'use client'

import type { Expense, Category } from '@/lib/types'
import { formatCurrency } from '@/lib/format'
import { LOCALE } from '@/lib/constants'

export function TransactionRow({
  expense,
  category,
  showBorder = true,
  isRecurring = false,
  onEdit,
}: {
  expense: Expense
  category: Category
  showBorder?: boolean
  isRecurring?: boolean
  onEdit?: () => void
}) {
  return (
    <div
      className={`flex items-center justify-between px-3 sm:px-5 py-3 sm:py-4 group ${showBorder ? 'border-b border-zinc-100 dark:border-zinc-800' : ''} ${onEdit ? 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer' : ''}`}
      onClick={onEdit}
    >
      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
        <div
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
          style={{ backgroundColor: category.color }}
        >
          {category.label.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{expense.description}</p>
            {isRecurring && (
              <span className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 text-[10px] font-medium rounded flex-shrink-0 hidden sm:inline">REC</span>
            )}
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            {new Date(expense.date).toLocaleDateString(LOCALE, { month: 'short', day: 'numeric' })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-2">
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">{formatCurrency(expense.amount)}</p>
        {onEdit && (
          <span className="text-xs text-zinc-400 dark:text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity hidden sm:inline">Edit →</span>
        )}
      </div>
    </div>
  )
}
