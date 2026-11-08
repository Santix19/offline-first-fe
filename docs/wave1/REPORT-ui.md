# REPORT: UI shell, primitives and charts

## Archivos creados

`src/components/ui/`: `range.ts` (`rangeStatus`), `Button.tsx`,
`StatusBadge.tsx`, `RangeBar.tsx`, `Stat.tsx`, `Card.tsx`,
`DataTable.tsx`, `Skeleton.tsx`, `EmptyState.tsx`, `ErrorState.tsx`,
`SlowServerNotice.tsx`, `Toast.tsx` (+ provider), `ConfirmDialog.tsx`,
`Field.tsx`, `Select.tsx`.

`src/components/charts/`: `ChartTooltip.tsx` (hora de Bogotá),
`TimeSeriesChart.tsx` (banda óptima, líneas críticas con etiqueta,
tooltip con hora de Bogotá, toggle Ver tabla), `DailyRangeChart.tsx`
(línea promedio + banda min-max), `GrowthChart.tsx` (puntos + línea,
proyección punteada a fecha objetivo), `DailyBars.tsx` (barras con
espacio de 2 y radio superior de 4).

`src/app/`: `Layout.tsx` (barra lateral fija en 1024 o más, barra
superior + panel en móvil, navegación por props, usuario + Salir),
`router.tsx` (rutas `/entrar`, `/clave`, `/`, `/estanques/:id`,
`/lotes/:id`, `/alertas`, `/dispositivos`, `/parametros`,
`/usuarios`, `/kit`; todo salvo Kit es un `h1` temporal).

`src/pages/Kit.tsx` (`/kit`): cada componente y cada gráfico con
datos de muestra (temp 10 a 18 °C, pH 6.5 a 8.5, O2 4 a 9 mg/L) en
estados normal, vacío, cargando y error. Un solo botón primario en
la vista.

`src/App.tsx`, `src/main.tsx`: QueryClient + ToastProvider + router.
No se tocó `tokens.css` ni `index.css`. Sin imports de `src/api`.

## Build

`npx -y pnpm@10 build` pasa (`tsc -b && vite build`):

- 534 módulos transformados, `dist` generado en 594 ms.
- Solo aviso: un chunk de 774 kB (recharts) supera 500 kB;
  dividir el código queda fuera del alcance.

## Grep

`grep -rnE '#[0-9a-fA-F]{3,6}\b|cubic-bezier|rgb\(' src
--include='*.tsx' --include='*.ts'` vacío (salida 1, sin
coincidencias). Sin em dashes, sin emoji, sin sombras. Colores de
gráficos solo con `var(--series-1)` y `var(--chart-*)`.

## Lo que no se pudo hacer

- Sin verificación visual en navegador (375 y 1440): el build y
  los tipos pasan, pero el acabado en pantalla queda por revisar.
- El aviso Toast reinicia sus 6 s al pasar el cursor en vez de
  pausar y continuar exacto.
- Las páginas reales son `h1` temporales según el brief; datos,
  auth y consultas las arma otro agente.
