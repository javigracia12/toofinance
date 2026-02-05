'use client'

import type { Category } from '@/lib/types'

export function CategoryPill({
  category,
  selected,
  onClick,
  onEdit,
}: {
  category: Category
  selected: boolean
  onClick: () => void
  onEdit?: () => void
}) {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
          selected ? 'text-white shadow-lg' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
        }`}
        style={selected ? { backgroundColor: category.color } : {}}
      >
        {category.label}
      </button>
      {onEdit && !selected && (
        <button
          onClick={(e) => { e.stopPropagation(); onEdit() }}
          className="absolute -top-1 -right-1 w-5 h-5 bg-zinc-500 hover:bg-zinc-700 text-white rounded-full text-[10px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
          title="Edit category"
        >
          ✎
        </button>
      )}
    </div>
  )
}
