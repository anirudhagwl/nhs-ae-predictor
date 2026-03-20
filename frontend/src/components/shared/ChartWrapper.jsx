export default function ChartWrapper({ title, subtitle, children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg p-5 border border-gray-100 dark:border-gray-700 transition-colors ${className}`}>
      {title && (
        <div className="mb-4">
          <h3 className="text-base font-semibold text-text-primary dark:text-gray-100">{title}</h3>
          {subtitle && <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      )}
      {children}
    </div>
  )
}
