import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { DataTable } from '../ui/DataTable'
import { Button } from '../ui/Button'
import { ChartCard } from './ChartCard'
import { ChartTooltip } from './ChartTooltip'
import { useChartMotion, useChartSwap } from './chartMotion'
import { niceTicks } from './axis'
import { formatDate, formatNumber, formatDayShort } from '../../lib/format'

export interface GrowthPoint {
  t: string
  peso?: number
  proyeccion?: number
}

interface GrowthChartProps {
  title: string
  icon?: LucideIcon
  data: GrowthPoint[]
  /** Target date of the projection. Optional: shown only when the data has a projection. */
  fechaObjetivo?: string
  emptyText: string
  decimals?: number
  /** Last measured weight: the big value at the top right of the card. */
  current?: number | null
  subtitle?: string
}

/** The batch's weight curve: white (series-2), area under the measured line, dashed projection. */
export function GrowthChart({
  title,
  icon,
  data,
  fechaObjetivo,
  emptyText,
  decimals = 1,
  current,
  subtitle,
}: GrowthChartProps) {
  const [verTabla, setVerTabla] = useState(false)
  const { draw } = useChartMotion()
  const swap = useChartSwap()


  const yScale = useMemo(() => {
    const values = data
      .flatMap((d) => [d.peso ?? NaN, d.proyeccion ?? NaN])
      .filter((v) => Number.isFinite(v))
    if (values.length === 0) return niceTicks(0, 1, 5)
    return niceTicks(Math.min(...values), Math.max(...values), 5)
  }, [data])

  const hasProjection = data.some((d) => d.proyeccion !== undefined)
  const showCaption = hasProjection && fechaObjetivo !== undefined && fechaObjetivo !== ''

  return (
    <ChartCard
      icon={icon}
      title={title}
      subtitle={subtitle}
      current={{ value: current ?? null, unit: 'g', decimals }}
      footer={
        <Button variant="quiet" onClick={() => setVerTabla((v) => !v)}>
          {verTabla ? 'Ver gráfico' : 'Ver tabla'}
        </Button>
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {verTabla ? (
          <motion.div key="tabla" {...swap}>
            <DataTable
              columns={[
                { key: 't', header: 'Fecha', render: (r: GrowthPoint) => formatDate(r.t) },
                {
                  key: 'peso',
                  header: 'Peso (g)',
                  numeric: true,
                  render: (r: GrowthPoint) =>
                    r.peso !== undefined
                      ? formatNumber(r.peso, decimals)
                      : r.proyeccion !== undefined
                        ? `proyección ${formatNumber(r.proyeccion, decimals)}`
                        : 'Sin dato',
                },
              ]}
              data={data}
              keyOf={(r) => r.t}
              emptyText={emptyText}
            />
          </motion.div>
        ) : (
          <motion.div key="grafico" {...swap}>
            <div className="relative h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 8, right: 32, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <XAxis
                    dataKey="t"
                    interval="preserveStartEnd"
                    minTickGap={28}
                    tickFormatter={formatDayShort}
                    tick={{ className: 'chart-tick' }}
                    stroke="var(--chart-grid)"
                  />
                  <YAxis
                    ticks={yScale.ticks}
                    domain={yScale.domain}
                    tickFormatter={(v: number) => formatNumber(v, decimals)}
                    tick={{ className: 'chart-tick' }}
                    stroke="var(--chart-grid)"
                  />
                  <Tooltip
                    content={
                      <ChartTooltip
                        unit="g"
                        formatLabel={formatDate}
                        formatValue={(v) =>
                          typeof v === 'number' ? formatNumber(v, decimals) : String(v)
                        }
                      />
                    }
                    cursor={{ stroke: 'var(--chart-grid)' }}
                  />
                  <Area
                    {...draw}
                    animationBegin={0}
                    type="monotone"
                    dataKey="peso"
                    stroke="none"
                    fill="var(--series-2)"
                    fillOpacity={0.14}
                    connectNulls={false}
                  />
                  <Line
                    {...draw}
                    animationBegin={120}
                    type="monotone"
                    dataKey="peso"
                    stroke="var(--series-2)"
                    strokeWidth={2}
                    dot={{ r: 2, fill: 'var(--series-2)', strokeWidth: 0 }}
                    activeDot={{ r: 3 }}
                    connectNulls={false}
                  />
                  {/* Projection continues once the measured line is drawing. */}
                  <Line
                    {...draw}
                    animationBegin={360}
                    type="monotone"
                    dataKey="proyeccion"
                    stroke="var(--series-2)"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    dot={false}
                    activeDot={{ r: 3 }}
                    connectNulls
                  />
                </ComposedChart>
              </ResponsiveContainer>
              {data.length === 0 ? (
                <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-caption text-ink-muted">
                  {emptyText}
                </p>
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {showCaption ? (
        <p className="mt-2 text-caption text-ink-faint">
          Línea punteada: proyección a {formatDate(fechaObjetivo)}.
        </p>
      ) : null}
    </ChartCard>
  )
}
