import type { ReactNode } from "react";
import { Inbox, type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  message: string;
  action?: ReactNode;
  icon?: LucideIcon;
}

export function EmptyState({ message, action, icon }: EmptyStateProps) {
  const Icon = icon ?? Inbox;
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-accent-soft text-ink-emphasis">
        <Icon size={24} strokeWidth={1.5} aria-hidden="true" />
      </span>
      <p className="max-w-sm text-body text-ink-muted">{message}</p>
      {action}
    </div>
  );
}
