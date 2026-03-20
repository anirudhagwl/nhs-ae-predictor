import { useState } from 'react'
import ChartWrapper from '../shared/ChartWrapper'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function interpolateColor(value, min, max) {
  if (min === max) return '#93C5FD'
  const t = (value - min) / (max - min)
  // Interpolate from #EFF6FF (light) to #1E40AF (dark blue)
  const r = Math.round(239 + (30 - 239) * t)
  const g = Math.round(246 + (64 - 246) * t)
  const b = Math.round(255 + (175 - 255) * t)
  return `rgb(${r}, ${g}, ${b})`
}

function getTextColor(value, min, max) {
  if (min === max) return '#1E3A5F'
  const t = (value - min) / (max - min)
  return t > 0.55 ? '#FFFFFF' : '#1E3A5F'
}

export default function DayMonthHeatmap({ heatmap }) {
  const [tooltip, setTooltip] = useState(null)

  if (!heatmap || !heatmap.values || !heatmap.rows || !heatmap.cols) {
    return (
      <ChartWrapper title="Attendance Patterns by Day & Month">
        <p className="text-sm text-text-secondary dark:text-gray-400">No heatmap data available.</p>
      </ChartWrapper>
    )
  }

  const { rows, cols, values } = heatmap

  const allValues = values.flat().filter((v) => v != null)
  const min = Math.min(...allValues)
  const max = Math.max(...allValues)

  const dayFullNames = {
    Mon: 'Monday',
    Tue: 'Tuesday',
    Wed: 'Wednesday',
    Thu: 'Thursday',
    Fri: 'Friday',
    Sat: 'Saturday',
    Sun: 'Sunday',
  }

  return (
    <ChartWrapper title="Attendance Patterns by Day & Month">
      <div className="overflow-x-auto -mx-2 px-2">
        <table className="w-full border-collapse min-w-[540px]">
          <thead>
            <tr>
              <th className="p-1 text-xs font-medium text-text-secondary dark:text-gray-400 text-left w-12" />
              {cols.map((col, i) => (
                <th
                  key={col}
                  className="p-1 text-xs font-medium text-text-secondary dark:text-gray-400 text-center"
                >
                  {MONTH_NAMES[col - 1] || col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((day, rowIdx) => (
              <tr key={day}>
                <td className="p-1 text-xs font-medium text-text-secondary dark:text-gray-400 text-left whitespace-nowrap">
                  {day}
                </td>
                {cols.map((col, colIdx) => {
                  const value = values[rowIdx]?.[colIdx]
                  if (value == null) {
                    return (
                      <td
                        key={col}
                        className="p-0.5"
                      >
                        <div className="h-9 rounded bg-gray-50 dark:bg-gray-700" />
                      </td>
                    )
                  }
                  const bgColor = interpolateColor(value, min, max)
                  const textColor = getTextColor(value, min, max)
                  const monthName = MONTH_NAMES[col - 1] || col
                  const fullDay = dayFullNames[day] || day
                  const tooltipText = `${fullDay}, ${monthName}: avg ${Math.round(value)} attendances`

                  return (
                    <td
                      key={col}
                      className="p-0.5 relative"
                      onMouseEnter={() => setTooltip({ row: rowIdx, col: colIdx, text: tooltipText })}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      <div
                        className="h-9 rounded flex items-center justify-center text-xs font-medium cursor-default transition-transform hover:scale-105"
                        style={{ backgroundColor: bgColor, color: textColor }}
                      >
                        {Math.round(value)}
                      </div>
                      {tooltip && tooltip.row === rowIdx && tooltip.col === colIdx && (
                        <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap pointer-events-none">
                          {tooltip.text}
                          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartWrapper>
  )
}
