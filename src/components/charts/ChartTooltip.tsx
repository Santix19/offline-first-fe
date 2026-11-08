import { formatNumber } from "../../lib/format"

interface ChartTooltipProps {
  active?: boolean
  label?: string | number
  payload?: Array<{ value?: number | string }>
  unit: string
  formatLabel?: (label: string) => string
  formatValue?: (value: number | string) => string
}

export function ChartTooltip({
  active,
  label,
  payload,
  unit,
  formatLabel,
  formatValue,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const value = payload[0]?.value
  const formatOne = formatValue ?? defaultFormatValue
  const text =
    label === undefined || label === "" ? "" : formatLabel ? formatLabel(String(label)) : String(label)
  return (
    <div className="rounded-[var(--radius-small)] border border-hairline bg-surface px-3 py-2">
      <p className="num font-mono text-body text-ink">
        {value === undefined ? "Sin dato" : formatOne(value)}{" "}
        <span className="font-normal text-caption text-ink-muted">{unit}</span>
      </p>
      {text ? <p className="font-mono text-caption text-ink-muted">{text}</p> : null}
    </div>
  )
}

function defaultFormatValue(value: number | string): string {
  if (typeof value === "number") return formatNumber(value, 1)
  const parsed = Number(value)
  if (value !== "" && Number.isFinite(parsed)) return formatNumber(parsed, 1)
  return String(value)
}

/** Kept for the Kit gallery, which imports these names. New code uses src/lib/format. */
export function formatBogota(iso: string): string {
  const d = new Date(iso)
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d)
}

/** Kept for the Kit gallery, which imports these names. New code uses src/lib/format. */
export function formatBogotaDay(iso: string): string {
  const d = new Date(iso)
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota",
    day: "2-digit",
    month: "short",
  }).format(d)
}
