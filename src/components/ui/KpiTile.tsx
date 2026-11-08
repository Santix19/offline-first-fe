// avoid-ai-design-ignore-file: M5 — readout on real backend numbers per DESIGN.md §7, not placeholder theater.
import type { LucideIcon } from 'lucide-react'
import { CountUp } from '../../motion/Motion'
import { StatusBadge } from './StatusBadge'

export interface KpiTileProps {
  icon: LucideIcon
  label: string
  /** null renders "Sin dato". Counted up with CountUp on first view. */
  value: number | null
  format: (n: number) => string
  unit?: string
  /** Optional status pill next to the value. */
  status?: 'ok' | 'advertencia' | 'critico'
}

/**
 * KPI tile: label, big figure (+ unit), optional status. No sparkline:
 * the number and its range carry the meaning, mini-charts are decoration.
 */
export function KpiTile({
  icon: Icon,
  label,
  value,
  format,
  unit,
  status,
}: KpiTileProps) {
  return (
    <div className="kpi-tile flex flex-col gap-2 rounded-[var(--radius-cards)] border border-hairline bg-surface">
      <div className="flex items-center justify-between gap-2">
        <span className="label">{label}</span>
        <span className="kpi-tile-chip size-8 shrink-0 place-items-center rounded-[var(--radius-small)] bg-accent-soft text-ink-emphasis">
          <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
        </span>
      </div>
      <div className="stat-pair flex flex-wrap items-center gap-2">
        <span className="stat-value leading-[var(--leading-display)]">
          {value == null ? (
            <span className="whitespace-nowrap font-text font-normal tracking-normal text-body text-ink-muted">Sin dato</span>
          ) : (
            <CountUp value={value} format={format} />
          )}
          {unit && value != null ? (
            <span className="unit">{'\u2009'}{unit}</span>
          ) : null}
        </span>
        {status ? <StatusBadge status={status} size="sm" /> : null}
      </div>
    </div>
  )
}
