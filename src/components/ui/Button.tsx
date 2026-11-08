import type { ButtonHTMLAttributes, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2, type LucideIcon } from "lucide-react";
import { duration, ease } from "../../motion/presets";

export type ButtonVariant = "primary" | "secondary" | "quiet" | "ghost" | "ghost-light";

interface ButtonProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    | "onAnimationStart"
    | "onAnimationEnd"
    | "onAnimationIteration"
    | "onDrag"
    | "onDragEnd"
    | "onDragEnter"
    | "onDragExit"
    | "onDragLeave"
    | "onDragOver"
    | "onDragStart"
    | "onDrop"
  > {
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: LucideIcon;
  children: ReactNode;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-buttons)] font-text text-ui " +
  "min-h-[var(--button-height)] min-w-[var(--target-min)] px-4 " +
  "transition-colors duration-[var(--dur-micro)] ease-out " +
  "active:scale-[var(--press-scale)] " +
  "disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<ButtonVariant, string> = {
  primary: "btn-aurora text-on-cta font-medium hover:brightness-105",
  secondary: "border border-hairline bg-surface text-ink hover:bg-surface-2",
  quiet: "px-2 text-ink hover:text-ink-emphasis",
  /* Monopo ghost pills: transparent, hairline border, no fill. For dark ink surfaces. */
  ghost: "border border-ink text-ink",
  "ghost-light": "border border-white/30 bg-transparent text-white hover:border-white/70",
};

export function Button({
  variant = "primary",
  loading = false,
  disabled,
  icon: Icon,
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const reduce = useReducedMotion();

  return (
    <motion.button
      className={`${base} ${variants[variant]} ${className}`}
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
      whileTap={reduce || disabled || loading ? undefined : { scale: 0.97 }}
      transition={{ duration: duration.micro, ease: ease.out }}
      {...rest}
    >
      {/* The icon keeps its slot while loading, so the label never shifts. */}
      {Icon ? (
        <span className="relative grid size-4 shrink-0 place-items-center" aria-hidden="true">
          <Icon
            size={16}
            strokeWidth={1.5}
            className={loading ? "opacity-0" : undefined}
          />
          {loading ? (
            <Loader2
              size={16}
              strokeWidth={1.5}
              className="absolute animate-spin motion-reduce:animate-none"
            />
          ) : null}
        </span>
      ) : null}
      <span className="relative inline-flex items-center justify-center">
        <span
          className={`inline-flex items-center gap-2 transition-opacity duration-[var(--dur-micro)] ${loading ? "opacity-0" : ""}`}
        >
          {children}
        </span>
        {loading && !Icon ? (
          <Loader2
            size={16}
            strokeWidth={1.5}
            aria-hidden="true"
            className="absolute animate-spin motion-reduce:animate-none"
          />
        ) : null}
      </span>
    </motion.button>
  );
}
