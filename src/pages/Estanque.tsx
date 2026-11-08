import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Link, useParams } from 'react-router'
import {
  CircleCheck,
  Download,
  Fish,
  FlaskConical,
  Pencil,
  Plus,
  ScanSearch,
  Thermometer,
  Waves,
  Wind,
  X,
  type LucideIcon,
} from 'lucide-react'
import { downloadPondReadingsCsv } from '../api/endpoints'
import { ApiError } from '../api/http'
import {
  useAiAvailable,
  useBatches,
  useDailyReadings,
  usePond,
  usePondFindings,
  usePondForecast,
  usePondReadings,
  useParameters,
} from '../api/queries'
import type {
  FindingResponse,
  ForecastDay,
  PondResponse,
  RangeResponse,
} from '../api/types'
import { Button } from '../components/ui/Button'
import { DataTable } from '../components/ui/DataTable'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { KpiTile } from '../components/ui/KpiTile'
import { Skeleton } from '../components/ui/Skeleton'
import { SlowServerNotice } from '../components/ui/SlowServerNotice'
import { StatusBadge } from '../components/ui/StatusBadge'
import { rangeStatus, type RangeStatus } from '../components/ui/range'
import { DailyRangeChart } from '../components/charts/DailyRangeChart'
import { TimeSeriesChart } from '../components/charts/TimeSeriesChart'
import { StaggerItem } from '../motion/Motion'
import { useBatchReveal, useParallax } from '../motion/scroll'
import { SectionHead } from '../components/SectionHead'
import { duration, ease } from '../motion/presets'
import { formatDate, formatDateTime, formatInteger, formatNumber, formatRelative } from '../lib/format'
import PondForm from './forms/PondForm'
import BatchForm from './forms/BatchForm'

type RangeKey = '24h' | '7d' | '30d'

const RANGES: Array<{ key: RangeKey; label: string; hours: number; dailyDias: number }> = [
  { key: '24h', label: '24 h', hours: 24, dailyDias: 7 },
  { key: '7d', label: '7 d', hours: 168, dailyDias: 7 },
  { key: '30d', label: '30 d', hours: 720, dailyDias: 30 },
]

const LECTURAS_VACIO =
  'Aún no llegan lecturas de este estanque. Llegan cuando el celular sincroniza.'

function detalleDe(error: unknown): string {
  if (error instanceof ApiError) return error.detalle
  if (error instanceof Error) return error.message
  return 'No se pudo cargar. Intenta de nuevo.'
}

function tipoLabel(tipo: PondResponse['tipo']): string {
  if (tipo === 'tanque') return 'Tanque'
  if (tipo === 'jaula') return 'Jaula'
  return 'Estanque'
}

function volumenTexto(volumen: number | null): ReactNode {
  if (volumen === null || volumen === undefined) return 'volumen sin dato'
  const decimals = Number.isInteger(volumen) ? 0 : 1
  return (
    <span className="font-mono tabular-nums">
      {formatNumber(volumen, decimals)} <span className="text-[0.85em]">m³</span>
    </span>
  )
}

function findingBadge(nivel: FindingResponse['nivel']): RangeStatus | null {
  if (nivel === 'critica') return 'critico'
  if (nivel === 'advertencia') return 'advertencia'
  return null
}

/** The band and limits in words, under the plot, so no label sits on the x axis. */
function captionRango(range: RangeResponse, decimals: number): string {
  const limpia = range.unidad.trim()
  const unidad = limpia === '' ? '' : ` ${limpia}`
  const optimo =
    range.optimo_max !== null && range.optimo_max !== range.optimo_min
      ? `Óptimo de ${formatNumber(range.optimo_min, decimals)} a ${formatNumber(range.optimo_max, decimals)}${unidad}`
      : `Óptimo desde ${formatNumber(range.optimo_min, decimals)}${unidad}`
  const critico =
    range.critico_max !== null
      ? `crítico ${formatNumber(range.critico_min, decimals)}${unidad} y ${formatNumber(range.critico_max, decimals)}${unidad}`
      : `crítico bajo ${formatNumber(range.critico_min, decimals)}${unidad}`
  return `${optimo} · ${critico}`
}

