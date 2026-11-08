# La Cocha panel: design system

## 0. Visual v5: Monopo layer (2026-11-08): user-directed, on top of v4

Reference: Monopo Saigon (Refero style `3e52dd36`). Monochrome discipline, 75px pill
buttons/tags ONLY (cards/inputs/sheets keep work-tool radii), one iridescent wash
(`--gradient-iridescent`, media only) behind the Entrar card + pond, patient
`--ease-patient cubic-bezier(0.19,1,0.22,1)` glides (`--dur-patient` 1100ms, framer
`ease.patient`/`duration.patient`), ghost pill Button variants (`ghost`/`ghost-light`),
sidebar active pill now full pill, orbit badge on Entrar (hidden <md, off under
reduced motion). Status solids, chart series, radii of data surfaces unchanged.

## 0. Visual v4: Midnight (2026-11-08): SUPERSEDES v3 where they conflict

User-directed, kills the green: blue-black stack `#050B18` field → `#030711` recessed → `#0B1526` raised (`#12203A` surface-2). Ice-white text (platinum headings, `#C3D0E5` body, `#EAF2FF` emphasis). Bright accents: electric blue `#1E6BFF`, ice cyan `#38E1FF` (CTA gradient origin, series-1, live dot), aurora CTA now ice→white→violet with `#0A1A33` label, stats in ice `#9BE7FF`, fish coral `#FF8A6B`, series violet/amber kept bright. Status solids brightened for the blue canvas (ok `#1A9E5C`, advertencia `#FFB02E`, critico `#FF5A5A`, info `#6EA8E8`). Everything else in v3 (radii, type, motion, icon map, layout) unchanged.

**v4c hero ASCII (same day, user-directed):** Inicio hero photo (stock) replaced by React Bits `GradientASCII` (`src/components/GradientASCII.tsx`, TSX port, no deps) in midnight ramp `#1E6BFF → #EAF2FF → #7DD7FF → #38E1FF`, horizon, slow drift, no mouse/click effects (Operate restraint). Pond orb stays on Entrar as the signature. Vendor exception: upstream fallback hexes live in the component file (SPEC hex rule), but every app use passes token colors via props.

## 0. Visual v3: Auros (2026-11-08): SUPERSEDED by v4 (teal removed per user request)

Abyssal terminal, dark. Surfaces abyss `#012624` → deep `#011d1c` → kelp `#003734`; no shadows, depth from the stack. Text platinum headings, silver-mist `#bbc7c6` body, mist `#edfffe` emphasis. DM Sans 400/500 only. Uppercase tracked `.eyebrow` labels; display tight `-0.04em` lh 1.0, body 16/1.4. Radii 16 cards / 6 small+buttons. Lavender `#fde9ff` only big stats (`.stat-value`); aurora gradient (`.btn-aurora`, dark `#222` label) only primary buttons. Status solids retuned for dark (icon+word, contrast ≥4.5). Charts bright series via tokens. Ghost nav uppercase 12px. Behavior, motion presets, copy, routing unchanged.


Read with `SPEC.md` (what each screen does) and `src/styles/tokens.css` (every value). This file
says how the values combine. A value that is not a token: stop and ask, never inline it.


## 0. Visual v2 (2026-11-07): SUPERSEDES §2, §3 sizes and §6 looks where they conflict

The v1 panel read as 2001: near-monochrome, no icons, flat hairline boxes. v2 commits to color,
icons and depth at CotizaIA's level, in the lake's world. Tokens: `src/styles/tokens.css` (v2 block).

