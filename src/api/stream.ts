/**
 * Live events over Server-Sent Events, read with fetch() + ReadableStream.
 *
 * Not EventSource: the route lives under /api/ and asks for `Authorization: Bearer ...`, and
 * EventSource cannot send headers. The backend's EventStreamController documents the same decision.
 *
 * The hook invalidates the query families a message touches, keeps the last `hallazgo` so the app
 * can raise one toast, and reconnects with backoff 1 s -> 30 s. It stops on logout (token gone) and
 * while the user must still change a temporary password (that token only opens /api/auth/**).
 */
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { buildUrl, isMockMode } from './http'
import { handleUnauthorized, useSession } from './session'
import { keys } from './queries'
import type { FindingResponse, StreamMessage, UUID } from './types'

export interface LiveEventsOptions {
  estanque_id?: UUID
  lote_id?: UUID
}

export interface LiveEventsState {
  connected: boolean
  lastFinding: FindingResponse | null
  clearLastFinding: () => void
}

const FIRST_BACKOFF_MS = 1_000
const MAX_BACKOFF_MS = 30_000

function parseBlock(block: string): StreamMessage | null {
  const dataLines: string[] = []
  for (const line of block.split(/\r?\n/)) {
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).replace(/^ /, ''))
    }
  }
  if (dataLines.length === 0) return null

  try {
    return JSON.parse(dataLines.join('\n')) as StreamMessage
  } catch {
    return null
  }
}

function wait(ms: number, register: (timer: ReturnType<typeof setTimeout>) => void): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms)
    register(timer)
  })
}

export function useLiveEvents(options: LiveEventsOptions = {}): LiveEventsState {
  const queryClient = useQueryClient()
  const { token, usuario } = useSession()
  const [connected, setConnected] = useState(false)
  const [lastFinding, setLastFinding] = useState<FindingResponse | null>(null)

  const pondId = options.estanque_id
  const batchId = options.lote_id
  const blocked = usuario?.debe_cambiar_clave === true
  const live = !isMockMode() && token !== null && !blocked

  useEffect(() => {
    if (!live || !token) return

    let cancelled = false
    let backoff = FIRST_BACKOFF_MS
    let retryTimer: ReturnType<typeof setTimeout> | undefined
    const controller = new AbortController()
    const decoder = new TextDecoder()

    const handleMessage = (message: StreamMessage): void => {
      if (message.tipo === 'hallazgo') {
        if (message.hallazgo) setLastFinding(message.hallazgo)
        void queryClient.invalidateQueries({ queryKey: keys.findings() })
        return
      }

      if (message.tipo === 'sincronizado') {
        if (message.estanque_id) {
          void queryClient.invalidateQueries({ queryKey: keys.pond(message.estanque_id) })
          void queryClient.invalidateQueries({
            queryKey: keys.pondFindings(message.estanque_id),
          })
        }
        if (message.lote_id) {
          void queryClient.invalidateQueries({ queryKey: keys.batch(message.lote_id) })
          void queryClient.invalidateQueries({
            queryKey: keys.batchFindings(message.lote_id),
          })
        }
        if (!message.estanque_id && !message.lote_id) {
          void queryClient.invalidateQueries({ queryKey: keys.ponds() })
          void queryClient.invalidateQueries({ queryKey: keys.batches() })
        }
        // A push can create threshold alerts and always moves the device's last-seen time.
        void queryClient.invalidateQueries({ queryKey: keys.alerts() })
        void queryClient.invalidateQueries({ queryKey: keys.devices() })
        void queryClient.invalidateQueries({ queryKey: keys.syncLogsRoot() })
      }
      // 'listo' only confirms the connection; there is nothing to refresh.
    }

    const consume = (block: string): void => {
      const message = parseBlock(block)
      if (message) handleMessage(message)
    }

    const run = async (): Promise<void> => {
      while (!cancelled) {
        try {
          const response = await fetch(
            buildUrl('/api/eventos/stream', {
              estanque_id: pondId,
              lote_id: batchId,
            }),
            {
              headers: {
                Accept: 'text/event-stream',
                Authorization: `Bearer ${token}`,
              },
              signal: controller.signal,
            },
          )

          if (response.status === 401) {
            let detalle = 'Tu sesión expiró. Vuelve a entrar.'
            try {
              const payload = (await response.json()) as { detalle?: string }
              if (payload.detalle) detalle = payload.detalle
            } catch {
              // Keep the generic sentence when the 401 body is not JSON.
            }
            handleUnauthorized(detalle)
            return
          }
          if (!response.ok || !response.body) {
            throw new Error(`stream ${response.status}`)
          }

          setConnected(true)
          backoff = FIRST_BACKOFF_MS

          const reader = response.body.getReader()
          let buffer = ''

          while (!cancelled) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })

            for (;;) {
              const match = /\r?\n\r?\n/.exec(buffer)
              if (!match) break
              const block = buffer.slice(0, match.index)
              buffer = buffer.slice(match.index + match[0].length)
              consume(block)
            }
          }

          // The server closed the stream: flush a final block that had no blank line after it.
          if (buffer.trim().length > 0) consume(buffer)
        } catch {
          if (cancelled) return
        } finally {
          if (!cancelled) setConnected(false)
        }

        if (cancelled) return
        await wait(backoff, (timer) => {
          retryTimer = timer
        })
        backoff = Math.min(backoff * 2, MAX_BACKOFF_MS)
      }
    }

    void run()

    return () => {
      cancelled = true
      controller.abort()
      if (retryTimer) clearTimeout(retryTimer)
      setConnected(false)
    }
  }, [live, token, pondId, batchId, queryClient])

  return {
    connected: live && connected,
    lastFinding,
    clearLastFinding: () => setLastFinding(null),
  }
}
