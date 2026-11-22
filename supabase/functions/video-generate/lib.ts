// Regras puras do provedor de vídeo (OpenRouter Video Generation API).
//
// Separadas do handler HTTP para poderem ser testadas sem rede — o mesmo
// padrão de os-webhook-dispatcher/lib.ts.

export type AppAspectRatio = "9:16" | "16:9" | "1:1" | "4:5";

/** Status devolvidos por GET /api/v1/videos/{id}. */
export type ProviderJobStatus =
  "pending" | "in_progress" | "completed" | "failed" | "cancelled" | "expired";

/** Espelho do enum public.video_job_status no banco. */
export type DbJobStatus = "queued" | "generating" | "ready" | "failed" | "cancelled";

/**
 * Nenhum modelo do catálogo aceita 4:5 (verificado em /api/v1/videos/models).
 * 3:4 é o retrato mais próximo suportado por todos os modelos que aceitam 4:5
 * e mantém o enquadramento vertical sem cortar o produto.
 */
const ASPECT_FALLBACK: Record<AppAspectRatio, string> = {
  "9:16": "9:16",
  "16:9": "16:9",
  "1:1": "1:1",
  "4:5": "3:4",
};

export function resolveProviderAspectRatio(appAspect: AppAspectRatio): string {
  return ASPECT_FALLBACK[appAspect] ?? "9:16";
}

/** Durações do app (5s e 10s) — todas dentro do suporte de 2s a 30s. */
export function resolveProviderDuration(appDuration: number): number {
  return Math.min(30, Math.max(2, Math.round(appDuration)));
}

export interface FrameImage {
  type: "image_url";
  image_url: { url: string };
  frame_type: "first_frame" | "last_frame";
}

export interface BuildVideoRequestInput {
  model: string;
  prompt: string;
  aspectRatio: AppAspectRatio;
  duration: number;
  startFrameUrl?: string | null;
  endFrameUrl?: string | null;
}

export interface VideoRequestBody {
  model: string;
  prompt: string;
  duration: number;
  resolution: string;
  aspect_ratio: string;
  frame_images?: FrameImage[];
}

export function buildVideoRequest(input: BuildVideoRequestInput): VideoRequestBody {
  const body: VideoRequestBody = {
    model: input.model,
    prompt: input.prompt,
    duration: resolveProviderDuration(input.duration),
    // 720p: melhor relação custo/qualidade (US$0,10/s) e aceito por todos os
    // modelos candidatos. 1080p dobra o custo sem ganho visível em mobile.
    resolution: "720p",
    aspect_ratio: resolveProviderAspectRatio(input.aspectRatio),
  };

  const frames: FrameImage[] = [];
  if (input.startFrameUrl) {
    frames.push({
      type: "image_url",
      image_url: { url: input.startFrameUrl },
      frame_type: "first_frame",
    });
  }
  if (input.endFrameUrl) {
    frames.push({
      type: "image_url",
      image_url: { url: input.endFrameUrl },
      frame_type: "last_frame",
    });
  }
  // Omitido quando vazio: enviar [] faz alguns provedores rejeitar o request.
  if (frames.length > 0) body.frame_images = frames;

  return body;
}

/**
 * Traduz o status do provedor para o enum do banco.
 * Retorna null quando o status remoto é desconhecido — nesse caso o chamador
 * mantém o job como está em vez de adivinhar um estado terminal.
 */
export function mapProviderStatus(status: string): DbJobStatus | null {
  switch (status) {
    case "pending":
    case "in_progress":
      return "generating";
    case "completed":
      // O enum do banco usa "ready", não "completed".
      return "ready";
    case "cancelled":
      return "cancelled";
    case "failed":
    case "expired":
      return "failed";
    default:
      return null;
  }
}

/**
 * Mensagem de erro legível para estados terminais do provedor.
 * O trigger do banco exige error_message preenchido em status "failed".
 */
export function describeTerminalError(status: string, providerError?: string): string {
  const detail = providerError?.trim();
  if (detail) return detail;
  if (status === "expired") {
    return "ERR_VIDEO_PROVIDER: o job expirou no provedor antes de concluir.";
  }
  return "ERR_VIDEO_PROVIDER: a geração falhou no provedor sem detalhe.";
}

/** Caminho do objeto no bucket privado "videos". */
export function videoStoragePath(organizationId: string, videoId: string): string {
  return `${organizationId}/${videoId}.mp4`;
}
