import { create } from "zustand";

export type ExportJobStatus = "queued" | "running" | "done" | "error" | "canceled";
export type ExportJobKind = "csv" | "zip" | "zip-by-type";

export interface ExportJob {
  id: string;
  label: string;
  kind: ExportJobKind;
  status: ExportJobStatus;
  /** total items (assets) for the job — 1 for CSV (single-step). */
  total: number;
  done: number;
  startedAt: number;
  finishedAt?: number;
  error?: string;
  /** Used to cancel an in-flight job. CSV jobs are effectively instant and ignore this. */
  controller?: AbortController;
  /** Optional per-type summary for zip-by-type. */
  summary?: string;
}

interface ExportQueueState {
  jobs: ExportJob[];
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  enqueue: (
    job: Omit<ExportJob, "status" | "done" | "startedAt"> & { status?: ExportJobStatus },
  ) => void;
  update: (id: string, patch: Partial<ExportJob>) => void;
  cancel: (id: string) => void;
  remove: (id: string) => void;
  clearFinished: () => void;
}

export const useExportQueue = create<ExportQueueState>((set, get) => ({
  jobs: [],
  panelOpen: false,
  setPanelOpen: (open) => set({ panelOpen: open }),
  enqueue: (job) =>
    set((s) => ({
      jobs: [
        ...s.jobs,
        { status: job.status ?? "running", done: 0, startedAt: Date.now(), ...job },
      ],
      panelOpen: true,
    })),
  update: (id, patch) =>
    set((s) => ({
      jobs: s.jobs.map((j) => (j.id === id ? { ...j, ...patch } : j)),
    })),
  cancel: (id) => {
    const job = get().jobs.find((j) => j.id === id);
    if (!job) return;
    job.controller?.abort();
    set((s) => ({
      jobs: s.jobs.map((j) =>
        j.id === id && (j.status === "running" || j.status === "queued")
          ? { ...j, status: "canceled", finishedAt: Date.now() }
          : j,
      ),
    }));
  },
  remove: (id) => set((s) => ({ jobs: s.jobs.filter((j) => j.id !== id) })),
  clearFinished: () =>
    set((s) => ({
      jobs: s.jobs.filter((j) => j.status === "running" || j.status === "queued"),
    })),
}));

/** Stable id factory — small, no deps. */
export function newJobId(): string {
  return `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
