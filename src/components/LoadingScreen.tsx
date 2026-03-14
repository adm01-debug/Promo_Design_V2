import { Loader2 } from "lucide-react";

const LoadingScreen = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
    <Loader2 className="w-8 h-8 text-primary animate-spin" />
    <p className="text-sm text-muted-foreground font-mono">Carregando...</p>
  </div>
);

export default LoadingScreen;
