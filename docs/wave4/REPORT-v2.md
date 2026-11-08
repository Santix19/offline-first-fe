# REPORT: BRIEF v2 (Inicio, Alertas, admin pages, data components)

## Cambios por archivo (solo archivos propios)

- `src/components/ui/KpiTile.tsx`: implementado desde el stub de contrato. Props intactas
  (`icon`, `label`, `value`, `format`, `unit`, `trend`, `tone`, `status`). Tono `ink`
  (banda oscura: valor blanco `text-on-nav`, etiqueta `text-on-nav-muted`, icono en
  cuadrado `bg-cta text-on-cta`, sparkline aquamarina) y tono `surface` (tarjeta blanca
  con `shadow-sm`, icono en `bg-accent-soft text-brand`, sparkline series-1). Valor con
  `CountUp`; `null` muestra "Sin dato". `status` usa `StatusBadge` tamaño sm.
- `src/components/ui/Sparkline.tsx`: implementado desde el stub. Props intactas
  (`values`, `color`, `label`, `height`). SVG inline con polyline de 2px y área suave
  al 16 por ciento, sin ejes, dibujo al montar con motion reveal; con reduced motion es
  estático. Menos de 2 puntos: solo texto accesible.
- `src/components/ui/StatusBadge.tsx`: chips SÓLIDOS (`bg-critico text-critico-fg`,
  `bg-advertencia text-advertencia-fg`, `bg-ok text-ok-fg`) con icono lucide del mapa
  de §0 (`TriangleAlert`, `CircleAlert`, `CircleCheck`, strokeWidth 1.5) más palabra.
  Nuevo prop opcional `size: sm | md` (por defecto sm); las llamadas existentes
  (`<StatusBadge status={...} />` en Inicio, Alertas, Estanque) no cambian.
- `src/components/ui/RangeBar.tsx`: nuevo prop opcional `icon?: LucideIcon` junto a la
  etiqueta (color `text-brand`). Segmento óptimo en `var(--chart-band-optimo)`.
  Marcador con color de estado y anillo blanco vía `var(--color-surface)`. Motion
  existente intacto. Llamadas sin `icon` siguen válidas.
- `src/components/ui/DataTable.tsx`: contenedor `rounded-lg` con `shadow-sm`,
  cabecera `bg-surface-2`, hover de fila `bg-surface-2`. Props intactas.
- `src/components/ui/Stat.tsx`: sin cambios (ya usa `CountUp` y tokens).
- `src/pages/Inicio.tsx`: banda hero ink (`bg-nav`, saludo según hora de Bogotá más
  primer nombre de sesión, fecha con `formatDate`, botón primario único Nuevo
  estanque) con 4 `KpiTile` en tono ink (Estanques, Lotes, Para atender con pill
  critico si hay pendientes, Biomasa total sumada de `batchSummary` por lote activo
  vía `useQueries`; tendencias de lecturas de temperatura, conteos y biometrías).
  Para atender conserva comportamiento (mutaciones optimistas, skeletons, errores)
  con chips sólidos y chip de estanque o lote con icono `Waves` o `Fish`. Tarjetas de
  estanque: barra superior de 4px con el peor estado, cabecera con `Waves` en cuadrado
  tintado más chip de tipo, tres `RangeBar` con iconos (`Thermometer`, `FlaskConical`,
  `Wind`), `Sparkline` de temperatura de 24 lecturas, pie con tiempo relativo.
  Lotes activos como tarjetas (no filas): `Fish` en tinta coral, código, estanque,
  días, biomasa con `CountUp` y barra de progreso de supervivencia. Tarjetas propias
  en `rounded-lg bg-surface shadow-sm` sin tocar `Card`.
- `src/pages/Alertas.tsx`: cabecera con cuadrado de icono `BellRing`. Chips de filtro
  con estado seleccionado aquamarina (`bg-cta text-on-cta`, indicador deslizante con
  `layoutId`). Filas como tarjetas blancas (`rounded-lg bg-surface shadow-sm`) con
  icono por clase (`BellRing` alerta de regla, `ScanSearch` hallazgo), chips sólidos,
  filtro por estanque y atender optimista intactos.
- `src/pages/Dispositivos.tsx`: cabecera con cuadrado `Smartphone`. Columna de
  dispositivo con icono `Smartphone`; chip sólido de estado (`Activo` ok con
  `CircleCheck`, `Dado de baja` neutro con `X`); `Sin señal` como chip sólido
  advertencia con `WifiOff`; columna Recibido con `RefreshCw`. Renombrar, dar de baja
  con confirmación y diálogos intactos.
- `src/pages/Parametros.tsx`: cabecera con cuadrado `SlidersHorizontal`. Columna
  Variable con icono por variable (`Thermometer`, `FlaskConical`, `Wind`). Tablas de
  solo lectura intactas, con `fuente` visible.
- `src/pages/Usuarios.tsx`: cabecera con cuadrado `Users`. Columna Nombre con icono
  `Users`; Estado como chip sólido (`Activo` ok con `CircleCheck`, `Desactivado`
  neutro con `X`). Roles, activar o desactivar con confirmación y clave temporal con
  Copiar intactos.

## Pruebas

- `npx -y pnpm@10 build` pasa. Cola:
  `dist/assets/index--xDJfYzV.js 1,027.75 kB`, advertencia de chunk mayor a 500 kB
  (preexistente, sin code splitting nuevo), `built in 418ms`.
- `grep -rnE '#[0-9a-fA-F]{3,6}\b|cubic-bezier|rgb\(' src --include='*.tsx' --include='*.ts'`
  vacío (sin coincidencias).
- Dev en modo mock (`VITE_MOCK=1`) en puerto 5199: raíz responde 200 con título
  "La Cocha · Panel". Servidor detenido al terminar (solo su propio proceso).

## No hecho y avisos para otros agentes

- `src/components/ui/Card.tsx` no es propio: sigue en `rounded-sm` con borde y sin
  sombra. Para v2 total su dueño debería llevarlo a `rounded-lg` con `shadow-sm`.
  Por eso Para atender y partes de admin siguen dentro de `Card` con ese aspecto.
- Biomasa total del hero suma `biomasa_kg` de `batchSummary` por lote (sin endpoint
  agregado). Tendencias del hero: temperatura del primer estanque, conteos y
  biometrías del primer lote activo. Si aparece un endpoint agregado, conviene
  migrar el KPI de biomasa.
- El tile Para atender no lleva sparkline: lleva pill de estado critico u ok según
  el brief. Los tiles de conteo usan series del primer elemento como tendencia.
- Sin dependencias nuevas, sin git, sin archivos fuera de la carpeta.
