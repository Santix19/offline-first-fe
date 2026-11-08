# REPORT s3: devices, parameters, users, forms

## Files changed (owned only)

- `src/pages/Dispositivos.tsx` (full)
- `src/pages/Parametros.tsx` (full)
- `src/pages/Usuarios.tsx` (full)
- `src/pages/forms/PondForm.tsx` (full, props interfaces kept exactly)
- `src/pages/forms/BatchForm.tsx` (full, props interfaces kept exactly)
- `REPORT.md` (this file)

## What was built

- **PondForm**: nombre (required, ≤ 80), tipo (estanque | tanque | jaula), volumen_m3 (optional, > 0,
  accepts the es-CO comma decimal). Client validation mirrors `_kit/backend/dto/Catalog.java`
  (`@NotBlank @Size(max = 80)`, `@Pattern(POND_TYPES)`, `@Positive`). Creates with `useCreatePond`,
  edits with `useUpdatePond` (PATCH also sends `activo` so it is preserved). Primary "Guardar",
  secondary "Cancelar". The server `detalle` shows at the top of the form and is mapped to the field
  when the message names nombre / tipo / volumen (searching for "volumen", "nombre", "tipo").
- **BatchForm**: estanque (required select in create; read-only in edit because `BatchUpdate` has no
  estanque_id; preselected through `pondId`), código (required, ≤ 40), fecha_siembra (date input with
  max = today, rejected if future, mirrors `@PastOrPresent`), cantidad_inicial (≥ 0), peso_inicial_g
  (> 0). `useCreateBatch` / `useUpdateBatch`. Same Guardar / Cancelar and detalle-to-field mapping
  (estanque / codigo / siembra / cantidad / peso inicial).
- **Dispositivos**: table with descripción (or id in muted ink), estado text (Activo / Dado de baja)
  plus a local advertencia-tinted "Sin señal" badge when `ultimo_visto_en` is older than 24 h
  (`hoursSince`), primer and último visto as relative time with the absolute Bogotá time in `title`
  (`formatRelative` + `formatDateTime`). Inline rename: quiet Guardar / Cancelar inside the cell,
  description validated to 1 to 120 chars (Devices.java `DeviceUpdate`), saved with `useUpdateDevice`.
  "Dar de baja" goes through ConfirmDialog (PATCH `activo: false`); inactive devices get a quiet
  "Activar" (no confirm, it is reversible). Below, the sincronizaciones log table: dispositivo,
  recibido (relative + title), aceptados, duplicados, obsoletos, rechazados, alertas_generadas, all
  numbers with `formatInteger`. Both cards have Skeleton + SlowServerNotice, empty-row sentence and
  ErrorState (`detalle` + Reintentar). Mutations surface server `detalle` in a banner above the table.
- **Parametros**: three read-only DataTables: rangos (variable, unidad, rango óptimo, rango crítico,
  fuente), tasas de alimentación (peso hasta g, tasa % del peso, fuente), factores de temperatura
  (temperatura hasta °C, factor sobre la tasa, fuente). Unbounded rows say "Sin tope"; a bounded
  óptimo reads "10 a 16", a one-sided one "6 o menos"; crítico reads "Menor que X" or "Menor que X o
  mayor que Y". Every row keeps its `fuente` in muted caption. A muted line says "Estos valores
  cambian en la base de datos, no aquí." Loading (Skeleton + SlowServerNotice) and error handled.
- **Usuarios**: non-productors (including no session) get the page title plus EmptyState "Solo el
  productor administra usuarios." For the productor: table (nombre, documento, rol as an inline
  select, estado, acciones). Rol change is a direct PATCH via `useUpdateUser`; the producer's own
  row select is disabled (title explains why). Desactivar goes through ConfirmDialog, Activar is a
  quiet direct action. "Clave temporal" calls `useResetTemporaryPassword` and opens a native dialog
  showing `clave_temporal` ONCE with a Copiar button (clipboard API with a select + execCommand
  fallback), a "Copiada al portapapeles." status line, and the note that the user must change it on
  first login. The dialog closes without ever storing the value.

## Verification

- `npx -y pnpm@10 build` clean (tsc + vite):
  `dist/assets/index-8oD7fSuy.js 807.25 kB | gzip 235.93 kB` (chunk-size warning is pre-existing,
  comes from recharts in the shared bundles).
- `grep -rnE '#[0-9a-fA-F]{3,6}\b|cubic-bezier|rgb\(' src --include='*.tsx' --include='*.ts'`
  empty (exit 1, no matches).
- `npx oxlint`: no warnings in my five files (the four warnings are pre-existing in shared
  `ChartTooltip.tsx`, `SlowServerNotice.tsx`, `Toast.tsx`).
- Smoke test (temp Playwright script, deleted after) against `vite` + `VITE_MOCK=1`, viewport 375 and
  1440: /dispositivos, /parametros, /usuarios all render (h1 as page title, table rows from the
  fixture), zero console errors or page errors, zero horizontal page scroll at 375 px; temp-password
  dialog shows the password with Copiar and the copied feedback; deactivate with confirm works;
  the "Sin señal" badge logic runs on `hoursSince(ultimo_visto_en) > 24` (the fixture device is
  fresh, so it does not light up in mock mode).

## Notes and gaps

- No shared-file changes made and none needed.
- The "Sin señal" badge is a small local component in `Dispositivos.tsx` reusing the
  advertencia tint from tokens: `StatusBadge` only prints "Advertencia" / "Crítico" / "Bien" and I do
  not own it, so I could not give it the exact "Sin señal" wording the brief asked for. If the
  integration wants one shared badge with custom wording, that is a shared-component change.
- In mock mode `login` returns `usuarios[0]` (productor), so the Usuarios table is reachable by
  seeding `lacocha.token` / `lacocha.usuario` in localStorage; the Entrar screen (not owned by this
  wave) is still a placeholder, so end-to-end login could not be exercised through the UI.
- Form-level server `detalle` and mutation errors are shown with a critico icon in ink, matching the
  Field error pattern; the critico color is used for state only, never for buttons.
