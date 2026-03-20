import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import ChartWrapper from '../shared/ChartWrapper'

function cleanFeatureName(name) {
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-3 shadow-lg text-sm">
      <p className="font-medium text-text-primary dark:text-gray-100 mb-1">{d.displayName}</p>
      <p className="text-text-secondary dark:text-gray-400">
        Importance: <span className="font-medium text-[#2563EB]">{d.importance.toFixed(4)}</span>
      </p>
    </div>
  )
}

export default function FeatureImportance({ features }) {
  const data = useMemo(() => {
    if (!features?.length) return []
    return [...features]
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 15)
      .map((f) => ({
        ...f,
        displayName: cleanFeatureName(f.feature),
      }))
  }, [features])

  if (!data.length) {
    return (
      <ChartWrapper title="Global Feature Importance">
        <p className="text-sm text-text-secondary dark:text-gray-400">
          No feature importance data available.
        </p>
      </ChartWrapper>
    )
  }

  return (
    <ChartWrapper title="Global Feature Importance" subtitle="Relative contribution of each feature to model predictions">
      <ResponsiveContainer width="100%" height={Math.max(280, data.length * 32)}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, bottom: 5, left: 130 }}
        >
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: '#6B7280' }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB' }}
            tickFormatter={(v) => v.toFixed(2)}
          />
          <YAxis
            type="category"
            dataKey="displayName"
            tick={{ fontSize: 12, fill: '#6B7280' }}
            tickLine={false}
            axisLine={false}
            width={125}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(37, 99, 235, 0.06)' }} />
          <Bar
            dataKey="importance"
            fill="#2563EB"
            fillOpacity={0.85}
            radius={[0, 4, 4, 0]}
            maxBarSize={22}
            animationDuration={700}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}
