import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { AlertCircle, BookOpen, Loader2 } from "lucide-react";
import { supabase } from "./supabaseClient";
import { OAUTH_RETURN_TO_KEY, useAuth } from "./AuthContext";

export function AuthCallback() {
  const navigate = useNavigate();
  const { user, loading, bootError } = useAuth();
  const [callbackError, setCallbackError] = useState<string | null>(null);

  useEffect(() => {
    const exchange = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const returnTo = localStorage.getItem(OAUTH_RETURN_TO_KEY) ?? "/home";
          localStorage.removeItem(OAUTH_RETURN_TO_KEY);
          window.location.replace(returnTo || "/home");
          return;
        }

        localStorage.removeItem(OAUTH_RETURN_TO_KEY);
        navigate("/login", { replace: true });
      } catch (error) {
        setCallbackError((error as Error).message);
      }
    };

    void exchange();
  }, [navigate]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAFAF8", color: "#0E1117", padding: 24 }}>
      <style>{`
        @keyframes auth-callback-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{ width: "100%", maxWidth: 420, borderRadius: 24, border: "1px solid rgba(148,163,184,.25)", background: "white", padding: 32, boxShadow: "0 16px 48px rgba(0,0,0,.08)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, borderRadius: 18, background: "#0E1117", margin: "0 auto 20px" }}>
          <BookOpen size={24} color="white" />
        </div>
        <h1 style={{ textAlign: "center", fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Completing sign-in</h1>
        <p style={{ textAlign: "center", color: "#64748B", fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
          Supabase is exchanging your Google callback for a session. This page stays open until that finishes.
        </p>

        {callbackError || bootError ? (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10, borderRadius: 12, border: "1px solid rgba(244,63,94,.25)", background: "rgba(244,63,94,.08)", padding: 12, color: "#BE123C" }}>
            <AlertCircle size={16} style={{ flex: "0 0 auto", marginTop: 2 }} />
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>
              {callbackError ?? bootError}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: "#64748B", fontSize: 14 }}>
            <Loader2 size={16} style={{ animation: "auth-callback-spin 1s linear infinite" }} />
            Waiting for session...
          </div>
        )}
      </div>
    </div>
  );
}