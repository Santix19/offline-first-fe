import type { SelectHTMLAttributes } from "react";
import { TriangleAlert } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  id: string;
  options: SelectOption[];
}

export function Select({ label, error, id, options, className = "", ...rest }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-caption text-ink-muted">
        {label}
      </label>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`h-[var(--button-height)] rounded-[var(--radius-small)] border bg-surface px-3 text-body text-ink transition-colors duration-[var(--dur-micro)] focus:border-brand focus:ring-2 focus:ring-white/20 focus:outline-none ${
          error ? "border-critico" : "border-hairline"
        } ${className}`}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
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
