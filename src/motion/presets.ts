// Motion tokens for framer-motion (seconds). Mirrors the CSS tokens in styles/tokens.css and the
// CotizaIA system: one exponential ease-out family, no bounce, exits at 60% of the enter.
export const ease = {
  out: [0.22, 1, 0.36, 1] as const,
  fluid: [0.32, 0.72, 0, 1] as const,
  /** Monopo glides: wash loops, login entrances, badge orbits. */
  patient: [0.19, 1, 0.22, 1] as const,
  in: [0.64, 0, 0.78, 0] as const,
}

export const duration = { micro: 0.12, state: 0.22, panel: 0.42, reveal: 0.64, patient: 1.1 } as const

export const STAGGER_STEP = 0.05
export const STAGGER_MAX_ITEMS = 8

/** Items past STAGGER_MAX_ITEMS share the last delay, so long lists never crawl in. */
export function staggerDelay(index: number): number {
  return Math.min(index, STAGGER_MAX_ITEMS) * STAGGER_STEP
}

/** Route change: cross-fade + rise. Keyed by pathname inside AnimatePresence mode="wait". */
export const viewTransition = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: duration.panel, ease: ease.out } },
  exit: { opacity: 0, y: -6, transition: { duration: duration.panel * 0.6, ease: ease.in } },
}

/** Dialogs, sheets, toasts. */
export const overlay = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1, transition: { duration: duration.panel, ease: ease.fluid } },
  exit: { opacity: 0, scale: 0.98, transition: { duration: duration.panel * 0.6, ease: ease.in } },
}

/** Reduced motion keeps the state change visible with opacity only. */
export const reducedFade = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: duration.micro } },
  exit: { opacity: 0, transition: { duration: duration.micro } },
}

/** Row that leaves a list (attended alert): collapses height via layout, fades and slides right. */
export const rowExit = {
  opacity: 0,
  x: 24,
  transition: { duration: duration.state, ease: ease.in },
}
