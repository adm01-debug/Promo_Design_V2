import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "promo-tour-completed";
const TOUR_VERSION = 1;

export interface TourStep {
  id: string;
  targetSelector: string;
  title: string;
  description: string;
  position: "top" | "bottom" | "left" | "right";
  spotlight?: boolean;
}

export const DASHBOARD_TOUR_STEPS: TourStep[] = [
  {
    id: "greeting",
    targetSelector: "[data-tour='greeting']",
    title: "Seu painel principal",
    description: "Aqui você acompanha métricas, atalhos e projetos recentes do seu time de artes.",
    position: "bottom",
  },
  {
    id: "stats",
    targetSelector: "[data-tour='stats']",
    title: "Métricas em tempo real",
    description:
      "Ordens de serviço, produção, imagens IA e rascunhos — tudo atualizado automaticamente com mini-gráficos de tendência.",
    position: "bottom",
  },
  {
    id: "quick-actions",
    targetSelector: "[data-tour='quick-actions']",
    title: "Ações rápidas",
    description:
      "Acesse os módulos mais usados com um clique: Mockup, Magic Up, Ordens de Serviço, Cinema Mode e muito mais.",
    position: "bottom",
  },
  {
    id: "activity",
    targetSelector: "[data-tour='activity-chart']",
    title: "Atividade semanal",
    description:
      "Visualize a produtividade do time ao longo das semanas com gráficos de barras interativos.",
    position: "top",
  },
  {
    id: "customize",
    targetSelector: "[data-tour='customize']",
    title: "Personalize seu dashboard",
    description: "Arraste e reorganize os widgets como preferir. A ordem é salva automaticamente!",
    position: "left",
  },
  {
    id: "sidebar",
    targetSelector: "[data-tour='sidebar-nav']",
    title: "Navegação por módulos",
    description:
      "Explore Mockup Studio, Magic Up e Video Studio. Use ⌘K para busca rápida ou ? para atalhos.",
    position: "right",
  },
];

export function useOnboardingTour() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.version === TOUR_VERSION) return;
      }
      // Auto-start after a short delay for first-time users
      const timer = setTimeout(() => setIsActive(true), 1500);
      return () => clearTimeout(timer);
    } catch {
      // ignore
    }
  }, []);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => {
      if (prev >= DASHBOARD_TOUR_STEPS.length - 1) {
        setIsActive(false);
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ version: TOUR_VERSION, completedAt: new Date().toISOString() }),
        );
        return 0;
      }
      return prev + 1;
    });
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const skipTour = useCallback(() => {
    setIsActive(false);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: TOUR_VERSION, skippedAt: new Date().toISOString() }),
    );
  }, []);

  const resetTour = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  return {
    isActive,
    currentStep,
    totalSteps: DASHBOARD_TOUR_STEPS.length,
    step: DASHBOARD_TOUR_STEPS[currentStep],
    startTour,
    nextStep,
    prevStep,
    skipTour,
    resetTour,
  };
}
