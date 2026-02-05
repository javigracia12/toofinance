export const LOCALE = 'en-US'
export const CURRENCY = 'EUR'

export const DEFAULT_CATEGORIES = [
  { id: 'food', label: 'Food', color: '#f97316', is_custom: false },
  { id: 'dining', label: 'Dining', color: '#ea580c', is_custom: false },
  { id: 'transport', label: 'Transport', color: '#3b82f6', is_custom: false },
  { id: 'shopping', label: 'Shopping', color: '#ec4899', is_custom: false },
  { id: 'entertainment', label: 'Entertainment', color: '#8b5cf6', is_custom: false },
  { id: 'bills', label: 'Bills & Utilities', color: '#06b6d4', is_custom: false },
  { id: 'health', label: 'Health', color: '#22c55e', is_custom: false },
] as const

export const CATEGORY_COLORS = [
  '#f97316', '#3b82f6', '#ec4899', '#8b5cf6', '#06b6d4', '#22c55e',
  '#eab308', '#ef4444', '#14b8a6', '#6366f1',
]
