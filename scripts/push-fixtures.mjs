// Loads the demo seed (src/mocks/data/db.json, rebuilt from the backend's piloto.sql) into a running
// backend through the phone's own route, POST /api/sync/push, in chunks of 500 events.
// Usage: API_URL=http://localhost:8080 API_KEY=cambia-esta-clave node scripts/push-fixtures.mjs
// Re-running is safe: the backend answers repeated event ids as "duplicados".
import { readFileSync } from 'node:fs'

const API = process.env.API_URL ?? 'http://localhost:8080'
const KEY = process.env.API_KEY ?? 'cambia-esta-clave'
const db = JSON.parse(readFileSync(new URL('../src/mocks/data/db.json', import.meta.url), 'utf8'))
const DEVICE = db.dispositivos[0]?.id ?? 'cel-demo'

const pick = (row, keys) => Object.fromEntries(keys.filter((k) => row[k] != null).map((k) => [k, row[k]]))
const events = [
  ...db.lecturas_agua.map((r) => ({ tipo: 'lectura_agua', ...pick(r, ['id', 'estanque_id', 'temp_c', 'ph', 'oxigeno_mg_l', 'origen', 'registrado_en']) })),
  ...db.conteos.map((r) => ({ tipo: 'conteo', ...pick(r, ['id', 'lote_id', 'total', 'cortes_multiples', 'origen', 'registrado_en']) })),
  ...db.mortalidades.map((r) => ({ tipo: 'mortalidad', ...pick(r, ['id', 'lote_id', 'cantidad', 'causa', 'origen', 'registrado_en']) })),
  ...db.alimentaciones.map((r) => ({ tipo: 'alimentacion', ...pick(r, ['id', 'lote_id', 'kg', 'origen', 'registrado_en']) })),
  ...db.biometrias.map((r) => ({ tipo: 'biometria', ...pick(r, ['id', 'lote_id', 'peso_promedio_g', 'muestra', 'origen', 'registrado_en']) })),
].sort((a, b) => a.registrado_en.localeCompare(b.registrado_en))

async function push(body) {
  const res = await fetch(`${API}/api/sync/push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': KEY },
    body: JSON.stringify({ dispositivo_id: DEVICE, ...body }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(json)}`)
  return json
}

const totals = { aceptados: 0, duplicados: 0, obsoletos: 0, rechazados: 0, alertas_generadas: 0 }
const add = (r) => { for (const k of Object.keys(totals)) totals[k] += Array.isArray(r[k]) ? r[k].length : (r[k] ?? 0) }

add(await push({
  estanques: db.estanques.map((p) => pick(p, ['id', 'nombre', 'tipo', 'volumen_m3', 'activo', 'actualizado_en'])),
  lotes: db.lotes.map((b) => pick(b, ['id', 'estanque_id', 'codigo', 'fecha_siembra', 'cantidad_inicial', 'peso_inicial_g', 'estado', 'fecha_cierre', 'actualizado_en'])),
  eventos: [],
}))
for (let i = 0; i < events.length; i += 500) {
  const r = await push({ eventos: events.slice(i, i + 500) })
  add(r)
  if (Array.isArray(r.rechazados) && r.rechazados.length) console.log('rechazados (first 3):', JSON.stringify(r.rechazados.slice(0, 3)))
}
console.log(`${events.length} events sent`, totals)
