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

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-6">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-lg font-display font-bold text-foreground">Algo deu errado</h2>
          <p className="text-sm text-muted-foreground max-w-md text-center">
            {this.state.error?.message || "Erro inesperado ao renderizar esta página."}
          </p>
          <Button onClick={this.handleRetry} className="gap-2 mt-2">
            <RefreshCw className="w-4 h-4" /> Tentar novamente
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default RouteErrorBoundary;
