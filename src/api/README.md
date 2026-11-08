# `src/api`: the panel's data layer

One paragraph per file. Field names are the wire names from `_kit/backend/dto/*.java` (Spring
`SNAKE_CASE`, `@JsonProperty` wins); routes and query parameters are the Spanish ones declared by
`_kit/backend/controller/*.java`.

**`types.ts`** holds one TypeScript type per request/response DTO the panel touches: ponds,
batches, water readings, daily readings, the four batch histories, `BatchSummary`, alerts,
findings, `ProjectionJson`, `ForecastJson`, parameters, devices, sync logs, users, sessions and
`StreamMessage` (aliased as `Stream.Message`). It also has the small query-parameter types
(`ReadingQuery`, `AlertFilters`, ...) so callers do not invent query names. Nullability follows the
Java wrapper types (`Double`, `Integer`, `Instant`) rather than the primitives.

**`http.ts`** is the only place that knows the base URL (`VITE_API_URL`), the query-string rules and
the auth header rule: `X-API-Key: VITE_API_KEY` only when `auth: 'apiKey'` (login/registro), and
`Authorization: Bearer <token>` for every other call. `request<T>(method, path, { query, body, auth })`
returns parsed JSON (or `undefined` for an empty body) and throws `ApiError { status, detalle }` with
the server's Spanish `{"detalle": ...}`; a 401 on a Bearer call also clears the session and emits
the unauthorized event. When `VITE_MOCK === '1'` it delegates to `mock.ts` instead of `fetch`.

**`session.ts`** keeps `token` and `usuario` in `localStorage` (all reads/writes in `try/catch`, so
private mode degrades to memory), exposes a `useSyncExternalStore`-backed `useSession()` plus
`login`, `logout` (`DELETE /api/auth/sesion`), `changePassword`, `refreshUser`, `debeCambiarClave`
and the role helpers `isProductor`/`isCuidador`. `handleUnauthorized(detalle)` clears the store and
fires `lacocha:unauthorized` on `window`; `onUnauthorized(listener)` is the app-side subscription
used to show the server's message and navigate to login.

**`endpoints.ts`** has one typed function per route in the SPEC screens table: auth `me`, ponds and
batches CRUD, readings/daily/CSV/forecast/findings, batch summary/projection/histories, alerts and
findings (including attend), parameters, devices and sync log, users and temporary passwords, and
`aiAvailable`. `pondReadingsCsvUrl()` builds the absolute CSV URL, while
`downloadPondReadingsCsv()` fetches it with the Bearer header and returns a `Blob` (a plain link
cannot send that header; in mock mode it builds the CSV from the fixture readings).

**`queries.ts`** is the TanStack Query layer: a `keys` factory rooted at `['lacocha']` (so
`keys.pond(id)` is a prefix that also matches readings, daily and forecast), read hooks for every
endpoint, and mutations for attending alerts/findings, creating/updating ponds and batches, updating
devices and users, and resetting a temporary password. Attending is optimistic with a full snapshot
and rollback; a pending-only list drops the row while an "all" list flips it to attended, and every
mutation invalidates the families whose numbers changed.

**`stream.ts`** implements `useLiveEvents()` with `fetch()` + `ReadableStream`, because EventSource
cannot send the Bearer header. It parses SSE `data:` blocks into `StreamMessage`, invalidates the
pond/batch/alerts/devices/sync-log keys a `sincronizado` touches, keeps the last `hallazgo` for a
toast (`lastFinding`, `clearLastFinding`), reconnects with exponential backoff from 1 s to 30 s, and
stops on logout or while a temporary password still has to be changed.

**`mock.ts`** serves the whole API from `src/mocks/data/db.json` when `VITE_MOCK === '1'`, keeping an
in-memory copy so POST/PATCH/attend persist for the session and adding 300-600 ms of latency. It
computes the derived endpoints with the backend README rules: population from the last count minus
later deaths, biomass, density over pond volume, feeding rate times temperature factor, FCR,
Bogotá-time culture days, and daily min/max/avg grouped by Bogotá date. `/api/ia/disponible` answers
`false`, the forecast returns the empty-days-plus-message shape, and the projection throws the
backend's 503 `detalle`; login accepts any document/password and returns `usuarios[0]`.
