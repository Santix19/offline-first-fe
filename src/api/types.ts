/**
 * Wire types for the La Cocha API.
 *
 * The backend serializes with Spring's SNAKE_CASE strategy, so every field name here is exactly
 * what travels on the wire (a Java record field `tempC` without @JsonProperty becomes `temp_c`;
 * @JsonProperty always wins). Source of truth: _kit/backend/dto/*.java.
 */

/** UUID as it travels in JSON. */
export type UUID = string
/** ISO-8601 instant with timezone, e.g. "2026-11-07T15:00:00Z". */
export type Instant = string
/** ISO local date, e.g. "2026-11-07". */
export type LocalDate = string

export type PondType = 'estanque' | 'tanque' | 'jaula'
export type BatchStatus = 'activo' | 'cerrado'
export type EventOrigin = 'sensor' | 'contador' | 'voz' | 'manual'
export type UserRole = 'productor' | 'cuidador'
export type AlertLevel = 'advertencia' | 'critica'
export type FindingLevel = AlertLevel | 'informe'
export type FindingKind = 'anomalia' | 'tendencia' | 'combinacion' | 'crecimiento' | 'mortalidad'

// ---------- Catalog.java ----------

export interface PondResponse {
  id: UUID
  nombre: string
  tipo: PondType
  volumen_m3: number | null
  activo: boolean
  actualizado_en: Instant
}

export interface PondCreate {
  id?: UUID | null
  nombre: string
  tipo?: PondType
  volumen_m3?: number | null
}

export interface PondUpdate {
  nombre?: string
  tipo?: PondType
  volumen_m3?: number | null
  activo?: boolean
}

export interface BatchResponse {
  id: UUID
  estanque_id: UUID
  codigo: string
  fecha_siembra: LocalDate
  cantidad_inicial: number | null
  peso_inicial_g: number | null
  estado: BatchStatus
  fecha_cierre: LocalDate | null
  actualizado_en: Instant
}

export interface BatchCreate {
  id?: UUID | null
  estanque_id: UUID
  codigo: string
  fecha_siembra?: LocalDate
  cantidad_inicial?: number | null
  peso_inicial_g?: number | null
  estado?: BatchStatus
  fecha_cierre?: LocalDate | null
}

export interface BatchUpdate {
  codigo?: string
  fecha_siembra?: LocalDate
  cantidad_inicial?: number | null
  peso_inicial_g?: number | null
  estado?: BatchStatus
  fecha_cierre?: LocalDate | null
}

// ---------- Queries.java ----------

export interface WaterReadingResponse {
  id: UUID
  estanque_id: UUID
  temp_c: number | null
  ph: number | null
  oxigeno_mg_l: number | null
  origen: EventOrigin
  registrado_en: Instant
}

export interface DailyReadings {
  fecha: LocalDate
  lecturas: number
  temp_min: number | null
  temp_max: number | null
  temp_promedio: number | null
  ph_min: number | null
  ph_max: number | null
  ph_promedio: number | null
}

export interface FryCountResponse {
  id: UUID
  lote_id: UUID
  total: number | null
  cortes_multiples: number | null
  origen: EventOrigin
  dispositivo_id: string | null
  registrado_en: Instant
}

export interface MortalityResponse {
  id: UUID
  lote_id: UUID
  cantidad: number | null
  causa: string | null
  origen: EventOrigin
  dispositivo_id: string | null
  registrado_en: Instant
}

export interface FeedingResponse {
  id: UUID
  lote_id: UUID
  kg: number | null
  origen: EventOrigin
  dispositivo_id: string | null
  registrado_en: Instant
}

export interface BiometryResponse {
  id: UUID
  lote_id: UUID
  peso_promedio_g: number | null
  muestra: number | null
  origen: EventOrigin
  dispositivo_id: string | null
  registrado_en: Instant
}

export interface BatchSummary {
  lote_id: UUID
  codigo: string
  estanque_id: UUID
  dias_cultivo: number | null
  cantidad_inicial: number | null
  poblacion_estimada: number | null
  mortalidad_total: number
  supervivencia_pct: number | null
  peso_promedio_g: number | null
  biomasa_kg: number | null
  densidad_kg_m3: number | null
  ultima_temperatura_c: number | null
  ultima_lectura_en: Instant | null
  tasa_alimentacion_pct: number | null
  racion_diaria_kg: number | null
  alimento_ultima_semana_kg: number
  alimento_total_kg: number
  conversion_alimenticia: number | null
  alertas_pendientes: number
  notas: string[]
}

// ---------- Sync.java ----------

