export default function MetricCard({ title, value, subtitle, trend, trendLabel, icon: Icon }) {
  const trendColor = trend > 0 ? 'text-red-600' : trend < 0 ? 'text-green-600' : 'text-gray-500'
  const trendPrefix = trend > 0 ? '+' : ''

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-gray-100 dark:border-gray-700 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-text-secondary dark:text-gray-400">{title}</span>
        {Icon && <Icon size={16} className="text-text-tertiary dark:text-gray-500" />}
      </div>
      <div className="text-2xl font-medium text-text-primary dark:text-gray-100 mb-1">
        {value}
      </div>
      <div className="flex items-center gap-2 text-xs">
        {subtitle && (
          <span className="text-text-secondary dark:text-gray-400">{subtitle}</span>
        )}
        {trend !== undefined && trend !== null && (
          <span className={trendColor}>
            {trendPrefix}{trend}% {trendLabel || 'vs national'}
          </span>
        )}
      </div>
    </div>
  )
}
