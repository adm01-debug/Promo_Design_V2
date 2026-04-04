import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, X, Sparkles, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnboardingTour, type TourStep } from "@/hooks/use-onboarding-tour";

interface TooltipPosition {
  top: number;
  left: number;
  arrowSide: "top" | "bottom" | "left" | "right";
}

function calculatePosition(
  targetRect: DOMRect,
  tooltipWidth: number,
  tooltipHeight: number,
  preferredPosition: TourStep["position"],
): TooltipPosition {
  const GAP = 16;
  const ARROW_OFFSET = 12;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let top = 0;
  let left = 0;
  let arrowSide: TooltipPosition["arrowSide"] = "top";

  switch (preferredPosition) {
    case "bottom":
      top = targetRect.bottom + GAP;
      left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
      arrowSide = "top";
      if (top + tooltipHeight > vh - 20) {
        top = targetRect.top - tooltipHeight - GAP;
        arrowSide = "bottom";
      }
      break;
    case "top":
      top = targetRect.top - tooltipHeight - GAP;
      left = targetRect.left + targetRect.width / 2 - tooltipWidth / 2;
      arrowSide = "bottom";
      if (top < 20) {
        top = targetRect.bottom + GAP;
        arrowSide = "top";
      }
      break;
    case "right":
      top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
      left = targetRect.right + GAP;
      arrowSide = "left";
      if (left + tooltipWidth > vw - 20) {
        left = targetRect.left - tooltipWidth - GAP;
        arrowSide = "right";
      }
      break;
    case "left":
      top = targetRect.top + targetRect.height / 2 - tooltipHeight / 2;
      left = targetRect.left - tooltipWidth - GAP;
      arrowSide = "right";
      if (left < 20) {
        left = targetRect.right + GAP;
        arrowSide = "left";
      }
      break;
  }

  // Clamp to viewport
  left = Math.max(12, Math.min(left, vw - tooltipWidth - 12));
  top = Math.max(12, Math.min(top, vh - tooltipHeight - 12));

  return { top, left, arrowSide };
}

const arrowStyles: Record<string, string> = {
  top: "left-1/2 -translate-x-1/2 -top-2 border-l-transparent border-r-transparent border-t-transparent border-b-[hsl(var(--card))]",
  bottom: "left-1/2 -translate-x-1/2 -bottom-2 border-l-transparent border-r-transparent border-b-transparent border-t-[hsl(var(--card))]",
  left: "top-1/2 -translate-y-1/2 -left-2 border-t-transparent border-b-transparent border-l-transparent border-r-[hsl(var(--card))]",
  right: "top-1/2 -translate-y-1/2 -right-2 border-t-transparent border-b-transparent border-r-transparent border-l-[hsl(var(--card))]",
};

const OnboardingTour = () => {
  const { isActive, currentStep, totalSteps, step, nextStep, prevStep, skipTour } = useOnboardingTour();
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<TooltipPosition | null>(null);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const recalculate = useCallback(() => {
    if (!step || !isActive) return;
    const el = document.querySelector(step.targetSelector);
    if (!el) {
      // If target not found, auto-advance
      nextStep();
      return;
    }
    const rect = el.getBoundingClientRect();
    setTargetRect(rect);

    const tw = Math.min(340, window.innerWidth - 40);
    const th = 180;
    setPos(calculatePosition(rect, tw, th, step.position));

    // Scroll target into view if needed
    if (rect.top < 0 || rect.bottom > window.innerHeight) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [step, isActive, nextStep]);

  useEffect(() => {
    recalculate();
    window.addEventListener("resize", recalculate);
    window.addEventListener("scroll", recalculate, true);
    return () => {
      window.removeEventListener("resize", recalculate);
      window.removeEventListener("scroll", recalculate, true);
    };
  }, [recalculate]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") skipTour();
      if (e.key === "ArrowRight" || e.key === "Enter") nextStep();
      if (e.key === "ArrowLeft") prevStep();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isActive, skipTour, nextStep, prevStep]);

  if (!isActive || !step || !pos || !targetRect) return null;

  const isLast = currentStep === totalSteps - 1;
  const isFirst = currentStep === 0;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <>
      {/* Overlay with spotlight cutout */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9998]"
        onClick={skipTour}
        style={{
          background: `radial-gradient(
            ellipse ${Math.max(targetRect.width + 40, 120)}px ${Math.max(targetRect.height + 40, 80)}px 
            at ${targetRect.left + targetRect.width / 2}px ${targetRect.top + targetRect.height / 2}px,
            transparent 60%,
            rgba(0, 0, 0, 0.7) 100%
          )`,
        }}
      />

      {/* Spotlight ring */}
      <motion.div
        layoutId="tour-spotlight"
        className="fixed z-[9998] rounded-xl border-2 border-primary/50 pointer-events-none"
        style={{
          top: targetRect.top - 8,
          left: targetRect.left - 8,
          width: targetRect.width + 16,
          height: targetRect.height + 16,
        }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
      >
        <div className="absolute inset-0 rounded-xl animate-pulse-glow bg-primary/5" />
      </motion.div>

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          ref={tooltipRef}
          initial={{ opacity: 0, scale: 0.9, y: pos.arrowSide === "top" ? -8 : pos.arrowSide === "bottom" ? 8 : 0 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="fixed z-[9999] bg-card border border-border rounded-xl shadow-elevated p-0 overflow-hidden"
          style={{
            top: pos.top,
            left: pos.left,
            width: Math.min(340, window.innerWidth - 40),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Arrow */}
          <div
            className={`absolute w-0 h-0 border-[8px] ${arrowStyles[pos.arrowSide]}`}
          />

          {/* Progress bar */}
          <div className="h-1 bg-muted">
            <motion.div
              className="h-full bg-gradient-primary"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <div className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-display font-bold text-foreground leading-tight">{step.title}</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Passo {currentStep + 1} de {totalSteps}
                  </p>
                </div>
              </div>
              <button
                onClick={skipTour}
                className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Fechar tour"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Description */}
            <p className="text-xs text-muted-foreground leading-relaxed mb-4 pl-9">
              {step.description}
            </p>

            {/* Actions */}
            <div className="flex items-center justify-between pl-9">
              <button
                onClick={skipTour}
                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Pular tour
              </button>

              <div className="flex items-center gap-2">
                {!isFirst && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={prevStep}
                    className="h-8 px-2 text-xs"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                    Anterior
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={nextStep}
                  className="h-8 px-3 text-xs bg-gradient-primary text-primary-foreground hover:opacity-90"
                >
                  {isLast ? (
                    <>
                      <Sparkles className="w-3.5 h-3.5 mr-1" />
                      Concluir
                    </>
                  ) : (
                    <>
                      Próximo
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Step dots */}
            <div className="flex items-center justify-center gap-1.5 mt-3 pt-3 border-t border-border">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    i === currentStep
                      ? "w-4 bg-primary"
                      : i < currentStep
                        ? "bg-primary/40"
                        : "bg-muted-foreground/20"
                  }`}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
};

export default OnboardingTour;
