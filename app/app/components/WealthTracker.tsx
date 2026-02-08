'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { WealthSnapshot, WealthItem, WealthYearData } from '@/lib/types'
import { formatCurrency } from '@/lib/format'

const MONTHS = ['Start', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

type ItemType = 'cash' | 'asset' | 'debt' | 'earning' | 'investment'

// Delete button for rows
function DeleteRowButton({
  onDelete,
  label,
}: {
  onDelete: () => void
  label: string
}) {
  const [confirming, setConfirming] = useState(false)

  if (confirming) {
    return (
      <span className="flex items-center gap-1">
        <button
          onClick={() => { onDelete(); setConfirming(false) }}
          className="text-xs text-red-600 dark:text-red-400 hover:underline"
        >
          Confirm
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="text-xs text-zinc-400 hover:text-zinc-600"
        >
          Cancel
        </button>
      </span>
    )
  }

  return (
    <button
      onClick={(e) => { e.stopPropagation(); setConfirming(true) }}
      className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 p-2 sm:p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/50 text-zinc-400 hover:text-red-500 transition-all touch-manipulation min-w-[36px] min-h-[36px] flex items-center justify-center"
      aria-label={`Delete ${label}`}
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  )
}

// Inline editable cell
function EditableCell({
  value,
  onChange,
  disabled = false,
  placeholder = '—',
  className = '',
}: {
  value: number
  onChange: (value: number) => void
  disabled?: boolean
  placeholder?: string
  className?: string
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [tempValue, setTempValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleClick = () => {
    if (disabled) return
    setTempValue(value ? value.toString() : '')
    setIsEditing(true)
  }

  const handleBlur = () => {
    setIsEditing(false)
    const newValue = parseFloat(tempValue) || 0
    if (newValue !== value) {
      onChange(newValue)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur()
    } else if (e.key === 'Escape') {
      setTempValue(value ? value.toString() : '')
      setIsEditing(false)
    }
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="number"
        inputMode="decimal"
        value={tempValue}
        onChange={(e) => setTempValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`w-full bg-white dark:bg-zinc-800 text-right px-2 py-2 sm:py-1 text-sm tabular-nums rounded-md border border-blue-400 dark:border-blue-500 outline-none min-h-[44px] sm:min-h-0 ${className}`}
      />
    )
  }

  return (
    <div
      onClick={handleClick}
      className={`px-2 py-2 sm:py-1 text-right text-sm tabular-nums rounded-md transition-colors min-h-[44px] sm:min-h-0 flex items-center justify-end ${
        disabled
          ? 'text-zinc-300 dark:text-zinc-600 cursor-default'
          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-text touch-manipulation'
      } ${className}`}
    >
      {value ? formatCurrency(value) : placeholder}
    </div>
  )
}

// Add asset row with optional classification
function AddAssetRow({
  onAdd,
  placeholder,
  classPlaceholder,
  color,
}: {
  onAdd: (name: string, assetClass: string) => void
  placeholder: string
  classPlaceholder: string
  color: string
}) {
  const [isAdding, setIsAdding] = useState(false)
  const [name, setName] = useState('')
  const [assetClass, setAssetClass] = useState('')
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isAdding && nameRef.current) {
      nameRef.current.focus()
    }
  }, [isAdding])

  const handleSubmit = () => {
    if (name.trim()) {
      onAdd(name.trim(), assetClass.trim() || 'Other')
      setName('')
      setAssetClass('')
    }
    setIsAdding(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    } else if (e.key === 'Escape') {
      setName('')
      setAssetClass('')
      setIsAdding(false)
    }
  }

  if (isAdding) {
    return (
      <div className="pl-8 pr-3 py-2 flex flex-col sm:flex-row gap-2 sm:flex-wrap">
        <input
          ref={nameRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="min-w-0 flex-1 sm:w-40 bg-white dark:bg-zinc-800 px-3 py-2 sm:py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 outline-none focus:border-blue-400 dark:focus:border-blue-500"
        />
        <input
          type="text"
          value={assetClass}
          onChange={(e) => setAssetClass(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSubmit}
          placeholder={classPlaceholder}
          className="min-w-0 flex-1 sm:w-28 bg-white dark:bg-zinc-800 px-3 py-2 sm:py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 outline-none focus:border-blue-400 dark:focus:border-blue-500"
        />
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsAdding(true)}
      className={`ml-8 px-3 py-1.5 text-xs font-medium rounded-lg transition-all hover:scale-105 ${color}`}
    >
      + Add
    </button>
  )
}

// Add item row
function AddItemRow({
  onAdd,
  placeholder,
  color,
}: {
  onAdd: (name: string) => void
  placeholder: string
  color: string
}) {
  const [isAdding, setIsAdding] = useState(false)
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isAdding])

  const handleSubmit = () => {
    if (name.trim()) {
      onAdd(name.trim())
      setName('')
    }
    setIsAdding(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    } else if (e.key === 'Escape') {
      setName('')
      setIsAdding(false)
    }
  }

  if (isAdding) {
    return (
      <div className="pl-8 pr-3 py-2">
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={handleSubmit}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full max-w-[12rem] sm:w-48 bg-white dark:bg-zinc-800 px-3 py-2 sm:py-1.5 text-sm rounded-lg border border-zinc-200 dark:border-zinc-700 outline-none focus:border-blue-400 dark:focus:border-blue-500"
        />
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsAdding(true)}
      className={`ml-8 px-3 py-1.5 text-xs font-medium rounded-lg transition-all hover:scale-105 ${color}`}
    >
      + Add
    </button>
  )
}

