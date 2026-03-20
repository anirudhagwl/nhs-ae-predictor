import { useState, useMemo } from 'react'
import { AlertTriangle } from 'lucide-react'

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const DEFAULT_TEMP = 10

function computeMonthlyAverages(grid) {
  if (!grid?.values) return null
  const values = grid.values
  const averages = []

  // Handle nested dict format: values[month][temp] e.g. values['1']['-5']
  if (typeof values === 'object' && !Array.isArray(values)) {
    for (let m = 1; m <= 12; m++) {
      const monthData = values[String(m)]
      if (monthData && typeof monthData === 'object') {
        const monthVals = Object.values(monthData).filter(v => v != null)
        averages.push(monthVals.length ? monthVals.reduce((s, v) => s + v, 0) / monthVals.length : null)
      } else {
        // Flat dict format fallback: keys like "1_-5"
        const monthVals = []
        const temps = grid.temp_buckets || [-5, 0, 5, 10, 15, 20, 25, 30]
        for (const t of temps) {
          const key = `${m}_${t}`
          if (values[key] != null) monthVals.push(values[key])
        }
        averages.push(monthVals.length ? monthVals.reduce((s, v) => s + v, 0) / monthVals.length : null)
      }
    }
    return averages
  }

  // Array format fallback
  for (let m = 0; m < 12; m++) {
    const row = values[m]
    if (!row) { averages.push(null); continue }
    const valid = row.filter((v) => v != null)
    averages.push(valid.length ? valid.reduce((s, v) => s + v, 0) / valid.length : null)
  }
  return averages
}

function getPressureLevel(value, min, max) {
  if (value == null) return { level: 'unknown', color: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-500', label: 'N/A' }
  const range = max - min
  if (range === 0) return { level: 'moderate', color: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', label: 'Moderate' }
  const t = (value - min) / range
  if (t < 0.33) return { level: 'low', color: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', label: 'Low' }
  if (t < 0.66) return { level: 'moderate', color: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', label: 'Moderate' }
  return { level: 'high', color: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'High' }
}

export default function BestTimeToGo({ predictionsGrid }) {
  const [tooltip, setTooltip] = useState(null)

  const averages = useMemo(
    () => computeMonthlyAverages(predictionsGrid),
    [predictionsGrid]
  )

  const { min, max } = useMemo(() => {
    if (!averages) return { min: 0, max: 0 }
    const valid = averages.filter((v) => v != null)
    if (!valid.length) return { min: 0, max: 0 }
    return { min: Math.min(...valid), max: Math.max(...valid) }
  }, [averages])

  if (!averages) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-100 dark:border-gray-700 transition-colors">
        <p className="text-sm text-text-secondary dark:text-gray-400">
          No prediction data available.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-100 dark:border-gray-700 transition-colors">
      <h3 className="text-base font-semibold text-text-primary dark:text-gray-100 mb-1">
        Best Time to Visit A&amp;E
      </h3>
      <p className="text-xs text-text-secondary dark:text-gray-400 mb-5">
        Predicted pressure by month (lower is better)
      </p>

      {/* Traffic light grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2 mb-5">
        {averages.map((avg, i) => {
          const pressure = getPressureLevel(avg, min, max)
          return (
            <div
              key={i}
              className="relative"
              onMouseEnter={() => setTooltip(i)}
              onMouseLeave={() => setTooltip(null)}
            >
              <div
                className={`rounded-lg p-3 text-center cursor-default transition-transform hover:scale-105 ${pressure.color}`}
              >
                <p className="text-xs font-semibold text-text-primary dark:text-gray-100 mb-0.5">
                  {MONTH_SHORT[i]}
                </p>
                <p className={`text-xs font-medium ${pressure.text}`}>
                  {pressure.label}
                </p>
              </div>

              {/* Tooltip */}
              {tooltip === i && avg != null && (
                <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap pointer-events-none">
                  <p className="font-medium mb-0.5">{MONTH_FULL[i]}</p>
                  <p>Predicted: ~{Math.round(avg).toLocaleString()} attendances</p>
                  <p>Pressure: {pressure.label}</p>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mb-4 text-xs text-text-secondary dark:text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 inline-block" />
          Low
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 inline-block" />
          Moderate
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 inline-block" />
          High
        </span>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
        <AlertTriangle size={16} className="text-[#D97706] mt-0.5 flex-shrink-0" />
        <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
          For non-emergency guidance only. Always call 999 for emergencies.
        </p>
      </div>
    </div>
  )
}
