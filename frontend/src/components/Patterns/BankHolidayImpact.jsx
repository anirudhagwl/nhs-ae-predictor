import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts'
import ChartWrapper from '../shared/ChartWrapper'

const BAR_COLORS = {
  'Week Before': '#2563EB',
  'Bank Holiday Week': '#D97706',
  'Week After': '#2563EB',
}

export default function BankHolidayImpact({ bankHolidayImpact }) {
  const chartData = useMemo(() => {
    if (!bankHolidayImpact) return null
    const { before, during, after } = bankHolidayImpact
    return [
      { name: 'Week Before', value: before },
      { name: 'Bank Holiday Week', value: during },
      { name: 'Week After', value: after },
    ]
  }, [bankHolidayImpact])

  if (!chartData) {
    return (
      <ChartWrapper title="Bank Holiday Impact">
        <p className="text-sm text-text-secondary dark:text-gray-400">No bank holiday data available.</p>
      </ChartWrapper>
    )
  }

  return (
    <ChartWrapper title="Bank Holiday Impact">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ top: 16, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#6B7280' }}
            axisLine={{ stroke: '#E5E7EB' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#6B7280' }}
            axisLine={false}
            tickLine={false}
            width={50}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              backgroundColor: 'white',
              border: '1px solid #E5E7EB',
              borderRadius: 6,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
            formatter={(value) => [Math.round(value), 'Avg Attendances']}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={64}>
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={BAR_COLORS[entry.name]} />
            ))}
            <LabelList
              dataKey="value"
              position="top"
              formatter={(v) => Math.round(v)}
              style={{ fontSize: 12, fontWeight: 600, fill: '#374151' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}
