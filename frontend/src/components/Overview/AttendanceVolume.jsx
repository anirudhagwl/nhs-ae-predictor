import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
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

  const d = payload[0]?.payload

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-3 shadow-lg text-sm">
      <p className="font-medium text-text-primary dark:text-gray-100 mb-1">{label}</p>
      <p className="text-text-secondary dark:text-gray-400">
        Attendances: <span className="font-medium text-text-primary dark:text-gray-100">{d?.attendances?.toLocaleString()}</span>
      </p>
      {d?.breach_rate != null && (
        <p className="text-text-secondary dark:text-gray-400">
          Breach rate: <span className="font-medium text-text-primary dark:text-gray-100">{d.breach_rate.toFixed(1)}%</span>
        </p>
      )}
    </div>
  )
}

export default function AttendanceVolume({ monthlyData }) {
  if (!monthlyData?.length) return null

  const data = monthlyData.map((d) => ({
    ...d,
    label: formatLabel(d.year, d.month),
  }))

  return (
    <ChartWrapper title="Monthly Attendance Volume" subtitle="A&E attendances by month">
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-gray-700" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 12, fill: '#6B7280' }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: '#6B7280' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => v.toLocaleString()}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(37, 99, 235, 0.08)' }} />
          <Bar
            dataKey="attendances"
            fill="#2563EB"
            fillOpacity={0.8}
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}
