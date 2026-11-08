import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

interface SlowServerNoticeProps {
  active: boolean;
}

export function SlowServerNotice({ active }: SlowServerNoticeProps) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!active) {
      setSlow(false);
      return;
    }
    setSlow(false);
    const t = setTimeout(() => setSlow(true), 5000);
    return () => clearTimeout(t);
  }, [active]);

  if (!active || !slow) return null;
  return (
    <p role="status" className="flex items-center gap-2 text-caption text-ink-muted">
      <RefreshCw
        size={16}
        strokeWidth={1.5}
        aria-hidden="true"
        className="animate-spin motion-reduce:animate-none"
      />
      Despertando el servidor…
    </p>
  );
}
