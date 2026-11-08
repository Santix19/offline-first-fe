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

export interface DayRangePoint {
  dia: string
  min: number
  avg: number
  max: number
}

interface DailyRangeChartProps {
  title: string
  icon?: LucideIcon
  data: DayRangePoint[]
  unit: string
  emptyText: string
  decimals?: number
  /** Last daily average: the big value at the top right of the card. */
  current?: number | null
  subtitle?: string
}

export function DailyRangeChart({
  title,
  icon,
  data,
  unit,
  emptyText,
  decimals = 1,
  current,
  subtitle,
}: DailyRangeChartProps) {
  const [verTabla, setVerTabla] = useState(false)
  const { draw } = useChartMotion()
  const swap = useChartSwap()


  const yScale = useMemo(() => {
    const values = data.flatMap((d) => [d.min, d.avg, d.max])
    if (values.length === 0) return niceTicks(0, 1, 5)
    return niceTicks(Math.min(...values), Math.max(...values), 5)
  }, [data])

  return (
    <ChartCard
      icon={icon}
      title={title}
      subtitle={subtitle}
      current={{ value: current ?? null, unit, decimals }}
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
                { key: 'dia', header: 'Día', render: (r: DayRangePoint) => formatDate(r.dia) },
                {
                  key: 'min',
                  header: `Mín (${unit})`,
                  numeric: true,
                  render: (r: DayRangePoint) => formatNumber(r.min, decimals),
                },
                {
                  key: 'avg',
                  header: `Promedio (${unit})`,
                  numeric: true,
                  render: (r: DayRangePoint) => formatNumber(r.avg, decimals),
                },
                {
                  key: 'max',
                  header: `Máx (${unit})`,
                  numeric: true,
                  render: (r: DayRangePoint) => formatNumber(r.max, decimals),
                },
              ]}
              data={data}
              keyOf={(r) => r.dia}
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
                    dataKey="dia"
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
                        unit={unit}
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
                    animationBegin={80}
                    type="monotone"
                    dataKey={(d: DayRangePoint) => [d.min, d.max]}
                    stroke="none"
                    fill="var(--series-1)"
                    fillOpacity={0.18}
                  />
                  <Line
                    {...draw}
                    animationBegin={240}
                    type="monotone"
                    dataKey="avg"
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
    </ChartCard>
  )
}
