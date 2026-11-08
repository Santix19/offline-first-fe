import { motion, useReducedMotion } from 'framer-motion'
import { duration, ease } from '../../motion/presets'

export interface SparklineProps {
  values: number[]
  /** CSS color, e.g. 'var(--series-1)' or 'var(--series-1)'. */
  color: string
  /** Accessible summary, e.g. "Temperatura promedio últimas 24 h, de 12,1 a 14,3 °C". */
  label: string
  height?: number
}

/**
 * Minimal trend sparkline: inline SVG polyline + soft area fill, no axes.
 * The line draws on mount (reveal); reduced motion renders it static.
 */
export function Sparkline({ values, color, label, height = 32 }: SparklineProps) {
  const reduce = useReducedMotion()
  const clean = values.filter((v) => Number.isFinite(v))

  if (clean.length < 2) {
    return <span className="sr-only">{label}</span>
  }const W = 100
  const H = 32
  const min = Math.min(...clean)
  const max = Math.max(...clean)
  // No zero baseline (standard sparkline): name the range in the label so a
  // flat series never reads as an alarm to a screen-reader user.
  const rango = `, de ${min.toLocaleString('es-CO', { maximumFractionDigits: 1 })} a ${max.toLocaleString('es-CO', { maximumFractionDigits: 1 })}`
  const spoken = `${label}${max > min ? rango : ''}`
  const span = max - min || 1
  const pad = 2
  const step = (W - pad * 2) / (clean.length - 1)
  const yOf = (v: number): number =>
    H - pad - ((v - min) / span) * (H - pad * 2)
  const points = clean
    .map((v, i) => `${(pad + i * step).toFixed(2)},${yOf(v).toFixed(2)}`)
    .join(' ')
  const area = `${pad.toFixed(2)},${(H - pad).toFixed(2)} ${points} ${(
    pad +
    (clean.length - 1) * step
  ).toFixed(2)},${(H - pad).toFixed(2)}`
  const anim = reduce
    ? {}
    : {
        initial: { pathLength: 0, opacity: 0 },
        animate: { pathLength: 1, opacity: 1 },
        transition: { duration: duration.reveal, ease: ease.out },
      }

  return (
    <span role="img" aria-label={spoken} className="block w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        width="100%"
        height={height}
        aria-hidden="true"
        className="block w-full"
      >
        <motion.polygon
          points={area}
          fill={color}
          opacity={0.16}
          initial={reduce ? undefined : { opacity: 0 }}
          animate={{ opacity: 0.16 }}
          transition={
            reduce
              ? { duration: duration.micro }
              : { duration: duration.reveal, ease: ease.out }
          }
        />
        <motion.polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          {...anim}
        />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  )
}