export interface AlertResponse {
  id: UUID
  estanque_id: UUID | null
  lectura_id: UUID | null
  lote_id: UUID | null
  disparada_por: string | null
  variable: string | null
  valor: number | null
  nivel: AlertLevel
  mensaje: string
  medido_en: Instant | null
  atendida: boolean
  atendida_en: Instant | null
  atendida_por: string | null
}

// ---------- Ai.java ----------

export interface FindingResponse {
  id: UUID
  estanque_id: UUID | null
  lote_id: UUID | null
  clase: FindingKind
  nivel: FindingLevel
  variable: string | null
  puntaje: number
  mensaje: string
  medido_en: Instant | null
  creado_en: Instant
  atendido: boolean
  atendido_en: Instant | null
  atendido_por: string | null
}

export interface BatchFindingJson {
  clase: 'crecimiento' | 'mortalidad'
  urgente: boolean
  puntaje: number
  mensaje: string
}

export interface ProjectionJson {
  dias_adelante: number
  tgc: number | null
  tgc_ajustado: boolean
  temp_media_c: number | null
  peso_actual_g: number | null
  peso_proyectado_g: number | null
  dias_para_objetivo: number | null
  fecha_objetivo: LocalDate | null
  cantidad_actual: number | null
  cantidad_proyectada: number | null
  supervivencia_pct: number | null
  muertes_por_dia: number | null
  hallazgos: BatchFindingJson[]
  notas: string[]
}

export interface ForecastDay {
  fecha: string
  minima: number
  maxima: number
  promedio: number
}

/**
 * Ai.ForecastJson and Forecasts.WaterForecast serialize to the same wire object; this is that
 * shape. `dias` is empty when the pond has too few readings, and `mensaje` says why.
 */
export interface ForecastJson {
  dias: ForecastDay[]
  error_tipico: number | null
  reaccion_horas: number | null
  lecturas_usadas: number
  mensaje: string | null
}

export interface AiAvailable {
  disponible: boolean
}

// ---------- Parameters.java ----------

export interface RangeResponse {
  variable: string
  nombre: string
  unidad: string
  optimo_min: number
  optimo_max: number | null
  critico_min: number
  critico_max: number | null
  fuente: string
  actualizado_en: Instant
}

export interface RateResponse {
  orden: number
  peso_hasta_g: number | null
  tasa_pct: number
  fuente: string
}

export interface FactorResponse {
  orden: number
  temp_hasta_c: number | null
  factor: number
  fuente: string
}

export interface ParametersResponse {
  rangos: RangeResponse[]
  tasas_alimentacion: RateResponse[]
  factores_temperatura: FactorResponse[]
}

// ---------- Devices.java ----------

export interface DeviceResponse {
  id: string
  descripcion: string | null
  activo: boolean
  primer_visto_en: Instant
  ultimo_visto_en: Instant
}

export interface DeviceUpdate {
  descripcion?: string
  activo?: boolean
}

export interface SyncLogResponse {
  id: UUID
  dispositivo_id: string
  aceptados: number
  duplicados: number
  obsoletos: number
  rechazados: number
  alertas_generadas: number
  servidor_en: Instant
}

// ---------- Auth.java ----------

export interface UserResponse {
  id: UUID
  documento: string
  nombre: string
  rol: UserRole
  activo: boolean
  debe_cambiar_clave: boolean
}

export interface LoginRequest {
  documento: string
  clave: string
  dispositivo_id?: string
}

export interface RegisterRequest {
  documento: string
  nombre: string
  clave: string
  dispositivo_id?: string
}

export interface UserUpdate {
  rol?: UserRole
  activo?: boolean
}

export interface TemporaryPassword {
  clave_temporal: string
  usuario: UserResponse
}

export interface PasswordChange {
  clave_actual: string
  clave_nueva: string
}

export interface SessionResponse {
  token: string
  expira_en: Instant
  usuario: UserResponse
}

// ---------- Stream.java ----------

export interface StreamMessage {
  tipo: 'listo' | 'sincronizado' | 'hallazgo'
  en?: Instant
  estanque_id?: UUID
  lote_id?: UUID
  dispositivo_id?: string
  aceptados?: number
  hallazgo?: FindingResponse
}

/** Namespaced alias so callers can write `Stream.Message`. */
export type Stream = { Message: StreamMessage }

// ---------- Query parameters used by the panel ----------

export interface DateRangeQuery {
  desde?: Instant
  hasta?: Instant
}

export interface ReadingQuery extends DateRangeQuery {
  limite?: number
}

export interface BatchFilters {
  estanque_id?: UUID
  estado?: BatchStatus
}

export interface AlertFilters {
  pendientes?: boolean
  estanque_id?: UUID
  limite?: number
}

export interface SyncLogFilters {
  dispositivo_id?: string
}
