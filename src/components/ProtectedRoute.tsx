import React from "react";
import { useAuth } from "@/hooks/use-auth";
import LoadingScreen from "./LoadingScreen";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isMfaStrong } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" replace />;

  // If user has verified factors but session is only AAL1, force MFA verification
  const hasVerifiedFactors = user.factors?.some((f) => f.status === "verified");
  if (hasVerifiedFactors && !isMfaStrong) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
