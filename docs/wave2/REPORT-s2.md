# REPORT s2: pond and batch detail + chart fixes

## Files changed (owned only)

- `src/components/charts/axis.ts` (new): `niceTicks` (round 1/2/2.5/5/10 steps, integer-only
  mode for count charts), `sampleTicks` (even sampling that drops repeated formatted labels),
  `isHourRange` / `spanHoursOf` (48 h rule for hour vs day x labels).
- `src/components/charts/ChartTooltip.tsx`: values and labels go through `src/lib/format.ts`
  (no ISO strings, no raw numbers). Kept `formatBogota` / `formatBogotaDay` exports so `Kit.tsx`
  still compiles; new chart code uses `format.ts`.
- `src/components/charts/TimeSeriesChart.tsx`: x ticks sampled from the data with
  `formatTime` (rango de 48 h o menos) or `formatDate` (rango mayor); y ticks from `niceTicks`;
  reference band/lines labeled with formatted numbers; tooltip `formatDateTime`; table Hora
  (Bogotá) + Valor con `formatNumber`. New optional props: `rangeHours`, `decimals`.
- `src/components/charts/DailyRangeChart.tsx`: same treatment, day labels via `formatDate`,
  avg line + min-max band kept.
- `src/components/charts/GrowthChart.tsx`: day labels and `formatDate`/`formatNumber`
  everywhere; `fechaObjetivo` is now optional and the projection caption only renders when
  the data actually has a projection.
- `src/components/charts/DailyBars.tsx`: `integerOnly` (mortality) forces integer y ticks
  with `allowDecimals={false}`; y always includes 0; rounded top only and 2 px gap kept.
- `src/pages/Estanque.tsx`: header (nombre, tipo, volumen, Editar primary en `<dialog>` con
  `PondForm`, Descargar CSV secondary via `downloadPondReadingsCsv`), range switch 24 h / 7 d /
  30 d, three stacked TimeSeriesCharts with bands/lines from `/parametros`, `DailyRangeChart`
  from the daily endpoint, forecast block (or the exact IA-off sentence), findings of the pond
  (critica to StatusBadge critico, advertencia to advertencia, informe as plain muted text),
  pond batches with links to `/lotes/:id` and Nuevo lote (secondary) with `BatchForm`.
- `src/pages/Lote.tsx`: header (código, estanque link, siembra date, estado, Cerrar lote
  secondary with `ConfirmDialog` to PATCH estado cerrado + fecha_cierre hoy Bogotá, Editar
  primary en `<dialog>`), stats from `/resumen` (días, población, supervivencia %, biomasa kg,
  densidad kg/m3, ración diaria kg, FCA) + notas list, `GrowthChart` (biometrías + projection
  only when IA is on), `DailyBars` for mortality (integer) and feeding per day, history tables
  (conteos, mortalidades, alimentaciones, biometrías) as stacked sections. All dates/numbers
  via `src/lib/format.ts`, loading with Skeleton + SlowServerNotice, errors with server detalle.

## Build tail

```
vite v8.3.6 building client environment for production...
transforming...
✓ 555 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.77 kB │ gzip:   0.43 kB
dist/assets/index-BDK3isXy.css   19.00 kB │ gzip:   4.92 kB
dist/assets/mock-CVwOZUie.js    360.52 kB │ gzip:  50.64 kB
dist/assets/index-CRiO1Joo.js   815.52 kB │ gzip: 237.56 kB
✓ built in 324ms
```

## Grep result

`grep -rnE '#[0-9a-fA-F]{3,6}\b|cubic-bezier|rgb\(' src --include='*.tsx' --include='*.ts'`
is empty (exit 1, no matches). No `any` in the owned files. No em dashes or emoji in
owned copy.

## Could not do

- Edit dialogs render empty: `src/pages/forms/PondForm.tsx` and `BatchForm.tsx` are still
  placeholders returning null (owned by the forms delegate). Wiring (props contract,
  `<dialog>` open/close, onDone/onCancel) is done; the forms only need implementing.
- No end-to-end click-through in a browser (no browser tooling in this session). Verified by
  `tsc -b && vite build` passing in mock mode, the token grep above, and a numeric check of
  the `niceTicks` steps (temp 10-16 to [10,12,14,16]; ph 6-9 to [6,7,8,9]; mortality 0-2 to
  [0,1,2] integers).
- `pnpm lint` (oxlint) reports only warnings, including pre-existing ones in foundation files
  (`SlowServerNotice` set-state-in-effect, fast-refresh export warnings). One new warning of
  the same harmless kind: `Date.now` inside the range `useMemo` in `Estanque.tsx`.

## Shared-file change needed

None. `GrowthChart` keeps backward compatibility with `Kit.tsx` (still accepts
`fechaObjetivo: string`). `ChartTooltip` keeps the `formatBogota` / `formatBogotaDay`
exports the Kit gallery imports. Note for the Kit owner: the Kit gallery tables still print
raw numbers and ISO strings; that file is not mine to edit.
