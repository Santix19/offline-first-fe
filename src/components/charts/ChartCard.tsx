import { useRef, type ReactNode } from 'react'
import { useInView } from 'framer-motion'
import { Waves, type LucideIcon } from 'lucide-react'
import { StatusBadge } from '../ui/StatusBadge'
import type { RangeStatus } from '../ui/range'
import { formatNumber } from '../../lib/format'

export interface ChartCurrent {
  /** Last value of the series. null renders "Sin dato". */
  value: number | null
  unit: string
  decimals?: number
}

interface ChartCardProps {
  icon?: LucideIcon
  title: string
  /** Small line under the title: the window, the measure or how to read the chart. */
  subtitle?: string
  /** Big current value at the top right, with its status chip when there is a range. */
  current?: ChartCurrent
  status?: RangeStatus
  /** Quiet action under the plot (Ver tabla). */
  footer?: ReactNode
  children: ReactNode
}

/**
 * One chart, one card: surface, header icon square, current value top right
 * with its status chip. Water charts use the brand square; batch charts reuse the same square. */
export function ChartCard({
  icon,
  title,
  subtitle,
  current,
  status,
  footer,
  children,
}: ChartCardProps) {
  const Icon = icon ?? Waves
  const decimals = current?.decimals ?? 1
  // Recharts draws on mount: hold the plot until the card enters the viewport so the
  // line draw happens where the reader can see it. Height is reserved, no layout jump.
  const ref = useRef<HTMLElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -8% 0px' })
  return (
    <section ref={ref} className="rounded-[var(--radius-cards)] bg-surface p-5  duration-[var(--dur-state)] ease-out ">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-small)] bg-accent-soft text-ink-emphasis">
            <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate">{title}</h2>
            {subtitle ? <p className="text-caption text-ink-faint">{subtitle}</p> : null}
          </div>
        </div>
        {current ? (
          <div className="ml-auto flex shrink-0 flex-col items-end gap-1">
            <span className="stat-value leading-none text-ink">
              {current.value === null ? 'Sin dato' : formatNumber(current.value, decimals)}
              {current.value === null ? null : (
                <span className="unit ml-1">{current.unit}</span>
              )}
            </span>
            {status ? <StatusBadge status={status} /> : null}
          </div>
        ) : null}
      </header>
      <div className="mt-5">
        {inView ? children : <div className="h-64 w-full" aria-hidden="true" />}
      </div>
      {footer ? <div className="mt-3 flex justify-end">{footer}</div> : null}
    </section>
  )
}

/** Title + icon square for the single-series charts: the title names the series, no legend box. */
export function ChartSubtitle({ children }: { children: ReactNode }) {
  return <span className="text-caption text-ink-faint">{children}</span>
}