**Palette roles**
- Ink sections `bg-nav` (#08201F): sidebar AND a hero band at the top of Inicio. Text white, muted `text-on-nav-muted`.
- Accent FILL `bg-cta` aquamarine (#5CE1C6) with `text-on-cta`: primary buttons, the active nav pill, selected
  filter chip, selected rows (`bg-accent-soft`). Never as text on light.
- Brand `text-brand` (#0B3B38): links, icon accents, section icons on light.
- Fish `text-fish` coral (#E0644B): everything about batches/fish (lote icon, lote chips, chart slot 2).
- Surfaces: `bg-field` app background, `bg-surface` white cards with `shadow-sm`, hover `shadow-lift`,
  `bg-surface-2` for table headers and secondary buttons. Radius `rounded-lg` cards, `rounded-sm` controls.
- Status = SOLID fills (`bg-critico text-critico-fg`, `bg-advertencia text-advertencia-fg`, `bg-ok text-ok-fg`,
  `bg-info`), with `-tint` only for whole-row backgrounds. Icon + word, always.
- Charts: `--series-1..5` in that order (validated). Water = series-1 teal, fish = series-2 coral.

**Icons: lucide-react, strokeWidth 1.5, size 16 (inline) / 20 (nav, card headers).** Map, use exactly:
Inicio `LayoutDashboard`, Alertas `BellRing`, Dispositivos `Smartphone`, Parámetros `SlidersHorizontal`,
Usuarios `Users`, Salir `LogOut`, estanque `Waves`, lote `Fish`, temperatura `Thermometer`, pH `FlaskConical`,
oxígeno `Wind`, biomasa `Scale`, supervivencia `HeartPulse`, días `CalendarDays`, densidad `Boxes`,
ración `Wheat`, FCA `Repeat`, crítico `TriangleAlert`, advertencia `CircleAlert`, bien `CircleCheck`,
hallazgo IA `Sparkles` is BANNED (AI tell) → `ScanSearch`, sincronización `RefreshCw`, sin señal `WifiOff`,
CSV `Download`, editar `Pencil`, nuevo `Plus`, atender `Check`, en vivo `Radio`, menú `Menu`, cerrar `X`.

**Shell**
- Sidebar (ink): wordmark with a `Waves` mark in an aquamarine square, nav items icon + label, active item =
  aquamarine pill (layoutId) with dark label/icon; Alertas count as a solid critico pill when > 0;
  bottom: user avatar (initials in a rounded square, `bg-nav-raised`) + name + rol + Salir icon button.
- Topbar (sticky, 56px, `bg-field/80` + backdrop-blur, hairline bottom): page breadcrumb, a live
  indicator ("En vivo" with a pulsing aquamarine dot when the SSE stream is connected, "Sin conexión" gray when not),
  bell icon with the pending count, on mobile the menu button.

**Inicio**
- Hero band (ink, rounded-lg, full content width): greeting "Buenos días, {nombre}" + date in Bogotá,
  then 4 KPI tiles on the ink: Estanques activos, Lotes activos, Para atender (critico pill if > 0),
  Biomasa total kg. Each tile: icon, label (muted on ink), CountUp value in white `text-stat`, and a
  sparkline (last 24 h temperature avg across ponds, or batch biomass) in aquamarine.
- "Para atender": rows with a solid status chip, pond/batch chip, message, relative time, Atender button.
- Pond cards: header with `Waves` icon in a tinted square + name + type chip; a 4px status bar on top colored by the
  worst variable state; the three RangeBars with their icons; a 24 h temperature sparkline; footer "hace N h".
- Lotes activos: cards (not rows): `Fish` icon in coral tint, código, estanque, días, supervivencia as a
  progress bar, biomasa.

**Other pages**: page header = icon in tinted square + MaskedText h1 + context line + actions. Tables: `bg-surface-2`
header, row hover `bg-surface-2`, status as solid chips, icons on key columns. Lote: KPI tiles like Inicio but on
white cards with icon squares. Entrar: keep the pond; card gets `shadow-overlay`, Waves mark above the title,
aquamarine primary button.

## 1. Direction

- **Product.** The daily work panel for a trout farm at Laguna de La Cocha: what needs attention
  today, how each pond's water is, how each batch is growing.
- **Register: product, alive.** A tool read every day, sometimes on a phone at the pond. Clear and
  consistent first, and it moves like a finished product (CotizaIA level): motion explains every
  state change, and the login is the one place it performs. No scroll-jacking, no decoration.
- **Character.** Cold, exact, quiet. The same lake world as the public showcase (dark lake
  sidebar, mist field, trout accent), turned down to working volume.
- **The one rule.** Attention first: anything pending (alerts, findings, stale devices) is the
  first thing on the screen that holds it, worded as what to do, with its status icon and word.
- **Generic default this is NOT:** a SaaS admin template (purple sidebar, 4 KPI cards with
  sparkline and "+12%" badge, rounded-2xl cards with soft grey shadows, emoji icons).

## 2. Color roles

| Role | Token | Use |
|---|---|---|
| App field | `--color-field` niebla | Page background behind cards |
| Surface | `--color-surface` papel | Cards, tables, chart areas, inputs |
| Ink / muted | `--color-ink` / `--color-ink-muted` | All text. Muted for labels, units, meta (8.9:1) |
| Hairline | `--color-hairline` orilla | Card borders, table row dividers, input borders |
| Sidebar | `--color-nav` + `--color-on-nav` (+ `-muted`) | Left nav (desktop), top bar (mobile) |
| Accent | `--color-cta` trucha + `--color-on-cta` | ONE primary action per view (Guardar, Entrar, Atender en un detalle). Never text, never a badge |
| Status | `--status-ok/advertencia/critico` (+ `-tint`) | Alert level, value-vs-range state, device freshness. Always icon + word + color, never color alone |
| Charts | `--series-1` (+ `--series-2` rarely), `--chart-*` | See §5 |

Secondary buttons: surface fill, 1px hairline border, ink label. Destructive (dar de baja,
cerrar lote): ink label + confirm step; the critico color is for state, not for buttons.

## 3. Type

Shipped rule (2026-11-08, v5 Cobalt). Fonts load from Google Fonts in `index.html` (DM Sans
300/400/500, IBM Plex Mono 400/500); every size is a token in `src/styles/tokens.css`.

- **Big figures** (`.stat-value`, `--text-stat`): DM Sans **300**, tabular (`tabular-nums
  lining-nums`), tracking `-0.04em`. Never mono: the mono comma sits in its own advance and opens
  a gap ("104 ,6"). The unit is 0.4em of the figure, IBM Plex Mono, muted, on the same line; the
  figure + unit are one `nowrap` pair and the figure scales with the column it sits in
  (`.stat-pair` size container, `min(--text-stat, 36cqw)`), so a 4-digit reading never pushes
  "kg" / "peces" onto a second line at 320-375px.
- **IBM Plex Mono only for small readings**: axis ticks (`.chart-tick`), chart tooltips, table
  numbers, units (`.unit`), timestamps, section index numerals (`.section-head-index`). Never for
  headings, body copy or the big figures.
- **Labels** (`.label`): sentence case, 14px (`--text-label`), weight 500, normal tracking, muted.
  Never uppercase-tracked eyebrows.
- **Captions** (`--text-caption`): 13px, muted: chart subtitles, meta lines, helper text.
- **Headings**: `h1` `--text-title` DM Sans 500, tracking `-0.025em`; `h2/h3` `--text-subheading`
  DM Sans 500. Editorial section heads are DM Sans 300 at `--text-display-section` /
  `--text-display-hero` (§10).
- **Buttons**: 48px tall (`--button-height`), pill radius `--radius-buttons` (75px), 14px label
  (`--text-ui`).
- **Body**: 16px (`--text-body`), line-height 1.4, DM Sans 400.
- **Palette v5 Cobalt**: black `#02040b`, cobalt `#0b2a8f`, electric `#2f6bff`, ice `#e8f0ff`.
  The wash and the shaders run black -> cobalt -> electric -> ice. No warm hue anywhere outside
  the warning and critical status solids (`--status-advertencia`, `--status-critico`).
- Sentence case everywhere. No uppercase tracked eyebrows, no mono headings, no second sans.

## 4. Layout

- Desktop ≥1024: fixed left sidebar `--sidebar-width` (lago-hondo): wordmark "La Cocha", nav
  (Inicio, Estanques via Inicio, Alertas with pending count, Dispositivos, Parámetros, Usuarios
  for productor), user + Salir at the bottom. Content max `--content-max`, padding `--gutter`.
- <1024: top bar (wordmark, Alertas count, menu button) + nav in a sheet. 375px: one column, no
  horizontal page scroll; tables scroll inside their own container.
- Page header: `h1` + one line of context (e.g. pond type and volume) + the view's actions right.
- Cards: surface, 1px hairline, `--radius`, padding `--space-5`. No shadows anywhere. Group with
  space (`--space-6` between cards) before adding borders.
- Inicio order: (1) "Para atender" list (alerts + findings, newest first, max 5 + "Ver todas"),
  (2) Estanques: one card per pond with last temp / pH / O2 as RangeBars + "hace 3 h",
  (3) Lotes activos: compact rows (código, estanque, días, supervivencia %, biomasa kg).

```
┌──────────┬───────────────────────────────────────────────────────────┐
│ La Cocha │ Inicio                                     [Nuevo estanque]│
│          │ Finca · 3 estanques · 2 lotes activos                      │
│ Inicio   │ ┌ Para atender (2) ───────────────────────────────────────┐ │
│ Alertas 2│ │ ▲ Crítico  Demo Tanque 2 · Oxígeno 4.6 mg/L  hace 2 h [Atender]│
│ Disposit.│ │ ● Advert.  L-2026-01 · El oxígeno viene bajando  ayer  [Atender]│
│ Paráme.  │ └─────────────────────────────────────────────────────────┘ │
│ Usuarios │ ┌ Demo Tanque 1 ─────┐ ┌ Demo Tanque 2 ─────┐ ┌ Jaula ─────┐ │
│          │ │ Temp 14.2 °C ▕▬▬●▬▏│ │ ...                │ │ ...        │ │
│ ──────── │ │ pH   7.05    ▕▬●▬▬▏│ │                    │ │            │ │
│ Ana · Salir│ hace 3 h · tanque 18 m³│                    │ │            │ │
└──────────┴───────────────────────────────────────────────────────────┘
```

## 5. Charts (from the dataviz method; validated palette)

- One measure per chart, one y-axis, never dual axis. Temp, pH and O2 are three stacked charts
  sharing the x range (small multiples), not one chart.
- Line 2px `--series-1`; no dots except on hover (crosshair + tooltip with value, unit, Bogotá time).
- Optimal range: a filled band `--chart-band-optimo` between `optimo_min/max` from `/api/parametros`.
  Critical limits: 1px dashed `--chart-line-critico` lines, labeled at the right edge
  ("crítico 18 °C"). O2 has no max: band and line only below.
- Daily min/avg/max: avg line + min–max band in `--series-1` at 18% (color-mix), not three lines.
- Weight curve: biometrías as points + line; projection continues as a dashed line in the same hue
  to `fecha_objetivo`, labeled "proyección".
- Mortality / feeding per day: bars `--series-1`, 2px gap between bars, 4px rounded top only.
- Grid: horizontal only, `--chart-grid`; axes text `--text-caption` `--chart-axis`. A single-series
  chart has no legend box: the title names it. Every chart has a "Ver tabla" toggle (the data as a table).
- Empty chart: keep the frame and axes, centered sentence in muted ink saying what fills it.

## 6. Components (build once in `src/components/ui/`, reuse everywhere)

- **Button**: primary (cta), secondary (surface + hairline), quiet (text). Height
  `--button-height`, min width 44px, press `scale(var(--press-scale))` `--dur-feedback`.
  Loading: label stays, a small spinner replaces nothing (width must not jump).
- **StatusBadge**: icon + word (`Crítico`, `Advertencia`, `Bien`) on the matching `-tint`,
  text in ink, icon in the status color, `--radius-pill`. Icons: inline SVG set of 3, no emoji.
- **RangeBar**: a value against its optimal and critical range: thin track, optimal segment in
  ok tint, marker dot colored by status, value + unit on the left. The core visual of Inicio.
- **Stat**: label (caption muted) over number (`--text-stat`, `.num`) + unit.
- **DataTable**: surface, hairline row dividers, caption headers, numbers right-aligned `.num`,
  sticky header, horizontal scroll in its own container on mobile, empty row sentence.
- **States**: Skeleton (blocks in `--color-hairline` matching the real layout, no shimmer
  animation), EmptyState (one sentence what fills it + optional action), ErrorState (server
  `detalle` + Reintentar). "Despertando el servidor…" after 5 s of loading.
- **Toast** (live findings via SSE): bottom-right desktop, top on mobile, auto-hide 6 s, pauses on hover.
- **ConfirmDialog**: native `<dialog>`, focus trapped, Esc closes.
- **Form fields**: label above, 16px input, hairline border, focus ring ink, error text under the
  field in ink with a critico icon (the server `detalle` mapped to the field when it names it).

## 7. Motion (2026-11-07: replaces "feedback only"; same system as CotizaIA)

Primitives: `src/motion/Motion.tsx` (FadeUp, StaggerItem, CountUp, MaskedText) and presets
`src/motion/presets.ts` (ease, duration, viewTransition, overlay, reducedFade, staggerDelay). CSS side:
`--ease-out/fluid/in`, `--dur-micro/state/panel/reveal` in tokens.css, `.shimmer` in index.css.
Use those, never a new curve or duration. framer-motion for React motion; CSS transitions for hovers.

| Kind | Duration | Example |
|---|---|---|
| micro | 120 ms | button press scale .97, hover tint, checkbox |
| state | 220 ms | sidebar active pill, tabs indicator, filter chips, badge color, row exit |
| panel | 420 ms | route change, dialog, mobile sheet, toast |
| reveal | 640 ms | h1 mask reveal, chart line draw, RangeBar marker slide |

Where motion lives:
1. **Route change**: `AnimatePresence mode="wait"` keyed by pathname around the outlet, `viewTransition`.
2. **Sidebar**: the active item has a background pill that slides between items (shared `layoutId`);
   mobile nav is a sheet sliding from the left with a fading scrim; Alertas count pops (scale 1.15 → 1) when it changes.
3. **Page titles**: every `h1` uses `MaskedText` (words rise out of a mask).
4. **Lists and tables**: first render staggers (`StaggerItem`, 50 ms, max 8); an attended alert leaves
   with `rowExit` while the rest close the gap (`layout`), inside `AnimatePresence`.
5. **Numbers**: Stat values and Inicio batch numbers `CountUp` on first view.
6. **Charts**: lines draw on mount (`isAnimationActive`, `animationDuration` 640, ease-out), bars grow
   from the baseline, the optimal band fades in first. Range switch (24 h / 7 d / 30 d) has a sliding indicator.
7. **RangeBar**: the marker slides from the left edge to its value (reveal) and the badge fades in after.
8. **Overlays**: dialogs and toasts use `overlay` (scale .98 → 1 + fade); toasts stack and slide.
9. **Skeleton**: shimmer sweep (`.shimmer`).
10. **Entrar (the signature)**: the lake's dithered pond surface rolls slowly behind the login card
    (canvas 2D, Bayer 4×4, two lake colors), title in MaskedText, card rises in. Paused off-screen and
    when the tab is hidden. This is the one place motion performs; everywhere else it explains state.
11. **Links**: underline draws in from the left on hover and leaves to the right (CSS, `--dur-state`).

Allowed properties: transform, opacity, clip-path. Never width/height/top/left (use `layout`).
Reduced motion (`useReducedMotion` + media query): opacity-only at 120 ms, no count-up, no stagger,
no line draw, static pond frame. Every motion must have its reduced path.

## 8. Copy (Colombian neutral Spanish, no em dashes)

- Action labels as verbs: "Atender", "Guardar cambios", "Dar de baja", "Descargar CSV".
- Times: relative ("hace 3 h") with the absolute Bogotá time in `title`.
- Empty: "Aún no llegan lecturas de este estanque. Llegan cuando el celular sincroniza."
- Never invent numbers: in mock mode values come from the seed fixtures.

## 9. Acceptance

Per SPEC.md §Acceptance, plus: no raw hex / px font sizes / cubic-bezier outside `tokens.css`
(`grep -rnE '#[0-9a-fA-F]{3,6}\b|cubic-bezier' src --include='*.tsx' --include='*.ts'` empty),
status always icon + word, one cta-filled button per view.

## 10. Editorial scroll layer (2026-11-08, user-directed Brief B)

Monopo Saigon direction applied to the panel: `src/motion/scroll.tsx` owns Lenis (lerp 0.09) synced
to GSAP ScrollTrigger (`gsap.ticker` drives `lenis.raf`, Lenis scroll calls `ScrollTrigger.update`,
refresh on route change and after fonts/load settle), plus `useReveal`, `useParallax`, `useScrub`
and `useBatchReveal`. Curves and durations are read from `tokens.css` (`--ease-patient`,
`--dur-reveal`, `--dur-panel`), never re-declared in JS.

New tokens: `--text-display-hero`, `--text-display-section`, `--text-numeral` (11px),
`--weight-display-light` (300), `--leading-editorial`, `--tracking-editorial`, `--tracking-numeral`.
`src/components/SectionHead.tsx` renders the index numeral + tracked kicker + masked display lines
on Inicio, Estanque, Lote and Alertas. Why: the pages needed one loud typographic moment; the
numerals are real section order, not decoration.

Inicio: the ponds row pins and slides horizontally on `>= 1024px` only (`useScrub`, travel from the
track width); below 1024px and under reduced motion it is a plain grid. Charts wait for their card
to enter the viewport before mounting, so the line draw is seen. Reduced motion: no Lenis, no scrub,
no hidden lines, no pin; everything renders visible.

Transparency: `body` is transparent and pages keep no opaque fills (cards keep their surfaces); the
hero's ASCII media gets a token scrim (`.hero-band::after`) so the white display type keeps 4.5:1.
`src/app/Layout.tsx` still has an opaque `bg-field` root behind the fixed WebGL canvas; it is the
canvas backdrop, not a content wrapper, and needs no change while the canvas is fixed at z-index 0.

