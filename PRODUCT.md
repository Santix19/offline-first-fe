# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Productor (farm owner) and cuidador (caretaker), weighted equally. The cuidador opens it on a phone at the pond to read water state and attend alerts; the productor reviews batches, biomass and findings, from office or phone. The thesis jury is an audience of the showcase site (`../la-cocha`), not of this panel.

## Product Purpose

The daily work panel for a trout farm at Laguna de La Cocha: what needs attention today, how each pond's water is, how each batch is growing. It exists so nothing pending (alerts, findings, stale devices) goes unattended. Success means alerts and findings get attended the same day they appear.

## Positioning

The panel is the readout of an offline-first thesis system (caretaker phone app + ESP32 counter + Java/Spring backend): pond readings, batch tracking and AI findings in one place, with every number traceable to the backend's field names and every range showing its source. A generic farm dashboard could not truthfully show this farm's optimal/critical ranges, its sync log, or its per-batch projection.

## Operating Context

Ponds near Laguna de La Cocha, Narino. Readings (pH, temperature, fry counts, mortality, feeding, biometrics) arrive when the caretaker's phone syncs; the backend raises alerts and per-batch summaries. The panel reads via Bearer-token API with live SSE invalidation (`fetch` + ReadableStream, not EventSource). Free-plan hosting sleeps: first request can take ~1 min. Times shown in America/Bogota, relative for recency with absolute on hover. Numbers in `es-CO` with units always. Mock mode (`VITE_MOCK=1`) runs the panel without the backend using seed fixtures.

## Capabilities and Constraints

Confirmed: auth with documento + clave, forced password change, roles (only productor sees Usuarios); Inicio with pending-first list, pond cards with RangeBars, active batches; pond detail with stacked small-multiple charts (optimal band + critical lines), forecast, CSV; batch detail with weight curve + projection, mortality/feeding histories, close batch; alerts/findings attend flow with optimistic update; devices with stale flag + sync log; read-only parametros with fuente; user management with one-time temp password. Server errors are always `{"detalle"}` in Spanish and surface verbatim. Never invent numbers: mock values come from the seed SQL formulas. Registration is the phone app's flow, not the panel's. Out of scope: push/pull sync, webhooks, AI internals, offline mode, i18n. Responsive floor: Inicio, Alertas and pond detail must work at 375px with no page-level horizontal scroll.

## Brand Commitments

Name "La Cocha". UI copy in Colombian neutral Spanish, no em dashes; code in English. Status is always icon + word + color, never color alone. One primary action per view. No invented testimonials, photos, or logo: none exist.

## Evidence on Hand

Backend DTOs in `../backend/src/main/java/com/lacocha/backend/dto/` (field-name source of truth, snake_case JSON). Seed fixtures from `../backend/src/main/resources/db/semilla/piloto.sql`. Screens and endpoints per `SPEC.md`; visual system per `DESIGN.md` + `src/styles/tokens.css`. Pending explicitly, not to be fabricated: thesis defense date, author names, university/program, real thresholds beyond `fuente`, pond/counter photos.

## Product Principles

1. Attention first: anything pending is the first thing on the screen that holds it, worded as what to do.
2. Every number earns its place: value, unit, recency, and range source travel together; no naked figures.
3. The server's word stands: show `detalle` text and `fuente` values as received, never paraphrased or generic.
4. Field-ready: a phone at the pond on mobile data gets the same answers as the office, with skeletons and honest loading states, never a frozen spinner.
5. Explain, don't decorate: motion and color exist to mark state changes, not to perform.

## Accessibility & Inclusion

Phone-at-the-pond use implies sunlight, one hand, and small text risks: contrast >= 4.5:1 for body, status never by color alone, 44px minimum targets. Reduced-motion path required for every animation (opacity-only, no count-up/stagger/line-draw, static pond frame).
