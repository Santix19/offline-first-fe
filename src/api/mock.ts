/**
 * Fixture-backed transport for `VITE_MOCK=1`.
 *
 * The file `src/mocks/data/db.json` (built by the fixtures agent) is an in-memory database of API
 * response objects. Mutations write to that copy, so a session behaves like a real one until the
 * tab reloads. Derived endpoints (batch summary, daily readings) are computed here with the rules
 * from the backend README "Resumen del lote"; the AI routes answer the backend's "not available"
 * shape. Every response waits 300-600 ms so loading states are visible.
 */
import { ApiError } from './http'
import type { RequestOptions } from './http'
import dbRaw from '../mocks/data/db.json?raw'
import type {
  AlertResponse,
  BatchResponse,
  BatchSummary,
  BiometryResponse,
  DailyReadings,
  DeviceResponse,
  FeedingResponse,
  FindingResponse,
  ForecastJson,
  FryCountResponse,
  MortalityResponse,
  ParametersResponse,
  PondResponse,
  SessionResponse,
  SyncLogResponse,
  TemporaryPassword,
  UserResponse,
  WaterReadingResponse,
} from './types'

interface MockDb {
  estanques: PondResponse[]
  lotes: BatchResponse[]
  lecturas_agua: WaterReadingResponse[]
  alertas: AlertResponse[]
  conteos: FryCountResponse[]
  mortalidades: MortalityResponse[]
  alimentaciones: FeedingResponse[]
  biometrias: BiometryResponse[]
  dispositivos: DeviceResponse[]
  sincronizaciones: SyncLogResponse[]
  parametros: ParametersResponse
  usuarios: UserResponse[]
  hallazgos?: FindingResponse[]
  _nota?: string
}

const db = JSON.parse(dbRaw) as MockDb

function clone<T>(value: T): T {
  return structuredClone(value)
}

function delay(): Promise<void> {
  const ms = 300 + Math.floor(Math.random() * 301)
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function nowIso(): string {
  return new Date().toISOString()
}

function readBody<T>(body: unknown): T {
  return (body ?? {}) as T
}

function mergeDefined<T extends object>(target: T, patch: Partial<T>): T {
  const writable = target as Record<string, unknown>
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) writable[key] = value
  }
  return target
}

function notFound(segments: string[]): ApiError {
  return new ApiError(404, `La ruta /${segments.join('/')} no existe`)
}

function methodNotAllowed(method: string): ApiError {
  return new ApiError(405, `Método ${method} no permitido en esta ruta`)
}

function primaryUser(): UserResponse {
  const user = db.usuarios[0]
  if (!user) throw new ApiError(500, 'El fixture no trae usuarios')
  return user
}

function findPond(id: string): PondResponse {
  const pond = db.estanques.find((row) => row.id === id)
  if (!pond) throw new ApiError(404, 'No existe el estanque solicitado')
  return pond
}

function findBatch(id: string): BatchResponse {
  const batch = db.lotes.find((row) => row.id === id)
  if (!batch) throw new ApiError(404, 'No existe el lote solicitado')
  return batch
}

// ---------- Bogotá time ----------

const bogotaFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Bogota',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function bogotaDate(value: string | Date): string {
  const parts = bogotaFormatter.formatToParts(typeof value === 'string' ? new Date(value) : value)
  const pick = (type: string): string => parts.find((part) => part.type === type)?.value ?? ''
  return `${pick('year')}-${pick('month')}-${pick('day')}`
}

function dayNumber(date: string): number {
  const [year, month, day] = date.split('-').map(Number)
  return Date.UTC(year, month - 1, day) / 86_400_000
}

function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from)
}

function addDays(date: string, delta: number): string {
  return new Date((dayNumber(date) + delta) * 86_400_000).toISOString().slice(0, 10)
}

// ---------- Small numeric helpers ----------

function sum(values: Array<number | null>): number {
  return values.reduce<number>(
    (total, value) => total + (typeof value === 'number' ? value : 0),
    0,
  )
}

