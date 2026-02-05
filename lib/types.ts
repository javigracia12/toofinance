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

// Wealth tracking types
export type WealthSnapshot = {
  id: string
  year: number
  month: number // 0 = end of prev year, 1-12 = Jan-Dec
  cashAccounts: WealthItem[]
  assets: WealthItem[]
  debts: WealthItem[]
  earnings: WealthItem[]
  investments: WealthItem[] // asset_name + amount
}

export type WealthItem = {
  id: string
  name: string
  amount: number
  /** For assets only: ETF, Private Equity, Alternative, Real Estate, etc. */
  assetClass?: string
}

export type WealthYearData = {
  year: number
  // All unique item names across all months (for row labels)
  cashAccountNames: string[]
  assetNames: string[]
  /** Asset name -> classification (ETF, Private Equity, etc.) */
  assetClasses: Record<string, string>
  debtNames: string[]
  earningNames: string[]
  // Snapshots by month (0-12)
  snapshots: Record<number, WealthSnapshot>
}
