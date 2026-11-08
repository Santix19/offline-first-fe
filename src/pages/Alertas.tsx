// avoid-ai-design-ignore-file: SD4d — compact dot-separated meta convention per SPEC copy rules, deliberate chrome.
import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { BellRing, ScanSearch } from 'lucide-react'
import { ApiError } from '../api/http'
import {
  useAlerts,
  useAttendAlert,
  useAttendFinding,
  useBatches,
  usePendingFindings,
  usePonds,
} from '../api/queries'
import type { AlertResponse, FindingLevel, FindingResponse, UUID } from '../api/types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { Select } from '../components/ui/Select'
import { Skeleton } from '../components/ui/Skeleton'
import { SlowServerNotice } from '../components/ui/SlowServerNotice'
import { StatusBadge } from '../components/ui/StatusBadge'
import { useToast } from '../components/ui/Toast'
import { formatDateTime, formatInteger, formatRelative } from '../lib/format'
import { StaggerItem } from '../motion/Motion'
import { useBatchReveal, useParallax } from '../motion/scroll'
import { SectionHead } from '../components/SectionHead'
import { duration, ease } from '../motion/presets'

type Filtro = 'pendientes' | 'atendidas' | 'todas'

interface Fila {
  key: string
  tipo: 'alerta' | 'hallazgo'
  id: UUID
  nivel: FindingLevel
  mensaje: string
  estanque_id: UUID | null
  lote_id: UUID | null
  cuando: string | null
  pendiente: boolean
  atendida_por: string | null
  atendida_en: string | null
}

function detalleDe(error: unknown): string {
  if (error instanceof ApiError) return error.detalle
  if (error instanceof Error) return error.message
  return 'No se pudo cargar la información. Intenta de nuevo.'
}

function badgeNivel(nivel: FindingLevel) {
  if (nivel === 'informe') {
    return <span className="text-caption text-ink-muted">Informe</span>
  }
  return <StatusBadge status={nivel === 'critica' ? 'critico' : 'advertencia'} />
}

function filaDeAlerta(alerta: AlertResponse): Fila {
  return {
    key: `alerta-${alerta.id}`,
    tipo: 'alerta',
    id: alerta.id,
    nivel: alerta.nivel,
    mensaje: alerta.mensaje,
    estanque_id: alerta.estanque_id,
    lote_id: alerta.lote_id,
    cuando: alerta.medido_en,
    pendiente: !alerta.atendida,
    atendida_por: alerta.atendida_por,
    atendida_en: alerta.atendida_en,
  }
}

function filaDeHallazgo(hallazgo: FindingResponse): Fila {
  return {
    key: `hallazgo-${hallazgo.id}`,
    tipo: 'hallazgo',
    id: hallazgo.id,
    nivel: hallazgo.nivel,
    mensaje: hallazgo.mensaje,
    estanque_id: hallazgo.estanque_id,
    lote_id: hallazgo.lote_id,
    cuando: hallazgo.medido_en ?? hallazgo.creado_en,
    pendiente: !hallazgo.atendido,
    atendida_por: hallazgo.atendido_por,
    atendida_en: hallazgo.atendido_en,
  }
}

function porFechaDesc(a: Fila, b: Fila): number {
  const izquierda = a.cuando ? Date.parse(a.cuando) : 0
  const derecha = b.cuando ? Date.parse(b.cuando) : 0
  return derecha - izquierda
}

const FILTROS: Array<{ value: Filtro; label: string }> = [
  { value: 'pendientes', label: 'Pendientes' },
  { value: 'atendidas', label: 'Atendidas' },
  { value: 'todas', label: 'Todas' },
]

function vacioDe(filtro: Filtro): string {
  if (filtro === 'pendientes') {
    return 'No hay alertas ni hallazgos pendientes. Cuando una lectura sale del rango o la IA detecta algo, aparece aquí.'
  }
  if (filtro === 'atendidas') {
    return 'Aún no hay alertas atendidas. Cuando atiendas una, queda aquí con quién la atendió.'
  }
  return 'Aún no hay alertas ni hallazgos. Llegan cuando el celular sincroniza.'
}

