import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
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
        Contribution:{' '}
        <span
          className={`font-medium ${d.value >= 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}
        >
          {d.value >= 0 ? '+' : ''}
          {d.value.toFixed(3)}
        </span>
      </p>
      <p className="text-xs text-text-tertiary dark:text-gray-500 mt-1">
        {d.value >= 0 ? 'Increases wait time' : 'Decreases wait time'}
      </p>
    </div>
  )
}

export default function ShapWaterfall({ shapFeatures }) {
  const data = useMemo(() => {
    if (!shapFeatures) return []

    const source = shapFeatures.per_trust?.length
      ? shapFeatures.per_trust
      : shapFeatures.global || []

    const key = shapFeatures.per_trust?.length ? 'mean_shap' : 'importance'

    return [...source]
      .sort((a, b) => Math.abs(b[key] || 0) - Math.abs(a[key] || 0))
      .slice(0, 12)
      .map((item) => ({
        feature: item.feature,
        displayName: cleanFeatureName(item.feature),
        value: item[key] || 0,
      }))
  }, [shapFeatures])

  if (!data.length) {
    return (
      <ChartWrapper title="Feature Contributions">
        <p className="text-sm text-text-secondary dark:text-gray-400">
          No SHAP data available.
        </p>
      </ChartWrapper>
    )
  }

  const maxAbs = Math.max(...data.map((d) => Math.abs(d.value)))
  const domain = [-maxAbs * 1.15, maxAbs * 1.15]

  return (
    <ChartWrapper title="Feature Contributions" subtitle="SHAP values showing each feature's impact on predictions">
      <ResponsiveContainer width="100%" height={Math.max(280, data.length * 36)}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 40, bottom: 5, left: 120 }}
        >
          <XAxis
            type="number"
            domain={domain}
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
            width={115}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(37, 99, 235, 0.06)' }} />
          <ReferenceLine x={0} stroke="#9CA3AF" strokeWidth={1} />
          <Bar
            dataKey="value"
            radius={[4, 4, 4, 4]}
            maxBarSize={24}
            animationDuration={800}
            animationEasing="ease-out"
          >
            {data.map((entry, idx) => (
              <Cell
                key={idx}
                fill={entry.value >= 0 ? '#DC2626' : '#16A34A'}
                fillOpacity={0.85}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-6 mt-3 text-xs text-text-secondary dark:text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[#DC2626] inline-block" />
          Increases wait
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[#16A34A] inline-block" />
          Decreases wait
        </span>
      </div>
    </ChartWrapper>
  )
}
