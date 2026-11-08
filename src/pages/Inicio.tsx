// avoid-ai-design-ignore-file: M5 — readout on real backend numbers per DESIGN.md §7, not placeholder theater.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { AnimatePresence } from 'framer-motion'
import { useQueries } from '@tanstack/react-query'
import {
  BellRing,
  Fish,
  FlaskConical,
  Scale,
  Thermometer,
  Waves,
  Wind,
  CircleCheck,
} from 'lucide-react'
import { ApiError } from '../api/http'
import { batchSummary } from '../api/endpoints'
import {
  keys,
  useAlerts,
  useAttendAlert,
  useAttendFinding,
  useBatchSummary,
  useBatches,
  useParameters,
  usePendingFindings,
  usePonds,
  usePondReadings,
} from '../api/queries'
import type {
  AlertResponse,
  BatchResponse,
  FindingLevel,
  FindingResponse,
  PondResponse,
  RangeResponse,
  UUID,
  WaterReadingResponse,
} from '../api/types'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { KpiTile } from '../components/ui/KpiTile'
import { RangeBar } from '../components/ui/RangeBar'
import { Skeleton } from '../components/ui/Skeleton'
import { SlowServerNotice } from '../components/ui/SlowServerNotice'
import { Sparkline } from '../components/ui/Sparkline'
import { StatusBadge } from '../components/ui/StatusBadge'
import { rangeStatus } from '../components/ui/range'
import { useToast } from '../components/ui/Toast'
import { formatDate, formatDateTime, formatInteger, formatNumber, formatRelative } from '../lib/format'
import { CountUp, StaggerItem } from '../motion/Motion'
import { useBatchReveal, useMediaQuery, useParallax, useScrub } from '../motion/scroll'
import { SectionHead } from '../components/SectionHead'
import { useReducedMotion } from 'framer-motion'
import GradientASCII from '../components/GradientASCII'
import PondForm from './forms/PondForm'

