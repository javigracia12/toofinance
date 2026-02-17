import { LOCALE, CURRENCY } from './constants'

export const formatCurrency = (n: number) =>
  new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY }).format(n)

export const getMonthKey = (date: string) => (date || '').slice(0, 7)
export const normalizeDate = (date: string) => (date || '').split('T')[0]

export const formatShortMonth = (key: string) => {
  const [y, m] = key.split('-')
  return new Date(+y, +m - 1).toLocaleDateString(LOCALE, { month: 'short' })
}

export const formatFullMonth = (key: string) => {
  const [y, m] = key.split('-')
  return new Date(+y, +m - 1).toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' })
}

export const formatDayLabel = (date: string) =>
  new Date(date).toLocaleDateString(LOCALE, { month: 'short', day: 'numeric' })

export const formatDateRange = (from: string, to: string) => {
  const fromDate = new Date(from)
  const toDate = new Date(to)
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
