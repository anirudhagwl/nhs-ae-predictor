export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
]

export const MONTH_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function formatNumber(n) {
  if (n === null || n === undefined) return '—'
  return n.toLocaleString('en-GB')
}

export function formatPercent(n, decimals = 1) {
  if (n === null || n === undefined) return '—'
  return `${n.toFixed(decimals)}%`
}

export function getRiskLevel(breachRate) {
  if (breachRate >= 40) return { label: 'High pressure', color: 'danger' }
  if (breachRate >= 25) return { label: 'Moderate', color: 'warning' }
  return { label: 'Low pressure', color: 'success' }
}

export function getComplianceColor(compliance) {
  if (compliance >= 95) return '#16A34A'
  if (compliance >= 80) return '#D97706'
  return '#DC2626'
}

export function getPressureColor(value, min, max) {
  const ratio = (value - min) / (max - min || 1)
  if (ratio < 0.33) return '#BBF7D0'
  if (ratio < 0.66) return '#FDE68A'
  return '#FECACA'
}

export function getPressureColorDark(value, min, max) {
  const ratio = (value - min) / (max - min || 1)
  if (ratio < 0.33) return '#166534'
  if (ratio < 0.66) return '#92400E'
  return '#991B1B'
}
