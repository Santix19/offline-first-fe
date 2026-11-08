// Editorial section head: index numeral + tracked kicker over a huge light display line,
// split by line and revealed through a mask when it enters the viewport. All sizes,
// weights and timings come from tokens.css; the reveal itself lives in motion/scroll.
import type { ReactNode } from 'react'
import { useReveal } from '../motion/scroll'

export interface SectionHeadProps {
  /** Sequence numeral: "01", "02"... shown in the 11px tracked label row. */
  index?: string
  kicker?: string
  title: string
  /** Explicit line breaks; when omitted, long titles split into balanced lines. */
  lines?: string[]
  description?: ReactNode
  /** h1 on page heroes, h2 inside a page. Defaults to h2. */
  as?: 'h1' | 'h2'
  /** hero uses the larger display step. Defaults to section. */
  size?: 'hero' | 'section'
  className?: string
}

function balancedLines(title: string): string[] {
  const clean = title.trim().replace(/\s+/g, ' ')
  const words = clean.split(' ')
  if (words.length < 3 || clean.length <= 22) return [clean]
  let cut = 1
  let bestDiff = Number.POSITIVE_INFINITY
  for (let i = 1; i < words.length; i += 1) {
    const first = words.slice(0, i).join(' ').length
    const diff = Math.abs(clean.length - first * 2)
    if (diff < bestDiff) {
      bestDiff = diff
      cut = i
    }
  }
  return [words.slice(0, cut).join(' '), words.slice(cut).join(' ')]
}

export function SectionHead({
  index,
  kicker,
  title,
  lines,
  description,
  as: Tag = 'h2',
  size = 'section',
  className = '',
}: SectionHeadProps) {
  const ref = useReveal<HTMLDivElement>()
  const rows = lines && lines.length > 0 ? lines : balancedLines(title)

  return (
    <div
      ref={ref}
      className={`section-head ${size === 'hero' ? 'section-head-hero' : ''} ${className}`.trim()}
    >
      {index || kicker ? (
        <div className="section-head-meta">
          {index ? (
            <span className="section-head-index" aria-hidden="true">
              {index}
            </span>
          ) : null}
          {kicker ? <span className="section-head-kicker">{kicker}</span> : null}
          <span className="section-head-rule" aria-hidden="true" />
        </div>
      ) : null}
      <Tag className="section-head-title" aria-label={title}>
        {rows.map((row, index_) => (
          <span key={`${row}-${index_}`} className="section-head-line" aria-hidden="true">
            <span data-reveal-line>{row}</span>
          </span>
        ))}
      </Tag>
      {description ? <p className="section-head-description">{description}</p> : null}
    </div>
  )
}