export function WealthTracker() {
  const supabase = useMemo(() => createClient(), [])
  const currentYear = new Date().getFullYear()
  
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [loading, setLoading] = useState(true)
  const [savingCells, setSavingCells] = useState<Set<string>>(new Set())
  const [saveError, setSaveError] = useState<string | null>(null)
  
  const [yearData, setYearData] = useState<WealthYearData>({
    year: currentYear,
    cashAccountNames: [],
    assetNames: [],
    assetClasses: {},
    debtNames: [],
    earningNames: [],
    snapshots: {},
  })

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    cash: true,
    assets: true,
    debts: true,
    earnings: false,
    investments: false,
  })

  // Load data for selected year
  const loadYearData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return
      const user = session.user

      const { data: snapshots } = await supabase
        .from('wealth_snapshots')
        .select('id, year, month')
        .eq('user_id', user.id)
        .eq('year', selectedYear)

      const snapshotMap: Record<number, WealthSnapshot> = {}
      const allCashNames = new Set<string>()
      const allAssetNames = new Set<string>()
      const allDebtNames = new Set<string>()
      const allEarningNames = new Set<string>()
      const assetClassesMap: Record<string, string> = {}

      if (snapshots && snapshots.length > 0) {
        const snapshotIds = snapshots.map(s => s.id)

        const [cashRes, assetsRes, debtsRes, earningsRes, investmentsRes] = await Promise.all([
          supabase.from('wealth_cash_accounts').select('*').in('snapshot_id', snapshotIds),
          supabase.from('wealth_assets').select('*').in('snapshot_id', snapshotIds),
          supabase.from('wealth_debts').select('*').in('snapshot_id', snapshotIds),
          supabase.from('wealth_earnings').select('*').in('snapshot_id', snapshotIds),
          supabase.from('wealth_investments').select('*').in('snapshot_id', snapshotIds),
        ])

        for (const snap of snapshots) {
          const cashAccounts = (cashRes.data || [])
            .filter(c => c.snapshot_id === snap.id)
            .map(c => ({ id: c.id, name: c.name, amount: Number(c.amount) }))
          const assets = (assetsRes.data || [])
            .filter(a => a.snapshot_id === snap.id)
            .map(a => {
              const ac = (a as { asset_class?: string }).asset_class
              if (ac && !assetClassesMap[a.name]) assetClassesMap[a.name] = ac
              return { id: a.id, name: a.name, amount: Number(a.amount), assetClass: (a as { asset_class?: string }).asset_class }
            })
          const debts = (debtsRes.data || [])
            .filter(d => d.snapshot_id === snap.id)
            .map(d => ({ id: d.id, name: d.name, amount: Number(d.amount) }))
          const earnings = (earningsRes.data || [])
            .filter(e => e.snapshot_id === snap.id)
            .map(e => ({ id: e.id, name: e.name, amount: Number(e.amount) }))
          const investments = (investmentsRes.data || [])
            .filter(i => i.snapshot_id === snap.id)
            .map(i => ({ id: i.id, name: i.asset_name, amount: Number(i.amount) }))

          cashAccounts.forEach(c => allCashNames.add(c.name))
          assets.forEach(a => allAssetNames.add(a.name))
          debts.forEach(d => allDebtNames.add(d.name))
          earnings.forEach(e => allEarningNames.add(e.name))

          snapshotMap[snap.month] = {
            id: snap.id,
            year: snap.year,
            month: snap.month,
            cashAccounts,
            assets,
            debts,
            earnings,
            investments,
          }
        }
      }

      setYearData({
        year: selectedYear,
        cashAccountNames: Array.from(allCashNames).sort(),
        assetNames: Array.from(allAssetNames).sort(),
        assetClasses: assetClassesMap,
        debtNames: Array.from(allDebtNames).sort(),
        earningNames: Array.from(allEarningNames).sort(),
        snapshots: snapshotMap,
      })
    } finally {
      setLoading(false)
    }
  }, [supabase, selectedYear])

  useEffect(() => {
    loadYearData()
  }, [loadYearData])

  // Get or create snapshot. Returns { id, snapshot } - snapshot is the new snapshot when created (for use in optimistic update)
  const ensureSnapshot = async (month: number): Promise<{ id: string; snapshot?: WealthSnapshot; error?: string } | null> => {
    const existing = yearData.snapshots[month]
    if (existing) return { id: existing.id }

    const { data: { session } } = await supabase.auth.getSession()
    console.log('[ensureSnapshot] session user', session?.user?.id)
    if (!session?.user) {
      return { id: '', error: 'Not authenticated - please log in again' }
    }
    const user = session.user

    const { data, error } = await supabase
      .from('wealth_snapshots')
      .insert({ user_id: user.id, year: selectedYear, month })
      .select('id')
      .single()

    console.log('[ensureSnapshot] insert result', { data, error })
    if (error) {
      return { id: '', error: `Failed to create snapshot: ${error.message}` }
    }

    const newSnapshot: WealthSnapshot = {
      id: data.id,
      year: selectedYear,
      month,
      cashAccounts: [],
      assets: [],
      debts: [],
      earnings: [],
      investments: [],
    }

    setYearData(prev => ({
      ...prev,
      snapshots: { ...prev.snapshots, [month]: newSnapshot },
    }))

    return { id: data.id, snapshot: newSnapshot }
  }

  // Get cell value
  const getCellValue = (type: ItemType, name: string, month: number): number => {
    const snapshot = yearData.snapshots[month]
    if (!snapshot) return 0

    const itemsMap: Record<ItemType, WealthItem[]> = {
      cash: snapshot.cashAccounts,
      asset: snapshot.assets,
      debt: snapshot.debts,
      earning: snapshot.earnings,
      investment: snapshot.investments,
    }

    return itemsMap[type].find(i => i.name === name)?.amount ?? 0
  }

  // Optimistic update + save
  const updateCell = async (type: ItemType, name: string, month: number, newValue: number) => {
    console.log('[updateCell] called', { type, name, month, newValue })
    setSaveError(null)
    const cellKey = `${type}-${name}-${month}`
    setSavingCells(prev => new Set(prev).add(cellKey))

    // Ensure snapshot exists first (creates in DB if needed)
    const result = await ensureSnapshot(month)
    console.log('[updateCell] ensureSnapshot result', result)
    if (!result || result.error) {
      console.log('[updateCell] ensureSnapshot failed', result?.error)
      setSaveError(result?.error || 'Failed to create snapshot')
      setSavingCells(prev => { const next = new Set(prev); next.delete(cellKey); return next })
      return
    }
    const { id: snapshotId } = result

    // Optimistic update - use snapshot from state or from result when we just created it
    setYearData(prev => {
      const snapshot = prev.snapshots[month] ?? result.snapshot
      if (!snapshot) return prev

      const typeToKey: Record<ItemType, keyof WealthSnapshot> = {
        cash: 'cashAccounts',
        asset: 'assets',
        debt: 'debts',
        earning: 'earnings',
        investment: 'investments',
      }
      const key = typeToKey[type]
      const items = [...(snapshot[key] as WealthItem[])]
      const idx = items.findIndex(i => i.name === name)

      if (idx >= 0) {
        items[idx] = { ...items[idx], amount: newValue }
      } else {
        const assetClass = type === 'asset' ? yearData.assetClasses[name] : undefined
        items.push({ id: `temp-${Date.now()}`, name, amount: newValue, ...(assetClass ? { assetClass } : {}) })
      }

      return {
        ...prev,
        snapshots: {
          ...prev.snapshots,
          [month]: { ...snapshot, [key]: items },
        },
      }
    })

    // Save to DB
    try {
      const tableMap: Record<ItemType, string> = {
        cash: 'wealth_cash_accounts',
        asset: 'wealth_assets',
        debt: 'wealth_debts',
        earning: 'wealth_earnings',
        investment: 'wealth_investments',
      }
      const table = tableMap[type]
      const nameCol = type === 'investment' ? 'asset_name' : 'name'

      const { data: existing } = await supabase
        .from(table)
        .select('id')
        .eq('snapshot_id', snapshotId)
        .eq(nameCol, name)
        .maybeSingle()

      console.log('[updateCell] checking existing row', { snapshotId, name, existing })
      let dbError: Error | null = null
      if (existing) {
        const updatePayload = type === 'asset' && yearData.assetClasses[name]
          ? { amount: newValue, asset_class: yearData.assetClasses[name] }
          : { amount: newValue }
        console.log('[updateCell] updating existing', { id: existing.id, updatePayload })
        const { error } = await supabase.from(table).update(updatePayload).eq('id', existing.id)
        if (error) { console.log('[updateCell] update error', error); dbError = error }
        else console.log('[updateCell] update success')
      } else {
        const insertData = type === 'investment'
          ? { snapshot_id: snapshotId, asset_name: name, amount: newValue }
          : type === 'asset'
            ? { snapshot_id: snapshotId, name, amount: newValue, ...(yearData.assetClasses[name] ? { asset_class: yearData.assetClasses[name] } : {}) }
            : { snapshot_id: snapshotId, name, amount: newValue }
        console.log('[updateCell] inserting new', { table, insertData })
        const { error } = await supabase.from(table).insert(insertData)
        if (error) { console.log('[updateCell] insert error', error); dbError = error }
        else console.log('[updateCell] insert success')
      }

      if (dbError) {
        setSaveError(dbError.message)
        loadYearData()
      }
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save')
      loadYearData()
    } finally {
      setSavingCells(prev => {
        const next = new Set(prev)
        next.delete(cellKey)
        return next
      })
    }
  }

  // Add new item (for non-assets)
  const addItem = async (type: ItemType, name: string) => {
    setYearData(prev => {
      const typeToKey: Record<ItemType, keyof WealthYearData> = {
        cash: 'cashAccountNames',
        asset: 'assetNames',
        debt: 'debtNames',
        earning: 'earningNames',
        investment: 'assetNames',
      }
      const key = typeToKey[type]
      const names = prev[key] as string[]
      if (names.includes(name)) return prev
      return { ...prev, [key]: [...names, name].sort() }
    })
  }

  // Add new asset with classification
  const addAsset = async (name: string, assetClass: string) => {
    setYearData(prev => {
      if (prev.assetNames.includes(name)) return prev
      return {
        ...prev,
        assetNames: [...prev.assetNames, name].sort(),
        assetClasses: { ...prev.assetClasses, [name]: assetClass || 'Other' },
      }
    })
  }

  // Delete item (removes from all snapshots)
  const deleteItem = async (type: ItemType, name: string) => {
    const typeToKey: Record<ItemType, keyof WealthYearData> = {
      cash: 'cashAccountNames',
      asset: 'assetNames',
      debt: 'debtNames',
      earning: 'earningNames',
      investment: 'assetNames',
    }
    const key = typeToKey[type]
    const nameCol = type === 'investment' ? 'asset_name' : 'name'
    const tableMap: Record<ItemType, string> = {
      cash: 'wealth_cash_accounts',
      asset: 'wealth_assets',
      debt: 'wealth_debts',
      earning: 'wealth_earnings',
      investment: 'wealth_investments',
    }

    setYearData(prev => {
      const typeToSnapKey: Record<ItemType, keyof WealthSnapshot> = {
        cash: 'cashAccounts',
        asset: 'assets',
        debt: 'debts',
        earning: 'earnings',
        investment: 'investments',
      }
      const snapKey = typeToSnapKey[type]
      const nextSnapshots = Object.fromEntries(
        Object.entries(prev.snapshots).map(([m, snap]) => {
          const items = (snap[snapKey] as WealthItem[]).filter(i => i.name !== name)
          const updates: Partial<WealthSnapshot> = { [snapKey]: items }
          if (type === 'asset') {
            updates.investments = (snap.investments || []).filter(i => i.name !== name)
          }
          return [m, { ...snap, ...updates }]
        })
      )
      const nextAssetClasses = type === 'asset' ? (() => {
        const next = { ...prev.assetClasses }
        delete next[name]
        return next
      })() : prev.assetClasses
      return {
        ...prev,
        [key]: (prev[key] as string[]).filter(n => n !== name),
        assetClasses: nextAssetClasses,
        snapshots: nextSnapshots,
      }
    })

    try {
      const snapshotIds = Object.values(yearData.snapshots).map(s => s.id)
      if (snapshotIds.length === 0) return

      const table = tableMap[type]
      await supabase.from(table).delete().in('snapshot_id', snapshotIds).eq(nameCol, name)
      if (type === 'asset') {
        await supabase.from('wealth_investments').delete().in('snapshot_id', snapshotIds).eq('asset_name', name)
      }
    } catch {
      loadYearData()
    }
  }

  // Totals
  const getTotal = (type: 'cash' | 'assets' | 'debts' | 'earnings' | 'investments', month: number): number => {
    const snapshot = yearData.snapshots[month]
    if (!snapshot) return 0

    const map: Record<string, WealthItem[]> = {
      cash: snapshot.cashAccounts,
      assets: snapshot.assets,
      debts: snapshot.debts,
      earnings: snapshot.earnings,
      investments: snapshot.investments,
    }

    return map[type].reduce((s, i) => s + i.amount, 0)
  }

  const getNetWorth = (month: number) =>
    getTotal('cash', month) + getTotal('assets', month) - getTotal('debts', month)

  // A month is "populated" if its snapshot exists and has any non-zero balance values.
  // If all values are 0 (or snapshot missing), the user hasn't entered data for that month yet.
  const isMonthPopulated = (month: number): boolean => {
    const snapshot = yearData.snapshots[month]
    if (!snapshot) return false
    const all = [...snapshot.cashAccounts, ...snapshot.assets, ...snapshot.debts]
    return all.some(i => i.amount !== 0)
  }

  const getAssetPerformance = (month: number): number | null => {
    if (month === 0) return null
    // Both months must have actual data; otherwise the delta is meaningless
    if (!isMonthPopulated(month) || !isMonthPopulated(month - 1)) return null

    const deltaAssets = getTotal('assets', month) - getTotal('assets', month - 1)
    const investments = getTotal('investments', month)

    return deltaAssets - investments
  }

  // Spending = Income - Δ Net Worth + Asset Appreciation
  // (Asset appreciation reduces "savings" so we add it back to get true spending)
  const getImpliedSpending = (month: number): number | null => {
    if (month === 0) return null
    if (!isMonthPopulated(month) || !isMonthPopulated(month - 1)) return null

    const income = getTotal('earnings', month)
    const deltaNetWorth = getNetWorth(month) - getNetWorth(month - 1)
    const assetAppreciation = getAssetPerformance(month) ?? 0

    return income - deltaNetWorth + assetAppreciation
  }

  const getAssetPerformanceFor = (name: string, month: number): number | null => {
    if (month === 0) return null
    if (!isMonthPopulated(month)) return null
    const prevVal = getCellValue('asset', name, month - 1)
    const currVal = getCellValue('asset', name, month)
    const inv = getCellValue('investment', name, month)
    if (prevVal === 0 && currVal === 0) return null
    return currVal - prevVal - inv
  }

  // Find the latest month with actual data for summary cards
  const latestPopulatedMonth = useMemo(() => {
    for (let m = 12; m >= 0; m--) {
      if (isMonthPopulated(m)) return m
    }
    return 0
  }, [yearData])

  const toggleSection = (s: string) =>
    setExpandedSections(prev => ({ ...prev, [s]: !prev[s] }))

  const years = [currentYear - 1, currentYear, currentYear + 1]

  const hasData = yearData.cashAccountNames.length > 0 ||
    yearData.assetNames.length > 0 ||
    yearData.debtNames.length > 0

  const handleYearChange = (year: number) => {
    setSelectedYear(year)
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Wealth</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Track your net worth over time</p>
          </div>
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl w-fit">
            {years.map(year => (
              <button
                key={year}
                onClick={() => handleYearChange(year)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  selectedYear === year
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
        <div key={selectedYear} className="space-y-4 animate-pulse animate-fade-slide-in">
          <div className="h-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl w-48" />
          <div className="h-64 bg-zinc-100 dark:bg-zinc-800 rounded-2xl" />
          <div className="h-48 bg-zinc-100 dark:bg-zinc-800 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Wealth</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Track your net worth over time</p>
        </div>
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl w-fit">
          {years.map(year => (
            <button
              key={year}
              onClick={() => handleYearChange(year)}
              className={`px-3 sm:px-4 py-2 text-sm font-medium rounded-lg transition-all touch-manipulation ${
                selectedYear === year
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {saveError && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {saveError}
        </div>
      )}

      {/* Content with year transition */}
      <div key={selectedYear} className="animate-fade-slide-in">
      {/* Empty state */}
      {!hasData && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">Start tracking your wealth</h2>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-sm mx-auto mb-6">
            Add your cash accounts, assets, and debts to see your net worth evolve month by month.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={() => { setExpandedSections(s => ({ ...s, cash: true })); addItem('cash', 'Checking') }}
              className="px-4 py-3 sm:py-2 text-sm font-medium bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors touch-manipulation"
            >
              Add Cash Account
            </button>
            <button
              onClick={() => { setExpandedSections(s => ({ ...s, assets: true })); addAsset('Investments', 'Other') }}
              className="px-4 py-3 sm:py-2 text-sm font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors touch-manipulation"
            >
              Add Asset
            </button>
          </div>
        </div>
      )}

      {hasData && (
        <>
          {/* Net Worth Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 dark:from-zinc-100 dark:to-zinc-200 rounded-2xl p-4 sm:p-5 text-white dark:text-zinc-900">
              <p className="text-xs font-medium opacity-70 uppercase tracking-wider">Net Worth</p>
              <p className="text-xl sm:text-2xl font-semibold mt-1 tabular-nums break-all">{formatCurrency(getNetWorth(latestPopulatedMonth))}</p>
              {latestPopulatedMonth > 0 && (
                <p className="text-xs opacity-50 mt-1">as of {MONTHS[latestPopulatedMonth]}</p>
              )}
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Assets</p>
              <p className="text-xl sm:text-2xl font-semibold text-green-600 dark:text-green-400 mt-1 tabular-nums break-all">{formatCurrency(getTotal('cash', latestPopulatedMonth) + getTotal('assets', latestPopulatedMonth))}</p>
            </div>
            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5">
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Debts</p>
              <p className="text-xl sm:text-2xl font-semibold text-red-600 dark:text-red-400 mt-1 tabular-nums break-all">{formatCurrency(getTotal('debts', latestPopulatedMonth))}</p>
            </div>
          </div>

          {/* Main Table */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden -mx-4 sm:mx-0">
            <div className="overflow-x-auto overscroll-x-contain">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800">
                    <th className="text-left py-4 px-3 sm:px-4 text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider sticky left-0 bg-white dark:bg-zinc-900 min-w-[160px] sm:min-w-[200px] z-10">
                      {selectedYear}
                    </th>
                    {MONTHS.map((m, idx) => (
                      <th key={idx} className="text-right py-4 px-2 sm:px-3 text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider min-w-[72px] sm:min-w-[85px]">
                        {m}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">

                  {/* CASH */}
                  <tr
                    className="group cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                    onClick={() => toggleSection('cash')}
                  >
                    <td className="py-3 px-4 sticky left-0 bg-white dark:bg-zinc-900 group-hover:bg-zinc-50 dark:group-hover:bg-zinc-800/30 transition-colors z-10">
                      <div className="flex items-center gap-2">
                        <span className={`text-zinc-400 transition-transform ${expandedSections.cash ? 'rotate-90' : ''}`}>›</span>
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">Cash</span>
                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                      </div>
                    </td>
                    {MONTHS.map((_, idx) => (
                      <td key={idx} className="text-right py-3 px-2 font-medium text-zinc-900 dark:text-zinc-100 tabular-nums">
                        {getTotal('cash', idx) ? formatCurrency(getTotal('cash', idx)) : <span className="text-zinc-300 dark:text-zinc-600">—</span>}
                      </td>
                    ))}
                  </tr>
                  {expandedSections.cash && yearData.cashAccountNames.map(name => (
                    <tr key={`cash-${name}`} className="group bg-zinc-50/50 dark:bg-zinc-800/20">
                      <td className="py-2 sm:py-1 px-3 sm:px-4 pl-8 sm:pl-10 text-sm text-zinc-600 dark:text-zinc-400 sticky left-0 bg-zinc-50/50 dark:bg-zinc-800/20 z-10">
                        <div className="flex items-center gap-2">
                          <span>{name}</span>
                          <DeleteRowButton onDelete={() => deleteItem('cash', name)} label={name} />
                        </div>
                      </td>
                      {MONTHS.map((_, idx) => (
                        <td key={idx} className="py-2 sm:py-1 px-1 sm:px-2">
                          <EditableCell
                            value={getCellValue('cash', name, idx)}
                            onChange={(v) => updateCell('cash', name, idx, v)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                  {expandedSections.cash && (
                    <tr className="bg-zinc-50/50 dark:bg-zinc-800/20">
                      <td colSpan={14} className="py-2 sticky left-0 bg-zinc-50/50 dark:bg-zinc-800/20 z-10">
                        <AddItemRow
                          onAdd={(name) => addItem('cash', name)}
                          placeholder="Account name..."
                          color="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                        />
                      </td>
                    </tr>
                  )}

                  {/* ASSETS */}
                  <tr
                    className="group cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                    onClick={() => toggleSection('assets')}
                  >
                    <td className="py-3 px-4 sticky left-0 bg-white dark:bg-zinc-900 group-hover:bg-zinc-50 dark:group-hover:bg-zinc-800/30 transition-colors z-10">
                      <div className="flex items-center gap-2">
                        <span className={`text-zinc-400 transition-transform ${expandedSections.assets ? 'rotate-90' : ''}`}>›</span>
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">Assets</span>
                        <span className="w-2 h-2 rounded-full bg-green-400" />
                      </div>
                    </td>
                    {MONTHS.map((_, idx) => (
                      <td key={idx} className="text-right py-3 px-2 font-medium text-green-600 dark:text-green-400 tabular-nums">
                        {getTotal('assets', idx) ? formatCurrency(getTotal('assets', idx)) : <span className="text-zinc-300 dark:text-zinc-600">—</span>}
                      </td>
                    ))}
                  </tr>
                  {expandedSections.assets && yearData.assetNames.map(name => (
                    <tr key={`asset-${name}`} className="group bg-zinc-50/50 dark:bg-zinc-800/20">
                      <td className="py-2 sm:py-1 px-3 sm:px-4 pl-8 sm:pl-10 text-sm text-zinc-600 dark:text-zinc-400 sticky left-0 bg-zinc-50/50 dark:bg-zinc-800/20 z-10">
                        <div className="flex items-center gap-2">
                          <span>{name}</span>
                          {yearData.assetClasses[name] && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400">
                              {yearData.assetClasses[name]}
                            </span>
                          )}
                          <DeleteRowButton onDelete={() => deleteItem('asset', name)} label={name} />
                        </div>
                      </td>
                      {MONTHS.map((_, idx) => (
                        <td key={idx} className="py-2 sm:py-1 px-1 sm:px-2">
                          <EditableCell
                            value={getCellValue('asset', name, idx)}
                            onChange={(v) => updateCell('asset', name, idx, v)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                  {expandedSections.assets && (
                    <tr className="bg-zinc-50/50 dark:bg-zinc-800/20">
                      <td colSpan={14} className="py-2 sticky left-0 bg-zinc-50/50 dark:bg-zinc-800/20 z-10">
                        <AddAssetRow
                          onAdd={(name, assetClass) => addAsset(name, assetClass)}
                          placeholder="Asset name..."
                          classPlaceholder="ETF, PE, etc."
                          color="text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/50 hover:bg-green-100 dark:hover:bg-green-900/50"
                        />
                      </td>
                    </tr>
                  )}

                  {/* DEBTS */}
                  <tr
                    className="group cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                    onClick={() => toggleSection('debts')}
                  >
                    <td className="py-3 px-4 sticky left-0 bg-white dark:bg-zinc-900 group-hover:bg-zinc-50 dark:group-hover:bg-zinc-800/30 transition-colors z-10">
                      <div className="flex items-center gap-2">
                        <span className={`text-zinc-400 transition-transform ${expandedSections.debts ? 'rotate-90' : ''}`}>›</span>
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">Debts</span>
                        <span className="w-2 h-2 rounded-full bg-red-400" />
                      </div>
                    </td>
                    {MONTHS.map((_, idx) => (
                      <td key={idx} className="text-right py-3 px-2 font-medium text-red-600 dark:text-red-400 tabular-nums">
                        {getTotal('debts', idx) ? formatCurrency(getTotal('debts', idx)) : <span className="text-zinc-300 dark:text-zinc-600">—</span>}
                      </td>
                    ))}
                  </tr>
                  {expandedSections.debts && yearData.debtNames.map(name => (
                    <tr key={`debt-${name}`} className="group bg-zinc-50/50 dark:bg-zinc-800/20">
                      <td className="py-2 sm:py-1 px-3 sm:px-4 pl-8 sm:pl-10 text-sm text-zinc-600 dark:text-zinc-400 sticky left-0 bg-zinc-50/50 dark:bg-zinc-800/20 z-10">
                        <div className="flex items-center gap-2">
                          <span>{name}</span>
                          <DeleteRowButton onDelete={() => deleteItem('debt', name)} label={name} />
                        </div>
                      </td>
                      {MONTHS.map((_, idx) => (
                        <td key={idx} className="py-2 sm:py-1 px-1 sm:px-2">
                          <EditableCell
                            value={getCellValue('debt', name, idx)}
                            onChange={(v) => updateCell('debt', name, idx, v)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                  {expandedSections.debts && (
                    <tr className="bg-zinc-50/50 dark:bg-zinc-800/20">
                      <td colSpan={14} className="py-2 sticky left-0 bg-zinc-50/50 dark:bg-zinc-800/20 z-10">
                        <AddItemRow
                          onAdd={(name) => addItem('debt', name)}
                          placeholder="Debt name..."
                          color="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900/50"
                        />
                      </td>
                    </tr>
                  )}

                  {/* NET WORTH ROW */}
                  <tr className="bg-zinc-100 dark:bg-zinc-800">
                    <td className="py-4 px-4 font-semibold text-zinc-900 dark:text-zinc-100 sticky left-0 bg-zinc-100 dark:bg-zinc-800 z-10">
                      Net Worth
                    </td>
                    {MONTHS.map((_, idx) => (
                      <td key={idx} className="text-right py-4 px-2 font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                        {formatCurrency(getNetWorth(idx))}
                      </td>
                    ))}
                  </tr>

                  {/* EARNINGS */}
                  <tr
                    className="group cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                    onClick={() => toggleSection('earnings')}
                  >
                    <td className="py-3 px-4 sticky left-0 bg-white dark:bg-zinc-900 group-hover:bg-zinc-50 dark:group-hover:bg-zinc-800/30 transition-colors z-10">
                      <div className="flex items-center gap-2">
                        <span className={`text-zinc-400 transition-transform ${expandedSections.earnings ? 'rotate-90' : ''}`}>›</span>
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">Earnings</span>
                        <span className="w-2 h-2 rounded-full bg-purple-400" />
                      </div>
                    </td>
                    {MONTHS.map((_, idx) => (
                      <td key={idx} className="text-right py-3 px-2 font-medium text-purple-600 dark:text-purple-400 tabular-nums">
                        {idx === 0 ? <span className="text-zinc-300 dark:text-zinc-600">—</span> : (getTotal('earnings', idx) ? formatCurrency(getTotal('earnings', idx)) : <span className="text-zinc-300 dark:text-zinc-600">—</span>)}
                      </td>
                    ))}
                  </tr>
                  {expandedSections.earnings && yearData.earningNames.map(name => (
                    <tr key={`earning-${name}`} className="group bg-zinc-50/50 dark:bg-zinc-800/20">
                      <td className="py-1 px-4 pl-10 text-sm text-zinc-600 dark:text-zinc-400 sticky left-0 bg-zinc-50/50 dark:bg-zinc-800/20 z-10">
                        <div className="flex items-center gap-2">
                          <span>{name}</span>
                          <DeleteRowButton onDelete={() => deleteItem('earning', name)} label={name} />
                        </div>
                      </td>
                      {MONTHS.map((_, idx) => (
                        <td key={idx} className="py-2 sm:py-1 px-1 sm:px-2">
                          <EditableCell
                            value={getCellValue('earning', name, idx)}
                            onChange={(v) => updateCell('earning', name, idx, v)}
                            disabled={idx === 0}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                  {expandedSections.earnings && (
                    <tr className="bg-zinc-50/50 dark:bg-zinc-800/20">
                      <td colSpan={14} className="py-2 sticky left-0 bg-zinc-50/50 dark:bg-zinc-800/20 z-10">
                        <AddItemRow
                          onAdd={(name) => addItem('earning', name)}
                          placeholder="Income source..."
                          color="text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 dark:hover:bg-purple-900/50"
                        />
                      </td>
                    </tr>
                  )}

                  {/* INVESTMENTS */}
                  <tr
                    className="group cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                    onClick={() => toggleSection('investments')}
                  >
                    <td className="py-3 px-4 sticky left-0 bg-white dark:bg-zinc-900 group-hover:bg-zinc-50 dark:group-hover:bg-zinc-800/30 transition-colors z-10">
                      <div className="flex items-center gap-2">
                        <span className={`text-zinc-400 transition-transform ${expandedSections.investments ? 'rotate-90' : ''}`}>›</span>
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">Investments Made</span>
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                      </div>
                    </td>
                    {MONTHS.map((_, idx) => (
                      <td key={idx} className="text-right py-3 px-2 font-medium text-amber-600 dark:text-amber-400 tabular-nums">
                        {idx === 0 ? <span className="text-zinc-300 dark:text-zinc-600">—</span> : (getTotal('investments', idx) ? formatCurrency(getTotal('investments', idx)) : <span className="text-zinc-300 dark:text-zinc-600">—</span>)}
                      </td>
                    ))}
                  </tr>
                  {expandedSections.investments && yearData.assetNames.map(name => (
                    <tr key={`inv-${name}`} className="bg-zinc-50/50 dark:bg-zinc-800/20">
                      <td className="py-2 sm:py-1 px-3 sm:px-4 pl-8 sm:pl-10 text-sm text-zinc-600 dark:text-zinc-400 sticky left-0 bg-zinc-50/50 dark:bg-zinc-800/20 z-10">
                        → {name}
                      </td>
                      {MONTHS.map((_, idx) => (
                        <td key={idx} className="py-2 sm:py-1 px-1 sm:px-2">
                          <EditableCell
                            value={getCellValue('investment', name, idx)}
                            onChange={(v) => updateCell('investment', name, idx, v)}
                            disabled={idx === 0}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}

                  {/* CALCULATED ROWS */}
                  <tr className="border-t-2 border-zinc-200 dark:border-zinc-700">
                    <td className="py-3 px-4 text-sm font-medium text-zinc-500 dark:text-zinc-400 sticky left-0 bg-white dark:bg-zinc-900 z-10">
                      Implied Spending
                    </td>
                    {MONTHS.map((_, idx) => {
                      const val = getImpliedSpending(idx)
                      return (
                        <td key={idx} className={`text-right py-3 px-2 text-sm font-medium tabular-nums ${val && val > 0 ? 'text-red-500' : 'text-zinc-400 dark:text-zinc-500'}`}>
                          {val !== null ? formatCurrency(val) : '—'}
                        </td>
                      )
                    })}
                  </tr>
                  <tr>
                    <td className="py-3 px-4 text-sm font-medium text-zinc-500 dark:text-zinc-400 sticky left-0 bg-white dark:bg-zinc-900 z-10">
                      Asset Performance
                    </td>
                    {MONTHS.map((_, idx) => {
                      const val = getAssetPerformance(idx)
                      return (
                        <td key={idx} className={`text-right py-3 px-2 text-sm font-medium tabular-nums ${val !== null ? (val >= 0 ? 'text-green-500' : 'text-red-500') : 'text-zinc-400 dark:text-zinc-500'}`}>
                          {val !== null ? `${val >= 0 ? '+' : ''}${formatCurrency(val)}` : '—'}
                        </td>
                      )
                    })}
                  </tr>
                  {yearData.assetNames.map(name => {
                    const hasPerf = MONTHS.some((_, idx) => getAssetPerformanceFor(name, idx) !== null)
                    if (!hasPerf) return null
                    return (
                      <tr key={`perf-${name}`}>
                        <td className="py-2 sm:py-1 px-3 sm:px-4 pl-8 sm:pl-10 text-xs text-zinc-400 dark:text-zinc-500 sticky left-0 bg-white dark:bg-zinc-900 z-10">
                          {name}
                        </td>
                        {MONTHS.map((_, idx) => {
                          const val = getAssetPerformanceFor(name, idx)
                          return (
                            <td key={idx} className={`text-right py-1 px-2 text-xs tabular-nums ${val !== null ? (val >= 0 ? 'text-green-500' : 'text-red-500') : 'text-zinc-300 dark:text-zinc-600'}`}>
                              {val !== null ? `${val >= 0 ? '+' : ''}${formatCurrency(val)}` : '—'}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  )
}
