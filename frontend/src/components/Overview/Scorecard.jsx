import { Clock, AlertTriangle, Calendar, Trophy } from 'lucide-react'
import MetricCard from '../shared/MetricCard'

export default function Scorecard({ scorecard }) {
  if (!scorecard) return null

  const {
    avg_wait_minutes,
    breach_rate_pct,
    busiest_month,
    busiest_day,
    total_annual_attendances,
    national_rank,
    national_total,
    vs_national_avg_pct,
  } = scorecard

  const waitTrend = vs_national_avg_pct ?? null
  const breachAboveTarget = breach_rate_pct > 5

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Avg Wait"
        value={
          <>
            {Math.round(avg_wait_minutes)}
            <span className="text-base font-normal text-text-secondary dark:text-gray-400 ml-1">
              min
            </span>
          </>
        }
        trend={waitTrend}
        trendLabel="vs national avg"
        icon={Clock}
      />

      <MetricCard
        title="4hr Breach Rate"
        value={`${breach_rate_pct.toFixed(1)}%`}
        subtitle={
          <span className={breachAboveTarget ? 'text-[#DC2626]' : 'text-[#16A34A]'}>
            Target: &lt;5%
          </span>
        }
        icon={AlertTriangle}
      />

      <MetricCard
        title="Busiest Month"
        value={busiest_month}
        subtitle={busiest_day ? `Peak day: ${busiest_day}` : undefined}
        icon={Calendar}
      />

      <MetricCard
        title="National Rank"
        value={`${national_rank}/${national_total}`}
        subtitle="By breach rate"
        icon={Trophy}
      />
    </div>
  )
}
