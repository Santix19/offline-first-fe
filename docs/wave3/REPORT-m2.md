# REPORT m2 — Motion (DESIGN.md §7 items 3, 4, 5, 7)

Owned files only. No behavior, data, copy or layout changes beyond what motion needs.
No new dependencies. No git.

Prove: `npx -y pnpm@10 build` passes (vite build ok).
`grep -rnE '#[0-9a-fA-F]{3,6}\b|cubic-bezier|rgb\(' src --include='*.tsx' --include='*.ts'`
is empty (only tokens.css holds hex/cubic-bezier, as allowed).

## Item 3 — Page titles + section blocks

- `src/pages/Inicio.tsx:326` — h1 via `MaskedText as="h1"`.
- `src/pages/Alertas.tsx:164` — h1 via `MaskedText as="h1"`.
- `src/pages/Dispositivos.tsx:275` — h1 via `MaskedText as="h1"`.
- `src/pages/Parametros.tsx:111` — h1 via `MaskedText as="h1"`.
- `src/pages/Usuarios.tsx:186,197` — h1 via `MaskedText as="h1"` (both productor and non-productor branches).
- Section blocks `FadeUp` delays 0 / .06 / .12:
  - Inicio: `src/pages/Inicio.tsx:332` (Para atender), `:425` (Estanques), `:464` (Lotes).
  - Alertas: `src/pages/Alertas.tsx:170` (filters), `:221` (list card).
  - Dispositivos: `src/pages/Dispositivos.tsx:282` (Dispositivos), `:330` (Sincronizaciones).
  - Parametros: `src/pages/Parametros.tsx:146` (Rangos), `:157` (Tasas), `:168` (Factores).
  - Usuarios: `src/pages/Usuarios.tsx:203` (Usuarios card).
- All use existing `FadeUp`/`MaskedText` from `src/motion/Motion.tsx`; delays are plain
  numbers, eases/durations come from `src/motion/presets.ts`. Reduced motion handled
  inside the primitives (opacity-only, no stagger).

## Item 4 — Lists and tables

- Inicio "Para atender": `src/pages/Inicio.tsx:358-419` — rows are `StaggerItem as="li"
  layout` inside `<AnimatePresence initial={false}>`; attending removes the row with the
  shared exit (slide right + fade, `rowExit` in `src/motion/Motion.tsx:35`) and the rest
  close the gap via `layout="position"`. Row hover: chevron nudges 4px,
  `src/pages/Inicio.tsx:404-413` (`variants={{ hover: { x: 4 } }}`, `duration.state` /
  `ease.out`, empty object when reduced motion), same pattern as `_kit/ref/AttentionList.jsx`.
- Alertas list: `src/pages/Alertas.tsx:242-314` — same construction (StaggerItem + layout
  + AnimatePresence + hover arrow `src/pages/Alertas.tsx:298-307`). Switching filters
  animates rows out/in through the same AnimatePresence.
- Filter chips sliding indicator: `src/pages/Alertas.tsx:188-189` — active chip renders
  `motion.span layoutId="alertas-filtro-activo"` (absolute inset-0, border + surface),
  `transition duration.state / ease.fluid` (micro when reduced). Label stays in a relative
  span so text does not move. Chips also use `duration-[var(--dur-state)]` token timing.
- DataTable first-render stagger (max 8, capped in `staggerDelay`): 
  `src/components/ui/DataTable.tsx:50-64` — body rows are `StaggerItem as="tr"`.
  Row hover tint is CSS only: `transition-colors duration-[var(--dur-state)] ease-out
  hover:bg-field` on the same line (tokens only, no hex).
- Dispositivos / Usuarios / Parametros tables stagger automatically through DataTable
  (same lines above); no page-level change needed.

## Item 5 — Numbers

- Inicio batch numbers: `src/pages/Inicio.tsx:224` — `LoteRow` renders
  `<CountUp value={dato} format={(n) => formatNumber(n, decimales)} />`; pending shows
  "Cargando", null shows "Sin dato" via `CountUp`/`format.ts`. Reduced motion shows the
  value with no count (inside `CountUp`).
- Stat: `src/components/ui/Stat.tsx:19` — new optional `numericValue?: number | null`
  + `decimals` props render via `CountUp` with `format.ts`; legacy `value: string` path
  is untouched so existing callers keep rendering byte-identical output.
  No owned page passes `numericValue` yet (Inicio batches use `CountUp` directly).

## Item 7 — RangeBar + StatusBadge

- RangeBar marker: `src/components/ui/RangeBar.tsx:79-91` — full-width mover
  `motion.div` animates `x` from `"0%"` to `pct%` (transform only, never `left`;
  final position is a percentage of track width). Mount uses `duration.reveal` /
  `ease.out`; value changes glide through the same `animate`. Reduced motion: initial x
  equals final x, only opacity fades (`duration.micro`).
- Optimal band fades in: `src/components/ui/RangeBar.tsx:68-77` (opacity, reveal).
- Badge fades in after: `src/components/ui/RangeBar.tsx:94-105` (opacity, `duration.state`,
  `delay: duration.state`). Reduced motion: plain 120 ms fade.
- StatusBadge crossfade: `src/components/ui/StatusBadge.tsx:89-107` —
  `<AnimatePresence mode="wait" initial={false}>` keyed `motion.span` on `status`;
  color tint + icon + label crossfade together (`duration.state` / `ease.out`,
  micro when reduced).

## Inline edits + confirm flows (state duration)

- Dispositivos rename form: `src/pages/Dispositivos.tsx:133-142` — `motion.div`
  fade + 4px rise on open (`duration.state` / `ease.out`; fade-only when reduced).
  Validation message: `:163-185`; server `detalle`: `:285-307` (opacity, state).
- Usuarios server `detalle`: `src/pages/Usuarios.tsx:206-228` (opacity, state).
- Clave temporal dialog content (owned file, native dialog kept):
  `src/pages/Usuarios.tsx:328-340` — enter `overlay`-like (opacity + scale 1 vs 0.98,
  `duration.panel` / `ease.fluid`; opacity-only micro when reduced). Exit animation is
  not possible without owning the dialog lifecycle. Copied confirmation:
  `:352-364` (opacity, state).

## Not done / needs a file I do not own

- `src/components/ui/ConfirmDialog.tsx` (Dar de baja / Activar / Desactivar flows in
  Dispositivos + Usuarios): needs the `overlay` enter/exit (scale .98 + fade, panel
  duration) — owned by another module. This session only animated the messages around it.
- `src/components/ui/Stat.tsx` callers in `src/pages/Lote.tsx` (~:237-289) and
  `src/pages/Kit.tsx` (~:195-197) still pass legacy `value: string`, so they render
  without CountUp. Converting them means editing files outside m2 (or those owners
  passing the new `numericValue` prop). Deliberately left untouched.
- DESIGN.md §7 items outside m2 scope, not touched here: 1 route change, 2 sidebar,
  6 charts, 8 overlays (Toast/Dialog owned elsewhere), 9 skeleton shimmer (CSS already
  exists in `src/index.css`), 10 Entrar signature, 11 links (CSS already exists).
