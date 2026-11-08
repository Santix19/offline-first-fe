/** Shared axis helpers for the panel charts. No recharts here, only numbers. */

export interface NiceScale {
  ticks: number[]
  domain: [number, number]
}

function magnitudeOf(value: number): number {
  return 10 ** Math.floor(Math.log10(value))
}

/**
 * Round steps to 1 / 2 / 2.5 / 5 / 10 so y ticks land on round values.
 * Count charts (mortality) pass integerOnly to keep every tick an integer.
 */
export function niceTicks(lo: number, hi: number, maxTicks = 5, integerOnly = false): NiceScale {
  const fallback: NiceScale = { ticks: [0, 1], domain: [0, 1] }
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return fallback
  let low = Math.min(lo, hi)
  let high = Math.max(lo, hi)
  if (low === high) {
    const pad = Math.abs(low) > 0 ? Math.abs(low) * 0.1 : 1
    low -= pad
    high += pad
  }
  const span = high - low
  if (span <= 0 || !Number.isFinite(span)) return fallback
  const safeMax = Math.max(2, Math.floor(maxTicks))
  const rawStep = span / (safeMax - 1)
  if (!Number.isFinite(rawStep) || rawStep <= 0) return fallback

  let step: number
  if (integerOnly) {
    if (rawStep <= 1) {
      step = 1
    } else {
      const mag = magnitudeOf(rawStep)
      const norm = rawStep / mag
      const niceNorm = norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10
      step = Math.max(1, Math.round(niceNorm * mag))
    }
  } else {
    const mag = magnitudeOf(rawStep)
    const norm = rawStep / mag
    const niceNorm = norm < 1.5 ? 1 : norm < 2.5 ? 2 : norm < 4 ? 2.5 : norm < 7 ? 5 : 10
    step = niceNorm * mag
  }

  const niceLo = Math.floor(low / step) * step
  const niceHi = Math.ceil(high / step) * step
  const ticks: number[] = []
  const count = Math.round((niceHi - niceLo) / step)
  for (let i = 0; i <= count; i += 1) {
    const tick = niceLo + i * step
    ticks.push(integerOnly ? Math.round(tick) : tick)
  }
  const unique = [...new Set(ticks)].sort((a, b) => a - b)
  if (unique.length < 2) return fallback
  return { ticks: unique, domain: [unique[0], unique[unique.length - 1]] }
}

/**
 * Evenly sample raw x keys so the axis never shows repeated identical labels.
 * Keeps the first key of each formatted label, capped at maxTicks.
 */
export function sampleTicks(
  keys: string[],
  format: (key: string) => string,
  maxTicks = 6,
): string[] {
  if (keys.length === 0) return []
  const safeMax = Math.max(1, Math.floor(maxTicks))
  if (keys.length <= safeMax) {
    const seen = new Set<string>()
    const out: string[] = []
    for (const key of keys) {
      const label = format(key)
      if (seen.has(label)) continue
      seen.add(label)
      out.push(key)
    }
    return out
  }
  const step = (keys.length - 1) / (safeMax - 1)
  const picked: string[] = []
  for (let i = 0; i < safeMax; i += 1) {
    picked.push(keys[Math.round(i * step)])
  }
  const seen = new Set<string>()
  const out: string[] = []
  for (const key of picked) {
    const label = format(key)
    if (seen.has(label)) continue
    seen.add(label)
    out.push(key)
  }
  if (out.length === 0) return [keys[0]]
  return out
}

/** True when the visible span calls for hour labels (brief: 48 h or less). */
export function isHourRange(rangeHours: number | undefined, spanHours: number): boolean {
  if (rangeHours !== undefined) return rangeHours <= 48
  return spanHours <= 48
}

/** Hours between the first and last x key. Zero when there is no usable span. */
export function spanHoursOf(keys: string[]): number {
  if (keys.length < 2) return 0
  const first = Date.parse(keys[0])
  const last = Date.parse(keys[keys.length - 1])
  if (!Number.isFinite(first) || !Number.isFinite(last)) return 0
  return Math.abs(last - first) / 3_600_000
}