/** State of one value against its optimal range, from /api/parametros. */
function statusDe(value: number | null, range: RangeResponse | undefined): RangeStatus | undefined {
  if (value === null || range === undefined) return undefined
  return rangeStatus(value, {
    optimo_min: range.optimo_min,
    optimo_max: range.optimo_max ?? range.optimo_min,
    critico_min: range.critico_min,
    critico_max: range.critico_max,
  })
}

/** White section card with an icon square, the page's non-chart panels. */
function Panel({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: LucideIcon
  title: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-[var(--radius-cards)] bg-surface p-5 ">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-small)] bg-accent-soft text-ink-emphasis">
            <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <h2 className="truncate">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function Cargando({ rows = 4 }: { rows?: number }) {
  return (
    <div className="rounded-[var(--radius-cards)] bg-surface p-5 ">
      <Skeleton rows={rows} />
      <SlowServerNotice active />
    </div>
  )
}

export default function Estanque() {
  const { id } = useParams()
  const pondId = id ?? ''
  const [rango, setRango] = useState<RangeKey>('7d')
  const reduce = useReducedMotion()
  const [editarAbierto, setEditarAbierto] = useState(false)
  const [loteAbierto, setLoteAbierto] = useState(false)
  const [csvCargando, setCsvCargando] = useState(false)
  const [csvError, setCsvError] = useState<string | null>(null)
  const editarRef = useRef<HTMLDialogElement>(null)
  const loteRef = useRef<HTMLDialogElement>(null)

  const rangoActual = RANGES.find((r) => r.key === rango) ?? RANGES[1]

  const { desde, hasta } = useMemo(() => {
    const end = Date.now()
    const start = end - rangoActual.hours * 3_600_000
    return { desde: new Date(start).toISOString(), hasta: new Date(end).toISOString() }
  }, [rangoActual])

  const pond = usePond(pondId || undefined)
  const params = useParameters()
  const readings = usePondReadings(pondId || undefined, { desde, hasta, limite: 500 })
  const ultima = usePondReadings(pondId || undefined, { limite: 1 })
  const daily = useDailyReadings(pondId || undefined, rangoActual.dailyDias)
  const ai = useAiAvailable()
  const forecast = usePondForecast(pondId || undefined, 2, ai.data?.disponible === true)
  const findings = usePondFindings(pondId || undefined)
  const batches = useBatches({ estanque_id: pondId || undefined })

  // Scroll layer: the pond name drifts on scroll, panels enter in one batch.
  const heroParallax = useParallax<HTMLDivElement>({ distance: 7, deps: [pond.data?.id] })
  const revealRoot = useBatchReveal<HTMLDivElement>({
    deps: [batches.data?.length, findings.data?.length],
  })

  useEffect(() => {
    const el = editarRef.current
    if (!el) return
    if (editarAbierto && !el.open) el.showModal()
    if (!editarAbierto && el.open) el.close()
  }, [editarAbierto])

  useEffect(() => {
    const el = loteRef.current
    if (!el) return
    if (loteAbierto && !el.open) el.showModal()
    if (!loteAbierto && el.open) el.close()
  }, [loteAbierto])

  const tempRange = params.data?.rangos.find((r) => r.variable === 'temp_c')
  const phRange = params.data?.rangos.find((r) => r.variable === 'ph')
  const o2Range = params.data?.rangos.find((r) => r.variable === 'oxigeno_mg_l')

  const ordenadas = useMemo(() => {
    const rows = readings.data ?? []
    return [...rows].sort((a, b) => Date.parse(a.registrado_en) - Date.parse(b.registrado_en))
  }, [readings.data])

  const tempData = useMemo(
    () =>
      ordenadas
        .filter((r) => r.temp_c !== null)
        .map((r) => ({ t: r.registrado_en, v: r.temp_c as number })),
    [ordenadas],
  )
  const phData = useMemo(
    () =>
      ordenadas
        .filter((r) => r.ph !== null)
        .map((r) => ({ t: r.registrado_en, v: r.ph as number })),
    [ordenadas],
  )
  const o2Data = useMemo(
    () =>
      ordenadas
        .filter((r) => r.oxigeno_mg_l !== null)
        .map((r) => ({ t: r.registrado_en, v: r.oxigeno_mg_l as number })),
    [ordenadas],
  )

  const diarioData = useMemo(
    () =>
      (daily.data ?? [])
        .filter((d) => d.temp_min !== null && d.temp_promedio !== null && d.temp_max !== null)
        .map((d) => ({
          dia: d.fecha,
          min: d.temp_min as number,
          avg: d.temp_promedio as number,
          max: d.temp_max as number,
        })),
    [daily.data],
  )

  /** Last reading (limite 1), the source of the three tiles. */
  const ultimaLectura = ultima.data?.[0]
  const tempAhora = ultimaLectura?.temp_c ?? null
  const phAhora = ultimaLectura?.ph ?? null
  const o2Ahora = ultimaLectura?.oxigeno_mg_l ?? null
  const ultimaEn = ultimaLectura?.registrado_en ?? null

  const tempStatus = statusDe(tempAhora, tempRange)
  const phStatus = statusDe(phAhora, phRange)
  const o2Status = statusDe(o2Ahora, o2Range)

  async function onDescargarCsv(): Promise<void> {
    if (!pondId) return
    setCsvCargando(true)
    setCsvError(null)
    try {
      const blob = await downloadPondReadingsCsv(pondId, { desde, hasta })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `lecturas-${pondId}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      setCsvError(detalleDe(error))
    } finally {
      setCsvCargando(false)
    }
  }

  if (pond.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <SectionHead as="h1" size="hero" index="01" kicker="Estanque" title="Estanque" />
        <Skeleton rows={2} />
        <SlowServerNotice active />
        <Skeleton rows={6} />
      </div>
    )
  }

  if (pond.isError) {
    return (
      <div className="flex flex-col gap-6">
        <SectionHead as="h1" size="hero" index="01" kicker="Estanque" title="Estanque" />
        <ErrorState detalle={detalleDe(pond.error)} onRetry={() => void pond.refetch()} />
      </div>
    )
  }

  if (!pond.data) {
    return (
      <div className="flex flex-col gap-6">
        <SectionHead as="h1" size="hero" index="01" kicker="Estanque" title="Estanque" />
        <EmptyState message="No existe el estanque solicitado." />
      </div>
    )
  }

  const estanque = pond.data

  return (
    <div ref={revealRoot} className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-[var(--radius-cards)] bg-accent-soft text-ink-emphasis ">
            <Waves size={20} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div ref={heroParallax}>
              <SectionHead as="h1" size="hero" index="01" kicker="Estanque" title={estanque.nombre} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-accent-soft px-3 py-1 text-caption font-medium text-ink-emphasis">
                {tipoLabel(estanque.tipo)}
              </span>
              <span className="text-caption text-ink-muted">{volumenTexto(estanque.volumen_m3)}</span>
              {ultimaEn ? (
                <span className="text-caption tabular-nums text-ink-faint" title={formatDateTime(ultimaEn)}>
                  Última lectura {formatRelative(ultimaEn)}
                </span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" loading={csvCargando} onClick={() => void onDescargarCsv()}>
            <Download size={16} strokeWidth={1.5} aria-hidden="true" />
            Descargar CSV
          </Button>
          <Button onClick={() => setEditarAbierto(true)}>
            <Pencil size={16} strokeWidth={1.5} aria-hidden="true" />
            Editar
          </Button>
        </div>
      </header>
      {csvError ? (
        <ErrorState detalle={csvError} onRetry={() => void onDescargarCsv()} />
      ) : null}

      <div data-reveal-item className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2>Calidad del agua</h2>
            <p className="text-caption text-ink-faint">
              {ultimaEn ? (
                <>
                  Última lectura{' '}
                  <span className="tabular-nums">{formatRelative(ultimaEn)}</span>
                </>
              ) : (
                'Sin lecturas todavía en este estanque'
              )}
            </p>
          </div>
          <div
            role="group"
            aria-label="Rango de lecturas"
            className="inline-flex items-center gap-1 rounded-[var(--radius-small)] bg-surface-2 p-1"
          >
            {RANGES.map((r) => {
              const activo = r.key === rango
              return (
                <button
                  key={r.key}
                  type="button"
                  aria-pressed={activo}
                  onClick={() => setRango(r.key)}
                  className={`relative min-h-[var(--target-min)] rounded-[var(--radius-small)] px-4 text-body transition-colors duration-[var(--dur-state)] ease-out ${
                    activo ? 'font-medium text-on-cta' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {activo ? (
                    <motion.span
                      aria-hidden="true"
                      layoutId="rango-activo"
                      className="absolute inset-0 rounded-[var(--radius-small)] bg-cta "
                      transition={{ duration: reduce ? 0 : duration.state, ease: ease.fluid }}
                    />
                  ) : null}
                  <span className="relative z-10 tabular-nums">{r.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <KpiTile
            icon={Thermometer}
            label="Temperatura"
            value={tempAhora}
            format={(n) => formatNumber(n, 1)}
            unit="°C"
            status={tempStatus}
          />
          <KpiTile
            icon={FlaskConical}
            label="pH"
            value={phAhora}
            format={(n) => formatNumber(n, 2)}
            status={phStatus}
          />
          <KpiTile
            icon={Wind}
            label="Oxígeno"
            value={o2Ahora}
            format={(n) => formatNumber(n, 1)}
            unit="mg/L"
            status={o2Status}
          />
        </div>
      </div>

      {params.isPending ? (
        <Cargando rows={6} />
      ) : params.isError || !tempRange || !phRange || !o2Range ? (
        <ErrorState
          detalle={
            params.isError
              ? detalleDe(params.error)
              : 'No se pudieron cargar los parámetros del agua.'
          }
          onRetry={() => void params.refetch()}
        />
      ) : readings.isPending ? (
        <Cargando rows={6} />
      ) : readings.isError ? (
        <ErrorState detalle={detalleDe(readings.error)} onRetry={() => void readings.refetch()} />
      ) : (
        <div className="flex flex-col gap-4">
          <div data-reveal-item>
            <TimeSeriesChart
              title="Temperatura"
              icon={Thermometer}
              subtitle="Agua del estanque, con banda óptima"
              data={tempData}
              unit="°C"
              optimoMin={tempRange.optimo_min}
              optimoMax={tempRange.optimo_max}
              criticoMin={tempRange.critico_min}
              criticoMax={tempRange.critico_max}
              emptyText={LECTURAS_VACIO}
              rangeHours={rangoActual.hours}
              decimals={1}
              current={tempAhora}
              status={tempStatus}
              rangeCaption={captionRango(tempRange, 1)}
            />
          </div>
          <div data-reveal-item>
            <TimeSeriesChart
              title="pH"
              icon={FlaskConical}
              subtitle="Acidez del agua, con banda óptima"
              data={phData}
              unit=""
              optimoMin={phRange.optimo_min}
              optimoMax={phRange.optimo_max}
              criticoMin={phRange.critico_min}
              criticoMax={phRange.critico_max}
              emptyText={LECTURAS_VACIO}
              rangeHours={rangoActual.hours}
              decimals={2}
              current={phAhora}
              status={phStatus}
              rangeCaption={captionRango(phRange, 2)}
            />
          </div>
          <div data-reveal-item>
            <TimeSeriesChart
              title="Oxígeno"
              icon={Wind}
              subtitle="Oxígeno disuelto, con banda óptima"
              data={o2Data}
              unit="mg/L"
              optimoMin={o2Range.optimo_min}
              optimoMax={o2Range.optimo_max}
              criticoMin={o2Range.critico_min}
              criticoMax={o2Range.critico_max}
              emptyText={LECTURAS_VACIO}
              rangeHours={rangoActual.hours}
              decimals={1}
              current={o2Ahora}
              status={o2Status}
              rangeCaption={captionRango(o2Range, 1)}
            />
          </div>
        </div>
      )}

      <div data-reveal-item>
        {daily.isPending ? (
          <Cargando rows={4} />
        ) : daily.isError ? (
          <ErrorState detalle={detalleDe(daily.error)} onRetry={() => void daily.refetch()} />
        ) : (
          <DailyRangeChart
            title="Temperatura diaria"
            icon={Thermometer}
            subtitle="Mínimo, promedio y máximo de cada día"
            data={diarioData}
            unit="°C"
            emptyText="Aún no hay promedios diarios. Aparecen cuando llegan lecturas de varios días."
            current={diarioData[diarioData.length - 1]?.avg ?? null}
          />
        )}
      </div>

      <div data-reveal-item>
        <Panel icon={Thermometer} title="Pronóstico de temperatura">
          {ai.isPending ? (
            <div className="flex flex-col gap-3">
              <Skeleton rows={2} />
              <SlowServerNotice active />
            </div>
          ) : ai.data && !ai.data.disponible ? (
            <p className="text-body text-ink-muted">
              Proyección no disponible: el servicio de IA está apagado.
            </p>
          ) : forecast.isPending ? (
            <div className="flex flex-col gap-3">
              <Skeleton rows={2} />
              <SlowServerNotice active />
            </div>
          ) : forecast.isError ? (
            <ErrorState detalle={detalleDe(forecast.error)} onRetry={() => void forecast.refetch()} />
          ) : forecast.data.dias.length === 0 ? (
            <p className="text-body text-ink-muted">
              {forecast.data.mensaje ?? 'Aún no hay pronóstico para este estanque.'}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <DataTable
                columns={[
                  { key: 'fecha', header: 'Día', render: (r: ForecastDay) => <span className="tabular-nums">{formatDate(r.fecha)}</span> },
                  {
                    key: 'minima',
                    header: 'Mín (°C)',
                    numeric: true,
                    render: (r: ForecastDay) => <span className="font-mono tabular-nums">{formatNumber(r.minima, 1)}</span>,
                  },
                  {
                    key: 'promedio',
                    header: 'Promedio (°C)',
                    numeric: true,
                    render: (r: ForecastDay) => <span className="font-mono tabular-nums">{formatNumber(r.promedio, 1)}</span>,
                  },
                  {
                    key: 'maxima',
                    header: 'Máx (°C)',
                    numeric: true,
                    render: (r: ForecastDay) => <span className="font-mono tabular-nums">{formatNumber(r.maxima, 1)}</span>,
                  },
                ]}
                data={forecast.data.dias}
                keyOf={(r) => r.fecha}
                emptyText="Aún no hay pronóstico para este estanque."
              />
              {forecast.data.error_tipico !== null ? (
                <p className="text-caption text-ink-faint">
                  Error típico{' '}
                  <span className="font-mono tabular-nums">{formatNumber(forecast.data.error_tipico, 1)} °C</span>{' '}
                  con <span className="font-mono tabular-nums">{formatNumber(forecast.data.lecturas_usadas, 0)}</span>{' '}
                  lecturas usadas.
                </p>
              ) : null}
            </div>
          )}
        </Panel>
      </div>

      <div data-reveal-item>
        <Panel icon={ScanSearch} title="Hallazgos de este estanque">
          {findings.isPending ? (
            <div className="flex flex-col gap-3">
              <Skeleton rows={2} />
              <SlowServerNotice active />
            </div>
          ) : findings.isError ? (
            <ErrorState detalle={detalleDe(findings.error)} onRetry={() => void findings.refetch()} />
          ) : findings.data.length === 0 ? (
            <EmptyState message="Este estanque no tiene hallazgos. Aparecen cuando el servicio de IA detecta algo." />
          ) : (
            <ul className="flex flex-col gap-3">
              {findings.data.map((h, index) => {
                const badge = findingBadge(h.nivel)
                return (
                  <StaggerItem
                    key={h.id}
                    as="li"
                    index={index}
                    className="flex flex-wrap items-center gap-2"
                  >
                    {badge ? (
                      <StatusBadge status={badge} />
                    ) : (
                      <span className="text-caption text-ink-muted">Informe</span>
                    )}
                    <span className="text-body text-ink">{h.mensaje}</span>
                    {h.medido_en ? (
                      <span
                        className="text-caption tabular-nums text-ink-faint"
                        title={formatDateTime(h.medido_en)}
                      >
                        {formatRelative(h.medido_en)}
                      </span>
                    ) : null}
                  </StaggerItem>
                )
              })}
            </ul>
          )}
        </Panel>
      </div>

      <div data-reveal-item>
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2>Lotes del estanque</h2>
              <p className="text-caption text-ink-faint">
                Cada lote con su siembra y el estado en que va
              </p>
            </div>
            <Button variant="secondary" onClick={() => setLoteAbierto(true)}>
              <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
              Nuevo lote
            </Button>
          </div>
          {batches.isPending ? (
            <Cargando rows={2} />
          ) : batches.isError ? (
            <ErrorState detalle={detalleDe(batches.error)} onRetry={() => void batches.refetch()} />
          ) : batches.data.length === 0 ? (
            <div className="rounded-[var(--radius-cards)] bg-surface p-5 ">
              <EmptyState message="Este estanque aún no tiene lotes. Crea el primero con Nuevo lote." />
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {batches.data.map((lote, index) => {
                const activo = lote.estado === 'activo'
                return (
                  <StaggerItem key={lote.id} as="li" index={index}>
                    <Link
                      to={`/lotes/${lote.id}`}
                      className="group flex h-full flex-col gap-3 rounded-[var(--radius-cards)] bg-surface p-4   duration-[var(--dur-state)] ease-out "
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-small)] bg-accent-soft text-ink-emphasis">
                          <Fish size={20} strokeWidth={1.5} aria-hidden="true" />
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-medium ${
                            activo
                              ? 'bg-ok text-ok-fg'
                              : 'bg-surface-2 text-ink-muted'
                          }`}
                        >
                          {activo ? (
                            <CircleCheck size={16} strokeWidth={1.5} aria-hidden="true" />
                          ) : (
                            <X size={16} strokeWidth={1.5} aria-hidden="true" />
                          )}
                          {activo ? 'Activo' : 'Cerrado'}
                        </span>
                      </div>
                      <div>
                        <p className="text-heading font-medium text-ink transition-colors duration-[var(--dur-micro)] group-hover:text-ink-emphasis">
                          {lote.codigo}
                        </p>
                        <p className="text-caption text-ink-faint">
                          Siembra <span className="tabular-nums">{formatDate(lote.fecha_siembra)}</span>
                        </p>
                      </div>
                      <dl className="mt-auto flex flex-wrap gap-x-6 gap-y-1">
                        <div>
                          <dt className="text-caption text-ink-faint">Peces sembrados</dt>
                          <dd className="num font-mono text-body tabular-nums text-ink">
                            {lote.cantidad_inicial === null
                              ? 'Sin dato'
                              : formatInteger(lote.cantidad_inicial)}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-caption text-ink-faint">Peso inicial</dt>
                          <dd className="num font-mono text-body tabular-nums text-ink">
                            {lote.peso_inicial_g === null ? (
                              'Sin dato'
                            ) : (
                              <>
                                {formatNumber(lote.peso_inicial_g, 1)}{' '}
                                <span className="text-[0.8em] text-ink-muted">g</span>
                              </>
                            )}
                          </dd>
                        </div>
                      </dl>
                    </Link>
                  </StaggerItem>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      <dialog
        ref={editarRef}
        onClose={() => setEditarAbierto(false)}
        aria-label="Editar estanque"
        className="m-auto max-h-[90dvh] w-[min(42rem,92vw)] overflow-y-auto rounded-[var(--radius-cards)] bg-surface p-5 text-ink  backdrop:bg-ink/40"
      >
        {editarAbierto ? (
          <PondForm
            pond={estanque}
            onDone={() => setEditarAbierto(false)}
            onCancel={() => setEditarAbierto(false)}
          />
        ) : null}
      </dialog>

      <dialog
        ref={loteRef}
        onClose={() => setLoteAbierto(false)}
        aria-label="Nuevo lote"
        className="m-auto max-h-[90dvh] w-[min(42rem,92vw)] overflow-y-auto rounded-[var(--radius-cards)] bg-surface p-5 text-ink  backdrop:bg-ink/40"
      >
        {loteAbierto ? (
          <BatchForm
            pondId={pondId}
            onDone={() => setLoteAbierto(false)}
            onCancel={() => setLoteAbierto(false)}
          />
        ) : null}
      </dialog>
    </div>
  )
}
