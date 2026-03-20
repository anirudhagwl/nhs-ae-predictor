import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  CartesianGrid,
} from 'recharts'
import ChartWrapper from '../shared/ChartWrapper'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatLabel(year, month) {
  const monthStr = MONTHS[month - 1] || ''
  const yearStr = String(year).slice(-2)
  return `${monthStr} ${yearStr}`
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-3 shadow-lg text-sm">
      <p className="font-medium text-text-primary dark:text-gray-100 mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-text-secondary dark:text-gray-400">
          <span style={{ color: entry.color }}>{entry.name}:</span>{' '}
          {entry.value?.toFixed(1)}%
        </p>
      ))}
    </div>
  )
}

export default function ComplianceTrend({ complianceTrend }) {
  if (!complianceTrend?.length) return null

  const data = complianceTrend.map((d) => ({
    ...d,
    label: formatLabel(d.year, d.month),
  }))

  return (
    <ChartWrapper title="4-Hour Target Compliance" subtitle="Trust performance vs national average over time">
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:stroke-gray-700" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: '#6B7280' }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB' }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 12, fill: '#6B7280' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            iconType="line"
            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
          />
          <ReferenceLine
            y={95}
            stroke="#16A34A"
            strokeDasharray="6 4"
            strokeWidth={1.5}
            label={{
              value: '95% Target',
              position: 'insideTopRight',
              fill: '#16A34A',
              fontSize: 11,
              fontWeight: 500,
            }}
          />
          <Line
            type="monotone"
            dataKey="compliance_pct"
            name="Trust"
            stroke="#2563EB"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="national_avg"
            name="National Avg"
            stroke="#9CA3AF"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            dot={false}
            activeDot={{ r: 3, strokeWidth: 1 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}