interface Fila {
  key: string
  tipo: 'alerta' | 'hallazgo'
  id: UUID
  nivel: FindingLevel
  mensaje: string
  cuando: string | null
  estanque_id: UUID | null
  lote_id: UUID | null
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

function tipoDeEstanque(tipo: PondResponse['tipo']): string {
  if (tipo === 'estanque') return 'Estanque'
  if (tipo === 'tanque') return 'Tanque'
  return 'Jaula'
}

function plural(cantidad: number, singular: string, plural_: string): string {
  return `${formatInteger(cantidad)} ${cantidad === 1 ? singular : plural_}`
}

function filaDeAlerta(alerta: AlertResponse): Fila {
  return {
    key: `alerta-${alerta.id}`,
    tipo: 'alerta',
    id: alerta.id,
    nivel: alerta.nivel,
    mensaje: alerta.mensaje,
    cuando: alerta.medido_en,
    estanque_id: alerta.estanque_id,
    lote_id: alerta.lote_id,
  }
}

function filaDeHallazgo(hallazgo: FindingResponse): Fila {
  return {
    key: `hallazgo-${hallazgo.id}`,
    tipo: 'hallazgo',
    id: hallazgo.id,
    nivel: hallazgo.nivel,
    mensaje: hallazgo.mensaje,
    cuando: hallazgo.medido_en ?? hallazgo.creado_en,
    estanque_id: hallazgo.estanque_id,
    lote_id: hallazgo.lote_id,
  }
}

function porFechaDesc(a: Fila, b: Fila): number {
  const izquierda = a.cuando ? Date.parse(a.cuando) : 0
  const derecha = b.cuando ? Date.parse(b.cuando) : 0
  return derecha - izquierda
}

/** Readings arrive newest first; sparklines read oldest first. */
function serieAntigua<T>(datos: T[] | undefined, valor: (item: T) => number | null | undefined): number[] {
  if (!datos) return []
  return [...datos]
    .reverse()
    .map(valor)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
}

interface BarraProps {
  label: string
  value: number | null
  unit: string
  range: RangeResponse | undefined
  icon: typeof Thermometer
}

function Barra({ label, value, unit, range, icon }: BarraProps) {
  if (value == null || !range) {
    return (
      <p className="text-caption text-ink-muted">
        {label}: Sin dato
      </p>
    )
  }
  // An open-ended optimum (O2) has optimo_max = null: the bar reaches the marker.
  const optimoMax = range.optimo_max ?? Math.max(value, range.optimo_min)
  return (
    <RangeBar
      label={label}
      value={value}
      unit={unit}
      optimo_min={range.optimo_min}
      optimo_max={optimoMax}
      critico_min={range.critico_min}
      critico_max={range.critico_max}
      icon={icon}
    />
  )
}

function fotoEstanque(tipo: PondResponse['tipo']): { src: string; alt: string } {
  if (tipo === 'tanque') return { src: '/img/trucha.webp', alt: 'Trucha arcoíris en el agua' }
  if (tipo === 'jaula') return { src: '/img/estanque.webp', alt: 'Isla de La Corota en la Laguna de La Cocha' }
  return { src: '/img/estanque.webp', alt: 'Orilla de la Laguna de La Cocha' }
}

function estadoPeor(valores: Array<number | null>, rangos: Array<RangeResponse | undefined>): 'ok' | 'advertencia' | 'critico' {
  let peor: 'ok' | 'advertencia' | 'critico' = 'ok'
  valores.forEach((valor, i) => {
    const rango = rangos[i]
    if (valor == null || !rango || rango.optimo_max == null) {
      if (valor == null || !rango) return
    }
    const estado = rangeStatus(valor, {
      optimo_min: rango.optimo_min,
      optimo_max: rango.optimo_max ?? valor,
      critico_min: rango.critico_min,
      critico_max: rango.critico_max,
    })
    if (estado === 'critico') peor = 'critico'
    else if (estado === 'advertencia' && peor === 'ok') peor = 'advertencia'
  })
  return peor
}

function PondSpark({ pondId }: { pondId: UUID }) {
  const lecturas = usePondReadings(pondId, { limite: 24 })
  const serie = serieAntigua(lecturas.data, (r) => r.temp_c)
  if (serie.length < 2) return null
  return (
    <Sparkline
      values={serie}
      color="var(--series-1)"
      label="Temperatura últimas 24 lecturas"
      height={40}
    />
  )
}

function PondCard({
  pond,
  rangos,
}: {
  pond: PondResponse
  rangos: RangeResponse[]
}) {
  const lectura = usePondReadings(pond.id, { limite: 1 })
  const ultima: WaterReadingResponse | undefined = lectura.data?.[0]

  const rango = (variable: string): RangeResponse | undefined =>
    rangos.find((item) => item.variable === variable)

  const rangoTemp = rango('temp_c')
  const rangoPh = rango('ph')
  const rangoOx = rango('oxigeno_mg_l')
  const peor = ultima
    ? estadoPeor([ultima.temp_c, ultima.ph, ultima.oxigeno_mg_l], [rangoTemp, rangoPh, rangoOx])
    : 'ok'
  const barra =
    peor === 'critico' ? 'bg-critico' : peor === 'advertencia' ? 'bg-advertencia' : 'bg-ok'
  const foto = fotoEstanque(pond.tipo)

  return (
    <article
      data-reveal-item
      className="card-lift flex flex-col overflow-hidden rounded-[var(--radius-cards)] border border-hairline bg-surface "
    >
      <div className="pond-card-img">
        <img src={foto.src} alt={foto.alt} loading="lazy" />
      </div>
      <div className={`h-1 w-full ${barra}`} aria-hidden="true" />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-small)] bg-accent-soft text-ink-emphasis">
            <Waves size={20} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3>
              <Link to={`/estanques/${pond.id}`} className="underline-offset-4 hover:underline">
                {pond.nombre}
              </Link>
            </h3>
            <p className="mt-1 text-caption text-ink-muted">
              {tipoDeEstanque(pond.tipo)} ·{' '}
              {pond.volumen_m3 != null ? (
                <span className="font-mono tabular-nums">
                  {formatNumber(pond.volumen_m3, 0)} <span className="text-[0.85em]">m³</span>
                </span>
              ) : (
                'Volumen sin dato'
              )}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-1 flex-col gap-4">
          {lectura.isPending ? (
            <>
              <Skeleton rows={3} />
              <SlowServerNotice active={lectura.isPending} />
            </>
          ) : lectura.isError ? (
            <ErrorState
              detalle={detalleDe(lectura.error)}
              onRetry={() => {
                void lectura.refetch()
              }}
            />
          ) : !ultima ? (
            <EmptyState message="Aún no llegan lecturas de este estanque. Llegan cuando el celular sincroniza." />
          ) : (
            <>
              <Barra
                label="Temperatura"
                value={ultima.temp_c}
                unit="°C"
                range={rangoTemp}
                icon={Thermometer}
              />
              <Barra label="pH" value={ultima.ph} unit="" range={rangoPh} icon={FlaskConical} />
              <Barra
                label="Oxígeno"
                value={ultima.oxigeno_mg_l}
                unit="mg/L"
                range={rangoOx}
                icon={Wind}
              />
              <PondSpark pondId={pond.id} />
            </>
          )}
        </div>

