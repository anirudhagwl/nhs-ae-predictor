import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import ChartWrapper from '../shared/ChartWrapper'

const SERIES = [
  { key: 'trend', label: 'Trend', color: '#2563EB' },
  { key: 'seasonal', label: 'Seasonal', color: '#16A34A' },
  { key: 'residual', label: 'Residual', color: '#6B7280' },
]

export default function SeasonalDecomposition({ decomposition }) {
  const chartData = useMemo(() => {
    if (!decomposition || !decomposition.trend) return null
    const len = decomposition.trend.length
    // Generate date labels if not provided (Jan 2020 onwards, monthly)
    const dates = decomposition.dates || Array.from({ length: len }, (_, i) => {
      const year = 2020 + Math.floor(i / 12)
      const month = (i % 12) + 1
      return `${year}-${String(month).padStart(2, '0')}`
    })
    return dates.map((date, i) => ({
      date,
      trend: decomposition.trend?.[i] ?? null,
      seasonal: decomposition.seasonal?.[i] ?? null,
      residual: decomposition.residual?.[i] ?? null,
    }))
  }, [decomposition])

  if (!chartData) {
    return (
      <ChartWrapper title="Seasonal Decomposition">
        <p className="text-sm text-text-secondary dark:text-gray-400">No decomposition data available.</p>
      </ChartWrapper>
    )
  }

  return (
    <ChartWrapper title="Seasonal Decomposition">
      <div className="space-y-1">
        {SERIES.map((series, idx) => {
          const isLast = idx === SERIES.length - 1
          return (
            <div key={series.key}>
              <p className="text-xs font-medium text-text-secondary dark:text-gray-400 mb-0.5 ml-1">
                {series.label}
              </p>
              <ResponsiveContainer width="100%" height={120}>
                <LineChart data={chartData} margin={{ top: 4, right: 12, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={isLast ? { fontSize: 10, fill: '#6B7280' } : false}
                    tickLine={isLast}
                    axisLine={{ stroke: '#E5E7EB' }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#6B7280' }}
                    tickLine={false}
                    axisLine={false}
                    width={45}
                    tickCount={3}
                  />
                  <Tooltip
                    contentStyle={{
                      fontSize: 12,
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: 6,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    }}
                    formatter={(value) => [value != null ? value.toFixed(1) : 'N/A', series.label]}
                    labelFormatter={(label) => label}
                  />
                  <Line
                    type="monotone"
                    dataKey={series.key}
                    stroke={series.color}
                    strokeWidth={1.5}
                    dot={false}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )
        })}
      </div>
    </ChartWrapper>
  )
}
