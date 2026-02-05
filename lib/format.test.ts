import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  getMonthKey,
  normalizeDate,
  formatShortMonth,
  formatFullMonth,
  formatDayLabel,
  formatVsLastMonth,
  getOrdinalSuffix,
} from './format'

describe('formatCurrency', () => {
  it('formats numbers as EUR currency', () => {
    expect(formatCurrency(0)).toContain('0')
    expect(formatCurrency(10.5)).toMatch(/10\.50/)
    expect(formatCurrency(1234.56)).toMatch(/1[,.]?234[,.]?56/)
  })
})

describe('getMonthKey', () => {
  it('extracts YYYY-MM from date string', () => {
    expect(getMonthKey('2024-03-15')).toBe('2024-03')
    expect(getMonthKey('2025-01-01')).toBe('2025-01')
  })
  it('handles empty string', () => {
    expect(getMonthKey('')).toBe('')
  })
})

describe('normalizeDate', () => {
  it('strips time from ISO date string', () => {
    expect(normalizeDate('2024-03-15T12:00:00')).toBe('2024-03-15')
    expect(normalizeDate('2024-03-15')).toBe('2024-03-15')
  })
  it('handles empty string', () => {
    expect(normalizeDate('')).toBe('')
  })
})

describe('formatShortMonth', () => {
  it('formats month key as short month name', () => {
    expect(formatShortMonth('2024-01')).toBe('Jan')
    expect(formatShortMonth('2024-12')).toBe('Dec')
  })
})

describe('formatFullMonth', () => {
  it('formats month key as full month and year', () => {
    expect(formatFullMonth('2024-01')).toBe('January 2024')
  })
})

describe('formatDayLabel', () => {
  it('formats date as short month and day', () => {
    const result = formatDayLabel('2024-03-15')
    expect(result).toContain('Mar')
    expect(result).toMatch(/\d{1,2}/)
  })
})

describe('formatVsLastMonth', () => {
  it('formats positive percentage with + prefix', () => {
    expect(formatVsLastMonth(5)).toBe('+5% vs last month')
  })
  it('formats negative percentage without + prefix', () => {
    expect(formatVsLastMonth(-10)).toBe('-10% vs last month')
  })
  it('formats zero', () => {
    expect(formatVsLastMonth(0)).toBe('0% vs last month')
  })
})

describe('getOrdinalSuffix', () => {
  it('returns st for 1, 21, 31', () => {
    expect(getOrdinalSuffix(1)).toBe('st')
    expect(getOrdinalSuffix(21)).toBe('st')
  })
  it('returns nd for 2, 22', () => {
    expect(getOrdinalSuffix(2)).toBe('nd')
    expect(getOrdinalSuffix(22)).toBe('nd')
  })
  it('returns rd for 3, 23', () => {
    expect(getOrdinalSuffix(3)).toBe('rd')
    expect(getOrdinalSuffix(23)).toBe('rd')
  })
  it('returns th for 4-20, 24-30', () => {
    expect(getOrdinalSuffix(4)).toBe('th')
    expect(getOrdinalSuffix(11)).toBe('th')
    expect(getOrdinalSuffix(15)).toBe('th')
  })
})