export default function Alertas() {
  const { notify } = useToast()
  const reduce = useReducedMotion()
  const [filtro, setFiltro] = useState<Filtro>('pendientes')
  const [estanqueId, setEstanqueId] = useState('')

  const estanques = usePonds()
  const lotes = useBatches()
  const alertas = useAlerts({
    pendientes: false,
    ...(estanqueId ? { estanque_id: estanqueId } : {}),
  })
  const hallazgos = usePendingFindings()
  const attendAlert = useAttendAlert()
  const attendFinding = useAttendFinding()

  // Scroll layer: the header drifts, the filter bar and the list card enter in a batch.
  const heroParallax = useParallax<HTMLDivElement>({ distance: 7 })
  const revealRoot = useBatchReveal<HTMLDivElement>()

  const hallazgosDelEstanque = estanqueId
    ? (hallazgos.data ?? []).filter((fila) => fila.estanque_id === estanqueId)
    : (hallazgos.data ?? [])

  let filas: Fila[] = (alertas.data ?? []).map(filaDeAlerta)
  // The API only returns pending findings; attended findings have no list route yet.
  if (filtro !== 'atendidas') {
    filas = filas.concat(hallazgosDelEstanque.map(filaDeHallazgo))
  }

  if (filtro === 'pendientes') filas = filas.filter((fila) => fila.pendiente)
  if (filtro === 'atendidas') filas = filas.filter((fila) => !fila.pendiente)
  filas.sort(porFechaDesc)

  const nombreEstanque = (id: UUID | null): string =>
    (estanques.data ?? []).find((pond) => pond.id === id)?.nombre ?? ''

  const lugarDe = (fila: Fila): string => {
    const estanque = nombreEstanque(fila.estanque_id)
    if (estanque) return estanque
    const lote = (lotes.data ?? []).find((item) => item.id === fila.lote_id)
    return lote ? `Lote ${lote.codigo}` : 'Sin estanque'
  }

  const atender = (fila: Fila): void => {
    const alFallar = (error: unknown): void => notify(detalleDe(error))
    if (fila.tipo === 'alerta') {
      attendAlert.mutate({ id: fila.id }, { onError: alFallar })
    } else {
      attendFinding.mutate({ id: fila.id }, { onError: alFallar })
    }
  }

  const cargando = alertas.isPending || hallazgos.isPending
  const error = alertas.error ?? hallazgos.error

  return (
    <div ref={revealRoot} className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start gap-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-small)] bg-accent-soft text-ink-emphasis">
          <BellRing size={20} strokeWidth={1.5} aria-hidden="true" />
        </span>
        <div ref={heroParallax}>
          <SectionHead as="h1" size="hero" index="01" kicker="Alertas" title="Alertas" />
          <p className="mt-1 text-body text-ink-muted">
            Alertas de umbral y hallazgos de la IA, del más nuevo al más viejo.
          </p>
        </div>
      </header>

      <div data-reveal-item>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrar por estado">
          {FILTROS.map((opcion) => {
            const activo = filtro === opcion.value
            return (
              <button
                key={opcion.value}
                type="button"
                aria-pressed={activo}
                onClick={() => setFiltro(opcion.value)}
                className={`relative min-h-[var(--target-min)] rounded-[var(--radius-small)] border px-3 text-body transition-colors duration-[var(--dur-state)] ease-out ${
                  activo
                    ? 'border-transparent bg-accent-soft text-on-cta'
                    : 'border-transparent text-ink-muted hover:text-ink'
                }`}
              >
                {activo ? (
                  <motion.span
                    layoutId="alertas-filtro-activo"
                    className="absolute inset-0 rounded-[var(--radius-small)] bg-cta"
                    aria-hidden="true"
                    transition={
                      reduce
                        ? { duration: duration.micro }
                        : { duration: duration.state, ease: ease.fluid }
                    }
                  />
                ) : null}
                <span className="relative">{opcion.label}</span>
              </button>
            )
          })}
        </div>
        <div className="w-full max-w-64">
          <Select
            id="filtro-estanque"
            label="Estanque"
            value={estanqueId}
            onChange={(event) => setEstanqueId(event.target.value)}
            options={[
              { value: '', label: 'Todos los estanques' },
              ...(estanques.data ?? []).map((pond) => ({
                value: pond.id,
                label: pond.nombre,
              })),
            ]}
          />
        </div>
      </div>
      </div>

      <div data-reveal-item>
      <Card
        title={`${FILTROS.find((opcion) => opcion.value === filtro)?.label ?? 'Lista'} (${formatInteger(filas.length)})`}
      >
        {cargando ? (
          <div className="flex flex-col gap-3">
            <Skeleton rows={6} />
            <SlowServerNotice active={cargando} />
          </div>
        ) : error ? (
          <ErrorState
            detalle={detalleDe(error)}
            onRetry={() => {
              void alertas.refetch()
              void hallazgos.refetch()
            }}
          />
        ) : filas.length === 0 ? (
          <EmptyState message={vacioDe(filtro)} />
        ) : (
          <ul className="flex flex-col gap-3">
            <AnimatePresence>
            {filas.map((fila, indice) => {
              const enCurso =
                fila.tipo === 'alerta'
                  ? attendAlert.isPending && attendAlert.variables?.id === fila.id
                  : attendFinding.isPending && attendFinding.variables?.id === fila.id
              const Icono = fila.tipo === 'alerta' ? BellRing : ScanSearch
              return (
                <StaggerItem
                  key={fila.key}
                  as="li"
                  index={indice}
                  layout
                  className="rounded-[var(--radius-cards)] border border-hairline bg-surface p-4 "
                >
                  <motion.div
                    initial={false}
                    whileHover="hover"
                    className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
                  >
                  <div className="flex w-full min-w-0 flex-1 items-start gap-3 sm:w-auto">
                    <span className="grid size-9 shrink-0 place-items-center rounded-[var(--radius-small)] bg-surface-2 text-ink-emphasis">
                      <Icono size={16} strokeWidth={1.5} aria-hidden="true" />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {fila.nivel === 'critica' && fila.pendiente ? (
                          <span className="pulse-dot" aria-hidden="true" />
                        ) : null}
                        {badgeNivel(fila.nivel)}
                        <span className="text-caption text-ink-muted">
                          {fila.tipo === 'alerta' ? 'Alerta' : 'Hallazgo'} · {lugarDe(fila)}
                          {fila.cuando ? (
                            <>
                              {' · '}
                              <span title={formatDateTime(fila.cuando)} className="tabular-nums">
                                {formatRelative(fila.cuando)}
                              </span>
                            </>
                          ) : null}
                        </span>
                      </div>
                      <p className="text-body text-ink">{fila.mensaje}</p>
                      {!fila.pendiente ? (
                        <p className="text-caption text-ink-muted">
                          {fila.atendida_por
                            ? `Atendida por ${fila.atendida_por}`
                            : 'Atendida'}
                          {fila.atendida_en ? (
                            <>
                              {' · '}
                              <span title={formatDateTime(fila.atendida_en)} className="tabular-nums">
                                {formatRelative(fila.atendida_en)}
                              </span>
                            </>
                          ) : null}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  {fila.pendiente ? (
                    <div className="flex min-h-[var(--button-height)] items-center gap-2 self-start sm:self-auto">
                    <Button variant="secondary" loading={enCurso} onClick={() => atender(fila)}>
                      Atender
                    </Button>
                    <motion.span
                      aria-hidden="true"
                      variants={{ hover: reduce ? {} : { x: 4 } }}
                      transition={{ duration: duration.state, ease: ease.out }}
                      className="grid shrink-0 place-items-center text-ink-muted"
                    >
                      <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m6 4 4 4-4 4" />
                      </svg>
                    </motion.span>
                    </div>
                  ) : null}
                  </motion.div>
                </StaggerItem>
              )
            })}
            </AnimatePresence>
          </ul>
        )}
      </Card>
      </div>
    </div>
  )
}
