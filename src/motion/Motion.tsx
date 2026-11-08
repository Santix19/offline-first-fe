// avoid-ai-design-ignore-file: M5 — readout on real backend numbers per DESIGN.md §7, not placeholder theater.
// Motion primitives. Every animated element in the panel goes through these or the presets,
// so the whole app moves as one system. All of them honor prefers-reduced-motion.
import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react'
import { animate, motion, useInView, useReducedMotion } from 'framer-motion'
import { duration, ease, staggerDelay } from './presets'

type Tag = 'div' | 'section' | 'li' | 'article' | 'span' | 'tr' | 'header'

/** Fades a block up once on mount. Reduced motion: plain fade. */
export function FadeUp({ as = 'div', delay = 0, className, children }: { as?: Tag; delay?: number; className?: string; children: ReactNode }) {
  const reduce = useReducedMotion()
  const Component = motion[as] as ElementType
  return (
    <Component
      className={className}
      initial={{ opacity: 0, y: reduce ? 0 : 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? duration.micro : duration.panel, ease: ease.out, delay: reduce ? 0 : delay }}
    >
      {children}
    </Component>
  )
}

/** One item of a list: first render staggers in (capped). Use inside AnimatePresence with `layout` for removals. */
export function StaggerItem({ index = 0, as = 'div', className, children, layout = false }: { index?: number; as?: Tag; className?: string; children: ReactNode; layout?: boolean }) {
  const reduce = useReducedMotion()
  const Component = motion[as] as ElementType
  return (
    <Component
      className={className}
      layout={layout && !reduce ? 'position' : undefined}
      initial={{ opacity: 0, y: reduce ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, x: 24, transition: { duration: duration.state, ease: ease.in } }}
      transition={{ duration: reduce ? duration.micro : duration.state + 0.1, ease: ease.out, delay: reduce ? 0 : staggerDelay(index) }}
    >
      {children}
    </Component>
  )
}

/** Counts a number up the first time it scrolls into view (600 ms). Reduced motion: shows the value. */
export function CountUp({ value, format, className }: { value: number | null | undefined; format: (n: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const reduce = useReducedMotion()
  const target = Number(value) || 0
  const [shown, setShown] = useState(reduce ? target : 0)

  useEffect(() => {
    if (!inView) return undefined
    if (reduce) {
      setShown(target)
      return undefined
    }
    const controls = animate(0, target, { duration: 0.6, ease: ease.out, onUpdate: setShown })
    return () => controls.stop()
  }, [inView, reduce, target])

  if (value == null) return <span className={className}>{format(NaN)}</span>
  return <span ref={ref} className={`num ${className ?? ''}`}>{format(shown)}</span>
}

/** Masked reveal: each word rises out of its own clipped box. Use on page titles (h1). */
export function MaskedText({ text, as = 'span', className = '', delay = 0 }: { text: string; as?: ElementType; className?: string; delay?: number }) {
  const reduce = useReducedMotion()
  const Component = as
  const words = String(text).split(' ')
  if (reduce) return <Component className={className}>{text}</Component>
  return (
    <Component className={className} aria-label={text}>
      {words.map((word, index) => (
        <span key={`${word}-${index}`} aria-hidden className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <motion.span
            className="inline-block"
            initial={{ y: '110%' }}
            animate={{ y: 0 }}
            transition={{ duration: duration.reveal, ease: ease.out, delay: delay + index * 0.06 }}
          >
            {word}
            {index < words.length - 1 ? ' ' : ''}
          </motion.span>
        </span>
      ))}
    </Component>
  )
}
