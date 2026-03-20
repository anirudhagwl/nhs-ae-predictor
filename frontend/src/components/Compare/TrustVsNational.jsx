import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  LabelList,
} from 'recharts'
import ChartWrapper from '../shared/ChartWrapper'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-3 shadow-lg text-sm">
      <p className="font-medium text-text-primary dark:text-gray-100 mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-text-secondary dark:text-gray-400">
          <span style={{ color: entry.color }}>{entry.name}:</span>{' '}
          {typeof entry.value === 'number' ? entry.value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : entry.value}
        </p>
      ))}
    </div>
  )
}

function formatValue(value) {
  if (value == null) return ''
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`
  return value.toFixed(1)
}

export default function TrustVsNational({ trustData, nationalAverages }) {
  if (!trustData || !nationalAverages?.length) return null

  const trustMonthly = trustData.monthly_metrics || trustData.monthlyMetrics || []

  const trustAvgBreach = trustMonthly.length > 0
    ? trustMonthly.reduce((sum, m) => sum + (m.breach_rate ?? m.breachRate ?? 0), 0) / trustMonthly.length
    : 0

  const trustAvgAttendances = trustMonthly.length > 0
    ? trustMonthly.reduce((sum, m) => sum + (m.total_attendances ?? m.attendances ?? 0), 0) / trustMonthly.length
    : 0

  const nationalAvgBreach = nationalAverages.length > 0
    ? nationalAverages.reduce((sum, m) => sum + (m.breach_rate ?? m.avg_breach_rate ?? 0), 0) / nationalAverages.length
    : 0

  const nationalAvgAttendances = nationalAverages.length > 0
    ? nationalAverages.reduce((sum, m) => sum + (m.total_attendances ?? m.avg_attendances ?? 0), 0) / nationalAverages.length
    : 0

  const chartData = [
    {
      metric: 'Avg Breach Rate (%)',
      trust: parseFloat(trustAvgBreach.toFixed(1)),
      national: parseFloat(nationalAvgBreach.toFixed(1)),
    },
    {
      metric: 'Avg Attendances',
      trust: Math.round(trustAvgAttendances),
      national: Math.round(nationalAvgAttendances),
    },
  ]

  return (
    <ChartWrapper title="Trust vs National Average" subtitle="Comparison of key performance metrics">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 10, right: 60, bottom: 10, left: 20 }}
          barCategoryGap="30%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} className="dark:stroke-gray-700" />
          <XAxis
            type="number"
            tick={{ fontSize: 12, fill: '#6B7280' }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB' }}
            tickFormatter={formatValue}
          />
          <YAxis
            type="category"
            dataKey="metric"
            tick={{ fontSize: 12, fill: '#6B7280' }}
            tickLine={false}
            axisLine={false}
            width={140}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            iconType="square"
            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
          />
          <Bar dataKey="trust" name="Trust" fill="#2563EB" radius={[0, 4, 4, 0]} barSize={18}>
            <LabelList
              dataKey="trust"
              position="right"
              formatter={formatValue}
              style={{ fontSize: 11, fill: '#2563EB', fontWeight: 600 }}
            />
          </Bar>
          <Bar dataKey="national" name="National" fill="#9CA3AF" radius={[0, 4, 4, 0]} barSize={18}>
            <LabelList
              dataKey="national"
              position="right"
              formatter={formatValue}
              style={{ fontSize: 11, fill: '#6B7280', fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}
