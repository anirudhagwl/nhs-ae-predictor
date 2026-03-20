import { useState } from 'react'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ZAxis,
} from 'recharts'
import ChartWrapper from '../shared/ChartWrapper'

const CLUSTER_COLORS = ['#2563EB', '#F97316', '#0D9488', '#7C3AED', '#D97706', '#DC2626']

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const data = payload[0]?.payload
  if (!data) return null
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg p-3 shadow-lg text-sm">
      <p className="font-medium text-text-primary dark:text-gray-100">{data.trust_name}</p>
      <p className="text-text-secondary dark:text-gray-400 text-xs mt-1">
        Avg Attendances: {data.avg_attendances?.toLocaleString() ?? '—'}
      </p>
      <p className="text-text-secondary dark:text-gray-400 text-xs">
        Breach Rate: {data.avg_breach_rate?.toFixed(1) ?? '—'}%
      </p>
      <p className="text-xs mt-1" style={{ color: CLUSTER_COLORS[data.cluster ?? 0] }}>
        Cluster: {data.cluster_name || `Group ${(data.cluster ?? 0) + 1}`}
      </p>
    </div>
  )
}

export default function TrustClusters({ clusterData, selectedTrustCode, trustList }) {
  const [activeCluster, setActiveCluster] = useState(null)

  if (!clusterData) return null

  // Build trust name lookup from trust list
  const nameMap = {}
  if (trustList) {
    trustList.forEach(t => { nameMap[t.trust_code] = t.trust_name })
  }

  // Transform assignments dict → trusts array
  let trusts = clusterData.trusts || []
  if (trusts.length === 0 && clusterData.assignments) {
    trusts = Object.entries(clusterData.assignments).map(([code, info]) => ({
      trust_code: code,
      trust_name: nameMap[code] || code,
      avg_attendances: info.avg_attendance ?? 0,
      avg_breach_rate: info.avg_breach_rate ?? 0,
      cluster: info.cluster_id ?? 0,
      cluster_name: info.cluster_name ?? `Cluster ${(info.cluster_id ?? 0) + 1}`,
    }))
  }

  // Extract cluster info
  const clustersInfo = clusterData.clusters || {}
  const clusterNames = typeof clustersInfo === 'object' && !Array.isArray(clustersInfo)
    ? Object.entries(clustersInfo)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([, c]) => c.name || `Cluster ${Number(c.id ?? 0) + 1}`)
    : Array.isArray(clustersInfo) && clustersInfo.length > 0
      ? clustersInfo.map(c => c.name || c.label || `Cluster ${c.id + 1}`)
      : [...new Set(trusts.map(t => t.cluster))].sort().map(id => `Cluster ${id + 1}`)

  const selectedTrustData = trusts.find(t => t.trust_code === selectedTrustCode)
  const selectedCluster = selectedTrustData?.cluster

  const sameTrusts = selectedCluster !== undefined
    ? trusts.filter(t => t.cluster === selectedCluster && t.trust_code !== selectedTrustCode)
    : []

  const groupedByCluster = {}
  trusts.forEach(t => {
    const c = t.cluster ?? 0
    if (!groupedByCluster[c]) groupedByCluster[c] = []
    groupedByCluster[c].push(t)
  })

  const filteredGroups = activeCluster !== null
    ? { [activeCluster]: groupedByCluster[activeCluster] || [] }
    : groupedByCluster

  return (
    <ChartWrapper title="Trust Clusters — Similar Hospitals" subtitle="Trusts grouped by attendance patterns, breach rates, and demographics">
      {/* Cluster legend/filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setActiveCluster(null)}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
            activeCluster === null
              ? 'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900 border-transparent'
              : 'border-gray-300 dark:border-gray-600 text-text-secondary dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
          }`}
        >
          All
        </button>
        {clusterNames.map((name, idx) => (
          <button
            key={idx}
            onClick={() => setActiveCluster(activeCluster === idx ? null : idx)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors flex items-center gap-1.5 ${
              activeCluster === idx
                ? 'border-transparent text-white'
                : 'border-gray-300 dark:border-gray-600 text-text-secondary dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
            style={activeCluster === idx ? { backgroundColor: CLUSTER_COLORS[idx % CLUSTER_COLORS.length] } : {}}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: CLUSTER_COLORS[idx % CLUSTER_COLORS.length] }}
            />
            {name}
          </button>
        ))}
      </div>

      {/* Scatter plot */}
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" className="dark:stroke-gray-700" />
          <XAxis
            type="number"
            dataKey="avg_attendances"
            name="Avg Attendances"
            tick={{ fontSize: 11, fill: '#6B7280' }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB' }}
            tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
            label={{ value: 'Avg Monthly Attendances', position: 'bottom', offset: 5, fontSize: 11, fill: '#9CA3AF' }}
          />
          <YAxis
            type="number"
            dataKey="avg_breach_rate"
            name="Breach Rate"
            tick={{ fontSize: 11, fill: '#6B7280' }}
            tickLine={false}
            axisLine={{ stroke: '#E5E7EB' }}
            tickFormatter={v => `${v}%`}
            label={{ value: 'Breach Rate %', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: '#9CA3AF' }}
          />
          <ZAxis range={[40, 200]} />
          <Tooltip content={<CustomTooltip />} />
          {Object.entries(filteredGroups).map(([clusterId, points]) => (
            <Scatter
              key={clusterId}
              data={points.map(p => ({
                ...p,
                // Highlight selected trust
                z: p.trust_code === selectedTrustCode ? 200 : 60,
              }))}
              fill={CLUSTER_COLORS[parseInt(clusterId) % CLUSTER_COLORS.length]}
              fillOpacity={0.7}
              strokeWidth={0}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>

      {/* Similar trusts list */}
      {selectedTrustData && (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-text-primary dark:text-gray-200 mb-2">
            Trusts in the same cluster as {selectedTrustData.trust_name}
            <span
              className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: CLUSTER_COLORS[(selectedCluster ?? 0) % CLUSTER_COLORS.length] }}
            >
              {clusterNames[selectedCluster ?? 0]}
            </span>
          </h4>
          {sameTrusts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {sameTrusts.slice(0, 12).map(t => (
                <div key={t.trust_code} className="text-xs text-text-secondary dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-3 py-2 rounded">
                  {t.trust_name}
                  <span className="text-text-tertiary dark:text-gray-500 ml-1">
                    ({t.avg_breach_rate?.toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-tertiary dark:text-gray-500">No other trusts in this cluster.</p>
          )}
        </div>
      )}
    </ChartWrapper>
  )
}
