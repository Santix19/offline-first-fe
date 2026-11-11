# La Cocha — panel web

The daily work panel for a trout farm at Laguna de La Cocha (Nariño, Colombia). It answers three
questions for the **productor** (farm owner) and the **cuidador** (caretaker): what needs attention
today, how each pond's water is, and how each batch is growing.

This is the web half of an offline-first thesis system. The caretaker's phone app and an ESP32
counter record readings offline and push them when they find signal; the Java/Spring backend
([`walterjojoa/backend--offline-first`](https://github.com/walterjojoa/backend--offline-first))
derives alerts, findings and batch summaries. This panel reads all of it over a Bearer-token API and
keeps itself live over Server-Sent Events.

UI copy is Colombian neutral Spanish; code, comments and docs are English.

## Quick start

```bash
pnpm install
cp .env.example .env
pnpm dev
```

The panel runs **without the backend** by default (`VITE_MOCK=1` in `.env.example`): a fixture-backed
transport serves the whole API from `src/mocks/data/db.json` with 300–600 ms of simulated latency, so
you can log in with any document and password and walk every screen.

To point at a real backend instead, set:

```bash
VITE_API_URL=http://localhost:8080
VITE_API_KEY=<the shared key the backend prints>
VITE_MOCK=0
```

The `X-API-Key` is browser-visible by the backend's own design. It is sent **only** on
`POST /api/auth/sesion`; every other call uses the Bearer token returned by login.

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Vite dev server on `:5173` (the origin the backend's CORS allows) |
| `pnpm build` | Type-check the project references, then build to `dist/` |
| `pnpm typecheck` | `tsc -b --noEmit` only |
| `pnpm lint` | Oxlint with the React/TypeScript plugin set |
| `pnpm preview` | Serve the built `dist/` |

Two Node scripts keep the fixtures honest, both dependency-free:

- `node scripts/build-fixtures.mjs` regenerates `src/mocks/data/db.json` from the backend's
  `piloto.sql` seed. Deterministic: seeded PRNG, fixed "now" of `2026-11-07T15:00:00Z`.
- `node scripts/push-fixtures.mjs` loads that same seed into a running backend through the phone's
  own route (`POST /api/sync/push`) in chunks of 500 events. Re-running is safe; repeated event ids
  come back as `duplicados`.

## Why a static SPA

Vite + React + TypeScript, Tailwind v4, TanStack Query, React Router, Recharts. Not Next.js: the
backend already allows `http://localhost:5173` in CORS and authenticates with a Bearer header, so a
static SPA is what its authors designed for. A Node server would be hosting cost with no job.

## Architecture

```
src/
  api/          the only door to the backend (see src/api/README.md)
  app/          shell, router, topbar, layout
  pages/        one file per screen, plus pages/forms/
  components/
    ui/         primitives: Button, Card, DataTable, Field, Skeleton, ErrorState, Toast, ...
    charts/     chart shells, tooltip, axes, motion presets
  motion/       Lenis scroll, shared presets, the pond hero
  lib/          formatting (es-CO numbers, Bogotá time)
  styles/       tokens.css, the source of truth for every value
  mocks/        fixture data and the mock transport's backing store
```

**`src/api` is the contract layer**, and it is worth reading before touching a screen:

- `types.ts` — one type per backend DTO, using the wire names (Spring `SNAKE_CASE`), with nullability
  following the Java wrapper types. Field names come from the Java DTOs; never guess one.
- `http.ts` — the only place that knows the base URL, query-string rules and the auth header rule.
  Throws `ApiError { status, detalle }` carrying the server's Spanish message. A 401 on a Bearer call
  clears the session and emits the unauthorized event.
- `session.ts` — token and user in `localStorage` (wrapped so private mode degrades to memory), a
  `useSyncExternalStore`-backed `useSession()`, and the role helpers.
- `queries.ts` — the TanStack Query layer. Keys are rooted at `['lacocha']` so `keys.pond(id)` is a
  prefix matching readings, daily and forecast too. Attending an alert is optimistic with snapshot
  and rollback.
- `stream.ts` — live events via `fetch()` + `ReadableStream`, **not** `EventSource`, because
  `EventSource` cannot send the `Authorization` header. Reconnects with backoff from 1 s to 30 s.
- `mock.ts` — the fixture transport, including the derived endpoints (population from last count
  minus later deaths, biomass, density over pond volume, feeding rate × temperature factor, FCR,
  culture days and daily min/max/avg grouped by Bogotá date).

### Auth

Login is `documento` + `clave`. If the user has `debe_cambiar_clave`, the token only opens
`/api/auth/**`, so the app forces the change-password screen. Roles are `productor` and `cuidador`;
only the productor sees Usuarios. Logout is `DELETE /api/auth/sesion`.

### Errors

Server errors are always `{"detalle": "..."}` in Spanish. The panel shows that text verbatim, never a
generic message, and never paraphrases a `fuente` value from `/api/parametros`.

## Screens

| Route | What it shows |
|---|---|
| `/entrar` | Login, with the server's `detalle` on failure |
| `/clave` | Forced password change |
| `/` Inicio | Pending alerts and findings first, then each pond's last temperature/pH/O₂ against its optimal and critical ranges, active batches with survival, biomass and days |
| `/estanques/:id` | Temp/pH/O₂ charts with optimal band and critical lines, 24h/7d/30d switch, daily min/avg/max table, temperature forecast with typical error, findings, CSV download, edit |
| `/lotes/:id` | Summary numbers, weight curve and projection, mortality and feeding per day, histories, close batch |
| `/alertas` | Rule alerts and AI findings in one list, filter by pending/attended and by pond, attend with optimistic update |
| `/dispositivos` | Devices with last-seen (stale > 24 h flagged), rename, deactivate, sync log |
| `/parametros` | Read-only ranges and factors, each with its `fuente` visible |
| `/usuarios` | Productor only: role, active, one-time temporary password with copy |
| forms | Create/edit pond and batch, with server validation mapped back to fields |

Every data view has three honest states: a skeleton matching the layout, an empty state that says
what fills it, and an error state with the server's `detalle` and a retry. Because free-plan hosting
sleeps, a request that takes more than 5 s shows "Despertando el servidor…" instead of a frozen
spinner.

## Conventions

- **Tokens only.** Every color, size, radius and motion value lives in `src/styles/tokens.css`. A raw
  hex, px font size or `cubic-bezier` in a component is a bug.
- **Numbers** are `es-CO`, tabular, and always carry their unit (°C, mg/L, kg, g, kg/m³, %).
- **Times** come from the server as UTC, display in `America/Bogota`, relative for recency with the
  absolute time on hover.
- **Status** is always icon + word + color, never color alone.
- **Motion** explains state changes rather than performing, and every animation has a reduced-motion
  path (opacity-only, no count-up, stagger or line-draw).
- **Mobile floor.** The cuidador opens this on a phone at the pond: Inicio, Alertas and pond detail
  must work at 375 px with no page-level horizontal scroll.

## Project documents

| File | Contents |
|---|---|
| [`SPEC.md`](SPEC.md) | Screens, endpoints, field-level requirements, acceptance criteria |
| [`DESIGN.md`](DESIGN.md) | Visual system and its version history (current: Midnight v4 + Monopo layer) |
| [`PRODUCT.md`](PRODUCT.md) | Users, positioning, operating context, principles |
| [`src/api/README.md`](src/api/README.md) | One paragraph per data-layer file |
| `docs/wave1..4/` | Build-wave reports: API kit, fixtures, UI, screens, motion, visual passes |
| `docs/e2e/` | Rendered screenshots of every route at 375 px and 1440 px |
| `docs/motion/` | Motion capture of the page transitions |
| `evidence/` | Supporting evidence collected for the thesis |

## Status

Working in mock mode end to end: login → Inicio → pond → batch → attend an alert. `pnpm build`,
`pnpm typecheck` and `pnpm lint` are clean (lint currently reports warnings only). Automated
end-to-end tests are not written yet; the `docs/e2e/` screenshots were captured by hand.
