import { useMemo } from 'react'
import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'
import ChartWrapper from '../shared/ChartWrapper'

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

function getFlagStyle(flag) {
  if (flag === 'significantly_worse') {
    return {
      bg: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
      badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
      label: 'Worse than expected',
      Icon: TrendingUp,
    }
  }
  if (flag === 'significantly_better') {
    return {
      bg: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
      badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
      label: 'Better than expected',
      Icon: TrendingDown,
    }
  }
  return {
    bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    label: 'Anomalous',
    Icon: AlertTriangle,
  }
}

export default function AnomalyFlags({ anomalies }) {
  const sorted = useMemo(() => {
    if (!anomalies?.length) return []
    return [...anomalies].sort(
      (a, b) => Math.abs(b.deviation_pct || 0) - Math.abs(a.deviation_pct || 0)
    )
  }, [anomalies])

  if (!sorted.length) {
    return (
      <ChartWrapper title="Anomaly Detection">
        <div className="flex flex-col items-center py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center mb-3">
            <AlertTriangle size={20} className="text-green-600 dark:text-green-400" />
          </div>
          <p className="text-sm font-medium text-text-primary dark:text-gray-100 mb-1">
            No Anomalies Detected
          </p>
          <p className="text-xs text-text-secondary dark:text-gray-400 max-w-xs">
            All observed values fall within expected ranges for this trust.
          </p>
        </div>
      </ChartWrapper>
    )
  }

  return (
    <ChartWrapper title="Anomaly Detection" subtitle="Months where actual performance deviated significantly from predictions">
      <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
        {sorted.map((anomaly, idx) => {
          const style = getFlagStyle(anomaly.flag)
          const monthLabel = MONTH_NAMES[(anomaly.month || 1) - 1] || anomaly.month
          const deviation = anomaly.deviation_pct

          return (
            <div
              key={`${anomaly.year}-${anomaly.month}-${idx}`}
              className={`rounded-lg border p-3.5 ${style.bg} transition-colors`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm font-semibold text-text-primary dark:text-gray-100">
                      {monthLabel} {anomaly.year}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${style.badge}`}>
                      <style.Icon size={10} />
                      {style.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-text-secondary dark:text-gray-400">
                    <span>
                      Actual: <span className="font-medium text-text-primary dark:text-gray-200">{Math.round(anomaly.actual).toLocaleString()}</span>
                    </span>
                    <span>
                      Predicted: <span className="font-medium text-text-primary dark:text-gray-200">{Math.round(anomaly.predicted).toLocaleString()}</span>
                    </span>
                  </div>
                </div>
                {deviation != null && (
                  <span className={`text-lg font-bold tabular-nums ${
                    deviation > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                  }`}>
                    {deviation > 0 ? '+' : ''}{deviation.toFixed(1)}%
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </ChartWrapper>
  )
}
