// Gateway de IA — OpenRouter (substitui o antigo gateway da Lovable, ai.gateway.lovable.dev).
//
// A API do OpenRouter é compatível com o formato OpenAI Chat Completions, então o
// corpo das requisições das functions não muda (messages / tools / modalities).
// O que muda: a URL base, a variável de ambiente da chave e os SLUGS dos modelos —
// vários modelos que a Lovable aceitava não existem no catálogo do OpenRouter.

export const AI_CHAT_COMPLETIONS_URL = "https://openrouter.ai/api/v1/chat/completions";

/** Fila de geração de vídeo (assíncrona: POST cria o job, GET consulta). */
export const AI_VIDEO_JOBS_URL = "https://openrouter.ai/api/v1/videos";

/**
 * Chave do provedor. Ausente => a feature responde 503 com
 * `aiNotConfiguredPayload()` em vez de seguir sem credencial.
 */
export function getAiApiKey(): string | undefined {
  return Deno.env.get("OPENROUTER_API_KEY");
}

/**
 * Motivo padronizado de "sem chave do provedor". O app lê `code` para explicar a
 * pendência em PT-BR: o supabase-js transforma qualquer non-2xx em
 * FunctionsHttpError com a mensagem genérica "non-2xx status code", então sem
 * código estável o usuário veria o sistema como quebrado.
 */
export const AI_NOT_CONFIGURED_CODE = "AI_NOT_CONFIGURED";

export const AI_NOT_CONFIGURED_MESSAGE =
  "A geração por IA ainda não está configurada neste ambiente. " +
  "Peça ao administrador para cadastrar a chave do provedor de IA (OPENROUTER_API_KEY) e tente novamente.";

/** 503: a rota existe, o serviço de IA é que está indisponível. */
export const AI_NOT_CONFIGURED_STATUS = 503;

/**
 * Corpo padrão de "IA não configurada". Mantém `error` (clientes antigos leem a
 * mensagem) e acrescenta `code` (clientes novos decidem sem parsear texto).
 */
export function aiNotConfiguredPayload(
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return { error: AI_NOT_CONFIGURED_MESSAGE, code: AI_NOT_CONFIGURED_CODE, ...extra };
}

/**
 * Erro tipado para o fluxo assíncrono de vídeo, onde o job já foi criado: ele
 * precisa nascer `failed` com a mensagem acionável, nunca preso em `generating`.
 */
export class AiNotConfiguredError extends Error {
  constructor() {
    super(AI_NOT_CONFIGURED_MESSAGE);
    this.name = AI_NOT_CONFIGURED_CODE;
  }
}

export function aiHeaders(apiKey: string): Record<string, string> {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    // Opcionais no OpenRouter, mas ajudam no rate limit e no ranking do app.
    "HTTP-Referer": Deno.env.get("APP_URL") ?? "https://promo-design.app",
    "X-Title": "Promo Design",
  };
}

/**
 * Modelos efetivamente presentes no catálogo do OpenRouter (verificado em
 * /api/v1/models). NÃO trocar por slugs "obvios": `google/gemini-2.0-flash-exp`
 * e `google/gemini-1.5-flash` (usados antes no gateway da Lovable) não existem
 * no OpenRouter e retornariam 404.
 */
export const AI_MODELS = {
  /** Saída de imagem + texto (remoção de fundo, geração de mockup). */
  image: "google/gemini-2.5-flash-image",
  /** Texto/visão barato — OCR, sugestões com tool call. */
  vision: "google/gemini-2.5-flash",
  /** Texto/visão de qualidade — inferência de brand guidelines. */
  visionPlus: "google/gemini-3-flash-preview",
  /**
   * Text-to-video / image-to-video. Único modelo do catálogo que cobre TODOS os
   * aspect ratios do app (16:9, 9:16, 1:1 e 3:4 — usado como fallback de 4:5),
   * aceita first_frame + last_frame e dura até 30s. US$0,10/s em 720p.
   * Verificado em /api/v1/videos/models.
   */
  video: "alibaba/wan-3.0",
} as const;
