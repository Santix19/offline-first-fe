/**
 * One typed function per backend route the panel uses. No React here, no query keys: this is the
 * layer a test or a one-off action can call directly.
 *
 * Route table: SPEC.md "Screens" + _kit/backend/controller/*.java. Query names are the Spanish
 * ones the controllers declare (`desde`, `hasta`, `limite`, `pendientes`, ...).
 */
import { ApiError, authHeaders, buildUrl, isMockMode, request } from './http'
import type {
  AiAvailable,
  AlertFilters,
  AlertResponse,
  BatchCreate,
  BatchFilters,
  BatchResponse,
  BatchSummary,
  BatchUpdate,
  BiometryResponse,
  DailyReadings,
  DateRangeQuery,
  DeviceResponse,
  DeviceUpdate,
  FeedingResponse,
  FindingResponse,
  ForecastJson,
  FryCountResponse,
  MortalityResponse,
  ParametersResponse,
  PondCreate,
  PondResponse,
  PondUpdate,
  ProjectionJson,
  ReadingQuery,
  SyncLogFilters,
  SyncLogResponse,
  TemporaryPassword,
  UserResponse,
  UserUpdate,
  UUID,
  WaterReadingResponse,
} from './types'

// ---------- Auth ----------

export function me(): Promise<UserResponse> {
  return request<UserResponse>('GET', '/api/auth/yo')
}

// ---------- Ponds ----------

export function listPonds(): Promise<PondResponse[]> {
  return request<PondResponse[]>('GET', '/api/estanques')
}

export function getPond(id: UUID): Promise<PondResponse> {
  return request<PondResponse>('GET', `/api/estanques/${encodeURIComponent(id)}`)
}

export function createPond(body: PondCreate): Promise<PondResponse> {
  return request<PondResponse>('POST', '/api/estanques', { body })
}

export function updatePond(id: UUID, body: PondUpdate): Promise<PondResponse> {
  return request<PondResponse>('PATCH', `/api/estanques/${encodeURIComponent(id)}`, { body })
}

// ---------- Batches ----------

export function listBatches(filters: BatchFilters = {}): Promise<BatchResponse[]> {
  return request<BatchResponse[]>('GET', '/api/lotes', {
    query: { estanque_id: filters.estanque_id, estado: filters.estado },
  })
}

export function getBatch(id: UUID): Promise<BatchResponse> {
  return request<BatchResponse>('GET', `/api/lotes/${encodeURIComponent(id)}`)
}

export function createBatch(body: BatchCreate): Promise<BatchResponse> {
  return request<BatchResponse>('POST', '/api/lotes', { body })
}

export function updateBatch(id: UUID, body: BatchUpdate): Promise<BatchResponse> {
  return request<BatchResponse>('PATCH', `/api/lotes/${encodeURIComponent(id)}`, { body })
}

// ---------- Water readings and forecast ----------

export function pondReadings(
  id: UUID,
  query: ReadingQuery = {},
): Promise<WaterReadingResponse[]> {
  return request<WaterReadingResponse[]>(
    'GET',
    `/api/estanques/${encodeURIComponent(id)}/lecturas`,
    { query: { desde: query.desde, hasta: query.hasta, limite: query.limite } },
  )
}

export function pondDailyReadings(id: UUID, dias = 7): Promise<DailyReadings[]> {
  return request<DailyReadings[]>(
    'GET',
    `/api/estanques/${encodeURIComponent(id)}/lecturas/diario`,
    { query: { dias } },
  )
}

/** GET /api/estanques/{id}/pronostico-temperatura. Empty `dias` + `mensaje` when the AI is off. */
export function pondForecast(id: UUID, dias = 2): Promise<ForecastJson> {
  return request<ForecastJson>(
    'GET',
    `/api/estanques/${encodeURIComponent(id)}/pronostico-temperatura`,
    { query: { dias } },
  )
}

export function pondReadingsCsvUrl(id: UUID, query: DateRangeQuery = {}): string {
  return buildUrl(`/api/estanques/${encodeURIComponent(id)}/lecturas.csv`, {
    desde: query.desde,
    hasta: query.hasta,
  })
}

