import { RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "./Button";

interface ErrorStateProps {
  detalle: string;
  onRetry: () => void;
}

export function ErrorState({ detalle, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-critico-tint text-critico">
        <TriangleAlert size={24} strokeWidth={1.5} aria-hidden="true" />
      </span>
      <p className="max-w-sm text-body text-ink-muted">{detalle}</p>
      <Button variant="secondary" icon={RefreshCw} onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}
