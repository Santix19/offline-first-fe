# REPORT: API data layer (`src/api/**`)

## What I built

- `src/api/types.ts`: one type per wire DTO used by the panel (ponds, batches, readings, daily,
  fry counts, mortality, feeding, biometry, `BatchSummary`, `AlertResponse`, `FindingResponse`,
  `ProjectionJson`, `ForecastJson`, parameters, devices, sync logs, auth/users/session,
  `Stream.Message`, plus create/update bodies and query-parameter types). Names are the wire names,
  not the Java camelCase.
- `src/api/http.ts`: `request<T>(method, path, { query, body, auth })` with `VITE_API_URL`, the
  `X-API-Key` rule only for login/registro, Bearer everywhere else, `ApiError { status, detalle }`
  from the server's `{"detalle": ...}`, and 401 -> clear session + `lacocha:unauthorized` event.
- `src/api/session.ts`: token + usuario in `localStorage` (try/catch), reactive `useSession()`
  (`useSyncExternalStore`), login, logout (`DELETE /api/auth/sesion`), change password,
  `debe_cambiar_clave`, `isProductor`/`isCuidador`, `onUnauthorized`.
- `src/api/endpoints.ts`: one typed function per route in the SPEC screens table, the CSV URL
  builder, and a Bearer-aware CSV download that returns a Blob (mock mode builds the CSV locally).
- `src/api/queries.ts`: TanStack Query hooks, the `keys` factory, optimistic attend mutations with
  rollback, and create/update/temp-password mutations.
- `src/api/stream.ts`: `useLiveEvents()` with `fetch()` + `ReadableStream` (not EventSource), SSE
  `data:` parsing, query invalidation, last finding for a toast, 1 s -> 30 s backoff, stops on
  logout / forced password change.
- `src/api/mock.ts`: full fixture transport from `src/mocks/data/db.json`, in-memory mutations,
  derived summary/daily endpoints in Bogotá time, AI-off shapes, 300-600 ms latency.
- `src/mocks/data/db.json`: placeholder only (1 pond, 1 batch, 3 readings, V17 ranges and V19
  feeding curves, 2 users) so the mock can run before the fixtures agent replaces it.
- `src/api/README.md`: one paragraph per file.

No dependencies added, nothing outside the allowed paths touched.

## Proof

`npx -y pnpm@10 build` (tsc + vite build):

```
> tsc -b && vite build

vite v8.3.6 building client environment for production...
transforming...
✓ 16 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                   0.77 kB │ gzip:  0.43 kB
dist/assets/index-BZuuFjLM.css   12.11 kB │ gzip:  3.36 kB
dist/assets/index-BrQyZRwX.js   219.56 kB │ gzip: 68.60 kB

✓ built in 118ms
```

Extra check, because `tsconfig.app.json` does not set `"strict": true`:
`npx tsc -p tsconfig.app.json --strict --noEmit` also exits clean.

I also ran the mock through a throwaway Vite SSR bundle (outside the repo) and exercised
`GET /api/estanques`, `GET /api/lotes`, `GET /api/lotes/{id}/resumen`,
`GET /api/estanques/{id}/lecturas/diario`, `GET /api/ia/disponible`, `POST /api/auth/sesion`,
`POST /api/estanques` and `GET /api/lotes/{id}/proyeccion`: it returned 1 pond, 1 batch, summary
`poblacion_estimada: 5200`, `biomasa_kg: 9.36`, daily min/max/avg grouped on `2026-11-07`,
`{disponible: false}`, role `productor`, the created pond, and `503` for the projection. The
throwaway files are under `/tmp/opencode`, not in this folder.

## Field names I was not 100% sure about (with the Java line)

1. **`DailyReadings` order and empty days.** The record is `Queries.java:37-45`; the route is
   `QueryController.java:74-78` (`dias`, default 7). Nothing states whether the list is ascending
   or whether days without readings are filled. The mock returns only days that have readings,
   ascending by `fecha`. If the real backend sorts newest-first, the chart must reverse it.
