// The lake behind the login: a low-res dithered pond (Bayer 4x4) painted on a canvas 2D,
// ported from the public showcase (see _kit/ref/pond-ref.ts). Time-driven only: no scroll
// mapping here. Colors come from tokens.css through CSS vars, never from literals.
import { useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'

type Rgb = [number, number, number]

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
]

function hash(x: number, y: number): number {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
  return value - Math.floor(value)
}

function noise(x: number, y: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi
  const u = xf * xf * (3 - 2 * xf)
  const v = yf * yf * (3 - 2 * yf)
  const a = hash(xi, yi)
  const b = hash(xi + 1, yi)
  const c = hash(xi, yi + 1)
  const d = hash(xi + 1, yi + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

/** Resolve a token to rgb numbers through the browser, so colors stay in tokens.css. */
function readColor(name: string): Rgb {
  const probe = document.createElement('span')
  probe.style.position = 'absolute'
  probe.style.opacity = '0'
  probe.style.pointerEvents = 'none'
  probe.style.color = `var(${name})`
  document.documentElement.appendChild(probe)
  const value = getComputedStyle(probe).color
  probe.remove()
  const parts = value.match(/[\d.]+/g)
  if (!parts || parts.length < 3) return [0, 0, 0]
  return [Number(parts[0]), Number(parts[1]), Number(parts[2])]
}

const COLS = 240
const ROWS = 140
const BLOCK = 1
const WATERLINE = 0.6
const AMPLITUDE = 16
const FPS = 30

function createPond(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas 2D no disponible')

  canvas.width = COLS
  canvas.height = ROWS
  context.imageSmoothingEnabled = false

  // Sky above the surface, the deep ink, and the glint on the waterline.
  const paper = readColor('--color-liquid-abyss')
  const ink = readColor('--color-liquid-kelp')
  const highlight = readColor('--color-aurora')

  const image = context.createImageData(COLS, ROWS)
  const pixels = image.data
  const frameInterval = 1000 / FPS

  let raf = 0
  let last = 0
  let running = false

  const paint = (time: number) => {
    const t = time * 0.0006 // slow roll: the surface barely moves
    const amplitude = AMPLITUDE * (ROWS / 150)
    const waterline = WATERLINE * ROWS

    const waveAt = (x: number) =>
      Math.sin(x * 0.055 + t * 0.9) * 0.55 + Math.sin(x * 0.017 - t * 0.45) * 0.45

    const put = (x: number, y: number, color: Rgb) => {
      const offset = (y * COLS + x) * 4
      pixels[offset] = color[0]
      pixels[offset + 1] = color[1]
      pixels[offset + 2] = color[2]
      pixels[offset + 3] = 255
    }

    for (let y = 0; y < ROWS; y++) {
      const gy = Math.floor(y / BLOCK)
      const sy = gy * BLOCK + BLOCK / 2
      for (let x = 0; x < COLS; x++) {
        const gx = Math.floor(x / BLOCK)
        const sx = gx * BLOCK + BLOCK / 2
        const wave = waveAt(sx) + Math.sin(sy * 0.03 + t * 0.3) * 0.12
        const surface = waterline + wave * amplitude
        let color: Rgb = paper

        if (sy >= surface) {
          const depth = (sy - surface) / ROWS
          const grain = noise(sx * 0.06 + t * 0.08, sy * 0.09)
          const height = Math.min(1, 0.26 + depth * 1.35 + (grain - 0.5) * 0.45)
          const threshold = (BAYER[gy & 3][gx & 3] + 0.5) / 16
          color = height > threshold ? ink : paper
        }

        put(x, y, color)
      }
    }

    for (let x = 0; x < COLS; x++) {
      const wave = waveAt(x) + Math.sin(waterline * 0.03 + t * 0.3) * 0.12
      const y = Math.round(waterline + wave * amplitude)
      if (y >= 0 && y < ROWS) put(x, y, highlight)
    }

    context.putImageData(image, 0, 0)
  }

  const frame = (now: number) => {
    if (!running) return
    raf = requestAnimationFrame(frame)
    if (now - last < frameInterval) return
    last = now
    paint(now)
  }

  return {
    start() {
      if (running) return
      running = true
      last = 0
      raf = requestAnimationFrame(frame)
    },
    stop() {
      running = false
      cancelAnimationFrame(raf)
    },
    render(time = 0) {
      paint(time)
    },
  }
}

export function Pond({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const reduce = useReducedMotion()

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return undefined

    const pond = createPond(canvas)

    // Reduced motion: one static frame, never a loop.
    if (reduce) {
      pond.render(18000)
      return () => pond.stop()
    }

    let inView = false
    const sync = () => {
      if (inView && !document.hidden) pond.start()
      else pond.stop()
    }

    const observer = new IntersectionObserver(
      (entries) => {
        inView = entries.some((entry) => entry.isIntersecting)
        sync()
      },
      { threshold: 0 },
    )
    observer.observe(canvas)
    document.addEventListener('visibilitychange', sync)

    return () => {
      observer.disconnect()
      document.removeEventListener('visibilitychange', sync)
      pond.stop()
    }
  }, [reduce])

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      style={{ imageRendering: 'pixelated' }}
    />
  )
}
