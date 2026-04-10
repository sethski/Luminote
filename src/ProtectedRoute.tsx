/**
 * ProtectedRoute.tsx
 * Wraps any route that requires authentication.
 * Shows a loading spinner while session resolves,
 * then redirects to /login if unauthenticated.
 */
import React from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "./AuthContext";
import { BookOpen } from "lucide-react";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, session, loading } = useAuth();
  const location = useLocation();

  // Session is still loading — show a branded splash
  if (loading) {
    return (
      <div
        style={{
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          justifyContent: "center",
          minHeight:      "100vh",
          background:     "#FAFAF8",
          gap:            "16px",
          fontFamily:     "'Outfit', sans-serif",
        }}
      >
        <div
          style={{
            width:          "52px",
            height:         "52px",
            borderRadius:   "16px",
            background:     "#0E1117",
            display:        "flex",
            alignItems:     "center",
            justifyContent: "center",
          }}
        >
          <BookOpen size={22} color="white" />
        </div>
        {/* Animated dots */}
        <div style={{ display: "flex", gap: "6px" }}>
          {[0, 1, 2].map(i => (
            <div
              key={i}
              style={{
                width:            "8px",
                height:           "8px",
                borderRadius:     "50%",
                background:       "#CBD5E1",
                animation:        "dot-pulse 1.2s ease-in-out infinite",
                animationDelay:   `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
        <style>{`
          @keyframes dot-pulse {
            0%, 100% { transform: scale(.8); opacity: .4; }
            50%       { transform: scale(1.2); opacity: 1;   }
          }
        `}</style>
      </div>
    );
  }

  // Not authenticated — redirect to login
  if (!user && !session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
