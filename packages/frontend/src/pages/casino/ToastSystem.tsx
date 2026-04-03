import { useState, useEffect, useCallback, useRef } from "react";
import { casinoSounds } from "@/lib/casino-sounds";

export interface Toast {
  id: string;
  type: "achievement" | "levelup" | "jackpot" | "challenge" | "combo" | "luckyhour" | "info" | "runvictory";
  title: string;
  message: string;
  emoji?: string;
  color?: string;
  duration?: number;
}

interface ToastSystemProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

const TYPE_STYLES: Record<string, { bg: string; border: string; glow: string; defaultEmoji: string }> = {
  achievement: {
    bg: "linear-gradient(135deg, rgba(255,215,0,0.15), rgba(168,85,247,0.1))",
    border: "rgba(255,215,0,0.6)",
    glow: "0 0 30px rgba(255,215,0,0.3)",
    defaultEmoji: "🏆",
  },
  levelup: {
    bg: "linear-gradient(135deg, rgba(168,85,247,0.2), rgba(59,130,246,0.1))",
    border: "rgba(168,85,247,0.6)",
    glow: "0 0 30px rgba(168,85,247,0.3)",
    defaultEmoji: "⬆️",
  },
  jackpot: {
    bg: "linear-gradient(135deg, rgba(255,215,0,0.25), rgba(255,100,0,0.15))",
    border: "rgba(255,215,0,0.8)",
    glow: "0 0 40px rgba(255,215,0,0.5)",
    defaultEmoji: "💰",
  },
  challenge: {
    bg: "linear-gradient(135deg, rgba(34,197,94,0.15), rgba(59,130,246,0.1))",
    border: "rgba(34,197,94,0.5)",
    glow: "0 0 25px rgba(34,197,94,0.3)",
    defaultEmoji: "⭐",
  },
  combo: {
    bg: "linear-gradient(135deg, rgba(255,100,0,0.2), rgba(255,0,0,0.1))",
    border: "rgba(255,100,0,0.6)",
    glow: "0 0 30px rgba(255,100,0,0.4)",
    defaultEmoji: "🔥",
  },
  luckyhour: {
    bg: "linear-gradient(135deg, rgba(34,211,238,0.2), rgba(168,85,247,0.1))",
    border: "rgba(34,211,238,0.6)",
    glow: "0 0 30px rgba(34,211,238,0.4)",
    defaultEmoji: "🍀",
  },
  info: {
    bg: "linear-gradient(135deg, rgba(100,100,255,0.1), rgba(50,50,100,0.1))",
    border: "rgba(100,100,255,0.4)",
    glow: "none",
    defaultEmoji: "ℹ️",
  },
  runvictory: {
    bg: "linear-gradient(135deg, rgba(255,100,0,0.2), rgba(255,215,0,0.15))",
    border: "rgba(255,100,0,0.7)",
    glow: "0 0 40px rgba(255,100,0,0.4)",
    defaultEmoji: "🎲",
  },
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const [entering, setEntering] = useState(true);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setEntering(false));
    const dur = toast.duration ?? 4000;
    const exitTimer = setTimeout(() => setExiting(true), dur - 500);
    const removeTimer = setTimeout(onRemove, dur);
    return () => { clearTimeout(exitTimer); clearTimeout(removeTimer); };
  }, []);

  const style = TYPE_STYLES[toast.type] ?? TYPE_STYLES.info!;

  return (
    <div
      className="mb-2 rounded-xl px-4 py-3 flex items-center gap-3 backdrop-blur-lg transition-all duration-500"
      style={{
        background: style.bg,
        border: `1px solid ${style.border}`,
        boxShadow: style.glow,
        transform: entering ? "translateX(120%)" : exiting ? "translateX(120%)" : "translateX(0)",
        opacity: entering ? 0 : exiting ? 0 : 1,
        maxWidth: "380px",
      }}
    >
      <span className="text-2xl flex-shrink-0">{toast.emoji ?? style.defaultEmoji}</span>
      <div className="min-w-0">
        <div className="text-xs font-black text-white truncate">{toast.title}</div>
        <div className="text-[11px] text-gray-300 truncate">{toast.message}</div>
      </div>
    </div>
  );
}

export function ToastSystem({ toasts, removeToast }: ToastSystemProps) {
  return (
    <div className="fixed top-20 right-4 z-[70] flex flex-col items-end pointer-events-none">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onRemove={() => removeToast(t.id)} />
      ))}
    </div>
  );
}

// Hook for managing toasts
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = `toast-${Date.now()}-${idRef.current++}`;
    setToasts(prev => [...prev.slice(-4), { ...toast, id }]); // max 5 visible
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, addToast, removeToast };
}
