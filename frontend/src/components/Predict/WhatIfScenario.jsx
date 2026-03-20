import { useState, useMemo } from 'react'
import { ArrowRight, CalendarDays, Thermometer, Snowflake, Bug } from 'lucide-react'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const TEMP_MIN = -5
const TEMP_MAX = 30

function lookupPrediction(grid, month, temp) {
  if (!grid?.values) return null
  const vals = grid.values
  // Nested dict format: values[month][temp]
  if (typeof vals === 'object' && !Array.isArray(vals)) {
    const monthData = vals[String(month)]
    if (monthData && typeof monthData === 'object') {
      const buckets = Object.keys(monthData).map(Number).sort((a, b) => a - b)
      const nearest = buckets.reduce((prev, curr) =>
        Math.abs(curr - temp) < Math.abs(prev - temp) ? curr : prev
      )
      return monthData[String(nearest)] ?? null
    }
    // Flat dict format fallback: "1_10"
    const temps = grid.temp_buckets || [-5, 0, 5, 10, 15, 20, 25, 30]
    const nearestTemp = temps.reduce((prev, curr) =>
      Math.abs(curr - temp) < Math.abs(prev - temp) ? curr : prev
    )
    return vals[`${month}_${nearestTemp}`] ?? null
  }
  // Array format fallback
  const row = vals[month - 1]
  if (!row) return null
  return row[temp - TEMP_MIN] ?? null
}

function ScenarioCard({ title, prediction, month, temp, bankHoliday, fluSeason, accent }) {
  const bgAccent = accent === 'blue'
    ? 'border-[#2563EB]/30 bg-blue-50/50 dark:bg-blue-900/10'
    : 'border-[#7C3AED]/30 bg-purple-50/50 dark:bg-purple-900/10'
  const textAccent = accent === 'blue' ? 'text-[#2563EB]' : 'text-[#7C3AED]'

  return (
    <div className={`rounded-lg border p-5 ${bgAccent} transition-colors flex-1`}>
      <h4 className={`text-sm font-semibold ${textAccent} mb-3`}>
        {title}
      </h4>
      <div className="space-y-1.5 text-xs text-text-secondary dark:text-gray-400 mb-4">
        <p>{MONTH_NAMES[month - 1]}</p>
        <p>{temp}&deg;C</p>
        {bankHoliday && <p className="text-amber-600 dark:text-amber-400">Bank Holiday</p>}
        {fluSeason && <p className="text-red-600 dark:text-red-400">Flu Season</p>}
      </div>
      <div className="text-center">
        <p className={`text-2xl font-bold ${textAccent}`}>
          {prediction != null ? Math.round(prediction).toLocaleString() : '\u2014'}
        </p>
        <p className="text-xs text-text-secondary dark:text-gray-400 mt-1">
          predicted attendances
        </p>
      </div>
    </div>
  )
}

export default function WhatIfScenario({ predictionsGrid }) {
  const now = new Date()
  const defaultMonth = now.getMonth() + 1
  const defaultTemp = 10

  const [scenarioMonth, setScenarioMonth] = useState(defaultMonth)
  const [scenarioTemp, setScenarioTemp] = useState(defaultTemp)
  const [bankHoliday, setBankHoliday] = useState(false)
  const [fluSeason, setFluSeason] = useState(false)

  const basePrediction = useMemo(
    () => lookupPrediction(predictionsGrid, defaultMonth, defaultTemp),
    [predictionsGrid, defaultMonth, defaultTemp]
  )

  const scenarioPrediction = useMemo(() => {
    let pred = lookupPrediction(predictionsGrid, scenarioMonth, scenarioTemp)
    if (pred == null) return null
    if (bankHoliday) pred *= 1.08
    if (fluSeason) pred *= 1.15
    return pred
  }, [predictionsGrid, scenarioMonth, scenarioTemp, bankHoliday, fluSeason])

  const delta = useMemo(() => {
    if (basePrediction == null || scenarioPrediction == null) return null
    return ((scenarioPrediction - basePrediction) / basePrediction) * 100
  }, [basePrediction, scenarioPrediction])

  if (!predictionsGrid?.values) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-100 dark:border-gray-700 transition-colors">
        <p className="text-sm text-text-secondary dark:text-gray-400">
          No prediction data available for scenario comparison.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-100 dark:border-gray-700 transition-colors">
      <h3 className="text-base font-semibold text-text-primary dark:text-gray-100 mb-5">
        What-If Scenario Simulator
      </h3>

      {/* Scenario controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-text-secondary dark:text-gray-400 mb-1.5">
            <CalendarDays size={14} />
            Scenario Month
          </label>
          <select
            value={scenarioMonth}
            onChange={(e) => setScenarioMonth(Number(e.target.value))}
            className="w-full rounded-md border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-text-primary dark:text-gray-100 text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/40"
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={i + 1} value={i + 1}>{name}</option>
            ))}
          </select>
        </div>

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
              value={scenarioTemp}
              onChange={(e) => setScenarioTemp(Number(e.target.value))}
              className="flex-1 accent-[#7C3AED] h-2 rounded-lg cursor-pointer"
            />
            <span className="text-sm font-medium text-text-primary dark:text-gray-100 min-w-[3rem] text-right">
              {scenarioTemp}&deg;C
            </span>
          </div>
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={bankHoliday}
            onChange={(e) => setBankHoliday(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-[#7C3AED] focus:ring-[#7C3AED]/40 accent-[#7C3AED]"
          />
          <span className="flex items-center gap-1.5 text-sm text-text-secondary dark:text-gray-400">
            <Snowflake size={14} />
            Bank Holiday
          </span>
        </label>

        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={fluSeason}
            onChange={(e) => setFluSeason(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-[#7C3AED] focus:ring-[#7C3AED]/40 accent-[#7C3AED]"
          />
          <span className="flex items-center gap-1.5 text-sm text-text-secondary dark:text-gray-400">
            <Bug size={14} />
            Flu Season
          </span>
        </label>
      </div>

      {/* Comparison display */}
      <div className="flex items-stretch gap-3">
        <ScenarioCard
          title="Base Scenario"
          prediction={basePrediction}
          month={defaultMonth}
          temp={defaultTemp}
          bankHoliday={false}
          fluSeason={false}
          accent="blue"
        />

        {/* Delta arrow */}
        <div className="flex flex-col items-center justify-center px-2 min-w-[60px]">
          <ArrowRight size={24} className="text-text-tertiary dark:text-gray-500 mb-1" />
          {delta != null && (
            <span className={`text-sm font-bold tabular-nums ${
              delta > 0
                ? 'text-red-600 dark:text-red-400'
                : delta < 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-500 dark:text-gray-400'
            }`}>
              {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
            </span>
          )}
        </div>

        <ScenarioCard
          title="Your Scenario"
          prediction={scenarioPrediction}
          month={scenarioMonth}
          temp={scenarioTemp}
          bankHoliday={bankHoliday}
          fluSeason={fluSeason}
          accent="purple"
        />
      </div>
    </div>
  )
}
