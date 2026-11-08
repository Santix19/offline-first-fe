# SPEC — La Cocha panel web

The web panel for the La Cocha backend (`../backend`, Java/Spring, repo
walterjojoa/backend--offline-first). The caretaker's phone app and the ESP32 counter send events;
this panel is where the **productor** (farm owner) and the **cuidador** read ponds and batches,
attend alerts and findings, and manage devices and users.

Source of truth for every field name: the Java DTOs in `../backend/src/main/java/com/lacocha/backend/dto/`
(JSON is snake_case globally, `spring.jackson.property-naming-strategy=SNAKE_CASE`). Never guess a field.

## Stack (decided 2026-11-07)

Vite + React + TypeScript SPA, Tailwind v4, TanStack Query, React Router, a small chart lib
(decided in DESIGN.md). **Why not Next.js:** the backend already allows `http://localhost:5173`
(Vite's port) in CORS by default and authenticates with a Bearer token, so a static SPA is what its
authors designed for; a Node server would be cost with no job.

## Auth (from `ApiKeyFilter`, `AuthController`)

- Every `/api/**` needs the shared `X-API-Key` OR a user's `Authorization: Bearer <token>`.
- Login (`POST /api/auth/sesion`, `{documento, clave}`) needs only the key → returns
  `{token, expira_en, usuario}`. The panel sends the key ONLY on login/registro, then Bearer only.
  The key lives in `VITE_API_KEY` (the README says it is copied into the app and the panel; a
  browser-visible key is the backend's accepted trade-off, write it down, do not hide it).
- `usuario.debe_cambiar_clave = true` → the token only opens `/api/auth/**`: force the
  change-password screen (`POST /api/auth/clave` `{clave_actual, clave_nueva}`, 8-72 chars).
- Roles: `productor` | `cuidador`. Only productor sees Usuarios.
- Logout: `DELETE /api/auth/sesion`. 401 anywhere → back to login with the server's `detalle`.
- Errors are always `{"detalle": "..."}` in Spanish: show that text, never a generic message.

## Screens

| # | Route | Data (endpoints) | Must show / do |
|---|---|---|---|
| 1 | `/entrar` | `POST /api/auth/sesion` | documento + clave (16px inputs), error `detalle`, loading state |
| 2 | `/clave` | `POST /api/auth/clave` | forced when `debe_cambiar_clave` |
| 3 | `/` Inicio | `/api/estanques`, `/api/lotes?estado=activo`, `/api/alertas`, `/api/hallazgos`, `/api/parametros`, last reading per pond (`/estanques/{id}/lecturas?limite=1`) | Pending alerts + findings first (what needs attention today). Each pond: last temp/pH/O2 placed against its optimal/critical range from `/parametros`, time since last reading. Active batches with survival, biomass, days. Live via SSE |
| 4 | `/estanques/:id` | `/estanques/{id}`, `/lecturas?desde&hasta`, `/lecturas/diario?dias=`, `/pronostico-temperatura`, `/estanques/{id}/hallazgos`, `/lecturas.csv` | Charts of temp, pH, O2 over time with optimal band + critical lines; range switch 24h / 7d / 30d; daily min/avg/max table; temperature forecast with `error_tipico`; findings; CSV download; edit (PATCH) |
| 5 | `/lotes/:id` | `/lotes/{id}/resumen`, `/lotes/{id}/proyeccion`, `/conteos`, `/mortalidades`, `/alimentaciones`, `/biometrias`, `/lotes/{id}/hallazgos` | Summary numbers (`dias_cultivo`, `poblacion_estimada`, `supervivencia_pct`, `biomasa_kg`, `densidad_kg_m3`, `racion_diaria_kg`, `conversion_alimenticia`, `notas`); weight curve (biometrías) + projection (`peso_proyectado_g`, `fecha_objetivo`, `tgc`); mortality per day; feeding per day; histories as tables; close batch (PATCH estado=cerrado + fecha_cierre) |
| 6 | `/alertas` | `/api/alertas?pendientes=`, `/api/hallazgos`, `POST /alertas/{id}/atender`, `POST /hallazgos/{id}/atender` | One list, two kinds (rule alert vs AI finding), filter pending/attended, by pond; attend with optimistic update; shows `atendida_por` / `atendida_en` |
| 7 | `/dispositivos` | `/api/dispositivos`, `PATCH /dispositivos/{id}`, `/api/sincronizaciones` | Devices with last seen (stale > 24 h flagged); rename, deactivate (confirm); sync log table (aceptados/duplicados/obsoletos/rechazados/alertas_generadas) |
| 8 | `/parametros` | `/api/parametros` | Read-only ranges, feeding rates, temperature factors, each with `fuente` visible |
| 9 | `/usuarios` (productor) | `/api/usuarios`, `PATCH /usuarios/{id}`, `POST /usuarios/{id}/clave-temporal` | Role, active, temp password shown once with copy |
| 10 | Forms | `POST/PATCH /api/estanques`, `/api/lotes` | Create/edit pond (nombre, tipo estanque/tanque/jaula, volumen_m3) and batch; server validation `detalle` mapped to fields |

## Cross-cutting

- **Live:** `GET /api/eventos/stream` read with `fetch()` + ReadableStream (NOT EventSource: it
  cannot send the Bearer header). Messages `{tipo: listo|sincronizado|hallazgo, ...}` invalidate
  the matching queries and raise a toast for `hallazgo`. Reconnect with backoff.
- **States:** every data view has loading (skeleton matching the layout), empty (says what fills it:
  "Aún no llegan lecturas de este estanque. Llegan cuando el celular sincroniza."), error (the
  `detalle` + retry). Render free plan sleeps: first request can take ~1 min, show "Despertando el
  servidor…" after 5 s instead of a frozen spinner.
- **Times:** server sends UTC; show Colombia time (America/Bogota), relative for recency
  ("hace 3 h") with the absolute time on hover/title.
- **Numbers:** `es-CO` formatting, tabular numerals, units always (°C, mg/L, kg, g, kg/m³, %).
- **Mock mode:** `VITE_MOCK=1` serves fixtures built from `../backend/src/main/resources/db/semilla/piloto.sql`
  (3 Demo ponds, 60 days, its alerts and batches) so the panel runs without the backend. Fixture
  values come from that file's formulas; nothing invented.
- **Language:** UI copy in Colombian neutral Spanish, no em dashes; code in English.
- **Responsive:** the cuidador opens it on a phone at the pond: Inicio, Alertas and pond detail must
  work at 375px (no horizontal page scroll; wide tables scroll inside their own container).

## Out of scope

Push/pull sync (that is the phone app), webhooks, AI service internals, registering new users from
the panel (registro is the phone's flow), offline mode, i18n.

## Acceptance

`pnpm build` + `pnpm typecheck` clean · every screen renders in mock mode at 375 and 1440 with zero
console errors · login → Inicio → pond → batch → attend an alert works end to end in mock mode ·
`detect.mjs` 0 P0 · no hex/cubic-bezier outside `tokens.css` · against the real backend (when
running): login and Inicio load with the seed data.
