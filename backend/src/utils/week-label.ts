/**
 * ISO 8601 week label utilities.
 * Rankings are keyed by "YYYY-Www" — e.g. "2025-W27".
 */

export function getISOWeekLabel(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayOfWeek = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNumber = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`
}

export function getCurrentSeason(): string {
  return String(new Date().getFullYear())
}

/** Returns the Monday of the current ISO week as an ISO string. */
export function getWeekStart(weekLabel: string): string {
  const [year, week] = weekLabel.split('-W').map(Number)
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const weekStart = new Date(jan4)
  weekStart.setUTCDate(jan4.getUTCDate() - (jan4.getUTCDay() || 7) + 1 + (week - 1) * 7)
  return weekStart.toISOString()
}

export function getPreviousWeekLabel(weekLabel: string): string {
  const [year, week] = weekLabel.split('-W').map(Number)
  if (week === 1) return `${year - 1}-W52`
  return `${year}-W${String(week - 1).padStart(2, '0')}`
}
