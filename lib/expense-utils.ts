import type { Category, Expense } from './types'
import { getOrdinalSuffix } from './format'

export function isRentCategory(catId: string, categories: Category[]): boolean {
  const cat = categories.find((c) => c.id === catId)
  if (!cat) return false
  const label = cat.label.toLowerCase()
  const id = catId.toLowerCase()
  return (
    label.includes('rent') ||
    label.includes('alquiler') ||
    label.includes('housing') ||
    label.includes('hipoteca') ||
    label.includes('mortgage') ||
    id.includes('rent') ||
    id.includes('housing')
  )
}

export type TransactionSort =
  | 'date-desc'
  | 'date-asc'
  | 'amount-desc'
  | 'amount-asc'
  | 'category-asc'
  | 'category-desc'

export function sortExpenses(
  expenses: Expense[],
  sort: TransactionSort,
  getCategory: (id: string) => Category
): Expense[] {
  const list = [...expenses]
  switch (sort) {
    case 'date-desc':
      return list.sort((a, b) => b.date.localeCompare(a.date))
    case 'date-asc':
      return list.sort((a, b) => a.date.localeCompare(b.date))
    case 'amount-desc':
      return list.sort((a, b) => b.amount - a.amount)
    case 'amount-asc':
      return list.sort((a, b) => a.amount - b.amount)
    case 'category-asc':
      return list.sort((a, b) =>
        getCategory(a.category).label.localeCompare(getCategory(b.category).label)
      )
    case 'category-desc':
      return list.sort((a, b) =>
        getCategory(b.category).label.localeCompare(getCategory(a.category).label)
      )
    default:
      return list.sort((a, b) => b.date.localeCompare(a.date))
  }
}

export function getDayOptions() {
  return Array.from({ length: 28 }, (_, i) => ({
    value: (i + 1).toString(),
    label: `${i + 1}${getOrdinalSuffix(i + 1)}`,
  }))
}
