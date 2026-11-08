import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import { overlay, reducedFade } from "../../motion/presets";

export type ToastKind = "info" | "ok" | "advertencia" | "critico";

interface ToastItem {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  notify: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue>({ notify: () => {} });

export function useToast(): ToastContextValue {
  return useContext(ToastContext);
}

const ICONS: Record<ToastKind, LucideIcon> = {
  info: Info,
  ok: CircleCheck,
  advertencia: CircleAlert,
  critico: TriangleAlert,
};

const TONES: Record<ToastKind, string> = {
  info: "bg-info-tint text-info",
  ok: "bg-ok-tint text-ok",
  advertencia: "bg-advertencia-tint text-advertencia",
  critico: "bg-critico-tint text-critico",
};

function ToastView({ toast, onDone }: { toast: ToastItem; onDone: (id: number) => void }) {
  const timer = useRef<number | null>(null);
  const Icon = ICONS[toast.kind];

  const start = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => onDone(toast.id), 6000);
  }, [onDone, toast.id]);

  useEffect(() => {
    start();
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, [start]);

  return (
    <div
      role="status"
      onMouseEnter={() => {
        if (timer.current !== null) window.clearTimeout(timer.current);
      }}
      onMouseLeave={start}
      className="flex items-start gap-3 rounded-[var(--radius-cards)] bg-surface p-4"
    >
      <span
        aria-hidden="true"
        className={`grid size-9 shrink-0 place-items-center rounded-full ${TONES[toast.kind]}`}
      >
        <Icon size={18} strokeWidth={1.5} />
      </span>
      <p className="min-w-0 text-body text-ink">{toast.message}</p>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const reduce = useReducedMotion();
  const preset = reduce ? reducedFade : overlay;

  const notify = useCallback((message: string, kind: ToastKind = "info") => {
    const id = nextId.current;
    nextId.current += 1;
    setToasts((prev) => [...prev.slice(-2), { id, message, kind }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 top-4 z-50 flex flex-col items-stretch gap-2 lg:inset-x-auto lg:bottom-8 lg:right-8 lg:top-auto lg:w-80"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout={!reduce}
              {...preset}
              className="pointer-events-auto"
            >
              <ToastView toast={t} onDone={dismiss} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
