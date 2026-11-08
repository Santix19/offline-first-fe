import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { TriangleAlert } from "lucide-react";
import { Button } from "./Button";
import { duration, overlay, reducedFade } from "../../motion/presets";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(false);
  const preset = reduce ? reducedFade : overlay;

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    if (open) {
      if (!el.open) el.showModal();
      // One frame with the backdrop at 0 so it can fade in.
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }

    if (!el.open) {
      setVisible(false);
      return undefined;
    }

    // Let the panel and the backdrop finish before the browser hides the dialog.
    setVisible(false);
    const wait = (reduce ? duration.micro : duration.panel * 0.6) * 1000;
    const timeout = window.setTimeout(() => {
      if (el.open) el.close();
    }, wait);
    return () => window.clearTimeout(timeout);
  }, [open, reduce]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(event) => {
        // Animate out first; the effect above closes the dialog after the exit.
        event.preventDefault();
        onClose();
      }}
      aria-label={title}
      className={`m-auto w-[calc(100vw-2rem)] max-w-md rounded-[var(--radius-cards)] bg-surface p-5 text-ink backdrop:bg-nav/60 backdrop:transition-opacity backdrop:duration-[var(--dur-panel)] backdrop:ease-fluid ${
        visible ? "backdrop:opacity-100" : "backdrop:opacity-0"
      }`}
    >
      <motion.div initial={preset.initial} animate={visible ? preset.animate : preset.exit}>
        <div className="mb-4 flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-critico-tint text-critico">
            <TriangleAlert size={20} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <h2 className="mt-1 min-w-0">{title}</h2>
        </div>
        <p className="mb-5 text-body text-ink-muted">{message}</p>
        <div className="flex justify-end gap-2">
          <Button variant="quiet" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </motion.div>
    </dialog>
  );
}
