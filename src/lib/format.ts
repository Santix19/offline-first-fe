// Shared display formatting. Every page uses these; never format dates or numbers inline.
// Server sends UTC ISO strings; the farm reads Colombia time (America/Bogota, no DST).
const TZ = 'America/Bogota'
const LOCALE = 'es-CO'

const dateTime = new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
const dateOnly = new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' })
const dayShort = new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, day: 'numeric', month: 'short' })
const timeOnly = new Intl.DateTimeFormat(LOCALE, { timeZone: TZ, hour: 'numeric', minute: '2-digit' })
const relative = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' })

/** "6 nov, 2:00 p. m." in Bogotá time. Accepts null and returns "Sin dato". */
export function formatDateTime(iso: string | null | undefined): string {
  return iso ? dateTime.format(new Date(iso)) : 'Sin dato'
}

/** "6 nov 2026". For LocalDate strings ("2026-09-13") it does not shift the day. */
export function formatDate(isoOrDate: string | null | undefined): string {
  if (!isoOrDate) return 'Sin dato'
  const d = /^\d{4}-\d{2}-\d{2}$/.test(isoOrDate) ? new Date(`${isoOrDate}T12:00:00-05:00`) : new Date(isoOrDate)
  return dateOnly.format(d)
}

export function formatTime(iso: string): string {
  return timeOnly.format(new Date(iso))
}

/** "hace 3 horas" / "ayer". Pair it with title={formatDateTime(iso)}. */
export function formatRelative(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return 'Sin dato'
  const diffS = (new Date(iso).getTime() - now.getTime()) / 1000
  const abs = Math.abs(diffS)
  if (abs < 60) return relative.format(Math.round(diffS), 'second')
  if (abs < 3600) return relative.format(Math.round(diffS / 60), 'minute')
  if (abs < 86400) return relative.format(Math.round(diffS / 3600), 'hour')
  return relative.format(Math.round(diffS / 86400), 'day')
}

/** es-CO number with fixed decimals ("128,4"). null returns "Sin dato". */
export function formatNumber(value: number | null | undefined, decimals = 1): string {
  if (value == null || Number.isNaN(value)) return 'Sin dato'
  return value.toLocaleString(LOCALE, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export function formatInteger(value: number | null | undefined): string {
  return formatNumber(value, 0)
}

/** Hours since an ISO time; used for "device stale > 24 h". */
export function hoursSince(iso: string | null | undefined, now: Date = new Date()): number {
  return iso ? (now.getTime() - new Date(iso).getTime()) / 3_600_000 : Infinity
}

/** "1 nov": compact day label for chart axes (no year, no "de"). */
export function formatDayShort(isoOrDate: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(isoOrDate) ? new Date(`${isoOrDate}T12:00:00-05:00`) : new Date(isoOrDate)
  return dayShort.format(d).replace(/ de /g, ' ').replace('.', '')
}