function stats(values: Array<number | null>): {
  min: number | null
  max: number | null
  avg: number | null
} {
  const numbers = values.filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value),
  )
  if (numbers.length === 0) return { min: null, max: null, avg: null }
  return {
    min: Math.min(...numbers),
    max: Math.max(...numbers),
    avg: numbers.reduce((total, value) => total + value, 0) / numbers.length,
  }
}

function byInstantDesc<T>(pick: (row: T) => string): (a: T, b: T) => number {
  return (a, b) => Date.parse(pick(b)) - Date.parse(pick(a))
}

function limitOf(query: Record<string, string>, fallback: number): number {
  const parsed = Number(query.limite)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

// ---------- Readings ----------

function pondReadings(pondId: string, query: Record<string, string>): WaterReadingResponse[] {
  const since = query.desde ? Date.parse(query.desde) : null
  const until = query.hasta ? Date.parse(query.hasta) : null
  const limit = limitOf(query, 500)

  return db.lecturas_agua
    .filter((reading) => reading.estanque_id === pondId)
    .filter((reading) => since === null || Date.parse(reading.registrado_en) >= since)
    .filter((reading) => until === null || Date.parse(reading.registrado_en) <= until)
    .sort(byInstantDesc((reading) => reading.registrado_en))
    .slice(0, limit)
}

function dailyReadings(pondId: string, requestedDays: number): DailyReadings[] {
  const days =
    Number.isFinite(requestedDays) && requestedDays > 0 ? Math.floor(requestedDays) : 7
  const today = bogotaDate(new Date())
  const firstDay = addDays(today, -(days - 1))
  const groups = new Map<string, WaterReadingResponse[]>()

  for (const reading of db.lecturas_agua) {
    if (reading.estanque_id !== pondId) continue
    const date = bogotaDate(reading.registrado_en)
    if (date < firstDay || date > today) continue
    const group = groups.get(date)
    if (group) group.push(reading)
    else groups.set(date, [reading])
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, rows]) => {
      const temperature = stats(rows.map((row) => row.temp_c))
      const ph = stats(rows.map((row) => row.ph))
      return {
        fecha: date,
        lecturas: rows.length,
        temp_min: temperature.min,
        temp_max: temperature.max,
        temp_promedio: temperature.avg,
        ph_min: ph.min,
        ph_max: ph.max,
        ph_promedio: ph.avg,
      }
    })
}

function csvFromReadings(readings: WaterReadingResponse[]): string {
  const cell = (value: number | null): string => (value !== null ? String(value) : '')
  const lines = ['registrado_en,temp_c,ph,oxigeno_mg_l,origen']
  for (let index = readings.length - 1; index >= 0; index -= 1) {
    const reading = readings[index]
    lines.push(
      [
        reading.registrado_en,
        cell(reading.temp_c),
        cell(reading.ph),
        cell(reading.oxigeno_mg_l),
        reading.origen,
      ].join(','),
    )
  }
  return `${lines.join('\n')}\n`
}

/** The backend's "AI off" answer for the forecast: no days and a sentence saying so. */
function unavailableForecast(): ForecastJson {
  return {
    dias: [],
    error_tipico: null,
    reaccion_horas: null,
    lecturas_usadas: 0,
    mensaje:
      'El servicio de IA no está disponible en este momento. El registro y las alertas de umbral siguen funcionando.',
  }
}

// ---------- Batch summary (README "Resumen del lote") ----------

