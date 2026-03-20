import { useState, useMemo } from 'react'
import { Brain, Thermometer, CalendarDays } from 'lucide-react'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const TEMP_MIN = -5
const TEMP_MAX = 30

function getRiskLevel(predicted) {
  if (predicted == null) return null
  if (predicted >= 300) return { label: 'High', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
  if (predicted >= 200) return { label: 'Moderate', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' }
  return { label: 'Low', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' }
}

export default function PredictionPanel({ predictionsGrid, trustName }) {
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedTemp, setSelectedTemp] = useState(10)

  const prediction = useMemo(() => {
    if (!predictionsGrid?.values) return null
    const vals = predictionsGrid.values
    // Nested dict format: values[month][temp] e.g. values['3']['10']
    if (typeof vals === 'object' && !Array.isArray(vals)) {
      const monthData = vals[String(selectedMonth)]
      if (monthData && typeof monthData === 'object') {
        // Find nearest temp bucket
        const buckets = Object.keys(monthData).map(Number).sort((a, b) => a - b)
        const nearest = buckets.reduce((prev, curr) =>
          Math.abs(curr - selectedTemp) < Math.abs(prev - selectedTemp) ? curr : prev
        )
        return monthData[String(nearest)] ?? null
      }
      // Flat dict format: values['3_10']
      const key = `${selectedMonth}_${selectedTemp}`
      return vals[key] ?? null
    }
    // Array format fallback
    const row = vals[selectedMonth - 1]
    if (!row) return null
    return row[selectedTemp - TEMP_MIN] ?? null
  }, [predictionsGrid, selectedMonth, selectedTemp])

  const confidence = useMemo(() => {
    if (!predictionsGrid?.confidence_intervals || prediction == null) return null
    const ciData = predictionsGrid.confidence_intervals
    // Nested dict format: ci[month][temp]
    const monthCi = ciData[String(selectedMonth)]
    if (monthCi && typeof monthCi === 'object') {
      const buckets = Object.keys(monthCi).map(Number).sort((a, b) => a - b)
      const nearest = buckets.reduce((prev, curr) =>
        Math.abs(curr - selectedTemp) < Math.abs(prev - selectedTemp) ? curr : prev
      )
      const ci = monthCi[String(nearest)]
      if (ci && ci.low != null) return { low: Math.round(ci.low), high: Math.round(ci.high) }
      if (ci && Array.isArray(ci)) return { low: Math.round(ci[0]), high: Math.round(ci[1]) }
    }
    // Flat dict format fallback
    const key = `${selectedMonth}_${selectedTemp}`
    const ci = ciData[key]
    if (ci && Array.isArray(ci)) return { low: Math.round(ci[0]), high: Math.round(ci[1]) }
    if (ci && ci.low != null) return { low: Math.round(ci.low), high: Math.round(ci.high) }
    return { low: Math.round(prediction * 0.9), high: Math.round(prediction * 1.1) }
  }, [predictionsGrid, selectedMonth, selectedTemp, prediction])

  const risk = useMemo(() => getRiskLevel(prediction), [prediction])

  if (!predictionsGrid?.values) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-100 dark:border-gray-700 transition-colors">
        <p className="text-sm text-text-secondary dark:text-gray-400">No prediction data available.</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-100 dark:border-gray-700 transition-colors">
      <div className="flex items-center gap-2 mb-5">
        <Brain size={20} className="text-[#2563EB]" />
        <h3 className="text-base font-semibold text-text-primary dark:text-gray-100">
          Predicted Attendance
        </h3>
        {trustName && (
          <span className="text-xs text-text-secondary dark:text-gray-400 ml-auto">
            {trustName}
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Month selector */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-text-secondary dark:text-gray-400 mb-1.5">
            <CalendarDays size={14} />
            Month
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="w-full rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-primary dark:text-gray-100 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40"
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={i + 1} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* Temperature slider */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-text-secondary dark:text-gray-400 mb-1.5">
            <Thermometer size={14} />
            Temperature
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={TEMP_MIN}
              max={TEMP_MAX}
              value={selectedTemp}
              onChange={(e) => setSelectedTemp(Number(e.target.value))}
              className="flex-1 accent-[#2563EB] h-2 rounded-lg cursor-pointer"
            />
            <span className="text-sm font-medium text-text-primary dark:text-gray-100 min-w-[3rem] text-right">
              {selectedTemp}&deg;C
            </span>
          </div>
        </div>
      </div>

      {/* Result */}
      <div className="text-center py-4 border-t border-gray-100 dark:border-gray-700">
        {prediction != null ? (
          <>
            <p className="text-3xl font-bold text-[#2563EB] mb-1">
              {Math.round(prediction).toLocaleString()}
            </p>
            <p className="text-sm text-text-secondary dark:text-gray-400 mb-3">
              predicted attendances
            </p>
            {confidence && (
              <p className="text-xs text-text-tertiary dark:text-gray-500 mb-3">
                95% CI: {confidence.low.toLocaleString()} &ndash; {confidence.high.toLocaleString()}
              </p>
            )}
            {risk && (
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${risk.color}`}>
                {risk.label} Risk
              </span>
            )}
          </>
        ) : (
          <p className="text-sm text-text-secondary dark:text-gray-400">
            No prediction available for this combination.
          </p>
        )}
      </div>

      {/* Footer */}
      <p className="text-xs text-text-tertiary dark:text-gray-500 mt-4 text-center">
        Based on XGBoost model
      </p>
    </div>
  )
}
