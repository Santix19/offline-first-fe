import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import {
  Boxes,
  CalendarDays,
  CircleCheck,
  Fish,
  HeartPulse,
  Pencil,
  Repeat,
  Scale,
  TriangleAlert,
  Users,
  Wheat,
  X,
  type LucideIcon,
} from 'lucide-react'
import { ApiError } from '../api/http'
import {
  useAiAvailable,
  useBatch,
  useBatchProjection,
  useBatchSummary,
  useBiometries,
  useFeedings,
  useFryCounts,
  useMortalities,
  usePond,
  useUpdateBatch,
} from '../api/queries'
import { Button } from '../components/ui/Button'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { DataTable } from '../components/ui/DataTable'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { KpiTile } from '../components/ui/KpiTile'
import { Skeleton } from '../components/ui/Skeleton'
import { SlowServerNotice } from '../components/ui/SlowServerNotice'
import { DailyBars } from '../components/charts/DailyBars'
import { GrowthChart } from '../components/charts/GrowthChart'
import type { GrowthPoint } from '../components/charts/GrowthChart'
import { useBatchReveal, useParallax } from '../motion/scroll'
import { SectionHead } from '../components/SectionHead'
import type {
  BiometryResponse,
  FeedingResponse,
  FryCountResponse,
  MortalityResponse,
} from '../api/types'
import { formatDate, formatDateTime, formatInteger, formatNumber } from '../lib/format'
import BatchForm from './forms/BatchForm'

function detalleDe(error: unknown): string {
  if (error instanceof ApiError) return error.detalle
  if (error instanceof Error) return error.message
  return 'No se pudo cargar. Intenta de nuevo.'
}

const bogotaDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Bogota',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function diaBogota(iso: string): string {
  return bogotaDay.format(new Date(iso))
}

function hoyBogota(): string {
  return bogotaDay.format(new Date())
}

function agruparPorDia(rows: Array<{ registrado_en: string; valor: number | null }>): Array<{
  dia: string
  valor: number
}> {
  const sums = new Map<string, number>()
  for (const row of rows) {
    if (row.valor === null || !Number.isFinite(row.valor)) continue
    const dia = diaBogota(row.registrado_en)
    sums.set(dia, (sums.get(dia) ?? 0) + (row.valor as number))
  }
  return [...sums.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dia, valor]) => ({ dia, valor }))
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