        {ultima ? (
          <p className="mt-4 text-caption tabular-nums text-ink-muted" title={formatDateTime(ultima.registrado_en)}>
            {formatRelative(ultima.registrado_en)}
          </p>
        ) : null}
      </div>
    </article>
  )
}

function barraSupervivencia(valor: number | null): string {
  if (valor == null) return 'bg-surface-2'
  if (valor >= 90) return 'bg-ok'
  if (valor >= 75) return 'bg-advertencia'
  return 'bg-critico'
}

function LoteCard({ lote, estanque }: { lote: BatchResponse; estanque: string }) {
  const resumen = useBatchSummary(lote.id)

  const numero = (
    dato: number | null | undefined,
    decimales = 1,
  ): ReactNode => {
    if (resumen.isPending) return 'Cargando'
    return <CountUp value={dato} format={(n) => formatNumber(n, decimales)} />
  }

  const supervivencia = resumen.data?.supervivencia_pct ?? null

  return (
    <article
      data-reveal-item
      className="card-lift flex flex-col rounded-[var(--radius-cards)] border border-hairline bg-surface p-5 "
    >
      <div className="flex items-start gap-3">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-small)] bg-accent-soft text-ink-emphasis"
        >
          <Fish size={20} strokeWidth={1.5} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3>
            <Link to={`/lotes/${lote.id}`} className="num font-mono tabular-nums underline-offset-4 hover:underline">
              {lote.codigo}
            </Link>
          </h3>
          <p className="mt-1 text-caption text-ink-muted">{estanque}</p>
        </div>
      </div>
      <dl className="mt-4 flex flex-wrap gap-6">
        <div className="flex flex-col">
          <dt className="text-caption text-ink-muted">Días</dt>
          <dd className="num font-mono text-body tabular-nums text-ink">
            {numero(resumen.data?.dias_cultivo, 0)}
          </dd>
        </div>
        <div className="flex flex-col">
          <dt className="text-caption text-ink-muted">Biomasa</dt>
          <dd className="num font-mono text-body tabular-nums text-ink">
            {numero(resumen.data?.biomasa_kg)}
            {resumen.data?.biomasa_kg != null ? (
              <span className="text-[0.8em] text-ink-muted"> kg</span>
            ) : null}
          </dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-caption text-ink-muted">Supervivencia</span>
          <span className="num font-mono text-body tabular-nums text-ink">
            {numero(supervivencia)}
            {supervivencia != null ? <span className="text-[0.8em] text-ink-muted"> %</span> : null}
          </span>
        </div>
        <div
          role="img"
          aria-label={supervivencia != null ? `Supervivencia ${formatNumber(supervivencia)} por ciento` : 'Supervivencia sin dato'}
          className="h-2 w-full overflow-hidden rounded-full bg-surface-2"
        >
          <div
            className={`h-full rounded-full ${barraSupervivencia(supervivencia)}`}
            style={{ width: `${supervivencia != null ? Math.max(0, Math.min(100, supervivencia)) : 0}%` }}
          />
        </div>
      </div>
    </article>
  )
}

function HeroKpis({
  estanques,
  activos,
  pendientes,
}: {
  estanques: PondResponse[]
  activos: BatchResponse[]
  pendientes: number
}) {
  const resumenes = useQueries({
    queries: activos.map((lote) => ({
      queryKey: keys.batchSummary(lote.id),
      queryFn: () => batchSummary(lote.id),
    })),
  })
  const biomasaCargando = resumenes.some((r) => r.isPending)
  const biomasaTotal = resumenes.reduce<number | null>((total, r) => {
    const valor = r.data?.biomasa_kg
    if (typeof valor !== 'number' || !Number.isFinite(valor)) return total
    return (total ?? 0) + valor
  }, activos.length === 0 ? 0 : null)

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <KpiTile
        icon={Waves}
        label="Estanques activos"
        value={estanques.length}
        format={(n) => formatInteger(n)}
      />
      <KpiTile
        icon={Fish}
        label="Lotes activos"
        value={activos.length}
        format={(n) => formatInteger(n)}
      />
      <KpiTile
        icon={BellRing}
        label="Para atender"
        value={pendientes}
        format={(n) => formatInteger(n)}
        status={pendientes > 0 ? 'critico' : 'ok'}
      />
      <KpiTile
        icon={Scale}
        label="Biomasa total"
        value={biomasaCargando ? null : biomasaTotal}
        format={(n) => formatNumber(n)}
        unit="kg"
      />
    </div>
  )
}

