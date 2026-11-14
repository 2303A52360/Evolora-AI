"use client";

import { useState, useCallback, createContext, useContext, type ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

/* ── Types ───────────────────────────────────────────────────────── */

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string) => void;
}

/* ── Context ─────────────────────────────────────────────────────── */

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = ++nextId;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = (id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const iconMap = {
    success: <CheckCircle2 className="w-4 h-4 text-[var(--color-success)] flex-shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-[var(--color-error)] flex-shrink-0" />,
    info: <Info className="w-4 h-4 text-[var(--color-info)] flex-shrink-0" />,
  };

  const borderMap = {
    success: "border-l-[var(--color-success)]",
    error: "border-l-[var(--color-error)]",
    info: "border-l-[var(--color-info)]",
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              animate-slide-up flex items-center gap-3 pl-4 pr-3 py-3
              bg-[var(--color-surface)] border border-[var(--color-border-default)]
              border-l-[3px] ${borderMap[toast.type]}
              rounded-[var(--radius-md)] shadow-sm
              text-[13px] text-[var(--color-ink-primary)]
              max-w-xs
            `}
          >
            {iconMap[toast.type]}
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => dismiss(toast.id)}
              className="ml-1 p-0.5 text-[var(--color-ink-tertiary)] hover:text-[var(--color-ink-primary)] transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be inside ToastProvider");
  return ctx;
}
