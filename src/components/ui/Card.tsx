import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface CardProps {
  title?: string;
  action?: ReactNode;
  icon?: LucideIcon;
  className?: string;
  children: ReactNode;
}

export function Card({ title, action, icon: Icon, className = "", children }: CardProps) {
  return (
    <section className={`rounded-[var(--radius-cards)] border border-hairline bg-surface p-9 ${className}`}>
      {title || action ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {Icon ? (
              <span className="grid size-8 shrink-0 place-items-center rounded-[var(--radius-small)] bg-accent-soft text-ink-emphasis">
                <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
              </span>
            ) : null}
            {title ? <h2 className="min-w-0">{title}</h2> : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}