export default function Lote() {
  const { id } = useParams()
  const loteId = id ?? ''
  const [editarAbierto, setEditarAbierto] = useState(false)
  const [cerrarAbierto, setCerrarAbierto] = useState(false)
  const [cerrarError, setCerrarError] = useState<string | null>(null)
  const editarRef = useRef<HTMLDialogElement>(null)

  const batch = useBatch(loteId || undefined)
  const summary = useBatchSummary(loteId || undefined)
  const ai = useAiAvailable()
  const projection = useBatchProjection(loteId || undefined, ai.data?.disponible === true)
  const counts = useFryCounts(loteId || undefined)
  const mortalities = useMortalities(loteId || undefined)
  const feedings = useFeedings(loteId || undefined)
  const biometries = useBiometries(loteId || undefined)
  const pond = usePond(batch.data?.estanque_id)
  const cerrar = useUpdateBatch()

  // Scroll layer: batch code drifts, panels enter in one batch.
  const heroParallax = useParallax<HTMLDivElement>({ distance: 7, deps: [batch.data?.id] })
  const revealRoot = useBatchReveal<HTMLDivElement>({
    deps: [batch.data?.id, summary.data?.dias_cultivo],
  })

  useEffect(() => {
    const el = editarRef.current
    if (!el) return
    if (editarAbierto && !el.open) el.showModal()
    if (!editarAbierto && el.open) el.close()
  }, [editarAbierto])

  const crecimiento: GrowthPoint[] = useMemo(() => {
    const puntos: GrowthPoint[] = (biometries.data ?? [])
      .filter((b) => b.peso_promedio_g !== null)
      .map((b) => ({ t: b.registrado_en, peso: b.peso_promedio_g as number }))
      .sort((a, b) => Date.parse(a.t) - Date.parse(b.t))
    const iaEncendida = ai.data?.disponible === true
    const proy = projection.data
    if (
      iaEncendida &&
      proy &&
      proy.peso_proyectado_g !== null &&
      proy.fecha_objetivo !== null &&
      proy.fecha_objetivo !== undefined
    ) {
      const actual = proy.peso_actual_g ?? puntos[puntos.length - 1]?.peso
      if (puntos.length > 0 && actual !== null && actual !== undefined) {
        const ultimo = puntos[puntos.length - 1]
        puntos[puntos.length - 1] = { ...ultimo, proyeccion: actual }
      }
      puntos.push({ t: proy.fecha_objetivo, proyeccion: proy.peso_proyectado_g })
    }
    return puntos
  }, [biometries.data, ai.data, projection.data])

  const fechaObjetivo = useMemo(() => {
    if (ai.data?.disponible !== true) return undefined
    const objetivo = projection.data?.fecha_objetivo
    return objetivo ?? undefined
  }, [ai.data, projection.data])

  const pesoActual = useMemo(() => {
    for (let i = crecimiento.length - 1; i >= 0; i -= 1) {
      const peso = crecimiento[i].peso
      if (peso !== undefined) return peso
    }
    return null
  }, [crecimiento])

  const mortalidadDiaria = useMemo(
    () =>
      agruparPorDia(
        (mortalities.data ?? []).map((m) => ({ registrado_en: m.registrado_en, valor: m.cantidad })),
      ),
    [mortalities.data],
  )

  const alimentoDiario = useMemo(
    () =>
      agruparPorDia(
        (feedings.data ?? []).map((f) => ({ registrado_en: f.registrado_en, valor: f.kg })),
      ),
    [feedings.data],
  )

  async function onCerrarLote(): Promise<void> {
    if (!loteId) return
    setCerrarError(null)
    try {
      await cerrar.mutateAsync({
        id: loteId,
        body: { estado: 'cerrado', fecha_cierre: hoyBogota() },
      })
      setCerrarAbierto(false)
    } catch (error) {
      setCerrarError(detalleDe(error))
    }
  }

  if (batch.isPending) {
    return (
      <div className="flex flex-col gap-6">
        <SectionHead as="h1" size="hero" index="01" kicker="Lote" title="Lote" />
        <Skeleton rows={2} />
        <SlowServerNotice active />
        <Skeleton rows={6} />
      </div>
    )
  }

  if (batch.isError) {
    return (
      <div className="flex flex-col gap-6">
        <SectionHead as="h1" size="hero" index="01" kicker="Lote" title="Lote" />
        <ErrorState detalle={detalleDe(batch.error)} onRetry={() => void batch.refetch()} />
      </div>
    )
  }

  if (!batch.data) {
    return (
      <div className="flex flex-col gap-6">
        <SectionHead as="h1" size="hero" index="01" kicker="Lote" title="Lote" />
        <EmptyState message="No existe el lote solicitado." />
      </div>
    )
  }

  const lote = batch.data
  const estaActivo = lote.estado === 'activo'

  return (
    <div ref={revealRoot} className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-[var(--radius-cards)] bg-accent-soft text-ink-emphasis ">
            <Fish size={20} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div ref={heroParallax}>
              <SectionHead as="h1" size="hero" index="01" kicker="Lote" title={lote.codigo} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-body text-ink-muted">
              {pond.data ? (
                <Link to={`/estanques/${pond.data.id}`} className="link-draw text-ink-emphasis">
                  {pond.data.nombre}
                </Link>
              ) : (
                <span>Estanque</span>
              )}
              <span className="text-caption text-ink-faint">
                Siembra <span className="tabular-nums">{formatDate(lote.fecha_siembra)}</span>
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-medium ${
                  estaActivo ? 'bg-ok text-ok-fg' : 'bg-surface-2 text-ink-muted'
                }`}
              >
                {estaActivo ? (
                  <CircleCheck size={16} strokeWidth={1.5} aria-hidden="true" />
                ) : (
                  <X size={16} strokeWidth={1.5} aria-hidden="true" />
                )}
                {estaActivo ? 'Activo' : 'Cerrado'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {estaActivo ? (
            <Button variant="secondary" onClick={() => setCerrarAbierto(true)}>
              Cerrar lote
            </Button>
          ) : null}
          <Button onClick={() => setEditarAbierto(true)}>
            <Pencil size={16} strokeWidth={1.5} aria-hidden="true" />
            Editar
          </Button>
        </div>
      </header>
      {cerrarError ? <p className="text-body text-ink">{cerrarError}</p> : null}

      <div data-reveal-item>
        {summary.isPending ? (
          <Cargando rows={3} />
        ) : summary.isError ? (
          <ErrorState detalle={detalleDe(summary.error)} onRetry={() => void summary.refetch()} />
        ) : (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <KpiTile
                icon={CalendarDays}
                label="Días de cultivo"
                value={summary.data.dias_cultivo}
                format={formatInteger}
              />
              <KpiTile
                icon={Users}
                label="Población estimada"
                value={summary.data.poblacion_estimada}
                format={formatInteger}
                unit="peces"
              />
              <KpiTile
                icon={HeartPulse}
                label="Supervivencia"
                value={summary.data.supervivencia_pct}
                format={(n) => formatNumber(n, 1)}
                unit="%"
              />
              <KpiTile
                icon={Scale}
                label="Biomasa"
                value={summary.data.biomasa_kg}
                format={(n) => formatNumber(n, 1)}
                unit="kg"
              />
              <KpiTile
                icon={Boxes}
                label="Densidad"
                value={summary.data.densidad_kg_m3}
                format={(n) => formatNumber(n, 2)}
                unit="kg/m³"
              />
              <KpiTile
                icon={Wheat}
                label="Ración diaria"
                value={summary.data.racion_diaria_kg}
                format={(n) => formatNumber(n, 2)}
                unit="kg"
              />
              <KpiTile
                icon={Repeat}
                label="FCA"
                value={summary.data.conversion_alimenticia}
                format={(n) => formatNumber(n, 2)}
              />
            </div>
            {summary.data.notas.length > 0 ? (
              <ul className="flex list-disc flex-col gap-1 rounded-[var(--radius-cards)] bg-surface-2 px-5 py-4 pl-9 text-caption text-ink-muted">
                {summary.data.notas.map((nota) => (
                  <li key={nota}>{nota}</li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
      </div>

      <div data-reveal-item>
        {biometries.isPending ? (
          <Cargando rows={3} />
        ) : biometries.isError ? (
          <ErrorState detalle={detalleDe(biometries.error)} onRetry={() => void biometries.refetch()} />
        ) : (
          <GrowthChart
            title="Curva de crecimiento"
            icon={Scale}
            subtitle="Peso promedio por biometría, con proyección"
            data={crecimiento}
            fechaObjetivo={fechaObjetivo}
            emptyText="Aún no hay biometrías de este lote. Aparecen cuando se registran pesajes."
            current={pesoActual}
          />
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div data-reveal-item>
          {mortalities.isPending ? (
            <Cargando rows={3} />
          ) : mortalities.isError ? (
            <ErrorState
              detalle={detalleDe(mortalities.error)}
              onRetry={() => void mortalities.refetch()}
            />
          ) : (
            <DailyBars
              title="Mortalidad por día"
              icon={TriangleAlert}
              subtitle="Peces muertos registrados cada día"
              data={mortalidadDiaria}
              unit="peces"
              emptyText="Aún no hay mortalidad registrada en este lote."
              integerOnly
              series="fish"
              current={mortalidadDiaria[mortalidadDiaria.length - 1]?.valor ?? null}
            />
          )}
        </div>

        <div data-reveal-item>
          {feedings.isPending ? (
            <Cargando rows={3} />
          ) : feedings.isError ? (
            <ErrorState detalle={detalleDe(feedings.error)} onRetry={() => void feedings.refetch()} />
          ) : (
            <DailyBars
              title="Alimento por día"
              icon={Wheat}
              subtitle="Kilogramos suministrados cada día"
              data={alimentoDiario}
              unit="kg"
              emptyText="Aún no hay alimento registrado en este lote."
              series="fish"
              current={alimentoDiario[alimentoDiario.length - 1]?.valor ?? null}
            />
          )}
        </div>
      </div>

      <div data-reveal-item>
        <Panel icon={Boxes} title="Conteos">
          {counts.isPending ? (
            <div className="flex flex-col gap-3">
              <Skeleton rows={2} />
              <SlowServerNotice active />
            </div>
          ) : counts.isError ? (
            <ErrorState detalle={detalleDe(counts.error)} onRetry={() => void counts.refetch()} />
          ) : (
            <DataTable
              columns={[
                {
                  key: 'fecha',
                  header: 'Fecha',
                  render: (r: FryCountResponse) => <span className="tabular-nums">{formatDateTime(r.registrado_en)}</span>,
                },
                {
                  key: 'total',
                  header: 'Total',
                  numeric: true,
                  render: (r: FryCountResponse) =>
                    r.total === null ? 'Sin dato' : <span className="font-mono tabular-nums">{formatInteger(r.total)}</span>,
                },
                { key: 'origen', header: 'Origen', render: (r: FryCountResponse) => r.origen },
              ]}
              data={counts.data}
              keyOf={(r) => r.id}
              emptyText="Aún no hay conteos en este lote."
            />
          )}
        </Panel>
      </div>

      <div data-reveal-item>
        <Panel icon={TriangleAlert} title="Mortalidades">
          {mortalities.isPending ? (
            <div className="flex flex-col gap-3">
              <Skeleton rows={2} />
              <SlowServerNotice active />
            </div>
          ) : mortalities.isError ? (
            <ErrorState
              detalle={detalleDe(mortalities.error)}
              onRetry={() => void mortalities.refetch()}
            />
          ) : (
            <DataTable
              columns={[
                {
                  key: 'fecha',
                  header: 'Fecha',
                  render: (r: MortalityResponse) => <span className="tabular-nums">{formatDateTime(r.registrado_en)}</span>,
                },
                {
                  key: 'cantidad',
                  header: 'Cantidad',
                  numeric: true,
                  render: (r: MortalityResponse) =>
                    r.cantidad === null ? 'Sin dato' : <span className="font-mono tabular-nums">{formatInteger(r.cantidad)}</span>,
                },
                {
                  key: 'causa',
                  header: 'Causa',
                  render: (r: MortalityResponse) => r.causa ?? 'Sin causa',
                },
                { key: 'origen', header: 'Origen', render: (r: MortalityResponse) => r.origen },
              ]}
              data={mortalities.data}
              keyOf={(r) => r.id}
              emptyText="Aún no hay mortalidad registrada en este lote."
            />
          )}
        </Panel>
      </div>

      <div data-reveal-item>
        <Panel icon={Wheat} title="Alimentaciones">
          {feedings.isPending ? (
            <div className="flex flex-col gap-3">
              <Skeleton rows={2} />
              <SlowServerNotice active />
            </div>
          ) : feedings.isError ? (
            <ErrorState detalle={detalleDe(feedings.error)} onRetry={() => void feedings.refetch()} />
          ) : (
            <DataTable
              columns={[
                {
                  key: 'fecha',
                  header: 'Fecha',
                  render: (r: FeedingResponse) => <span className="tabular-nums">{formatDateTime(r.registrado_en)}</span>,
                },
                {
                  key: 'kg',
                  header: 'Alimento (kg)',
                  numeric: true,
                  render: (r: FeedingResponse) =>
                    r.kg === null ? 'Sin dato' : <span className="font-mono tabular-nums">{formatNumber(r.kg, 2)}</span>,
                },
                { key: 'origen', header: 'Origen', render: (r: FeedingResponse) => r.origen },
              ]}
              data={feedings.data}
              keyOf={(r) => r.id}
              emptyText="Aún no hay alimento registrado en este lote."
            />
          )}
        </Panel>
      </div>

      <div data-reveal-item>
        <Panel icon={Scale} title="Biometrías">
          {biometries.isPending ? (
            <div className="flex flex-col gap-3">
              <Skeleton rows={2} />
              <SlowServerNotice active />
            </div>
          ) : biometries.isError ? (
            <ErrorState
              detalle={detalleDe(biometries.error)}
              onRetry={() => void biometries.refetch()}
            />
          ) : (
            <DataTable
              columns={[
                {
                  key: 'fecha',
                  header: 'Fecha',
                  render: (r: BiometryResponse) => <span className="tabular-nums">{formatDateTime(r.registrado_en)}</span>,
                },
                {
                  key: 'peso',
                  header: 'Peso promedio (g)',
                  numeric: true,
                  render: (r: BiometryResponse) =>
                    r.peso_promedio_g === null ? 'Sin dato' : <span className="font-mono tabular-nums">{formatNumber(r.peso_promedio_g, 1)}</span>,
                },
                {
                  key: 'muestra',
                  header: 'Muestra',
                  numeric: true,
                  render: (r: BiometryResponse) =>
                    r.muestra === null ? 'Sin dato' : <span className="font-mono tabular-nums">{formatInteger(r.muestra)}</span>,
                },
                { key: 'origen', header: 'Origen', render: (r: BiometryResponse) => r.origen },
              ]}
              data={biometries.data}
              keyOf={(r) => r.id}
              emptyText="Aún no hay biometrías de este lote. Aparecen cuando se registran pesajes."
            />
          )}
        </Panel>
      </div>

      <ConfirmDialog
        open={cerrarAbierto}
        title="Cerrar lote"
        message={`El lote ${lote.codigo} queda cerrado con fecha de hoy. Puedes consultarlo después en el historial.`}
        confirmLabel="Cerrar lote"
        onConfirm={() => void onCerrarLote()}
        onClose={() => {
          if (!cerrar.isPending) setCerrarAbierto(false)
        }}
      />

      <dialog
        ref={editarRef}
        onClose={() => setEditarAbierto(false)}
        aria-label="Editar lote"
        className="m-auto max-h-[90dvh] w-[min(42rem,92vw)] overflow-y-auto rounded-[var(--radius-cards)] bg-surface p-5 text-ink  backdrop:bg-ink/40"
      >
        {editarAbierto ? (
          <BatchForm
            batch={lote}
            pondId={lote.estanque_id}
            onDone={() => setEditarAbierto(false)}
            onCancel={() => setEditarAbierto(false)}
          />
        ) : null}
      </dialog>
    </div>
  )
}
