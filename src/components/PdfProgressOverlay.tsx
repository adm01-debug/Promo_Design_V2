import { useEffect, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PdfProgress {
  stage: string;
  current: number;
  total: number;
  percent: number;
}

interface PdfProgressOverlayProps {
  open: boolean;
  title: string;
  progress: PdfProgress | null;
}

const PdfProgressOverlay = ({ open, title, progress }: PdfProgressOverlayProps) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!open) {
      setElapsed(0);
      return;
    }
    const start = Date.now();
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 500);
    return () => window.clearInterval(id);
  }, [open]);

  const percent = Math.max(0, Math.min(100, Math.round(progress?.percent ?? 0)));
  const stage = progress?.stage ?? "Preparando…";
  const counter =
    progress && progress.total > 0
      ? `${progress.current}/${progress.total}`
      : null;

  return (
    <DialogPrimitive.Root open={open}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          )}
        />
        <DialogPrimitive.Content
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%]",
            "gap-4 border border-border bg-card p-6 shadow-xl rounded-lg",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
        >
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <DialogPrimitive.Title className="text-base font-semibold text-foreground">
              {title}
            </DialogPrimitive.Title>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
              <span aria-live="polite">
                {stage}
                {counter && <span className="ml-1 text-foreground/80">({counter})</span>}
              </span>
              <span>{percent}%</span>
            </div>
            <Progress value={percent} className="h-2" />
          </div>

          <DialogPrimitive.Description className="text-xs text-muted-foreground">
            Não feche esta aba. O download começa automaticamente.
          </DialogPrimitive.Description>

          <div className="text-[10px] text-muted-foreground/60 font-mono text-right">
            Tempo decorrido: {elapsed}s
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

export default PdfProgressOverlay;
