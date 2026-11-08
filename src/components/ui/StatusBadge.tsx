import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import { duration, ease } from "../../motion/presets";
import type { RangeStatus } from "./range";

interface StatusBadgeProps {
  status: RangeStatus;
  size?: "sm" | "md";
}

const words: Record<RangeStatus, string> = {
  ok: "Bien",
  advertencia: "Advertencia",
  critico: "Crítico",
};

/** Solid fills with their own foreground. Status is always icon + word. */
const fills: Record<RangeStatus, string> = {
  ok: "bg-ok text-ok-fg",
  advertencia: "bg-advertencia text-advertencia-fg",
  critico: "bg-critico text-critico-fg",
};

function Icon({ status, size }: { status: RangeStatus; size: number }) {
  const props = { size, strokeWidth: 1.5, "aria-hidden": true } as const;
  if (status === "ok") return <CircleCheck {...props} />;
  if (status === "advertencia") return <CircleAlert {...props} />;
  return <TriangleAlert {...props} />;
}

/** Badge whose color and label crossfade when the status changes (state duration). */
export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const reduce = useReducedMotion();
  const chip =
    size === "md"
      ? "px-3 py-1 text-body"
      : "px-2 py-0.5 text-caption";
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={`${status}-${size}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={
          reduce
            ? { duration: duration.micro }
            : { duration: duration.state, ease: ease.out }
        }
        className={`inline-flex shrink-0 items-center gap-1 rounded-full ${fills[status]} ${chip}`}
      >
        <Icon status={status} size={size === "md" ? 16 : 14} />
        <span>{words[status]}</span>
      </motion.span>
    </AnimatePresence>
  );
}
