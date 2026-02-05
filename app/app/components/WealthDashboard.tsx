'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/format'
import {
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts'

type ChartPoint = { month: string; value: number; fullDate: string }

type AllocationGroup = { label: string; amount: number; pct: number; assets: { name: string; amount: number; pct: number }[] }

export function WealthDashboard() {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [incomeData, setIncomeData] = useState<ChartPoint[]>([])
  const [expenseData, setExpenseData] = useState<ChartPoint[]>([])
  const [netWorthData, setNetWorthData] = useState<ChartPoint[]>([])
  const [allocation, setAllocation] = useState<AllocationGroup[]>([])
  const [allocationMonth, setAllocationMonth] = useState<string>('')
  const [collapsedClasses, setCollapsedClasses] = useState<Set<string>>(new Set())

  const loadDashboardData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return
      const user = session.user

      // Wealth: snapshots, earnings for net worth and income
      const { data: snapshots } = await supabase
        .from('wealth_snapshots')
        .select('id, year, month')
        .eq('user_id', user.id)
        .order('year', { ascending: true })
        .order('month', { ascending: true })

      if (!snapshots || snapshots.length === 0) {
        setIncomeData([])
        setNetWorthData([])
        setExpenseData([])
        setAllocation([])
        setAllocationMonth('')
        setLoading(false)
        return
      }

      const snapshotIds = snapshots.map(s => s.id)
      const [cashRes, assetsRes, debtsRes, earningsRes] = await Promise.all([
        supabase.from('wealth_cash_accounts').select('snapshot_id, name, amount').in('snapshot_id', snapshotIds),
        supabase.from('wealth_assets').select('snapshot_id, name, amount, asset_class').in('snapshot_id', snapshotIds),
        supabase.from('wealth_debts').select('snapshot_id, amount').in('snapshot_id', snapshotIds),
        supabase.from('wealth_earnings').select('snapshot_id, amount').in('snapshot_id', snapshotIds),
      ])

      const cashBySnap = new Map<string, number>()
      ;(cashRes.data || []).forEach((r: { snapshot_id: string; amount: number }) => {
        cashBySnap.set(r.snapshot_id, (cashBySnap.get(r.snapshot_id) || 0) + Number(r.amount))
      })
      const assetsBySnap = new Map<string, number>()
      const assetsDetailBySnap = new Map<string, { name: string; amount: number; assetClass: string }[]>()
      ;(assetsRes.data || []).forEach((r: { snapshot_id: string; name: string; amount: number; asset_class?: string }) => {
        assetsBySnap.set(r.snapshot_id, (assetsBySnap.get(r.snapshot_id) || 0) + Number(r.amount))
        const list = assetsDetailBySnap.get(r.snapshot_id) || []
        list.push({ name: r.name, amount: Number(r.amount), assetClass: r.asset_class || 'Other' })
        assetsDetailBySnap.set(r.snapshot_id, list)
      })
      const debtsBySnap = new Map<string, number>()
      ;(debtsRes.data || []).forEach((r: { snapshot_id: string; amount: number }) => {
        debtsBySnap.set(r.snapshot_id, (debtsBySnap.get(r.snapshot_id) || 0) + Number(r.amount))
      })
      const earningsBySnap = new Map<string, number>()
      ;(earningsRes.data || []).forEach((r: { snapshot_id: string; amount: number }) => {
        earningsBySnap.set(r.snapshot_id, (earningsBySnap.get(r.snapshot_id) || 0) + Number(r.amount))
      })

      const snapById = new Map(snapshots.map(s => [s.id, s]))
      const netWorthPoints: ChartPoint[] = []
      const incomePoints: ChartPoint[] = []

      for (const snap of snapshots) {
        const cash = cashBySnap.get(snap.id) || 0
        const assets = assetsBySnap.get(snap.id) || 0
        const debts = debtsBySnap.get(snap.id) || 0
        const earnings = earningsBySnap.get(snap.id) || 0
        const netWorth = cash + assets - debts
        const monthLabel = snap.month === 0
          ? `${snap.year - 1}‑12`
          : `${snap.year}‑${String(snap.month).padStart(2, '0')}`
        const fullDate = snap.month === 0
          ? `${snap.year - 1}-12-31`
          : `${snap.year}-${String(snap.month).padStart(2, '0')}-01`

        netWorthPoints.push({ month: monthLabel, value: netWorth, fullDate })
        if (snap.month >= 1) {
          incomePoints.push({ month: monthLabel, value: earnings, fullDate })
        }
      }

      setNetWorthData(netWorthPoints)
      setIncomeData(incomePoints)

      // Expenses from expenses table
      const { data: expenses } = await supabase
        .from('expenses')
        .select('date, amount')
        .order('date', { ascending: true })

      const byMonth = new Map<string, number>()
      ;(expenses || []).forEach((r: { date: string; amount: number }) => {
        const [y, m] = r.date.split('-')
        const key = `${y}-${m}`
        byMonth.set(key, (byMonth.get(key) || 0) + Number(r.amount))
      })

      const expensePoints: ChartPoint[] = Array.from(byMonth.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month]) => ({ month, value: byMonth.get(month) || 0, fullDate: `${month}-01` }))

      setExpenseData(expensePoints)

      // Allocation summary (last month): 100% = cash + all assets
      const lastSnap = snapshots[snapshots.length - 1]
      if (lastSnap) {
        const cash = cashBySnap.get(lastSnap.id) || 0
        const assetsDetail = assetsDetailBySnap.get(lastSnap.id) || []
        const total = cash + assetsDetail.reduce((s, a) => s + a.amount, 0)
        if (total > 0) {
          const monthLabel = lastSnap.month === 0
            ? `${lastSnap.year - 1}‑12`
            : `${lastSnap.year}‑${String(lastSnap.month).padStart(2, '0')}`
          setAllocationMonth(monthLabel)
          const groups: AllocationGroup[] = []
          groups.push({ label: 'Cash', amount: cash, pct: (cash / total) * 100, assets: [] })
          const byClass = new Map<string, { amount: number; assets: { name: string; amount: number }[] }>()
          for (const a of assetsDetail) {
            const c = (a.assetClass || 'Other').trim() || 'Other'
            const existing = byClass.get(c) || { amount: 0, assets: [] }
            existing.amount += a.amount
            existing.assets.push({ name: a.name, amount: a.amount })
            byClass.set(c, existing)
          }
          for (const [assetClass, { amount, assets }] of Array.from(byClass.entries()).sort((a, b) => b[1].amount - a[1].amount)) {
            const sortedAssets = assets.sort((x, y) => y.amount - x.amount)
            groups.push({
              label: assetClass,
              amount,
              pct: (amount / total) * 100,
              assets: sortedAssets.map(a => ({ name: a.name, amount: a.amount, pct: (a.amount / total) * 100 }))
            })
          }
          setAllocation(groups.sort((a, b) => b.amount - a.amount))
        } else {
          setAllocation([])
          setAllocationMonth('')
        }
      } else {
        setAllocation([])
        setAllocationMonth('')
      }
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    loadDashboardData()
  }, [loadDashboardData])

  const chartHeight = 120

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-8 bg-zinc-100 dark:bg-zinc-800 rounded-xl w-48 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
          <div className="h-48 bg-zinc-100 dark:bg-zinc-800 rounded-2xl" />
          <div className="h-48 bg-zinc-100 dark:bg-zinc-800 rounded-2xl" />
          <div className="h-48 bg-zinc-100 dark:bg-zinc-800 rounded-2xl" />
        </div>
        <div className="h-64 bg-zinc-100 dark:bg-zinc-800 rounded-2xl animate-pulse" />
      </div>
    )
  }

  const hasAny = incomeData.length > 0 || expenseData.length > 0 || netWorthData.length > 0 || allocation.length > 0

  if (!hasAny) {
    return (
      <div className="space-y-8">
        <p className="text-zinc-500 dark:text-zinc-400">Add wealth and expense data to see your overview.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="space-y-6">
      <h2 className="text-lg font-medium text-zinc-800 dark:text-zinc-200">Evolution</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Income */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Income</p>
          {incomeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={chartHeight}>
              <AreaChart data={incomeData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                <defs>
                  <linearGradient id="wealth-dash-income-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#71717a" />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid rgb(228 228 231)' }}
                  formatter={(v) => [formatCurrency(Number(v) || 0), 'Income']}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.month}
                />
                <Area type="monotone" dataKey="value" stroke="#8b5cf6" fill="url(#wealth-dash-income-grad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-zinc-400 dark:text-zinc-500 py-8 text-center">No income data yet</p>
          )}
        </div>

        {/* Expenses */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Expenses</p>
          {expenseData.length > 0 ? (
            <ResponsiveContainer width="100%" height={chartHeight}>
              <AreaChart data={expenseData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                <defs>
                  <linearGradient id="wealth-dash-expense-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#71717a" />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid rgb(228 228 231)' }}
                  formatter={(v) => [formatCurrency(Number(v) || 0), 'Expenses']}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.month}
                />
                <Area type="monotone" dataKey="value" stroke="#ef4444" fill="url(#wealth-dash-expense-grad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-zinc-400 dark:text-zinc-500 py-8 text-center">No expense data yet</p>
          )}
        </div>

        {/* Net worth */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Net Worth</p>
          {netWorthData.length > 0 ? (
            <ResponsiveContainer width="100%" height={chartHeight}>
              <AreaChart data={netWorthData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                <defs>
                  <linearGradient id="wealth-dash-nw-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#71717a" />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid rgb(228 228 231)' }}
                  formatter={(v) => [formatCurrency(Number(v) || 0), 'Net Worth']}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.month}
                />
                <Area type="monotone" dataKey="value" stroke="#22c55e" fill="url(#wealth-dash-nw-grad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-zinc-400 dark:text-zinc-500 py-8 text-center">No net worth data yet</p>
          )}
        </div>
      </div>

      {/* Asset allocation summary table */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium text-zinc-800 dark:text-zinc-200">
          Allocation {allocationMonth && <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">({allocationMonth})</span>}
        </h2>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800">
                <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Asset class</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Amount</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">%</th>
              </tr>
            </thead>
            <tbody>
              {allocation.length > 0 ? (
                allocation.map((group) => {
                  const isCollapsed = collapsedClasses.has(group.label)
                  const hasChildren = group.assets.length > 0
                  return (
                    <React.Fragment key={group.label}>
                      <tr
                        key={group.label}
                        className="border-b border-zinc-50 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-800/30"
                      >
                        <td className="py-2.5 px-4 font-medium text-zinc-900 dark:text-zinc-100">
                          <button
                            type="button"
                            onClick={() => setCollapsedClasses(prev => {
                              const next = new Set(prev)
                              if (next.has(group.label)) next.delete(group.label)
                              else next.add(group.label)
                              return next
                            })}
                            className="flex items-center gap-1.5 text-left hover:opacity-80"
                            aria-expanded={!isCollapsed}
                          >
                            {hasChildren ? (
                              <span className="text-zinc-500 text-xs">{isCollapsed ? '▶' : '▼'}</span>
                            ) : (
                              <span className="w-3.5 inline-block" />
                            )}
                            {group.label}
                          </button>
                        </td>
                        <td className="py-2.5 px-4 text-right tabular-nums text-zinc-700 dark:text-zinc-300">{formatCurrency(group.amount)}</td>
                        <td className="py-2.5 px-4 text-right tabular-nums text-zinc-600 dark:text-zinc-400 w-20">{group.pct.toFixed(1)}%</td>
                      </tr>
                      {hasChildren && !isCollapsed && group.assets.map((a) => (
                        <tr key={`${group.label}-${a.name}`} className="border-b border-zinc-50 dark:border-zinc-800/50 last:border-0">
                          <td className="py-2 px-4 pl-8 text-zinc-600 dark:text-zinc-400">{a.name}</td>
                          <td className="py-2 px-4 text-right tabular-nums text-zinc-700 dark:text-zinc-300">{formatCurrency(a.amount)}</td>
                          <td className="py-2 px-4 text-right tabular-nums text-zinc-600 dark:text-zinc-400 w-20">{a.pct.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={3} className="py-8 px-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                    Add cash and assets in the Tracker to see your allocation by class (Cash, ETF, etc.)
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {allocation.length > 0 && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 px-4 pb-4 pt-2">Cash + all assets = 100%</p>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}
