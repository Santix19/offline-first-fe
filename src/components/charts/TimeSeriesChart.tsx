import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { DataTable } from '../ui/DataTable'
import { Button } from '../ui/Button'
import type { RangeStatus } from '../ui/range'
import { ChartCard } from './ChartCard'
import { ChartTooltip } from './ChartTooltip'
import { useChartMotion, useChartSwap } from './chartMotion'
import { isHourRange, niceTicks, sampleTicks, spanHoursOf } from './axis'
import { formatDateTime, formatNumber, formatTime, formatDayShort } from '../../lib/format'

export interface TimePoint {
  t: string
  v: number
}

interface TimeSeriesChartProps {
  title: string
  icon?: LucideIcon
  data: TimePoint[]
  unit: string
  optimoMin: number
  /** null = no upper bound (oxygen): the band runs to the top of the plot. */
  optimoMax: number | null
  criticoMin: number
  criticoMax: number | null
  emptyText: string
  /** Visible hours (24, 168, 720). Decides hour vs day x labels. Defaults to the data span. */
  rangeHours?: number
  /** Decimals for y ticks, tooltip and table. Defaults to 1. */
  decimals?: number
  /** Last reading: the big value at the top right of the card. */
  current?: number | null
  /** State of the current value against the optimal range. */
  status?: RangeStatus
  subtitle?: string
  /** One line under the plot: optimal band and critical limits, in the range's own units. */
  rangeCaption?: string
}

export function TimeSeriesChart({
  title,
  icon,
  data,
  unit,
  optimoMin,
  optimoMax,
  criticoMin,
  criticoMax,
  emptyText,
  rangeHours,
  decimals = 1,
  current,
  status,
  subtitle,
  rangeCaption,
}: TimeSeriesChartProps) {
  const [verTabla, setVerTabla] = useState(false)
  const { draw, bandShape } = useChartMotion()
  const swap = useChartSwap()

  const hourMode = useMemo(() => {
    const keys = data.map((d) => d.t)
    return isHourRange(rangeHours, spanHoursOf(keys))
  }, [data, rangeHours])

  const formatTick = hourMode ? formatTime : formatDayShort

  const xTicks = useMemo(
    () => sampleTicks(data.map((d) => d.t), formatTick, 5),
    [data, formatTick],
  )

  const yScale = useMemo(() => {
    const values = data.map((d) => d.v)
    const lo = Math.min(optimoMin, criticoMin, ...values)
    const hi = Math.max(
      optimoMax ?? Number.NEGATIVE_INFINITY,
      criticoMin,
      criticoMax ?? Number.NEGATIVE_INFINITY,
      ...values,
    )
    return niceTicks(lo, hi, 5)
  }, [data, optimoMin, optimoMax, criticoMin, criticoMax])

  return (
    <ChartCard
      icon={icon}
      title={title}
      subtitle={subtitle}
      current={{ value: current ?? null, unit, decimals }}
      status={status}
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
                { key: 't', header: 'Hora (Bogotá)', render: (r: TimePoint) => formatDateTime(r.t) },
                {
                  key: 'v',
                  header: `Valor (${unit})`,
                  numeric: true,
                  render: (r: TimePoint) => formatNumber(r.v, decimals),
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
                    ticks={xTicks}
                    interval={0}
                    tickFormatter={formatTick}
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
                        unit={unit}
                        formatLabel={formatDateTime}
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
                    dataKey="v"
                    stroke="none"
                    fill="var(--chart-fill)"
                    fillOpacity={1}
                  />
                  <ReferenceArea y1={optimoMin} y2={optimoMax ?? yScale.domain[1]} shape={bandShape} />
                  <ReferenceLine
                    y={criticoMin}
                    stroke="var(--chart-line-critico)"
                    strokeDasharray="4 4"
                  />
                  {criticoMax !== null ? (
                    <ReferenceLine
                      y={criticoMax}
                      stroke="var(--chart-line-critico)"
                      strokeDasharray="4 4"
                    />
                  ) : null}
                  <Line
                    {...draw}
                    animationBegin={120}
                    type="monotone"
                    dataKey="v"
                    stroke="var(--series-1)"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 3 }}
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
      {!verTabla && rangeCaption ? (
        <p className="mt-2 text-caption text-ink-faint">{rangeCaption}</p>
      ) : null}
    </ChartCard>
  )
}
