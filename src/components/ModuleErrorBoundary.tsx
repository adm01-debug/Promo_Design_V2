import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorLogger } from "@/lib/error-logger";

interface Props {
  children: ReactNode;
  /** Nome do módulo, usado para logs e mensagens. Ex.: "Editor de Mockup". */
  moduleName: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary escopo-módulo: uma falha em uma rota não derruba a app inteira
 * (sidebar, topbar e outras rotas permanecem funcionais).
 *
 * Uso: envelope cada `<Route element={...} />` de uma feature grande.
 */
class ModuleErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    ErrorLogger.fatal(`Module ErrorBoundary [${this.props.moduleName}]`, error, {
      module: this.props.moduleName,
      componentStack: info.componentStack ?? undefined,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="flex flex-col items-center justify-center min-h-[60vh] gap-5 p-6"
        >
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" aria-hidden="true" />
          </div>
          <div className="text-center space-y-1.5 max-w-md">
            <h2 className="text-lg font-display font-bold text-foreground">
              O módulo <span className="text-primary">{this.props.moduleName}</span> falhou
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {this.state.error?.message ||
                "Um erro inesperado interrompeu esta área. Os outros módulos continuam funcionando."}
            </p>
          </div>
          <Button onClick={this.handleRetry} className="gap-2" aria-label="Tentar carregar módulo novamente">
            <RefreshCw className="w-4 h-4" aria-hidden="true" /> Tentar novamente
          </Button>
          <p className="text-[10px] text-muted-foreground font-mono">
            {this.state.error?.name || "UnknownError"}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ModuleErrorBoundary;
