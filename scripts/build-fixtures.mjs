// build-fixtures.mjs — deterministic mock db.json from _kit/backend/piloto.sql
// Plain Node, no dependencies. Fixed "now" = 2026-11-07T15:00:00Z.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const NOW = new Date('2026-11-07T15:00:00Z');
const CURRENT_DATE = new Date(Date.UTC(2026, 10, 7)); // 2026-11-07

// Seeded PRNG (mulberry32) used to emulate PostgreSQL gen_random_uuid() deterministically.
let seed = 0xC0FFEE;
function rand() {
  seed |= 0;
  seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function uuid() {
  const b = [];
  for (let i = 0; i < 16; i++) b.push(Math.floor(rand() * 256));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = b.map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function iso(d) { return d.toISOString().replace(/\.\d{3}Z$/, 'Z'); }
function dateStr(d) { return d.toISOString().slice(0, 10); }
function addDays(d, n) { return new Date(d.getTime() + n * 86400000); }
function addHours(d, n) { return new Date(d.getTime() + n * 3600000); }
function r2(x) { return Math.round(x * 100) / 100; }
function r3(x) { return Math.round(x * 1000) / 1000; }

// ---------- dispositivos ----------
const dispositivos = [{
  id: 'cel-demo',
  descripcion: 'Celular de demostración',
  activo: true,
  primer_visto_en: iso(addDays(NOW, -60)),
  ultimo_visto_en: iso(NOW),
}];

// ---------- estanques ----------
const estanques = [
  { id: 'aaaaaaaa-0000-0000-0000-000000000001', nombre: 'Demo Tanque 1',   tipo: 'tanque', volumen_m3: 18.0, activo: true, actualizado_en: iso(addDays(NOW, -60)) },
  { id: 'aaaaaaaa-0000-0000-0000-000000000002', nombre: 'Demo Tanque 2',   tipo: 'tanque', volumen_m3: 18.0, activo: true, actualizado_en: iso(addDays(NOW, -60)) },
  { id: 'aaaaaaaa-0000-0000-0000-000000000003', nombre: 'Demo Jaula Lago', tipo: 'jaula',  volumen_m3: 120.0, activo: true, actualizado_en: iso(addDays(NOW, -60)) },
];

// ---------- lotes ----------
const lotes = [
  { id: 'bbbbbbbb-0000-0000-0000-000000000001', estanque_id: 'aaaaaaaa-0000-0000-0000-000000000001', codigo: 'L-2026-01', fecha_siembra: dateStr(addDays(CURRENT_DATE, -55)), cantidad_inicial: 5200, peso_inicial_g: 1.8, estado: 'activo', fecha_cierre: null, actualizado_en: iso(NOW) },
  { id: 'bbbbbbbb-0000-0000-0000-000000000002', estanque_id: 'aaaaaaaa-0000-0000-0000-000000000002', codigo: 'L-2026-02', fecha_siembra: dateStr(addDays(CURRENT_DATE, -40)), cantidad_inicial: 4200, peso_inicial_g: 2.1, estado: 'activo', fecha_cierre: null, actualizado_en: iso(NOW) },
  { id: 'bbbbbbbb-0000-0000-0000-000000000003', estanque_id: 'aaaaaaaa-0000-0000-0000-000000000003', codigo: 'L-2025-11', fecha_siembra: dateStr(addDays(CURRENT_DATE, -58)), cantidad_inicial: 8000, peso_inicial_g: 1.5, estado: 'cerrado', fecha_cierre: dateStr(addDays(CURRENT_DATE, -10)), actualizado_en: iso(NOW) },
];

// ---------- lecturas_agua ----------
const lecturas = [];
const demoPonds = estanques; // all are Demo
for (const e of demoPonds) {
  for (let h = 1; h <= 60 * 6; h++) {
    lecturas.push({
      id: uuid(),
      estanque_id: e.id,
      temp_c: r2(13.0 + 2.0 * Math.sin(h / 6.0)),
      ph: r2(7.3 + 0.4 * Math.sin(h / 11.0)),
      oxigeno_mg_l: r2(7.0 + 0.8 * Math.sin(h / 17.0)),
      origen: 'sensor',
      registrado_en: iso(new Date(NOW.getTime() - h * 4 * 3600000)),
    });
  }
}
// special readings
lecturas.push({
  id: 'cccccccc-0000-0000-0000-000000000001',
  estanque_id: 'aaaaaaaa-0000-0000-0000-000000000001',
  temp_c: 19.4,
  ph: 7.2,
  oxigeno_mg_l: null,
  origen: 'sensor',
  registrado_en: iso(addDays(NOW, -3)),
});
lecturas.push({
  id: 'cccccccc-0000-0000-0000-000000000002',
  estanque_id: 'aaaaaaaa-0000-0000-0000-000000000001',
  temp_c: 14.1,
  ph: 6.2,
  oxigeno_mg_l: null,
  origen: 'sensor',
  registrado_en: iso(addHours(NOW, -26)),
});

// ---------- alertas ----------
const alertas = [
  {
    id: uuid(),
    estanque_id: 'aaaaaaaa-0000-0000-0000-000000000001',
    lectura_id: 'cccccccc-0000-0000-0000-000000000001',
    lote_id: null,
    disparada_por: 'lectura_agua',
    variable: 'temp_c',
    valor: 19.4,
    nivel: 'critica',
    mensaje: 'Temperatura alta: 19.4 °C (óptimo 10–16 °C)',
    medido_en: iso(addDays(NOW, -3)),
    atendida: false,
    atendida_en: null,
    atendida_por: null,
  },
  {
    id: uuid(),
    estanque_id: 'aaaaaaaa-0000-0000-0000-000000000001',
    lectura_id: 'cccccccc-0000-0000-0000-000000000002',
    lote_id: null,
    disparada_por: 'lectura_agua',
    variable: 'ph',
    valor: 6.2,
    nivel: 'advertencia',
    mensaje: 'pH bajo: 6.2 (óptimo 6.5–8.5)',
    medido_en: iso(addHours(NOW, -26)),
    atendida: false,
    atendida_en: null,
    atendida_por: null,
  },
];

// ---------- conteos ----------
const conteos = [
  { id: uuid(), lote_id: 'bbbbbbbb-0000-0000-0000-000000000001', total: 5140, cortes_multiples: 42, origen: 'contador', dispositivo_id: 'cel-demo', registrado_en: iso(addDays(NOW, -55)) },
  { id: uuid(), lote_id: 'bbbbbbbb-0000-0000-0000-000000000002', total: 4180, cortes_multiples: 31, origen: 'contador', dispositivo_id: 'cel-demo', registrado_en: iso(addDays(NOW, -40)) },
  { id: uuid(), lote_id: 'bbbbbbbb-0000-0000-0000-000000000003', total: 7890, cortes_multiples: 65, origen: 'contador', dispositivo_id: 'cel-demo', registrado_en: iso(addDays(NOW, -58)) },
];

// ---------- mortalidades ----------
const mortalidades = [];
for (let d = 1; d <= 54; d++) {
  if (d % 3 === 0) continue;
  mortalidades.push({
    id: uuid(),
    lote_id: 'bbbbbbbb-0000-0000-0000-000000000001',
    cantidad: (d % 4) + 1,
    causa: (d % 10 === 0) ? 'manipulación' : null,
    origen: 'voz',
    dispositivo_id: 'cel-demo',
    registrado_en: iso(addDays(NOW, -d)),
  });
}

// ---------- alimentaciones ----------
const alimentaciones = [];
for (let d = 1; d <= 54; d++) {
  for (const t of [7, 16]) {
    alimentaciones.push({
      id: uuid(),
      lote_id: 'bbbbbbbb-0000-0000-0000-000000000001',
      kg: r3(0.25 + (54 - d) * 0.012),
      origen: 'manual',
      dispositivo_id: 'cel-demo',
      registrado_en: iso(addHours(addDays(NOW, -d), -t)),
    });
  }
}

// ---------- biometrias ----------
const biometrias = [];
for (const d of [54, 40, 26, 12, 2]) {
  biometrias.push({
    id: uuid(),
    lote_id: 'bbbbbbbb-0000-0000-0000-000000000001',
    peso_promedio_g: 1.8 + (54 - d) * 0.33,
    muestra: 50,
    origen: 'manual',
    dispositivo_id: 'cel-demo',
    registrado_en: iso(addDays(NOW, -d)),
  });
}

// ---------- parametros ----------
const parametros = {
  rangos: [
    { variable: 'temp_c', nombre: 'Temperatura', unidad: ' °C', optimo_min: 10.0, optimo_max: 16.0, critico_min: 6.0, critico_max: 18.0, fuente: 'Valor de referencia sin citar: ajustar con el productor y citar AUNAP/FAO antes del piloto', actualizado_en: iso(NOW) },
    { variable: 'ph', nombre: 'pH', unidad: '', optimo_min: 6.5, optimo_max: 8.5, critico_min: 6.0, critico_max: 9.0, fuente: 'Valor de referencia sin citar: ajustar con el productor y citar AUNAP/FAO antes del piloto', actualizado_en: iso(NOW) },
    { variable: 'oxigeno_mg_l', nombre: 'Oxígeno disuelto', unidad: ' mg/L', optimo_min: 6.0, optimo_max: null, critico_min: 5.0, critico_max: null, fuente: 'Valor de referencia sin citar: ajustar con el productor y citar AUNAP/FAO antes del piloto', actualizado_en: iso(NOW) },
  ],
  tasas_alimentacion: [
    { orden: 1, peso_hasta_g: 1.0,  tasa_pct: 6.0, fuente: 'Valor de referencia sin citar: reemplazar por la tabla del fabricante del alimento' },
    { orden: 2, peso_hasta_g: 5.0,  tasa_pct: 4.5, fuente: 'Valor de referencia sin citar: reemplazar por la tabla del fabricante del alimento' },
    { orden: 3, peso_hasta_g: 20.0, tasa_pct: 3.0, fuente: 'Valor de referencia sin citar: reemplazar por la tabla del fabricante del alimento' },
    { orden: 4, peso_hasta_g: 50.0, tasa_pct: 2.2, fuente: 'Valor de referencia sin citar: reemplazar por la tabla del fabricante del alimento' },
    { orden: 5, peso_hasta_g: null, tasa_pct: 1.5, fuente: 'Valor de referencia sin citar: reemplazar por la tabla del fabricante del alimento' },
  ],
  factores_temperatura: [
    { orden: 1, temp_hasta_c: 8.0,  factor: 0.5,  fuente: 'Valor de referencia sin citar: ajustar con el productor y citar AUNAP/FAO' },
    { orden: 2, temp_hasta_c: 10.0, factor: 0.75, fuente: 'Valor de referencia sin citar: ajustar con el productor y citar AUNAP/FAO' },
    { orden: 3, temp_hasta_c: 16.0, factor: 1.0,  fuente: 'Valor de referencia sin citar: ajustar con el productor y citar AUNAP/FAO' },
    { orden: 4, temp_hasta_c: 18.0, factor: 0.7,  fuente: 'Valor de referencia sin citar: ajustar con el productor y citar AUNAP/FAO' },
    { orden: 5, temp_hasta_c: null, factor: 0.0,  fuente: 'Valor de referencia sin citar: ajustar con el productor y citar AUNAP/FAO' },
  ],
};

// ---------- usuarios ----------
const usuarios = [
  { id: uuid(), documento: '1000000001', nombre: 'Productor demo', rol: 'productor', activo: true, debe_cambiar_clave: false },
  { id: uuid(), documento: '1000000002', nombre: 'Cuidador demo', rol: 'cuidador', activo: true, debe_cambiar_clave: false },
];

// ---------- sincronizaciones (derived) ----------
// Bucket events and alerts by UTC date.
const eventCounts = {};
const alertCounts = {};
function bucket(map, isoStr) {
  const d = isoStr.slice(0, 10);
  map[d] = (map[d] || 0) + 1;
}
for (const r of lecturas) bucket(eventCounts, r.registrado_en);
for (const c of conteos) bucket(eventCounts, c.registrado_en);
for (const m of mortalidades) bucket(eventCounts, m.registrado_en);
for (const f of alimentaciones) bucket(eventCounts, f.registrado_en);
for (const b of biometrias) bucket(eventCounts, b.registrado_en);
for (const a of alertas) bucket(alertCounts, a.medido_en);

const sincronizaciones = [];
for (let d = 0; d < 60; d++) {
  const dayDate = addDays(NOW, -d);
  const dayKey = dayDate.toISOString().slice(0, 10);
  sincronizaciones.push({
    id: uuid(),
    dispositivo_id: 'cel-demo',
    aceptados: eventCounts[dayKey] || 0,
    duplicados: 0,
    obsoletos: 0,
    rechazados: 0,
    alertas_generadas: alertCounts[dayKey] || 0,
    servidor_en: iso(dayDate),
  });
}

const db = {
  _nota: 'Valores inventados unicamente: usuarios (documentos 1000000001/1000000002, ids, activo, debe_cambiar_clave) y los ids generados con PRNG semilla para emular gen_random_uuid() de PostgreSQL. sincronizaciones derivadas (una por dia) a partir de los eventos del seed. Todo lo demas sale de _kit/backend/piloto.sql y las migraciones V17/V19.',
  estanques,
  lotes,
  lecturas_agua: lecturas,
  alertas,
  conteos,
  mortalidades,
  alimentaciones,
  biometrias,
  dispositivos,
  sincronizaciones,
  parametros,
  usuarios,
};

const outDir = path.join(ROOT, 'src', 'mocks', 'data');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'db.json');
fs.writeFileSync(outPath, JSON.stringify(db, null, 2) + '\n', 'utf8');

// print counts
for (const k of ['estanques','lotes','lecturas_agua','alertas','conteos','mortalidades','alimentaciones','biometrias','dispositivos','sincronizaciones','usuarios']) {
  console.log(`${k}: ${db[k].length}`);
}
console.log('parametros: rangos=%d tasas=%d factores=%d', db.parametros.rangos.length, db.parametros.tasas_alimentacion.length, db.parametros.factores_temperatura.length);
console.log('written', outPath);
