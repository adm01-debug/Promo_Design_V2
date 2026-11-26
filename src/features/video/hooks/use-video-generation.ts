import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { edgeErrorMessage } from "@/lib/functions-client";

export type VideoJobStatus = "queued" | "generating" | "ready" | "failed" | "cancelled";

export interface VideoJob {
  id: string;
  status: VideoJobStatus;
  video_url: string | null;
  thumbnail_url: string | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface CharacterSoulRef {
  /** Identificador estável do personagem no Character Studio (quando houver). */
  id?: string | null;
  /** Rótulo legível — usado no prompt para manter consistência entre gerações. */
  label?: string | null;
  avatar?: string | null;
  description?: string | null;
}

export interface EnqueueVideoInput {
  organizationId: string;
  clientId?: string | null;
  name: string;
  productName?: string | null;
  productSku?: string | null;
  prompt: string;
  aspectRatio: "9:16" | "16:9" | "1:1" | "4:5";
  duration: 5 | 10;
  style?: string | null;
  motionPresets: string[];
  startFrameUrl?: string | null;
  endFrameUrl?: string | null;
  characterRef?: CharacterSoulRef | null;
}

const TERMINAL: readonly VideoJobStatus[] = ["ready", "failed", "cancelled"];

/** Backoff adaptativo: rápido no início, mais espaçado conforme o job envelhece. */
export function pollIntervalFor(attempt: number): number {
  const ms = 2000 * Math.pow(1.5, Math.max(0, attempt));
  return Math.min(ms, 20000);
}

interface EdgeResponse {
  job?: VideoJob | { id: string; status: VideoJobStatus };
  error?: string | unknown;
}

function errorMessage(payload: EdgeResponse | null, fallback: string): string {
  if (payload && typeof payload.error === "string") return payload.error;
  return fallback;
}

/**
 * Enfileira e acompanha um job de geração de vídeo.
 * O polling para automaticamente em estados terminais e é encerrado ao desmontar.
 */
export function useVideoGeneration() {
  const queryClient = useQueryClient();
  const [jobId, setJobId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  const reset = useCallback(() => {
    setJobId(null);
    setAttempt(0);
  }, []);

  const enqueue = useMutation({
    mutationFn: async (input: EnqueueVideoInput) => {
      const { data, error } = await supabase.functions.invoke<EdgeResponse>("video-generate", {
        body: { action: "enqueue", ...input },
      });
      // Sem provedor a edge responde 503 com o motivo no corpo: ele fica em
      // `error.context`, então precisa ser lido (o supabase-js só expõe
      // "non-2xx status code" em `error.message`).
      if (error) throw new Error(await edgeErrorMessage(error, "Falha ao enfileirar o vídeo."));
      if (!data?.job) throw new Error(errorMessage(data ?? null, "Falha ao enfileirar o vídeo."));
      return data;
    },
    onSuccess: (data) => {
      const job = data.job!;
      setJobId(job.id);
      setAttempt(0);
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      if (job.status === "failed") {
        toast.error(errorMessage(data, "Geração indisponível no momento."));
      } else {
        toast.success("Vídeo enfileirado para geração.");
      }
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const jobQuery = useQuery({
    queryKey: ["video-job", jobId],
    enabled: !!jobId,
    queryFn: async () => {
      // Chama a edge em vez de ler a tabela: a action `status` sincroniza o job
      // com o provedor externo e só então devolve o estado. Ler a tabela direto
      // deixaria o job preso em "generating" para sempre.
      const { data, error } = await supabase.functions.invoke<EdgeResponse>("video-generate", {
        body: { action: "status", videoId: jobId },
      });
      if (error) throw new Error(await edgeErrorMessage(error, "Falha ao consultar o vídeo."));
      setAttempt((a) => a + 1);
      return (data?.job as VideoJob | null) ?? null;
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status || TERMINAL.includes(status)) return false;
      return pollIntervalFor(attempt);
    },
    refetchIntervalInBackground: false,
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke<EdgeResponse>("video-generate", {
        body: { action: "cancel", videoId: id },
      });
      if (error) {
        throw new Error(await edgeErrorMessage(error, "Falha ao cancelar a geração."));
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["videos"] });
      queryClient.invalidateQueries({ queryKey: ["video-job", jobId] });
      toast.success("Geração cancelada.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const job = jobQuery.data ?? null;
  const isTerminal = job ? TERMINAL.includes(job.status) : false;

  return useMemo(
    () => ({
      job,
      jobId,
      isEnqueuing: enqueue.isPending,
      isPolling: !!jobId && !isTerminal,
      isTerminal,
      enqueue: enqueue.mutate,
      cancel: cancel.mutate,
      isCancelling: cancel.isPending,
      reset,
    }),
    [
      job,
      jobId,
      enqueue.isPending,
      enqueue.mutate,
      cancel.mutate,
      cancel.isPending,
      isTerminal,
      reset,
    ],
  );
}