function batchSummary(batchId: string): BatchSummary {
  const batch = findBatch(batchId)
  const counts = db.conteos
    .filter((row) => row.lote_id === batchId)
    .sort(byInstantDesc((row) => row.registrado_en))
  const lastCount = counts[0]
  const deaths = db.mortalidades.filter((row) => row.lote_id === batchId)
  const totalMortality = sum(deaths.map((row) => row.cantidad))

  // Population: last count minus deaths recorded after it (all deaths when there is no count).
  const deathsAfterCount = lastCount
    ? sum(
        deaths
          .filter(
            (row) => Date.parse(row.registrado_en) > Date.parse(lastCount.registrado_en),
          )
          .map((row) => row.cantidad),
      )
    : totalMortality

  const populationBase = lastCount ? lastCount.total : batch.cantidad_inicial
  const population =
    populationBase === null || populationBase === undefined
      ? null
      : Math.max(0, populationBase - deathsAfterCount)

  const initial = batch.cantidad_inicial
  const survivalPct =
    initial !== null && initial > 0 && population !== null
      ? (population / initial) * 100
      : null

  const biometrics = db.biometrias
    .filter((row) => row.lote_id === batchId)
    .sort(byInstantDesc((row) => row.registrado_en))
  const averageWeight = biometrics[0]?.peso_promedio_g ?? batch.peso_inicial_g

  const biomassKg =
    population !== null && averageWeight !== null
      ? (population * averageWeight) / 1000
      : null

  const pond = db.estanques.find((row) => row.id === batch.estanque_id)
  const densityKgM3 =
    biomassKg !== null && pond?.volumen_m3 ? biomassKg / pond.volumen_m3 : null

  const pondReadingsList = db.lecturas_agua
    .filter((row) => row.estanque_id === batch.estanque_id)
    .sort(byInstantDesc((row) => row.registrado_en))
  const lastReading = pondReadingsList[0]
  const lastTemperature = lastReading?.temp_c ?? null

  const parameters = db.parametros
  const rates = [...(parameters?.tasas_alimentacion ?? [])].sort(
    (left, right) => left.orden - right.orden,
  )
  const rate =
    averageWeight !== null
      ? rates.find(
          (row) => row.peso_hasta_g === null || averageWeight <= row.peso_hasta_g,
        )
      : undefined

  const factors = [...(parameters?.factores_temperatura ?? [])].sort(
    (left, right) => left.orden - right.orden,
  )
  const factor =
    lastTemperature !== null
      ? factors.find(
          (row) => row.temp_hasta_c === null || lastTemperature <= row.temp_hasta_c,
        )
      : undefined

  const feedingPct = rate ? rate.tasa_pct * (factor ? factor.factor : 1) : null
  const dailyRationKg =
    biomassKg !== null && feedingPct !== null ? (biomassKg * feedingPct) / 100 : null

  const feedings = db.alimentaciones.filter((row) => row.lote_id === batchId)
  const totalFeedKg = sum(feedings.map((row) => row.kg))
  const weekAgo = Date.now() - 7 * 86_400_000
  const feedLastWeekKg = sum(
    feedings
      .filter((row) => Date.parse(row.registrado_en) >= weekAgo)
      .map((row) => row.kg),
  )

  const initialBiomassKg =
    initial !== null && batch.peso_inicial_g !== null
      ? (initial * batch.peso_inicial_g) / 1000
      : null
  const gainedKg =
    biomassKg !== null && initialBiomassKg !== null ? biomassKg - initialBiomassKg : null
  const feedConversion =
    gainedKg !== null && gainedKg > 0 ? totalFeedKg / gainedKg : null

  const pendingAlerts = db.alertas.filter(
    (alert) =>
      !alert.atendida &&
      (alert.estanque_id === batch.estanque_id || alert.lote_id === batchId),
  ).length

  const notes: string[] = []
  if (!lastCount) {
    notes.push('Sin conteos: la población se estima con la cantidad inicial menos la mortalidad.')
  }
  if (biometrics.length === 0) {
    notes.push('Sin biometrías: el peso promedio es el de siembra.')
  }
  if (lastTemperature === null) {
    notes.push('Sin lecturas de agua: la ración no se ajustó por temperatura.')
  }
  if (feedConversion === null) {
    notes.push('Sin ganancia de biomasa suficiente: no se puede calcular la conversión alimenticia.')
  }

  const cultureDays = batch.fecha_siembra
    ? Math.max(0, daysBetween(batch.fecha_siembra, bogotaDate(new Date())))
    : null

  return {
    lote_id: batch.id,
    codigo: batch.codigo,
    estanque_id: batch.estanque_id,
    dias_cultivo: cultureDays,
    cantidad_inicial: initial,
    poblacion_estimada: population,
    mortalidad_total: totalMortality,
    supervivencia_pct: survivalPct,
    peso_promedio_g: averageWeight,
    biomasa_kg: biomassKg,
    densidad_kg_m3: densityKgM3,
    ultima_temperatura_c: lastTemperature,
    ultima_lectura_en: lastReading?.registrado_en ?? null,
    tasa_alimentacion_pct: feedingPct,
    racion_diaria_kg: dailyRationKg,
    alimento_ultima_semana_kg: feedLastWeekKg,
    alimento_total_kg: totalFeedKg,
    conversion_alimenticia: feedConversion,
    alertas_pendientes: pendingAlerts,
    notas: notes,
  }
}

