import ChartWrapper from '../shared/ChartWrapper'

function titleCase(str) {
  if (!str) return str
  return str
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\bNhs\b/g, 'NHS')
    .replace(/\bNhs\b/gi, 'NHS')
    .replace(/\bA&e\b/gi, 'A&E')
}

export default function RegionalRanking({ rankings, selectedTrustCode }) {
  if (!rankings || rankings.length === 0) return null

  const sorted = [...rankings].sort((a, b) =>
    (a.avg_breach_rate ?? a.avg_wait ?? a.breach_rate ?? 0) -
    (b.avg_breach_rate ?? b.avg_wait ?? b.breach_rate ?? 0)
  )
  const maxVal = Math.max(...sorted.map(t => t.avg_breach_rate ?? t.avg_wait ?? t.breach_rate ?? 0), 1)

  return (
    <ChartWrapper title="Regional Ranking" subtitle="Trusts in the same NHS region ranked by performance">
      <div className="max-h-[400px] overflow-y-auto pr-1 space-y-1.5">
        {sorted.map((trust, idx) => {
          const val = trust.avg_breach_rate ?? trust.avg_wait ?? trust.breach_rate ?? 0
          const pct = (val / maxVal) * 100
          const isSelected = trust.trust_code === selectedTrustCode

          let barColor = 'bg-green-500'
          if (pct > 66) barColor = 'bg-red-500'
          else if (pct > 33) barColor = 'bg-amber-500'

          return (
            <div
              key={trust.trust_code}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                isSelected
                  ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <span className="text-xs font-medium text-text-secondary dark:text-gray-400 w-6 text-right shrink-0">
                {idx + 1}
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-sm truncate ${isSelected ? 'font-semibold text-primary dark:text-blue-400' : 'text-text-primary dark:text-gray-200'}`}>
                    {trust.trust_name}
                  </span>
                  {isSelected && (
                    <span className="text-[10px] font-semibold bg-primary text-white px-1.5 py-0.5 rounded shrink-0">
                      YOU
                    </span>
                  )}
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5">
                  <div
                    className={`${barColor} h-1.5 rounded-full transition-all duration-500`}
                    style={{ width: `${Math.max(pct, 2)}%` }}
                  />
                </div>
              </div>

              <span className="text-xs font-medium text-text-secondary dark:text-gray-400 w-16 text-right shrink-0">
                {typeof val === 'number' ? val.toFixed(1) : val}
                <span className="text-text-tertiary dark:text-gray-500 ml-0.5">%</span>
              </span>
            </div>
          )
        })}
      </div>
    </ChartWrapper>
  )
}
