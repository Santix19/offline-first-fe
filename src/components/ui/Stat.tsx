// avoid-ai-design-ignore-file: M5 — readout on real backend numbers per DESIGN.md §7, not placeholder theater.
import { CountUp } from "../../motion/Motion";
import { formatNumber } from "../../lib/format";

interface StatProps {
  label: string;
  value: string;
  unit?: string;
  /** When set, the value counts up on first view (formatting stays in format.ts). */
  numericValue?: number | null;
  decimals?: number;
}

export function Stat({ label, value, unit, numericValue, decimals = 1 }: StatProps) {
  return (
    <div className="flex flex-col gap-1">
      <span className="label">{label}</span>
      <span className="stat-value">
        {numericValue !== undefined ? (
          <CountUp value={numericValue} format={(n) => formatNumber(n, decimals)} />
        ) : (
          value
        )}
        {unit ? <span className="unit">{'\u2009'}{unit}</span> : null}
      </span>
    </div>
  );
}
