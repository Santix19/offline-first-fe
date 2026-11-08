import type { InputHTMLAttributes } from "react";
import { TriangleAlert } from "lucide-react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  id: string;
}

export function Field({ label, error, id, className = "", ...rest }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-caption text-ink-muted">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`h-[var(--button-height)] rounded-[var(--radius-small)] border bg-surface px-3 text-body text-ink transition-colors duration-[var(--dur-micro)] placeholder:text-ink-faint focus:border-brand focus:ring-2 focus:ring-white/20 focus:outline-none ${
          error ? "border-critico" : "border-hairline"
        } ${className}`}
        {...rest}
      />
      {error ? (
        <p id={`${id}-error`} className="flex items-start gap-1.5 text-caption text-ink">
          <TriangleAlert
            size={16}
            strokeWidth={1.5}
            aria-hidden="true"
            className="mt-px shrink-0 text-critico"
          />
          {error}
        </p>
      ) : null}
    </div>
  );
}
