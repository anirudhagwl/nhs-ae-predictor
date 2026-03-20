export function LoadingSkeleton({ className = '', width = '100%', height = '20px' }) {
  return (
    <div
      className={`bg-gray-200 dark:bg-gray-700 rounded animate-pulse-skeleton ${className}`}
      style={{ width, height }}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-gray-100 dark:border-gray-700">
      <LoadingSkeleton height="14px" width="40%" className="mb-3" />
      <LoadingSkeleton height="32px" width="60%" className="mb-2" />
      <LoadingSkeleton height="12px" width="50%" />
    </div>
  )
}

export function ChartSkeleton({ height = '300px' }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-5 border border-gray-100 dark:border-gray-700">
      <LoadingSkeleton height="16px" width="30%" className="mb-4" />
      <LoadingSkeleton height={height} width="100%" />
    </div>
  )
}

export function ScoreboardSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
    </div>
  )
}
