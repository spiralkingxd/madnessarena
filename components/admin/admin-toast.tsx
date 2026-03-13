"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

type ToastTone = "success" | "error" | "info";

type ToastItem = {
  id: string;
  tone: ToastTone;
  message: string;
};

type ToastContextValue = {
  pushToast: (tone: ToastTone, message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function AdminToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const pushToast = useCallback((tone: ToastTone, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, tone, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3200);
  }, []);

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[90] flex w-[min(92vw,360px)] flex-col gap-2">
        {toasts.map((toast) => (
          <ToastView key={toast.id} toast={toast} onClose={() => setToasts((prev) => prev.filter((item) => item.id !== toast.id))} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useAdminToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useAdminToast deve ser usado dentro de AdminToastProvider.");
  }
  return context;
}

function ToastView({ toast, onClose }: { toast: ToastItem; onClose: () => void }) {
  const classes =
    toast.tone === "success"
      ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
      : toast.tone === "error"
        ? "border-rose-300/30 bg-rose-300/10 text-rose-100"
        : "border-cyan-300/30 bg-cyan-300/10 text-cyan-100";

  return (
    <div className={`pointer-events-auto rounded-xl border px-3 py-2.5 text-sm shadow-xl ${classes}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {toast.tone === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : toast.tone === "error" ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <Info className="h-4 w-4" />
          )}
          <span>{toast.message}</span>
        </div>
        <button type="button" onClick={onClose} aria-label="Fechar notificação" className="opacity-80 hover:opacity-100">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
