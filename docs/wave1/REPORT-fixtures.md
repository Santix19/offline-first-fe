# Fixtures report

## Counts per key

- estanques: 3
- lotes: 3
- lecturas_agua: 1082
- alertas: 2
- conteos: 3
- mortalidades: 36
- alimentaciones: 108
- biometrias: 5
- dispositivos: 1
- sincronizaciones: 60
- parametros: rangos=3, tasas_alimentacion=5, factores_temperatura=5
- usuarios: 2

## Sample rows

Reading (lecturas_agua[0]):
```json
{"id":"05aac7bd-1b80-455d-864c-650cdb8c3a58","estanque_id":"aaaaaaaa-0000-0000-0000-000000000001","temp_c":13.33,"ph":7.34,"oxigeno_mg_l":7.05,"origen":"sensor","registrado_en":"2026-11-07T11:00:00Z"}
```

Alert (alertas[0]):
```json
{"id":"0057b6ad-ee05-4312-8961-1411fd7ab999","estanque_id":"aaaaaaaa-0000-0000-0000-000000000001","lectura_id":"cccccccc-0000-0000-0000-000000000001","lote_id":null,"disparada_por":"lectura_agua","variable":"temp_c","valor":19.4,"nivel":"critica","mensaje":"Temperatura alta: 19.4 °C (óptimo 10–16 °C)","medido_en":"2026-11-04T15:00:00Z","atendida":false,"atendida_en":null,"atendida_por":null}
```

Batch (lotes[0]):
```json
{"id":"bbbbbbbb-0000-0000-0000-000000000001","estanque_id":"aaaaaaaa-0000-0000-0000-000000000001","codigo":"L-2026-01","fecha_siembra":"2026-09-13","cantidad_inicial":5200,"peso_inicial_g":1.8,"estado":"activo","fecha_cierre":null,"actualizado_en":"2026-11-07T15:00:00Z"}
```

## Interpretations of the SQL

1. `gen_random_uuid()` for generated rows (lecturas, alertas, conteos, mortalidades, alimentaciones, biometrias, sincronizaciones) is non-deterministic. Replaced with a seeded PRNG (mulberry32, seed 0xC0FFEE) producing v4-shaped UUIDs. Output is deterministic across runs (verified by diff).
2. Fixed "now" anchored to `2026-11-07T15:00:00Z` (top of script). `CURRENT_DATE` taken as `2026-11-07` (UTC date of that instant).
3. `servidor_en`, `recibido_en`, `mv` (where not in the DTO), `creada_en`, `femenino` are dropped because the Java response DTOs (Catalog/Queries/Sync/Parameters) do not serialize them. `oxigeno_mg_l` is null for the two special readings (SQL only inserted temp_c/ph).
4. Date math uses UTC instants; `registrado_en` for alimentaciones subtracts `t` hours (7/16) on top of `d` days, matching `now() - (d || ' days')::interval - (t || ' hours')::interval`.
5. `sincronizaciones` does not exist in the seed. Derived one log per day for the 60-day window: `aceptados` = count of events (lecturas/conteos/mortalidades/alimentaciones/biometrias) whose `registrado_en` falls on that UTC day; `alertas_generadas` = alerts measured that day; duplicates/stale/rejected = 0; `servidor_en` = that day at 15:00Z. Stated in `_nota`.
6. `usuarios` are entirely invented (no SQL table in seed): ids and `activo`/`debe_cambiar_clave` set to true/false; documentos `1000000001`/`1000000002` as specified. Marked in top-level `_nota`.
7. `actualizado_en` for parametros uses the fixed now (SQL used `now()`).
8. JSON timestamps formatted without fractional seconds (all instants land on whole seconds).
9. `biometrias.peso_promedio_g` left as the raw double `1.8 + (54 - d) * 0.33` (no rounding in SQL).
10. `mv` omitted from WaterReadingResponse per DTO (SQL stores it but response does not expose it).

## Verification

- `node scripts/build-fixtures.mjs` runs and prints counts above.
- `src/mocks/data/db.json` parses as JSON (verified via node require).
- Output is deterministic (re-run diffed identical).