/** CSV header exactly as QueryController.readingsCsv writes it, oldest first. */
export function readingsToCsv(readings: WaterReadingResponse[]): string {
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

/**
 * The CSV route needs the Bearer header, so a plain `<a href>` cannot fetch it. This returns the
 * file as a Blob (in mock mode it builds the CSV from the fixture readings).
 */
export async function downloadPondReadingsCsv(
  id: UUID,
  query: DateRangeQuery = {},
): Promise<Blob> {
  if (isMockMode()) {
    const readings = await pondReadings(id, { ...query, limite: 5000 })
    return new Blob([readingsToCsv(readings)], { type: 'text/csv;charset=utf-8' })
  }

  let response: Response
  try {
    response = await fetch(pondReadingsCsvUrl(id, query), {
      headers: authHeaders('bearer'),
    })
  } catch {
    throw new ApiError(
      0,
      'No se pudo conectar con el servidor. Revisa la conexión e intenta de nuevo.',
    )
  }
  if (!response.ok) {
    let detalle = `Error ${response.status}`
    try {
      const payload = (await response.json()) as { detalle?: string }
      if (payload.detalle) detalle = payload.detalle
    } catch {
      // A non-JSON body: keep the generic status message.
    }
    throw new ApiError(response.status, detalle)
  }
  return response.blob()
}

// ---------- Batch history and summary ----------

export function batchSummary(id: UUID): Promise<BatchSummary> {
  return request<BatchSummary>('GET', `/api/lotes/${encodeURIComponent(id)}/resumen`)
}

/** 503 with a Spanish `detalle` when the AI service is off. */
export function batchProjection(id: UUID): Promise<ProjectionJson> {
  return request<ProjectionJson>('GET', `/api/lotes/${encodeURIComponent(id)}/proyeccion`)
}

export function batchFryCounts(id: UUID, limite = 100): Promise<FryCountResponse[]> {
  return request<FryCountResponse[]>('GET', `/api/lotes/${encodeURIComponent(id)}/conteos`, {
    query: { limite },
  })
}

export function batchMortalities(id: UUID, limite = 100): Promise<MortalityResponse[]> {
  return request<MortalityResponse[]>(
    'GET',
    `/api/lotes/${encodeURIComponent(id)}/mortalidades`,
    { query: { limite } },
  )
}

export function batchFeedings(id: UUID, limite = 100): Promise<FeedingResponse[]> {
  return request<FeedingResponse[]>(
    'GET',
    `/api/lotes/${encodeURIComponent(id)}/alimentaciones`,
    { query: { limite } },
  )
}

export function batchBiometries(id: UUID, limite = 100): Promise<BiometryResponse[]> {
  return request<BiometryResponse[]>('GET', `/api/lotes/${encodeURIComponent(id)}/biometrias`, {
    query: { limite },
  })
}

// ---------- Alerts and findings ----------

export function listAlerts(filters: AlertFilters = {}): Promise<AlertResponse[]> {
  return request<AlertResponse[]>('GET', '/api/alertas', {
    query: {
      pendientes: filters.pendientes,
      estanque_id: filters.estanque_id,
      limite: filters.limite,
    },
  })
}

export function attendAlert(id: UUID, dispositivo_id?: string): Promise<AlertResponse> {
  return request<AlertResponse>(
    'POST',
    `/api/alertas/${encodeURIComponent(id)}/atender`,
    { query: { dispositivo_id } },
  )
}

export function listPendingFindings(): Promise<FindingResponse[]> {
  return request<FindingResponse[]>('GET', '/api/hallazgos')
}

export function pondFindings(id: UUID): Promise<FindingResponse[]> {
  return request<FindingResponse[]>('GET', `/api/estanques/${encodeURIComponent(id)}/hallazgos`)
}

export function batchFindings(id: UUID): Promise<FindingResponse[]> {
  return request<FindingResponse[]>('GET', `/api/lotes/${encodeURIComponent(id)}/hallazgos`)
}

export function attendFinding(id: UUID, dispositivo_id?: string): Promise<FindingResponse> {
  return request<FindingResponse>(
    'POST',
    `/api/hallazgos/${encodeURIComponent(id)}/atender`,
    { query: { dispositivo_id } },
  )
}

// ---------- Parameters ----------

export function getParameters(): Promise<ParametersResponse> {
  return request<ParametersResponse>('GET', '/api/parametros')
}

// ---------- Devices and sync log ----------

export function listDevices(): Promise<DeviceResponse[]> {
  return request<DeviceResponse[]>('GET', '/api/dispositivos')
}

export function updateDevice(id: string, body: DeviceUpdate): Promise<DeviceResponse> {
  return request<DeviceResponse>('PATCH', `/api/dispositivos/${encodeURIComponent(id)}`, { body })
}

export function listSyncLogs(filters: SyncLogFilters = {}): Promise<SyncLogResponse[]> {
  return request<SyncLogResponse[]>('GET', '/api/sincronizaciones', {
    query: { dispositivo_id: filters.dispositivo_id },
  })
}

// ---------- Users (productor only) ----------

export function listUsers(): Promise<UserResponse[]> {
  return request<UserResponse[]>('GET', '/api/usuarios')
}

export function updateUser(id: UUID, body: UserUpdate): Promise<UserResponse> {
  return request<UserResponse>('PATCH', `/api/usuarios/${encodeURIComponent(id)}`, { body })
}

export function resetTemporaryPassword(id: UUID): Promise<TemporaryPassword> {
  return request<TemporaryPassword>(
    'POST',
    `/api/usuarios/${encodeURIComponent(id)}/clave-temporal`,
  )
}

// ---------- AI ----------

export function aiAvailable(): Promise<AiAvailable> {
  return request<AiAvailable>('GET', '/api/ia/disponible')
}
