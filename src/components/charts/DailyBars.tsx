import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
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
import { formatDate, formatInteger, formatNumber, formatDayShort } from '../../lib/format'

export interface DayBarPoint {
  dia: string
  valor: number
}

interface DailyBarsProps {
  title: string
  icon?: LucideIcon
  data: DayBarPoint[]
  unit: string
  emptyText: string
  /** Count charts use integer ticks only. Defaults to false. */
  integerOnly?: boolean
  decimals?: number
  /** Water data (series-1 blue) or batch data (series-2 white). Defaults to water. */
  series?: 'water' | 'fish'
  /** Last day value: the big value at the top right of the card. */
  current?: number | null
  subtitle?: string
}

export function DailyBars({
  title,
  icon,
  data,
  unit,
  emptyText,
  integerOnly = false,
  decimals,
  series = 'water',
  current,
  subtitle,
}: DailyBarsProps) {
  const [verTabla, setVerTabla] = useState(false)
  const { draw } = useChartMotion()
  const swap = useChartSwap()
  const resolvedDecimals = decimals ?? (integerOnly ? 0 : 1)
  const fill = series === 'fish' ? 'var(--series-2)' : 'var(--series-1)'


  const yScale = useMemo(() => {
    const values = data.map((d) => d.valor)
    if (values.length === 0) return niceTicks(0, 1, 4, integerOnly)
    return niceTicks(Math.min(0, ...values), Math.max(...values), 4, integerOnly)
  }, [data, integerOnly])

  const formatValue = (v: number | string): string => {
    if (typeof v !== 'number') {
      const parsed = Number(v)
      if (v !== '' && Number.isFinite(parsed)) {
        return integerOnly ? formatInteger(Math.round(parsed)) : formatNumber(parsed, resolvedDecimals)
      }
      return String(v)
    }
    return integerOnly ? formatInteger(Math.round(v)) : formatNumber(v, resolvedDecimals)
  }

  return (
    <ChartCard
      icon={icon}
      title={title}
      subtitle={subtitle}
      current={{ value: current ?? null, unit, decimals: resolvedDecimals }}
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
                { key: 'dia', header: 'Día', render: (r: DayBarPoint) => formatDate(r.dia) },
                {
                  key: 'valor',
                  header: `Valor (${unit})`,
                  numeric: true,
                  render: (r: DayBarPoint) => formatValue(r.valor),
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
                <BarChart
                  data={data}
                  margin={{ top: 8, right: 32, bottom: 0, left: 0 }}
                  barCategoryGap={2}
                >
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
                    allowDecimals={!integerOnly}
                    tickFormatter={(v: number) => formatValue(v)}
                    tick={{ className: 'chart-tick' }}
                    stroke="var(--chart-grid)"
                  />
                  <Tooltip
                    content={
                      <ChartTooltip unit={unit} formatLabel={formatDate} formatValue={formatValue} />
                    }
                    cursor={{ fill: 'var(--chart-band-optimo)' }}
                  />
                  <Bar
                    {...draw}
                    animationBegin={120}
                    dataKey="valor"
                    fill={fill}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
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
