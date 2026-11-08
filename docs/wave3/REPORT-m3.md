# REPORT m3: charts, pond and batch detail, forms

## Verification

- `npx -y pnpm@10 build` passes (tsc -b + vite build), 961 modules.
- `grep -rnE '#[0-9a-fA-F]{3,6}\b|cubic-bezier|rgb\(' src --include='*.tsx' --include='*.ts'` is empty.
- Ran the panel in mock mode (`VITE_MOCK=1`) in headless Chromium: Estanque on 7 d and 30 d, the
  "Ver tabla" toggle, the form validation error, Lote, and a `prefers-reduced-motion` pass. No page
  errors. Screenshots checked for the band, the drawn lines, the range pill and the error position.

## DESIGN.md §7 items

| §7 | What | Where |
|---|---|---|
| 6 | Lines draw on mount: 640 ms (`duration.reveal`), `ease-out` | `src/components/charts/chartMotion.tsx:9,38-48`, `TimeSeriesChart.tsx:151-152`, `DailyRangeChart.tsx:123-133`, `GrowthChart.tsx:120-132` |
| 6 | Optimal band fades in first (220 ms), before the line starts (line `animationBegin` 120) | `chartMotion.tsx:53-73` (ReferenceArea renders through `shape`), used at `TimeSeriesChart.tsx:135` |
| 6 | Bars grow from the baseline | `DailyBars.tsx:117-118` |
| 6 | Daily min-avg-max: band draws, then the average line | `DailyRangeChart.tsx:123-124` (area), `:132-133` (line) |
| 6 | Growth projection dashed line draws after the measured line (`animationBegin` 360) | `GrowthChart.tsx:120-132` |
| 6 | "Ver tabla" crossfades chart <-> table (`AnimatePresence` + state) | `chartMotion.tsx:19-36`, `TimeSeriesChart.tsx:84-103`, `DailyBars.tsx:70-89`, `GrowthChart.tsx:63-87`, `DailyRangeChart.tsx:59-90` |
| 6 | Range switch (24 h / 7 d / 30 d) sliding indicator, shared `layoutId` | `src/pages/Estanque.tsx:236-263`, indicator `:249-254` |
| 3 | Page titles in `MaskedText` | `Estanque.tsx:187,198,207,219`; `Lote.tsx:192,203,212,225` |
| 4 | Findings and batches lists stagger (`StaggerItem`, capped in the primitive) | `Estanque.tsx:418-430`, `:459-469` |
| 5 | Lote Resumen numbers count up | `Lote.tsx:43-66` (`ResumenStat`), usages `:263-304` |
| reveal | Section blocks fade up (`FadeUp`, increasing delays 0 / .06 / .12 / .18 / .24) | `Estanque.tsx:233,321,341,402,438`; `Lote.tsx:251,318,341,365,388,422,464,501` |

Reduced motion, all of it: `chartMotion.tsx` disables the recharts draw and renders the band as a
static rect; the chart/table swap becomes opacity 120 ms; the range pill moves with duration 0
(`Estanque.tsx:253`); `FadeUp`, `StaggerItem`, `CountUp` and `MaskedText` already carry their own
reduced paths. Verified with `reducedMotion: "reduce"`.

## Brief item 4 (forms)

- Field error messages slide down 4 px and fade in/out (state, 220 ms; reduced: opacity 120 ms):
  `PondForm.tsx:15-48` and `BatchForm.tsx:15-48`, used at `PondForm.tsx:174,187,201` and
  `BatchForm.tsx:224,239,253,270,287`. `Field`/`Select` render their own error text, so the forms
  pass `aria-invalid` / `aria-describedby` through to them and render the animated message next to
  the control; the error copy and markup are unchanged.
- Submit button uses the `loading` prop (Button is another agent's): `PondForm.tsx:208`,
  `BatchForm.tsx:294`.
- Success already closes the dialog through the parent's `onDone`; no behavior changed.

## Not done, or needs a file I do not own

- **DataTable rows stagger** (Lote history tables): `src/components/ui/DataTable.tsx` is owned by m2.
  Lote passes its data unchanged; the tbody needs `StaggerItem as="tr"` (max 8). Not implemented here.
- **Stat with CountUp**: `src/components/ui/Stat.tsx` is owned by m2. To hit "Resumen numbers via
  CountUp" now, `Lote.tsx` has a local `ResumenStat` that mirrors Stat's markup exactly. If Stat gains
  a numeric value + CountUp, delete `ResumenStat` and use Stat.
- **Dialog panel animation**: the `<dialog>` elements in Estanque/Lote are plain containers
  (`Estanque.tsx:476-504`, `Lote.tsx:556-570`). The overlay preset on the panel/backdrop is m1's
  (ConfirmDialog/Toast); the pond and batch dialogs still open without it until a shared dialog exists.
- **Field/Select error animation**: the animation currently lives in each form because Field renders
  its own error text. Once Field owns an `AnimatePresence` error, remove the local `FieldError`.
- **Per-bar stagger**: recharts 3 animates a single `Bar` series as a whole, so `animationBegin` (120 ms)
  offsets the series rather than each bar. Per-day stagger would need one series per day (wrong data
  shape) or a custom bar renderer; not worth the behavior risk.
- **Range switch markup**: it was three `Button variant="secondary"` elements; a sliding pill needs a
  transparent segment behind the label, so it is now a plain-button segmented control with the same
  group/`aria-pressed` behavior and the same height. Visual change is limited to the active pill.
- **Pre-existing console warning** (not from motion): the mock fixtures have a duplicated
  `2026-11-04T15:00:00Z` reading, so the TimeSeriesChart table gets a duplicate `keyOf` value
  (`keyOf={(r) => r.t}`). It only warns when "Ver tabla" renders that table.
