import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
      // A edge function responde 503 com corpo útil quando não há provedor.
      if (error && !data?.job) throw new Error(error.message);
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
      const { data, error } = await supabase
        .from("videos")
        .select("id,status,video_url,thumbnail_url,error_message,started_at,completed_at")
        .eq("id", jobId!)
        .maybeSingle();
      if (error) throw error;
      setAttempt((a) => a + 1);
      return (data as VideoJob | null) ?? null;
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
      if (error) throw new Error(errorMessage(data ?? null, error.message));
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
    [job, jobId, enqueue.isPending, enqueue.mutate, cancel.mutate, cancel.isPending, isTerminal, reset],
  );
}
