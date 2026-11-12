import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorLogger } from "@/lib/error-logger";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    ErrorLogger.fatal("React ErrorBoundary caught error", error, {
      componentStack: info.componentStack ?? undefined,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  handleHardReset = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] gap-6 p-6">
          <div className="w-20 h-20 rounded-3xl bg-destructive/10 flex items-center justify-center animate-pulse">
            <AlertTriangle className="w-10 h-10 text-destructive" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-display font-bold text-foreground">
              Ops! Algo saiu do roteiro.
            </h2>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
              {this.state.error?.message || "Ocorreu um erro inesperado ao processar esta página."}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
            <Button onClick={this.handleRetry} className="flex-1 gap-2 shadow-sm">
              <RefreshCw className="w-4 h-4" /> Tentar novamente
            </Button>
            <Button
              onClick={this.handleHardReset}
              variant="outline"
              className="flex-1 gap-2 border-destructive/20 text-destructive hover:bg-destructive/5"
            >
              Limpar Cache
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground font-mono mt-4">
            Código do erro: {this.state.error?.name || "UnknownError"}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default RouteErrorBoundary;
