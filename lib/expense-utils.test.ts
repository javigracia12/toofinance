import { describe, it, expect } from 'vitest'
import { isRentCategory, sortExpenses, getDayOptions } from './expense-utils'
import type { Category, Expense } from './types'

describe('isRentCategory', () => {
  const categories: Category[] = [
    { id: 'rent', label: 'Rent', color: '#333' },
    { id: 'food', label: 'Food', color: '#333' },
    { id: 'housing', label: 'Housing', color: '#333' },
    { id: 'alquiler', label: 'Alquiler', color: '#333' },
  ]

  it('returns true for rent-related categories', () => {
    expect(isRentCategory('rent', categories)).toBe(true)
    expect(isRentCategory('housing', categories)).toBe(true)
    expect(isRentCategory('alquiler', categories)).toBe(true)
  })

  it('returns false for non-rent categories', () => {
    expect(isRentCategory('food', categories)).toBe(false)
  })

  it('returns false for unknown category id', () => {
    expect(isRentCategory('unknown', categories)).toBe(false)
  })
})

describe('sortExpenses', () => {
  const getCategory = (id: string): Category => ({ id, label: id, color: '#333' })
  const expenses: Expense[] = [
    { id: '1', amount: 50, description: 'A', category: 'b', date: '2024-01-15' },
    { id: '2', amount: 100, description: 'B', category: 'a', date: '2024-02-10' },
    { id: '3', amount: 25, description: 'C', category: 'c', date: '2024-01-20' },
  ]

  it('sorts by date descending', () => {
    const result = sortExpenses(expenses, 'date-desc', getCategory)
    expect(result[0].date).toBe('2024-02-10')
    expect(result[2].date).toBe('2024-01-15')
  })

  it('sorts by date ascending', () => {
    const result = sortExpenses(expenses, 'date-asc', getCategory)
    expect(result[0].date).toBe('2024-01-15')
  })

  it('sorts by amount descending', () => {
    const result = sortExpenses(expenses, 'amount-desc', getCategory)
    expect(result[0].amount).toBe(100)
  })

  it('sorts by amount ascending', () => {
    const result = sortExpenses(expenses, 'amount-asc', getCategory)
    expect(result[0].amount).toBe(25)
  })

  it('sorts by category ascending', () => {
    const result = sortExpenses(expenses, 'category-asc', getCategory)
    expect(result[0].category).toBe('a')
  })
})

describe('getDayOptions', () => {
  it('returns 28 options', () => {
    const options = getDayOptions()
    expect(options).toHaveLength(28)
  })

  it('includes ordinal suffixes', () => {
    const options = getDayOptions()
    expect(options[0].label).toBe('1st')
    expect(options[1].label).toBe('2nd')
    expect(options[2].label).toBe('3rd')
    expect(options[3].label).toBe('4th')
  })
})
