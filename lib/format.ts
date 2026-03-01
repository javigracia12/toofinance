import { LOCALE, CURRENCY } from './constants'

export const formatCurrency = (n: number) =>
  new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY }).format(n)

export const getMonthKey = (date: string) => (date || '').slice(0, 7)
export const normalizeDate = (date: string) => (date || '').split('T')[0]

/** Today's date as YYYY-MM-DD in local time (no UTC shift). */
export const todayISO = (): string => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Parse YYYY-MM-DD (or with T suffix) as local midnight so display is correct in any timezone. */
export const parseLocalDate = (dateStr: string): Date => {
  const raw = (dateStr || '').split('T')[0]
  const [y, m, d] = raw.split('-').map(Number)
  if (y == null || m == null || d == null) return new Date(NaN)
  return new Date(y, m - 1, d)
}

export const formatShortMonth = (key: string) => {
  const [y, m] = key.split('-')
  return new Date(+y, +m - 1).toLocaleDateString(LOCALE, { month: 'short' })
}

export const formatFullMonth = (key: string) => {
  const [y, m] = key.split('-')
  return new Date(+y, +m - 1).toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' })
}

export const formatDayLabel = (date: string) =>
  parseLocalDate(date).toLocaleDateString(LOCALE, { month: 'short', day: 'numeric' })

export const formatDateRange = (from: string, to: string) => {
  const fromDate = parseLocalDate(from)
  const toDate = parseLocalDate(to)
  const sameYear = fromDate.getFullYear() === toDate.getFullYear()
  const sameMonth = sameYear && fromDate.getMonth() === toDate.getMonth()
  if (sameMonth) {
    return new Intl.DateTimeFormat(LOCALE, { month: 'short', day: 'numeric', year: 'numeric' }).formatRange(fromDate, toDate)
  }
  if (sameYear) {
    return new Intl.DateTimeFormat(LOCALE, { month: 'short', day: 'numeric' }).formatRange(fromDate, toDate) + ` ${fromDate.getFullYear()}`
  }
  return new Intl.DateTimeFormat(LOCALE, { month: 'short', day: 'numeric', year: 'numeric' }).formatRange(fromDate, toDate)
}

export const formatVsLastMonth = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(0)}% vs last month`

export const getOrdinalSuffix = (day: number) => {
  if (day > 3 && day < 21) return 'th'
  switch (day % 10) {
    case 1: return 'st'
    case 2: return 'nd'
    case 3: return 'rd'
    default: return 'th'
  }
}