export default function Inicio() {
  const { notify } = useToast()
  const dialogo = useRef<HTMLDialogElement>(null)

  const estanques = usePonds()
  const lotes = useBatches()
  const alertas = useAlerts({ pendientes: true })
  const hallazgos = usePendingFindings()
  const parametros = useParameters()
  const attendAlert = useAttendAlert()
  const attendFinding = useAttendFinding()

  // Grace period: attending waits 5 s so a tap can be undone. No backend
  // undo endpoint exists, so the mutation only fires after the window closes.
  const [aplazada, setAplazada] = useState<Fila | null>(null)
  const temporizador = useRef<number | null>(null)
  const listaRef = useRef<HTMLDivElement>(null)
  const reenfocar = useRef(false)

  // Scroll layer: cards enter in one batch, the ponds row pins and slides on desktop.
  const desktop = useMediaQuery('(min-width: 1024px)')
  const reduce = useReducedMotion() === true
  const horizontal = desktop && !reduce
  const pondTrack = useRef<HTMLDivElement>(null)
  const heroParallax = useParallax<HTMLDivElement>({ distance: 7 })
  const pondCount = estanques.data?.length ?? 0
  const activeCount = (lotes.data ?? []).filter((lote) => lote.estado === 'activo').length
  const revealRoot = useBatchReveal<HTMLDivElement>({
    deps: [pondCount, activeCount],
  })
  const pondTravel = (): number =>
    Math.max(
      0,
      (pondTrack.current?.scrollWidth ?? 0) -
        (pondTrack.current?.parentElement?.clientWidth ?? 0),
    )
  const pinRef = useScrub<HTMLDivElement>({
    target: pondTrack,
    from: { x: 0 },
    to: { x: () => -pondTravel() },
    start: 'top 18%',
    end: () => `+=${Math.max(1, pondTravel() * 1.15)}`,
    scrub: 0.7,
    pin: true,
    enabled: horizontal && pondCount > 0,
    deps: [horizontal, pondCount],
  })

  useEffect(
    () => () => {
      if (temporizador.current !== null) window.clearTimeout(temporizador.current)
    },
    [],
  )

  const abrirFormulario = (): void => {
    dialogo.current?.showModal()
  }

  const cerrarFormulario = (): void => {
    dialogo.current?.close()
  }

  const activos = (lotes.data ?? []).filter((lote) => lote.estado === 'activo')

  const filas: Fila[] = [
    ...(alertas.data ?? []).map(filaDeAlerta),
    ...(hallazgos.data ?? []).map(filaDeHallazgo),
  ].sort(porFechaDesc)

  const visibles = filas.slice(0, 5)

  const nombreEstanque = (id: UUID | null): string =>
    (estanques.data ?? []).find((pond) => pond.id === id)?.nombre ?? 'Sin estanque'

  const nombreLote = (id: UUID | null): string => {
    const lote = (lotes.data ?? []).find((item) => item.id === id)
    return lote ? `Lote ${lote.codigo}` : ''
  }

  const atender = (fila: Fila): void => {
    const alFallar = (error: unknown): void => notify(detalleDe(error))
    if (temporizador.current !== null) window.clearTimeout(temporizador.current)
    setAplazada(fila)
    temporizador.current = window.setTimeout(() => {
      temporizador.current = null
      setAplazada(null)
      // The row unmounts on the optimistic update, taking focus with it.
      // Flag the next paint to land focus on the next action instead of body.
      reenfocar.current = true
      if (fila.tipo === 'alerta') {
        attendAlert.mutate({ id: fila.id }, { onError: alFallar })
      } else {
        attendFinding.mutate({ id: fila.id }, { onError: alFallar })
      }
    }, 5000)
  }

  const deshacer = (): void => {
    if (temporizador.current !== null) window.clearTimeout(temporizador.current)
    temporizador.current = null
    setAplazada(null)
  }

  // After an attended row leaves, focus the next row's button, else the
  // section heading. Runs on the paint where the list shrinks.
  useEffect(() => {
    if (!reenfocar.current) return
    reenfocar.current = false
    const root = listaRef.current
    if (!root) return
    const boton = root.querySelector<HTMLButtonElement>('ul li button:not([disabled])')
    if (boton) {
      boton.focus()
      return
    }
    const titulo = root.querySelector<HTMLElement>('h2')
    if (titulo) {
      titulo.tabIndex = -1
      titulo.focus({ preventScroll: true })
    }
  }, [visibles.length])

  const atencionCargando = alertas.isPending || hallazgos.isPending
  const atencionError = alertas.error ?? hallazgos.error

  const estanquesCargando = estanques.isPending || parametros.isPending
  const estanquesError = estanques.error ?? parametros.error

  const hoy = formatDate(new Date().toISOString())
  const contexto =
    estanques.isPending || lotes.isPending
      ? 'Cargando el resumen de la finca.'
      : `${hoy} · ${plural(estanques.data?.length ?? 0, 'estanque', 'estanques')} · ${plural(activos.length, 'lote activo', 'lotes activos')}`

  return (
    <div ref={revealRoot} className="flex flex-col gap-6">
      <section className="hero-band rounded-[var(--radius-cards)] bg-nav p-6 text-on-nav">
        <div className="hero-ascii" aria-hidden="true">
          <GradientASCII
            colors={[
              'var(--color-bioluminescent)',
              'var(--color-liquid-mist)',
              'var(--color-aurora)',
              'var(--aguamarina)',
            ]}
            shape="horizon"
            cellSize={20}
            density={0.65}
            speed={0.5}
            flow={0.4}
            grain={0.06}
            glow={0.15}
            flicker={0.15}
            mouseInteraction={false}
            clickEffect="none"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
          />
        </div>
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
          <div ref={heroParallax} className="min-w-0">
            <SectionHead as="h1" size="hero" index="01" kicker="Inicio" title="Hoy en la finca" />
            <p className="mt-2 text-body tabular-nums text-on-nav-muted">{contexto}</p>
          </div>
          <Button onClick={abrirFormulario}>Nuevo estanque</Button>
        </div>
        <div className="relative z-10 mt-5">
          {estanques.isPending || lotes.isPending ? (
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              {[0, 1, 2, 3].map((indice) => (
                <div key={indice} className="rounded-[var(--radius-cards)] bg-nav-raised p-4">
                  <Skeleton rows={2} />
                </div>
              ))}
            </div>
          ) : (
            <HeroKpis
              estanques={estanques.data ?? []}
              activos={activos}
              pendientes={filas.length}
            />
          )}
        </div>
      </section>

      <div data-reveal-item ref={listaRef}>
      <Card
        title={`Para atender${atencionCargando ? '' : ` (${formatInteger(filas.length)})`}`}
        action={
          <Link to="/alertas" className="text-body text-ink underline underline-offset-4">
            Ver todas
          </Link>
        }
      >
        {atencionCargando ? (
          <div className="flex flex-col gap-3">
            <Skeleton rows={4} />
            <SlowServerNotice active={atencionCargando} />
          </div>
        ) : atencionError ? (
          <ErrorState
            detalle={detalleDe(atencionError)}
            onRetry={() => {
              void alertas.refetch()
              void hallazgos.refetch()
            }}
          />
        ) : visibles.length === 0 ? (
          <p className="flex items-start gap-3 rounded-[var(--radius-small)] bg-ok-tint px-4 py-3 text-body text-ink">
            <CircleCheck size={20} strokeWidth={1.5} aria-hidden className="mt-0.5 shrink-0 text-ok" />
            <span>
              Nada pendiente.{' '}
              <span className="text-ink-muted">Las alertas y los hallazgos aparecen aquí cuando una lectura sale del rango o la IA detecta algo.</span>
            </span>
          </p>
        ) : (
          <ul>
            <AnimatePresence>
            {visibles.map((fila, indice) => {
              const pendiente =
                fila.tipo === 'alerta'
                  ? attendAlert.isPending && attendAlert.variables?.id === fila.id
                  : attendFinding.isPending && attendFinding.variables?.id === fila.id
              const lugar =
                nombreLote(fila.lote_id) || nombreEstanque(fila.estanque_id)
              const esLote = fila.lote_id != null && nombreLote(fila.lote_id) !== ''
              const LugarIcon = esLote ? Fish : Waves
              return (
                <StaggerItem
                  key={fila.key}
                  as="li"
                  index={indice}
                  layout
                  className="group border-b border-hairline py-3 first:pt-0 last:border-b-0 last:pb-0"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <div className="flex w-full min-w-0 flex-1 flex-col gap-1 sm:w-auto">
                    <div className="flex flex-wrap items-center gap-2">
                      {badgeNivel(fila.nivel)}
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-caption text-ink-muted">
                        <LugarIcon size={14} strokeWidth={1.5} aria-hidden="true" />
                        {fila.tipo === 'alerta' ? 'Alerta' : 'Hallazgo'} · {lugar}
                      </span>
                      {fila.cuando ? (
                        <span className="text-caption tabular-nums text-ink-muted" title={formatDateTime(fila.cuando)}>
                          {formatRelative(fila.cuando)}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-body text-ink">{fila.mensaje}</p>
                  </div>
                  <div className="flex min-h-[var(--button-height)] items-center gap-2 self-start sm:self-auto">
                  {aplazada?.key === fila.key ? (
                    <>
                      <span className="text-caption text-ink-muted">Se atiende en unos segundos</span>
                      <Button variant="secondary" onClick={deshacer}>
                        Deshacer
                      </Button>
                    </>
                  ) : (
                  <Button
                    variant="secondary"
                    loading={pendiente}
                    onClick={() => atender(fila)}
                  >
                    Atender
                  </Button>
                  )}
                  </div>
                  </div>
                </StaggerItem>
              )
            })}
            </AnimatePresence>
          </ul>
        )}
      </Card>
      </div>

      <section className="flex flex-col gap-5">
        <SectionHead index="02" kicker="Estanques" title="Los estanques" />
        {estanquesCargando ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((indice) => (
              <div key={indice} className="rounded-[var(--radius-cards)] border border-hairline bg-surface p-5 ">
                <Skeleton rows={1} />
                <div className="mt-4">
                  <Skeleton rows={5} />
                </div>
              </div>
            ))}
            <SlowServerNotice active={estanquesCargando} />
          </div>
        ) : estanquesError ? (
          <Card>
            <ErrorState
              detalle={detalleDe(estanquesError)}
              onRetry={() => {
                void estanques.refetch()
                void parametros.refetch()
              }}
            />
          </Card>
        ) : (estanques.data ?? []).length === 0 ? (
          <Card>
            <EmptyState message="Aún no hay estanques. Crea el primero para empezar a seguir el agua y los lotes." />
          </Card>
        ) : (
          <div
            ref={pinRef}
            className={horizontal ? 'overflow-hidden lg:h-[32rem]' : ''}
          >
            <div
              ref={pondTrack}
              className={horizontal ? 'pond-track' : 'grid gap-6 md:grid-cols-2 xl:grid-cols-3'}
            >
              {(estanques.data ?? []).map((pond) => (
                <PondCard key={pond.id} pond={pond} rangos={parametros.data?.rangos ?? []} />
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-5">
        <SectionHead index="03" kicker="Lotes" title="Lotes activos" />
        {lotes.isPending ? (
          <div className="flex flex-col gap-3">
            <Skeleton rows={3} />
            <SlowServerNotice active={lotes.isPending} />
          </div>
        ) : lotes.isError ? (
          <Card>
            <ErrorState
              detalle={detalleDe(lotes.error)}
              onRetry={() => {
                void lotes.refetch()
              }}
            />
          </Card>
        ) : activos.length === 0 ? (
          <Card>
            <EmptyState message="No hay lotes activos. Un lote queda activo cuando siembras alevinos en un estanque." />
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {activos.map((lote) => (
              <LoteCard key={lote.id} lote={lote} estanque={nombreEstanque(lote.estanque_id)} />
            ))}
          </div>
        )}
      </section>

      <dialog
        ref={dialogo}
        aria-label="Nuevo estanque"
        className="w-full max-w-md rounded-[var(--radius-small)] border border-hairline bg-surface p-5 text-ink backdrop:bg-ink/40"
      >
        <h2 className="mb-4">Nuevo estanque</h2>
        <PondForm
          onDone={(pond) => {
            cerrarFormulario()
            notify(`Estanque ${pond.nombre} creado.`)
          }}
          onCancel={cerrarFormulario}
        />
      </dialog>
    </div>
  )
}
