import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import LoadingScreen from "./LoadingScreen";
import { Navigate, useLocation } from "react-router-dom";
import { ErrorLogger } from "@/lib/error-logger";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, session, isMfaStrong } = useAuth();
  const location = useLocation();
  const [isTimedOut, setIsTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading) {
        setIsTimedOut(true);
        ErrorLogger.warn("Auth loading timed out in ProtectedRoute", { path: location.pathname });
      }
    }, 5000); // 5s timeout for auth loading
    return () => clearTimeout(timer);
  }, [loading, location.pathname]);

  if (loading && !isTimedOut) return <LoadingScreen />;
  
  if (!user && !loading) {
    return <Navigate to={`/auth?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (isTimedOut && !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <h2 className="text-xl font-bold mb-2">Erro de Autenticação</h2>
        <p className="text-muted-foreground mb-4">Não foi possível verificar sua sessão. Por favor, tente novamente.</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
        >
          Recarregar Página
        </button>
      </div>
    );
  }

  // If user has verified factors but session is only AAL1, force MFA verification
  const hasVerifiedFactors = user?.factors?.some(f => f.status === 'verified');
  if (hasVerifiedFactors && !isMfaStrong && user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
