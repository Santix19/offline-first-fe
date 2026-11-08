# REPORT v3: pond and batch detail, charts, forms

Scope: only `src/pages/{Estanque,Lote}.tsx`, `src/pages/forms/{PondForm,BatchForm}.tsx`,
`src/components/charts/**`, `REPORT.md`. No new dependencies, no git.

## What changed per file

### `src/components/charts/ChartCard.tsx` (new)
One chart card: `bg-surface`, `rounded-lg`, `shadow-sm` (hover `shadow-lift`), an icon square with
the header icon at 20 px/stroke 1.5, title + subtitle, and the current value in `text-stat` at the
top right with its `StatusBadge` chip. Optional quiet footer for "Ver tabla". Icon falls back to
`Waves` so the Kit gallery keeps compiling without passing one.

### `src/components/charts/TimeSeriesChart.tsx`
Now renders inside `ChartCard`. New props: `icon`, `current`, `status`, `subtitle`, `rangeCaption`.
Added an area under the line (`var(--chart-fill)`) before the optimal band. `optimoMax` accepts
`null` (oxygen): the band then runs to the top of the plot instead of an invented upper bound.
X ticks are sampled (5) and de-duplicated by label, so seven days of readings no longer print
"1 nov" three times. The inline `crítico` ReferenceLine labels collided with x labels at 375 px, so
the lines stay and the limits moved to a caption under the plot (`rangeCaption`, built from
`/api/parametros`, units included). Draw motion untouched (`useChartMotion`).

### `src/components/charts/DailyRangeChart.tsx`
`ChartCard` + `Thermometer` icon + current daily average at the top right. Min-max band and average
line kept, axis auto-thins (`interval="preserveStartEnd"`, 28 px gap).

### `src/components/charts/GrowthChart.tsx`
`ChartCard` (`Scale` icon), fish series in `--series-2` coral with a 14% coral area under the
measured line, biometry dots, dashed coral projection, last measured weight as the big current
value, projection caption kept. Draw motion untouched.

### `src/components/charts/DailyBars.tsx`
`ChartCard` + icon + last day value. New `series: 'water' | 'fish'` (Lote passes `fish`), bars keep
2 px gap and 4 px top radius, integer ticks for counts, auto-thinned x axis.

### `src/pages/Estanque.tsx`
- Header: `Waves` in an accent-soft square, `MaskedText` h1, type chip, volume, last-reading line
  ("Última lectura hace N", absolute time in `title`). CSV (`Download`) secondary, `Editar`
  (`Pencil`) primary, one aquamarine button per view.
- Segmented control 24 h / 7 d / 30 d: `bg-surface-2` track, aquamarine `bg-cta` pill with
  `layoutId="rango-activo"`, dark `text-on-cta` label, reduced-motion path kept.
- Last-reading `KpiTile` row (tone `surface`) for temperatura/pH/oxígeno with `Thermometer`,
  `FlaskConical`, `Wind`, status from `rangeStatus` against `/api/parametros`, plus a 24-point trend.
- Three water chart cards in series-1 with icon, current value and status; daily temperature card;
  `Panel` cards for forecast and findings (forecast table and AI-off sentence unchanged); findings
  badges unchanged.
- Pond batches as cards: `Fish` in a coral tint square (`bg-fish/10 text-fish`), solid estado chip
  with icon, siembra, peces sembrados, peso inicial, link to the batch.
- Dialogs: centered (`m-auto`), `rounded-lg`, `shadow-overlay`, scrollable at `90dvh`.

### `src/pages/Lote.tsx`
- Header: `Fish` in a coral square, h1, pond link (`.link-draw`), siembra, solid estado chip.
  `Cerrar lote` secondary, `Editar` primary.
- `KpiTile` grid (2 cols at 375, 4 at xl) for días, población, supervivencia, biomasa, densidad,
  ración, FCA with `CalendarDays`, `Users`, `HeartPulse`, `Scale`, `Boxes`, `Wheat`, `Repeat`.
  Summary notes stay under the tiles when present.
- Growth chart in coral with projection; mortality and feeding bars side by side at xl, coral fish
  series, last-day value as the current value.
- Tables (conteos, mortalidades, alimentaciones, biometrías) wrapped in `Panel` cards with icons;
  only data is passed to `DataTable`, no new props.

### `src/pages/forms/PondForm.tsx` and `BatchForm.tsx`
- Dialog header with the icon square (`Waves` / `Fish`), title (Nuevo / Editar) and one line of
  context.
- Two-column grid at `sm` (≥640 px): nombre full width; tipo + volumen, or estanque full width,
  código + fecha, cantidad + peso. Buttons full width on mobile, one primary `Guardar`.
- Server `detalle` banner uses `bg-critico-tint` + `TriangleAlert`; field errors use the lucide
  `TriangleAlert` instead of the hand-drawn SVG. Validation, parsing and mutations unchanged.

## Proof

`npx -y pnpm@10 build`:

```
> panel@0.0.0 build
> tsc -b && vite build
✓ 2514 modules transformed.
dist/index.html                     0.77 kB │ gzip:   0.43 kB
dist/assets/index-DPN2lr4I.css     36.60 kB │ gzip:   8.08 kB
dist/assets/mock-BvlBBGjI.js      360.52 kB │ gzip:  50.64 kB
dist/assets/index-BBAyWI8B.js   1,024.72 kB │ gzip: 299.94 kB
✓ built in 733ms
```

(Only the usual Vite >500 kB chunk warning.)

Raw values check:

```
$ grep -rnE '#[0-9a-fA-F]{3,6}\b|cubic-bezier|rgb\(' src --include='*.tsx' --include='*.ts'
(no output)
```

Mock mode (`.env.local` VITE_MOCK=1) in a local Vite dev server on port 5199, stopped after use:
1440 and 375 screenshots of both pages, the 24 h switch, the growth chart and both dialogs; zero
console errors. `oxlint` reports warnings only, no errors.

## Not done / shared needs

- `src/components/ui/KpiTile.tsx` is still the one-line contract stub in this checkout (it renders
  just the label). My pages pass the full contract (`icon`, `label`, `value`, `format`, `unit`,
  `trend`, `tone="surface"`, `status`); the KPI rows will render as tiles as soon as the ui owner
  ships it. Until then those two rows show labels only.
- `StatusBadge`, `Card`, `DataTable`, `Field`, `Select`, `Button` were still v1 in this checkout.
  Status chips in the chart cards use `StatusBadge` (solid-vs-tint styling is that owner's), and
  Lote/Estanque pass table data without adding props, so the table restyle lands with `DataTable`.
- Growth, mortality and feeding cards show a current value but no status chip: there are no
  optimal/critical ranges for those measures and the panel never invents one.
- `src/pages/Kit.tsx` keeps compiling because `icon` is optional; its gallery previews now show the
  new chart cards.
