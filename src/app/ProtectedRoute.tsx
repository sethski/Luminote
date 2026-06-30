/**
 * ProtectedRoute.tsx
 * Wraps any route that requires authentication.
 * Shows a loading spinner while session resolves,
 * then redirects to /login if unauthenticated.
 */
import React from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../features/auth/AuthContext";
import { AuthLoadingSplash } from "./AuthLoadingSplash";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <AuthLoadingSplash />;
  }

  // Not authenticated — redirect to login
  if (!user && !session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
