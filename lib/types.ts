export type Expense = {
  id: string
  amount: number
  description: string
  category: string
  date: string
  recurringId?: string
}

export type RecurringExpense = {
  id: string
  amount: number
  description: string
  category: string
  dayOfMonth: number
  isActive: boolean
  createdAt: string
}

export type Category = {
  id: string
  label: string
  color: string
  isCustom?: boolean
}
