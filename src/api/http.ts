/**
 * The single door to the backend.
 *
 * Every call goes through `request()`, which knows the base URL, the auth header rule (the shared
 * X-API-Key ONLY on login/registro, a Bearer token everywhere else), the `{"detalle": ...}` error
 * shape, and what a 401 means. `VITE_MOCK=1` swaps the transport for the fixture-backed mock.
 */
import { getToken, handleUnauthorized } from './session'

export type AuthMode = 'bearer' | 'apiKey' | 'none'

export type QueryValue = string | number | boolean | null | undefined
export type QueryParams = Record<string, QueryValue>

export interface RequestOptions {
  query?: QueryParams
  body?: unknown
  /** Defaults to 'bearer'. 'apiKey' is only for /api/auth/sesion and /api/auth/registro. */
  auth?: AuthMode
}

/** A non-2xx answer, carrying the server's Spanish `detalle`. status 0 means no connection. */
export class ApiError extends Error {
  readonly status: number
  readonly detalle: string

  constructor(status: number, detalle: string) {
    super(detalle)
    this.name = 'ApiError'
    this.status = status
    this.detalle = detalle
  }
}

export function isMockMode(): boolean {
  return import.meta.env.VITE_MOCK === '1'
}

function apiBase(): string {
  const base = String(import.meta.env.VITE_API_URL ?? '')
  return base.replace(/\/+$/, '')
}

/** Absolute URL for a route plus its query string. Used by the CSV download. */
export function buildUrl(path: string, query?: QueryParams): string {
  const search = new URLSearchParams()
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        search.set(key, String(value))
      }
    }
  }
  const suffix = search.toString()
  return `${apiBase()}${path}${suffix ? `?${suffix}` : ''}`
}

/** Headers for a route, without touching the body. */
export function authHeaders(auth: AuthMode = 'bearer'): Record<string, string> {
  if (auth === 'apiKey') {
    const key = String(import.meta.env.VITE_API_KEY ?? '')
    return key ? { 'X-API-Key': key } : {}
  }
  if (auth === 'bearer') {
    const token = getToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }
  return {}
}

function detailFrom(payload: unknown): string | null {
  if (typeof payload === 'object' && payload !== null && 'detalle' in payload) {
    const detalle = (payload as { detalle?: unknown }).detalle
    if (typeof detalle === 'string' && detalle.length > 0) return detalle
  }
  return null
}

/**
 * `request<T>(method, path, { query, body, auth })`.
 *
 * On a non-2xx answer it throws ApiError with the server's `detalle`. On a 401 from a Bearer call
 * it also clears the local session and emits the unauthorized event, so the app can go back to
 * login without every screen repeating that logic.
 */
export async function request<T>(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  if (isMockMode()) {
    const { mockRequest } = await import('./mock')
    return mockRequest<T>(method, path, options)
  }

  const auth = options.auth ?? 'bearer'
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...authHeaders(auth),
  }
  const init: RequestInit = { method, headers }

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    init.body = JSON.stringify(options.body)
  }

  let response: Response
  try {
    response = await fetch(buildUrl(path, options.query), init)
  } catch {
    throw new ApiError(
      0,
      'No se pudo conectar con el servidor. Revisa la conexión e intenta de nuevo.',
    )
  }

  const text = await response.text()
  let payload: unknown = null
  if (text.length > 0) {
    try {
      payload = JSON.parse(text) as unknown
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    const detalle =
      detailFrom(payload) ?? (text.length > 0 ? text : `Error ${response.status}`)
    if (response.status === 401 && auth === 'bearer') {
      handleUnauthorized(detalle)
    }
    throw new ApiError(response.status, detalle)
  }

  return (payload ?? undefined) as T
}
