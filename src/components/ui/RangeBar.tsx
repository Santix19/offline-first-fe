import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { duration, ease } from "../../motion/presets";
import { rangeStatus, type RangeLimits } from "./range";
import { StatusBadge } from "./StatusBadge";
import { formatNumber } from "../../lib/format";

interface RangeBarProps extends RangeLimits {
  value: number;
  unit: string;
  label: string;
  /** Decimals shown (es-CO). pH and temperature read best with 1. */
  decimals?: number;
  /** Optional icon shown next to the label. */
  icon?: LucideIcon;
}

function clamp(n: number, lo: number, hi: number): number {
  if (n < lo) return lo;
  if (n > hi) return hi;
  return n;
}

/**
 * The marker slides from the track start to its value on mount (reveal, transform
 * only) and glides on value change; the badge fades in right after.
 */
export function RangeBar({
  value,
  unit,
  label,
  decimals = 1,
  optimo_min,
  optimo_max,
  critico_min,
  critico_max,
  icon: Icon,
}: RangeBarProps) {
  const reduce = useReducedMotion();
  const status = rangeStatus(value, {
    optimo_min,
    optimo_max,
    critico_min,
    critico_max,
  });
  const span = optimo_max - optimo_min;
  const lo = critico_min;
  const hi = critico_max ?? optimo_max + span;
  const safeHi = hi === lo ? lo + 1 : hi;
  const pct = (n: number) => ((clamp(n, lo, safeHi) - lo) / (safeHi - lo)) * 100;
  const marker =
    status === "ok"
      ? "bg-ok"
      : status === "advertencia"
        ? "bg-advertencia"
        : "bg-critico";
  const target = `${pct(value)}%`;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-1 text-caption text-ink-muted">
          {Icon ? (
            <Icon size={16} strokeWidth={1.5} aria-hidden="true" className="shrink-0 text-ink-emphasis" />
          ) : null}
          {label}
        </span>
        <span className="num font-mono text-body tracking-normal text-ink">
          {formatNumber(value, decimals)} <span className="text-caption text-ink-muted">{unit}</span>
        </span>
      </div>
      <div
        role="img"
        aria-label={`${label}: ${formatNumber(value, decimals)} ${unit}`}
        className="relative h-1.5 w-full rounded-[var(--radius-small)] bg-hairline"
      >
        <motion.div
          className="absolute inset-y-0 rounded-[var(--radius-small)]"
          style={{
            left: `${pct(optimo_min)}%`,
            width: `${pct(optimo_max) - pct(optimo_min)}%`,
            backgroundColor: "var(--chart-band-optimo)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={
            reduce
              ? { duration: duration.micro }
              : { duration: duration.reveal, ease: ease.out }
          }
        />
        <motion.div
          className="absolute inset-y-0 right-0 left-0"
          initial={{ x: reduce ? target : "0%", opacity: 0 }}
          animate={{ x: target, opacity: 1 }}
          transition={
            reduce
              ? { duration: duration.micro }
              : { duration: duration.reveal, ease: ease.out }
          }
        >
          <span
            className={`absolute top-1/2 left-0 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ${marker}`}
            style={{ boxShadow: "0 0 0 2px var(--color-surface)" }}
          />
        </motion.div>
      </div>
      {status !== "ok" ? (
      <motion.div
        className="flex justify-start"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={
          reduce
            ? { duration: duration.micro }
            : { duration: duration.state, ease: ease.out, delay: duration.state }
        }
      >
        <StatusBadge status={status} />
      </motion.div>
      ) : null}
    </div>
  );
}
