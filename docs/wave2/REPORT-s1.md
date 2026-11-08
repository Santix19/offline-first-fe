# REPORT s1: entry, shell, Inicio, Alertas

## Files changed

- `src/app/Shell.tsx`: session gate (no session -> `/entrar`, `debe_cambiar_clave` -> `/clave`), Usuarios only for `productor`, Alertas count = pending alerts + pending findings, user name + Salir (logout then `/entrar`), `useLiveEvents()` with a Toast per live `hallazgo`, 401 listener that toasts the server `detalle` and goes to `/entrar`. The data hooks live in an inner `ShellFrame` so nothing is fetched without a session.
- `src/app/Layout.tsx`: desktop sidebar is `fixed` at `left-0 top-0` with `h-dvh max-h-dvh z-40 overflow-y-auto`, so it spans the viewport and stays put while content scrolls.
- `src/pages/Entrar.tsx`: documento + clave, `inputMode="numeric"` / `pattern` for documento, 16px inputs, server `detalle` on error, loading button, redirect by `debe_cambiar_clave`.
- `src/pages/Clave.tsx`: forced change (actual, nueva, repetida), client check for 8-72 chars and match, server `detalle` on error, Salir.
- `src/pages/Inicio.tsx`: header + context line + "Nuevo estanque" (PondForm in a native `<dialog>`); "Para atender" (alerts + pending findings, newest first, max 5, inline Atender, "Ver todas"); pond cards with last temp/pH/O2 RangeBars against `/parametros` and relative time (absolute in `title`); active batch rows with days, survival and biomass from the batch summary, linked to `/lotes/:id`.
- `src/pages/Alertas.tsx`: one list of alerts + findings, filters Pendientes / Atendidas / Todas and by estanque, optimistic Atender (`useAttendAlert` / `useAttendFinding`), attended rows show `atendida_por` and relative time.
- `REPORT.md`: this file.

## Evidence

Build (`npx -y pnpm@10 build`):

```
dist/assets/index-LPfkWvvs.js   814.04 kB │ gzip: 237.91 kB
[plugin builtin:vite-reporter]
(!) Some chunks are larger than 500 kB after minification. Consider:
- Using dynamic import() to code-split the application
...
✓ built in 335ms
```

The chunk-size warning is pre-existing (recharts + app) and does not fail the build.

Hex / cubic-bezier / rgb check:

```
grep -rnE '#[0-9a-fA-F]{3,6}\b|cubic-bezier|rgb\(' src --include='*.tsx' --include='*.ts'
(no output; exit 1)
```

Mock-mode checks with Playwright against `vite preview` (375 and 1440): login -> Inicio -> Alertas -> Atender works, sidebar count goes 2 -> 1, "Atendidas" shows the attended alert with "Atendida por panel", no horizontal page scroll at 375 (`scrollWidth` 375), logout -> `/entrar`, simulated `debe_cambiar_clave` -> `/clave` -> back to `/`, zero console errors.

## Could not do / gaps

- **Attended findings in Alertas:** `/api/hallazgos` only returns pending findings (there is no all-findings route), so with the Atendidas filter the list contains attended alerts only. With Todas it shows all alerts plus the pending findings. Fixing this needs a backend route or a `pendientes` parameter on findings.
- **Mock seed has no `hallazgos`:** `src/mocks/data/db.json` has no `hallazgos` key, so the findings half of "Para atender" and of the Alertas list cannot be exercised in mock mode. The code handles it (`usePendingFindings` returns `[]`).
- **`/api/alertas` default:** the mock treats a missing `pendientes` parameter as `pendientes=true`. The Alertas page sends `pendientes: false` explicitly to get the full list; worth confirming the real backend's default matches.
- **PondForm:** `src/pages/forms/PondForm.tsx` is still the placeholder that returns `null`, so "Nuevo estanque" opens the dialog with only the heading until the forms agent lands it. The import and props contract are already wired.
- **Real backend:** not running here; only mock mode was tested.
- **Edge case:** `optimo_max` is null for oxygen (no upper bound). `RangeBar` requires a number, so the page passes `Math.max(value, optimo_min)` as a display-only upper edge; the marker and status stay correct.

## Shared-file change I need

`src/components/ui/RangeBar.tsx` (shared, not mine):

1. It prints `value` and unit raw (`13.33 °C`). Every number must go through `formatNumber` (es-CO gives `13,33`). Right now Inicio shows a dot decimal.
2. `RangeLimits.optimo_max` is `number` while `/api/parametros` sends `null` for oxygen (open-ended optimum). Accepting `number | null` and treating null as "band extends to the right edge" would remove the display-only workaround in `Inicio.tsx` (`Barra`).

Optional: `EmptyState` is only a sentence; the pond card uses it inside a card and it is fine, no change needed.