function projectionUnavailable(): never {
  throw new ApiError(
    503,
    'El servicio de IA no está disponible en este momento. El registro y las alertas de umbral siguen funcionando.',
  )
}

// ---------- Routing ----------

function route(
  method: string,
  segments: string[],
  query: Record<string, string>,
  body: unknown,
): unknown {
  const resource = segments[1]
  const id = segments[2]
  const sub = segments[3]
  const sub2 = segments[4]

  if (resource === 'auth') {
    if (id === 'sesion') {
      if (method === 'POST') return mockLogin()
      if (method === 'DELETE') return undefined
    }
    if (id === 'clave' && method === 'POST') {
      const input = readBody<{ clave_actual?: string; clave_nueva?: string }>(body)
      const next = input.clave_nueva ?? ''
      if (next.length < 8 || next.length > 72) {
        throw new ApiError(422, 'clave_nueva: debe tener entre 8 y 72 caracteres')
      }
      const user = db.usuarios[0]
      if (user) user.debe_cambiar_clave = false
      return undefined
    }
    if (id === 'yo' && method === 'GET') return clone(primaryUser())
    throw notFound(segments)
  }

  if (resource === 'estanques') {
    if (!id) {
      if (method === 'GET') {
        return clone([...db.estanques].sort((a, b) => a.nombre.localeCompare(b.nombre)))
      }
      if (method === 'POST') {
        const input = readBody<{
          id?: string | null
          nombre?: string
          tipo?: PondResponse['tipo']
          volumen_m3?: number | null
        }>(body)
        const name = (input.nombre ?? '').trim()
        if (!name) throw new ApiError(422, 'nombre: no debe estar vacío')
        const pond: PondResponse = {
          id: input.id ?? crypto.randomUUID(),
          nombre: name,
          tipo: input.tipo ?? 'estanque',
          volumen_m3: input.volumen_m3 ?? null,
          activo: true,
          actualizado_en: nowIso(),
        }
        db.estanques.push(pond)
        return clone(pond)
      }
      throw methodNotAllowed(method)
    }

    const pond = findPond(id)
    if (!sub) {
      if (method === 'GET') return clone(pond)
      if (method === 'PATCH') {
        const input = readBody<Partial<PondResponse>>(body)
        mergeDefined(pond, input)
        pond.actualizado_en = nowIso()
        return clone(pond)
      }
      throw methodNotAllowed(method)
    }

    if (sub === 'lecturas.csv') {
      if (method !== 'GET') throw methodNotAllowed(method)
      return csvFromReadings(pondReadings(id, { ...query, limite: '5000' }))
    }
    if (sub === 'lecturas') {
      if (sub2 === 'diario') {
        if (method !== 'GET') throw methodNotAllowed(method)
        return clone(dailyReadings(id, Number(query.dias ?? 7)))
      }
      if (method !== 'GET') throw methodNotAllowed(method)
      return clone(pondReadings(id, query))
    }
    if (sub === 'pronostico-temperatura') {
      if (method !== 'GET') throw methodNotAllowed(method)
      return clone(unavailableForecast())
    }
    if (sub === 'hallazgos') {
      if (method !== 'GET') throw methodNotAllowed(method)
      return clone(
        (db.hallazgos ?? [])
          .filter((finding) => finding.estanque_id === id)
          .sort(byInstantDesc((finding) => finding.creado_en)),
      )
    }
    throw notFound(segments)
  }

  if (resource === 'lotes') {
    if (!id) {
      if (method === 'GET') {
        const rows = db.lotes
          .filter((batch) => !query.estanque_id || batch.estanque_id === query.estanque_id)
          .filter((batch) => !query.estado || batch.estado === query.estado)
          .sort((a, b) => a.codigo.localeCompare(b.codigo))
        return clone(rows)
      }
      if (method === 'POST') {
        const input = readBody<{
          id?: string | null
          estanque_id?: string
          codigo?: string
          fecha_siembra?: string
          cantidad_inicial?: number | null
          peso_inicial_g?: number | null
          estado?: BatchResponse['estado']
          fecha_cierre?: string | null
        }>(body)
        if (!input.estanque_id) throw new ApiError(422, 'estanque_id: no debe estar vacío')
        findPond(input.estanque_id)
        const code = (input.codigo ?? '').trim()
        if (!code) throw new ApiError(422, 'codigo: no debe estar vacío')
        const batch: BatchResponse = {
          id: input.id ?? crypto.randomUUID(),
          estanque_id: input.estanque_id,
          codigo: code,
          fecha_siembra: input.fecha_siembra ?? bogotaDate(new Date()),
          cantidad_inicial: input.cantidad_inicial ?? null,
          peso_inicial_g: input.peso_inicial_g ?? null,
          estado: input.estado ?? 'activo',
          fecha_cierre: input.fecha_cierre ?? null,
          actualizado_en: nowIso(),
        }
        db.lotes.push(batch)
        return clone(batch)
      }
      throw methodNotAllowed(method)
    }

    const batch = findBatch(id)
    if (!sub) {
      if (method === 'GET') return clone(batch)
      if (method === 'PATCH') {
        const input = readBody<Partial<BatchResponse>>(body)
        mergeDefined(batch, input)
        batch.actualizado_en = nowIso()
        return clone(batch)
      }
      throw methodNotAllowed(method)
    }

    if (method !== 'GET') throw methodNotAllowed(method)

    switch (sub) {
      case 'resumen':
        return clone(batchSummary(id))
      case 'proyeccion':
        return projectionUnavailable()
      case 'conteos':
        return clone(
          db.conteos
            .filter((row) => row.lote_id === id)
            .sort(byInstantDesc((row) => row.registrado_en))
            .slice(0, limitOf(query, 100)),
        )
      case 'mortalidades':
        return clone(
          db.mortalidades
            .filter((row) => row.lote_id === id)
            .sort(byInstantDesc((row) => row.registrado_en))
            .slice(0, limitOf(query, 100)),
        )
      case 'alimentaciones':
        return clone(
          db.alimentaciones
            .filter((row) => row.lote_id === id)
            .sort(byInstantDesc((row) => row.registrado_en))
            .slice(0, limitOf(query, 100)),
        )
      case 'biometrias':
        return clone(
          db.biometrias
            .filter((row) => row.lote_id === id)
            .sort(byInstantDesc((row) => row.registrado_en))
            .slice(0, limitOf(query, 100)),
        )
      case 'hallazgos':
        return clone(
          (db.hallazgos ?? [])
            .filter((finding) => finding.lote_id === id)
            .sort(byInstantDesc((finding) => finding.creado_en)),
        )
      default:
        throw notFound(segments)
    }
  }

  if (resource === 'alertas') {
    if (!id && method === 'GET') {
      const pendingOnly = query.pendientes !== 'false'
      const rows = db.alertas
        .filter((alert) => !pendingOnly || !alert.atendida)
        .filter((alert) => !query.estanque_id || alert.estanque_id === query.estanque_id)
        .sort(
          byInstantDesc((alert) => alert.medido_en ?? '1970-01-01T00:00:00Z'),
        )
        .slice(0, limitOf(query, 100))
      return clone(rows)
    }
    if (id && sub === 'atender' && method === 'POST') {
      const alert = db.alertas.find((row) => row.id === id)
      if (!alert) throw new ApiError(404, 'No existe la alerta solicitada')
      alert.atendida = true
      alert.atendida_en = nowIso()
      alert.atendida_por = query.dispositivo_id || 'panel'
      return clone(alert)
    }
    throw notFound(segments)
  }

  if (resource === 'hallazgos') {
    if (!id && method === 'GET') {
      return clone(
        (db.hallazgos ?? [])
          .filter((finding) => !finding.atendido)
          .sort(byInstantDesc((finding) => finding.creado_en)),
      )
    }
    if (id && sub === 'atender' && method === 'POST') {
      const finding = (db.hallazgos ?? []).find((row) => row.id === id)
      if (!finding) throw new ApiError(404, 'No existe el hallazgo solicitado')
      finding.atendido = true
      finding.atendido_en = nowIso()
      finding.atendido_por = query.dispositivo_id || 'panel'
      return clone(finding)
    }
    throw notFound(segments)
  }

  if (resource === 'parametros') {
    if (method !== 'GET') throw methodNotAllowed(method)
    return clone(db.parametros)
  }

  if (resource === 'dispositivos') {
    if (!id) {
      if (method !== 'GET') throw methodNotAllowed(method)
      return clone(
        [...db.dispositivos].sort(byInstantDesc((device) => device.ultimo_visto_en)),
      )
    }
    const device = db.dispositivos.find((row) => row.id === id)
    if (!device) throw new ApiError(404, 'No existe el dispositivo solicitado')
    if (method !== 'PATCH') throw methodNotAllowed(method)
    const input = readBody<Partial<DeviceResponse>>(body)
    mergeDefined(device, input)
    return clone(device)
  }

  if (resource === 'sincronizaciones') {
    if (method !== 'GET') throw methodNotAllowed(method)
    return clone(
      db.sincronizaciones
        .filter(
          (row) => !query.dispositivo_id || row.dispositivo_id === query.dispositivo_id,
        )
        .sort(byInstantDesc((row) => row.servidor_en)),
    )
  }

  if (resource === 'usuarios') {
    if (!id && method === 'GET') {
      return clone([...db.usuarios].sort((a, b) => a.nombre.localeCompare(b.nombre)))
    }
    const user = db.usuarios.find((row) => row.id === id)
    if (!user) throw new ApiError(404, 'No existe el usuario solicitado')

    if (!sub && method === 'PATCH') {
      const input = readBody<Partial<UserResponse>>(body)
      mergeDefined(user, input)
      return clone(user)
    }
    if (sub === 'clave-temporal' && method === 'POST') {
      user.debe_cambiar_clave = true
      const result: TemporaryPassword = {
        clave_temporal: 'Temporal-2026',
        usuario: clone(user),
      }
      return result
    }
    throw notFound(segments)
  }

  if (resource === 'ia') {
    if (id === 'disponible' && method === 'GET') return { disponible: false }
    throw notFound(segments)
  }

  throw notFound(segments)
}

function mockLogin(): SessionResponse {
  return {
    token: 'mock-sesion',
    expira_en: new Date(Date.now() + 180 * 86_400_000).toISOString(),
    usuario: clone(primaryUser()),
  }
}

/** Same signature as `request()`, so http.ts can delegate without knowing anything else. */
export async function mockRequest<T>(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  await delay()

  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined && value !== null) search.set(key, String(value))
  }

  const suffix = search.toString()
  const url = new URL(`${path}${suffix ? `?${suffix}` : ''}`, 'http://mock.local')
  const segments = url.pathname.split('/').filter(Boolean)
  const query: Record<string, string> = {}
  for (const [key, value] of url.searchParams.entries()) query[key] = value

  if (segments[0] !== 'api') throw notFound(segments)

  const result = route(method.toUpperCase(), segments, query, options.body)
  return result as T
}
