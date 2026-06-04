import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, XCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "info";
interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  show: (type: ToastType, message: string, durationMs?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((type: ToastType, message: string, durationMs = 3000) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    if (durationMs > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, durationMs);
    }
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        className="dark fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
        role="status"
      >
        {toasts.map((t) => (
          <ToastView key={t.id} toast={t} onDismiss={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastView({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const Icon = toast.type === "success" ? CheckCircle2 : toast.type === "error" ? XCircle : Info;
  const palette =
    toast.type === "success"
      ? "bg-green-500/10 border-green-500/40 text-green-300"
      : toast.type === "error"
        ? "bg-destructive/15 border-destructive/40 text-destructive"
        : "bg-card border-border text-foreground";

  return (
    <button
      onClick={onDismiss}
      className={cn(
        "pointer-events-auto flex items-center gap-2 rounded-md border px-4 py-2 text-sm shadow-lg backdrop-blur transition-all min-w-[200px] max-w-md text-left",
        palette,
        visible ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{toast.message}</span>
    </button>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
