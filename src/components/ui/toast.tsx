/**
 * toast.tsx
 * Lightweight, dependency-free toast notification system.
 * Renders via React portal into #toast-root.
 * Usage: toast.success("Note saved!") / toast.error("Failed") / toast.info("...")
 */
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, XCircle, Info, X, Loader2 } from "lucide-react";

type ToastType = "success" | "error" | "info" | "loading";

type Toast = {
  id:      string;
  type:    ToastType;
  message: string;
  duration?: number;
};

type ToastContextType = {
  success: (msg: string, duration?: number) => string;
  error:   (msg: string, duration?: number) => string;
  info:    (msg: string, duration?: number) => string;
  loading: (msg: string) => string;
  dismiss: (id: string) => void;
  toast:   (message: string, type?: ToastType, duration?: number) => string;
};

const ToastContext = createContext<ToastContextType | null>(null);

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={16} />,
  error:   <XCircle size={16} />,
  info:    <Info size={16} />,
  loading: <Loader2 size={16} className="animate-spin" />,
};

const COLORS: Record<ToastType, { bg: string; border: string; icon: string; text: string }> = {
  success: { bg: "#F0FDF4", border: "#BBF7D0", icon: "#16A34A", text: "#14532D" },
  error:   { bg: "#FFF1F2", border: "#FECDD3", icon: "#E11D48", text: "#881337" },
  info:    { bg: "#EFF6FF", border: "#BFDBFE", icon: "#2563EB", text: "#1E3A5F" },
  loading: { bg: "#F5F3FF", border: "#DDD6FE", icon: "#7C3AED", text: "#3B0764" },
};

/* ─── Individual toast item ───────────────────────── */
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const c = COLORS[toast.type];
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const t1 = setTimeout(() => setVisible(true), 10);
    // Auto-dismiss
    if (toast.type !== "loading" && toast.duration !== 0) {
      const dur = toast.duration ?? 3500;
      const t2  = setTimeout(() => { setVisible(false); setTimeout(() => onDismiss(toast.id), 300); }, dur);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
    return () => clearTimeout(t1);
  }, [toast.id, toast.type, toast.duration, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        display:        "flex",
        alignItems:     "center",
        gap:            "10px",
        padding:        "12px 14px",
        borderRadius:   "14px",
        border:         `1.5px solid ${c.border}`,
        background:     c.bg,
        boxShadow:      "0 8px 24px rgba(0,0,0,.1)",
        maxWidth:       "360px",
        minWidth:       "260px",
        fontFamily:     "'Outfit', 'DM Sans', sans-serif",
        fontSize:       "13px",
        fontWeight:     500,
        color:          c.text,
        transform:      visible ? "translateX(0) scale(1)"    : "translateX(20px) scale(.95)",
        opacity:        visible ? 1 : 0,
        transition:     "transform .3s cubic-bezier(.34,1.56,.64,1), opacity .3s ease",
      }}
    >
      <span style={{ color: c.icon, flexShrink: 0 }}>{ICONS[toast.type]}</span>
      <span style={{ flex: 1, lineHeight: 1.4 }}>{toast.message}</span>
      {toast.type !== "loading" && (
        <button
          type="button"
          onClick={() => { setVisible(false); setTimeout(() => onDismiss(toast.id), 300); }}
          style={{ color: c.icon, opacity: .6, cursor: "pointer", background: "none", border: "none", padding: 0, flexShrink: 0 }}
          aria-label="Dismiss notification"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

/* ─── Provider ────────────────────────────────────── */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((type: ToastType, message: string, duration?: number): string => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev.slice(-4), { id, type, message, duration }]); // max 5 toasts
    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const ctx: ToastContextType = {
    success: (msg, d) => add("success", msg, d),
    error:   (msg, d) => add("error",   msg, d),
    info:    (msg, d) => add("info",    msg, d),
    loading: (msg)    => add("loading", msg, 0),
    dismiss,
    toast: (msg, type = "info", d) => add(type, msg, d),
  };

  // Ensure portal target exists with proper cleanup
  useEffect(() => {
    let portalRoot = document.getElementById("toast-root");
    if (!portalRoot) {
      portalRoot = document.createElement("div");
      portalRoot.id = "toast-root";
      document.body.appendChild(portalRoot);
    }
    
    // Cleanup: remove portal root only if it has no children and will be recreated if needed
    return () => {
      const root = document.getElementById("toast-root");
      if (root && root.childNodes.length === 0 && toasts.length === 0) {
        root.remove();
      }
    };
  }, [toasts]);

  const portal = document.getElementById("toast-root");

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {portal && createPortal(
        <div
          aria-live="assertive"
          aria-atomic="false"
          style={{
            position:       "fixed",
            bottom:         "24px",
            right:          "24px",
            zIndex:         99999,
            display:        "flex",
            flexDirection:  "column",
            gap:            "8px",
            alignItems:     "flex-end",
          }}
        >
          {toasts.map(t => (
            <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
          ))}
        </div>,
        portal
      )}
    </ToastContext.Provider>
  );
}

/* ─── Hook ────────────────────────────────────────── */
export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