2. **`BatchSummary` derived semantics.** Fields are `Queries.java:107-127`; the rules are README
   lines 188-193. Two assumptions in the mock: `tasa_alimentacion_pct` is the table rate already
   multiplied by the temperature factor, and `racion_diaria_kg = biomasa_kg * tasa_pct / 100`.
   The `notas` strings are mine (they say which input was missing); the real backend may phrase
   them differently. `alimento_ultima_semana_kg` / `alimento_total_kg` are primitive `double`
   (never null), so the mock returns `0`, not `null`.
3. **Forecast when the AI is off.** `AiController.java:98-102` defines the 503 text only for the
   projection (`/lotes/{id}/proyeccion`). The forecast route (`QueryController.java:88`) returns
   `Forecasts.WaterForecast` (`Forecasts.java:32-40`), whose `dias` is empty and `mensaje` explains
   why, so the mock returns `dias: []`, null error/reaction, `lecturas_usadas: 0` and the same
   "servicio de IA no disponible" sentence. The facade's exact text for that case is not in the
   kit.
4. **Alert levels.** `Sync.AlertResponse.nivel` is a plain `String` (`Sync.java:51`); I typed it as
   `'advertencia' | 'critica'` because `V26__hallazgos_de_la_ia.sql` (comment on the `nivel` column)
   says findings reuse those two and add `'informe'`. If the rule engine ever emits another level,
   the union needs widening.
5. **Pond type.** `Catalog.POND_TYPES = "estanque|tanque|jaula"` (`Catalog.java:29`), but the
   response field is a `String` (`Catalog.java:55`). I typed the union from the validation regexp.
6. **`BatchResponse.fecha_siembra`.** The response record (`Catalog.java`, `BatchResponse`) carries
   a `LocalDate`; I typed it non-null because a batch is created with one. If a legacy row can have
   null, widen it to `LocalDate | null`.
7. **`RangeResponse.unidad`.** `Parameters.java:29` calls `p.getUnit().trim()`, so the wire value
   is trimmed (`"°C"`, `"mg/L"`, `""`). The placeholder `db.json` follows that, not the raw spaces
   in `V17__parametros_de_la_trucha.sql`.
8. **`DeviceResponse.id` is a `String`, not a UUID** (`Devices.java:23`), unlike every other id.
9. **`FindingResponse.puntaje` is a primitive `double`** (`Ai.java:212`), so never null;
   `medido_en`, `atendido_en` and `atendido_por` are nullable.
10. **`SessionResponse`** uses `expira_en` (`Auth.java:72-76`), and `UserResponse` is embedded, not
    flattened.

## Deliberate choices worth knowing

- **CSV needs the token.** `GET /api/estanques/{id}/lecturas.csv` is under `/api/`, so the shared
  key or Bearer is required (`QueryController.java:64-86`). A plain `<a href>` cannot send the
  header, so `downloadPondReadingsCsv()` fetches with Bearer and returns a Blob. In mock mode it
  builds the same CSV from the fixture readings.
- **401 on login does not force a logout.** Only Bearer calls clear the session and emit the
  unauthorized event. A 401 from `/api/auth/sesion` (wrong password) is thrown as `ApiError` so
  the login screen can show the server's `detalle` without a spurious "session expired" event.
- **Mock login accepts any credentials** and returns `usuarios[0]`, as the brief asks; the mock
  temporary password is the fixed string `Temporal-2026` (mock only, never sent by the backend).
- **Mock stream is absent by design.** `useLiveEvents()` does not open a connection when
  `VITE_MOCK === '1'`; the brief says the mock stream emits nothing.
- **`keys` are prefix-friendly.** `keys.pond(id)` is `['lacocha','estanques', id]`, so invalidating
  it also refreshes readings, daily and forecast; `keys.batch(id)` does the same for summary,
  projection and the four histories.
