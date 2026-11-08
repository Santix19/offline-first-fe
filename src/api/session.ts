/**
 * The session: token + usuario in localStorage, a reactive store for React, and the auth actions.
 *
 * The token lasts six months by backend design, so it is kept across reloads. `useSession()` is a
 * `useSyncExternalStore` view of the store, which means every screen re-renders when login/logout
 * or a 401 changes it. `handleUnauthorized` is what `http.ts` calls on a 401: it clears the store
 * and emits UNAUTHORIZED_EVENT so the app can show the server's `detalle` and go back to login.
 */
import { useSyncExternalStore } from 'react'
import { request } from './http'
import type { LoginRequest, PasswordChange, SessionResponse, UserResponse } from './types'

const TOKEN_KEY = 'lacocha.token'
const USER_KEY = 'lacocha.usuario'

/** Fired on window when a Bearer call comes back 401. detail = { detalle }. */
export const UNAUTHORIZED_EVENT = 'lacocha:unauthorized'

export interface SessionState {
  token: string | null
  usuario: UserResponse | null
}

export interface UnauthorizedDetail {
  detalle: string
}

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    // Private mode or a full quota: the session still works in memory for this tab.
  }
}

function readStoredUser(): UserResponse | null {
  const raw = readStorage(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as UserResponse
  } catch {
    return null
  }
}

let state: SessionState = {
  token: readStorage(TOKEN_KEY),
  usuario: readStoredUser(),
}

const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

function setState(next: SessionState): void {
  state = next
  writeStorage(TOKEN_KEY, next.token)
  writeStorage(USER_KEY, next.usuario ? JSON.stringify(next.usuario) : null)
  emit()
}

export function getSession(): SessionState {
  return state
}

export function getToken(): string | null {
  return state.token
}

export function getUser(): UserResponse | null {
  return state.usuario
}

export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Stable snapshot for useSyncExternalStore: `state` only changes when the store changes. */
export function getSessionSnapshot(): SessionState {
  return state
}

export function clearSession(): void {
  state = { token: null, usuario: null }
  writeStorage(TOKEN_KEY, null)
  writeStorage(USER_KEY, null)
  emit()
}

/** Called by http.ts on a 401: forget the session and tell the app why. */
export function handleUnauthorized(detalle: string): void {
  clearSession()
  try {
    window.dispatchEvent(
      new CustomEvent<UnauthorizedDetail>(UNAUTHORIZED_EVENT, { detail: { detalle } }),
    )
  } catch {
    // No window (tests, SSR): the store change is enough.
  }
}

/** Listen for forced logouts. Returns the unsubscribe function. */
export function onUnauthorized(listener: (detalle: string) => void): () => void {
  const handler = (event: Event): void => {
    const detail = (event as CustomEvent<UnauthorizedDetail>).detail
    listener(detail?.detalle ?? 'Tu sesión expiró. Vuelve a entrar.')
  }
  try {
    window.addEventListener(UNAUTHORIZED_EVENT, handler)
  } catch {
    return () => undefined
  }
  return () => window.removeEventListener(UNAUTHORIZED_EVENT, handler)
}

export function isProductor(usuario: UserResponse | null = state.usuario): boolean {
  return usuario?.rol === 'productor'
}

export function isCuidador(usuario: UserResponse | null = state.usuario): boolean {
  return usuario?.rol === 'cuidador'
}

export function debeCambiarClave(usuario: UserResponse | null = state.usuario): boolean {
  return usuario?.debe_cambiar_clave === true
}

/** POST /api/auth/sesion. The only call that sends the shared X-API-Key. */
export async function login(
  documento: string,
  clave: string,
  dispositivo_id?: string,
): Promise<SessionResponse> {
  const body: LoginRequest = { documento, clave }
  if (dispositivo_id) body.dispositivo_id = dispositivo_id

  const session = await request<SessionResponse>('POST', '/api/auth/sesion', {
    body,
    auth: 'apiKey',
  })
  setState({ token: session.token, usuario: session.usuario })
  return session
}

/** DELETE /api/auth/sesion. The local session is cleared even if the network call fails. */
export async function logout(): Promise<void> {
  try {
    if (state.token) {
      await request<void>('DELETE', '/api/auth/sesion')
    }
  } catch {
    // The token is already useless to this tab; the server call is a courtesy.
  } finally {
    clearSession()
  }
}

/** POST /api/auth/clave. Afterwards `debe_cambiar_clave` is false locally. */
export async function changePassword(
  clave_actual: string,
  clave_nueva: string,
): Promise<void> {
  const body: PasswordChange = { clave_actual, clave_nueva }
  await request<void>('POST', '/api/auth/clave', { body })
  if (state.usuario) {
    setState({
      token: state.token,
      usuario: { ...state.usuario, debe_cambiar_clave: false },
    })
  }
}

/** GET /api/auth/yo: re-read the user behind the token. */
export async function refreshUser(): Promise<UserResponse> {
  const usuario = await request<UserResponse>('GET', '/api/auth/yo')
  setState({ token: state.token, usuario })
  return usuario
}

export interface UseSession extends SessionState {
  autenticado: boolean
  debeCambiarClave: boolean
  isProductor: boolean
  isCuidador: boolean
  login: typeof login
  logout: typeof logout
  changePassword: typeof changePassword
  refreshUser: typeof refreshUser
}

/** Reactive session for components. */
export function useSession(): UseSession {
  const snapshot = useSyncExternalStore(
    subscribeSession,
    getSessionSnapshot,
    getSessionSnapshot,
  )

  return {
    ...snapshot,
    autenticado: snapshot.token !== null,
    debeCambiarClave: snapshot.usuario?.debe_cambiar_clave === true,
    isProductor: isProductor(snapshot.usuario),
    isCuidador: isCuidador(snapshot.usuario),
    login,
    logout,
    changePassword,
    refreshUser,
  }
}
