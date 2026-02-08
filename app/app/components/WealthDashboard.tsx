'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/format'
import {
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

/* ─── Tooltip ─── */

function ChartTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { value: number; name?: string; dataKey?: string; color?: string; fill?: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 shadow-lg text-left">
      {label && <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">{label}</p>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color || entry.fill }} />
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{entry.name || entry.dataKey}</span>
          <span className="font-medium text-zinc-900 dark:text-zinc-100 ml-auto pl-3 tabular-nums text-sm">
            {formatCurrency(Number(entry.value) || 0)}
          </span>
        </div>
      ))}
    </div>
  )
}

function PercentTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { value: number; name?: string; color?: string; fill?: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 shadow-lg text-left">
      {label && <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">{label}</p>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color || entry.fill }} />
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{entry.name}</span>
          <span className="font-medium text-zinc-900 dark:text-zinc-100 ml-auto pl-3 tabular-nums text-sm">
            {Number(entry.value).toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  )
}

/* ─── Types ─── */

type ChartPoint = { month: string; value: number }
type ComparisonPoint = { month: string; implied: number; tracked: number }
type SavingsPoint = { month: string; rate: number }
type NWBreakdownPoint = { month: string; cash: number; assets: number }
type AllocationGroup = {
  label: string
  amount: number
  pct: number
  assets: { name: string; amount: number; pct: number }[]
}

const ALLOC_COLORS = [
  '#3b82f6', '#22c55e', '#8b5cf6', '#f97316', '#ec4899',
  '#06b6d4', '#eab308', '#14b8a6', '#6366f1', '#ef4444',
]

/* ─── Component ─── */

export function WealthDashboard() {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [incomeData, setIncomeData] = useState<ChartPoint[]>([])
  const [expenseData, setExpenseData] = useState<ChartPoint[]>([])
  const [netWorthData, setNetWorthData] = useState<ChartPoint[]>([])
  const [nwBreakdown, setNwBreakdown] = useState<NWBreakdownPoint[]>([])
  const [allocation, setAllocation] = useState<AllocationGroup[]>([])
  const [allocationMonth, setAllocationMonth] = useState('')
  const [collapsedClasses, setCollapsedClasses] = useState<Set<string>>(new Set())
  const [comparisonData, setComparisonData] = useState<ComparisonPoint[]>([])
  const [savingsData, setSavingsData] = useState<SavingsPoint[]>([])

  const loadDashboardData = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return
      const user = session.user

      // Current month boundary — only show completed months
      const now = new Date()
      const curYear = now.getFullYear()
      const curMonth = now.getMonth() + 1 // 1-12

      const { data: snapshots } = await supabase
        .from('wealth_snapshots')
        .select('id, year, month')
        .eq('user_id', user.id)
        .order('year', { ascending: true })
        .order('month', { ascending: true })

      if (!snapshots?.length) {
        setIncomeData([]); setNetWorthData([]); setExpenseData([])
        setNwBreakdown([]); setAllocation([]); setAllocationMonth('')
        setComparisonData([]); setSavingsData([])
        setLoading(false)
        return
      }

      const snapshotIds = snapshots.map(s => s.id)
      const [cashRes, assetsRes, debtsRes, earningsRes, investmentsRes, expensesRes] = await Promise.all([
        supabase.from('wealth_cash_accounts').select('snapshot_id, name, amount').in('snapshot_id', snapshotIds),
        supabase.from('wealth_assets').select('snapshot_id, name, amount, asset_class').in('snapshot_id', snapshotIds),
        supabase.from('wealth_debts').select('snapshot_id, amount').in('snapshot_id', snapshotIds),
        supabase.from('wealth_earnings').select('snapshot_id, amount').in('snapshot_id', snapshotIds),
        supabase.from('wealth_investments').select('snapshot_id, amount').in('snapshot_id', snapshotIds),
        supabase.from('expenses').select('date, amount, category'),
      ])

      // Build lookup maps
      const cashBySnap = new Map<string, number>()
      for (const r of (cashRes.data || []) as { snapshot_id: string; amount: number }[]) {
        cashBySnap.set(r.snapshot_id, (cashBySnap.get(r.snapshot_id) || 0) + Number(r.amount))
      }

      const assetsBySnap = new Map<string, number>()
      const assetsDetailBySnap = new Map<string, { name: string; amount: number; assetClass: string }[]>()
      for (const r of (assetsRes.data || []) as { snapshot_id: string; name: string; amount: number; asset_class?: string }[]) {
        assetsBySnap.set(r.snapshot_id, (assetsBySnap.get(r.snapshot_id) || 0) + Number(r.amount))
        const list = assetsDetailBySnap.get(r.snapshot_id) || []
        list.push({ name: r.name, amount: Number(r.amount), assetClass: r.asset_class || 'Other' })
        assetsDetailBySnap.set(r.snapshot_id, list)
      }

      const debtsBySnap = new Map<string, number>()
      for (const r of (debtsRes.data || []) as { snapshot_id: string; amount: number }[]) {
        debtsBySnap.set(r.snapshot_id, (debtsBySnap.get(r.snapshot_id) || 0) + Number(r.amount))
      }

      const earningsBySnap = new Map<string, number>()
      for (const r of (earningsRes.data || []) as { snapshot_id: string; amount: number }[]) {
        earningsBySnap.set(r.snapshot_id, (earningsBySnap.get(r.snapshot_id) || 0) + Number(r.amount))
      }

      const investmentsBySnap = new Map<string, number>()
      for (const r of (investmentsRes.data || []) as { snapshot_id: string; amount: number }[]) {
        investmentsBySnap.set(r.snapshot_id, (investmentsBySnap.get(r.snapshot_id) || 0) + Number(r.amount))
      }

      // ── Filter to completed & populated months ──
      const isCompleted = (y: number, m: number) => {
        if (m === 0) return true // "Start" (end of prev year) is always OK
        if (y < curYear) return true
        return y === curYear && m < curMonth
      }

      const hasData = (id: string) => {
        const c = cashBySnap.get(id) || 0
        const a = assetsBySnap.get(id) || 0
        const d = debtsBySnap.get(id) || 0
        return (c + a + d) > 0
      }

      const populated = snapshots.filter(s => isCompleted(s.year, s.month) && hasData(s.id))

      if (populated.length === 0) {
        setIncomeData([]); setNetWorthData([]); setExpenseData([])
        setNwBreakdown([]); setAllocation([]); setAllocationMonth('')
        setComparisonData([]); setSavingsData([])
        setLoading(false)
        return
      }

      // ── Build chart points ──
      const fmtMonth = (y: number, m: number) =>
        m === 0 ? `${y - 1}-12` : `${y}-${String(m).padStart(2, '0')}`

      const netWorthPts: ChartPoint[] = []
      const incomePts: ChartPoint[] = []
      const expensePts: ChartPoint[] = []
      const nwBkPts: NWBreakdownPoint[] = []
      const savPts: SavingsPoint[] = []

      let prev: typeof populated[0] | null = null
      for (const snap of populated) {
        const cash = cashBySnap.get(snap.id) || 0
        const assets = assetsBySnap.get(snap.id) || 0
        const debts = debtsBySnap.get(snap.id) || 0
        const earnings = earningsBySnap.get(snap.id) || 0
        const nw = cash + assets - debts
        const label = fmtMonth(snap.year, snap.month)

        netWorthPts.push({ month: label, value: nw })
        nwBkPts.push({ month: label, cash, assets })

        if (snap.month >= 1 && prev) {
          incomePts.push({ month: label, value: earnings })
          const pCash = cashBySnap.get(prev.id) || 0
          const pAssets = assetsBySnap.get(prev.id) || 0
          const pDebts = debtsBySnap.get(prev.id) || 0
          const pNw = pCash + pAssets - pDebts
          const deltaNw = nw - pNw
          const deltaA = assets - pAssets
          const inv = investmentsBySnap.get(snap.id) || 0
          const appreciation = deltaA - inv
          const implied = earnings - deltaNw + appreciation

          expensePts.push({ month: label, value: implied })

          if (earnings > 0) {
            const saved = earnings - implied
            savPts.push({ month: label, rate: Math.round((saved / earnings) * 100) })
          }
        }
        prev = snap
      }

      setNetWorthData(netWorthPts)
      setIncomeData(incomePts)
      setExpenseData(expensePts)
      setNwBreakdown(nwBkPts)
      setSavingsData(savPts)

      // ── Tracked expenses (INCLUDING rent) by month ──
      const trackedByMonth = new Map<string, number>()
      for (const r of (expensesRes.data || []) as { date: string; amount: number; category: string }[]) {
        const [y, m] = r.date.split('-')
        const key = `${y}-${m}`
        trackedByMonth.set(key, (trackedByMonth.get(key) || 0) + Number(r.amount))
      }

      setComparisonData(expensePts.map(wp => ({
        month: wp.month,
        implied: wp.value,
        tracked: trackedByMonth.get(wp.month) || 0,
      })))

      // ── Allocation: last populated completed snapshot ──
      const lastSnap = populated[populated.length - 1]
      const alloCash = cashBySnap.get(lastSnap.id) || 0
      const alloAssets = assetsDetailBySnap.get(lastSnap.id) || []
      const alloTotal = alloCash + alloAssets.reduce((s, a) => s + a.amount, 0)

      if (alloTotal > 0) {
        setAllocationMonth(fmtMonth(lastSnap.year, lastSnap.month))
        const groups: AllocationGroup[] = []
        if (alloCash > 0) {
          groups.push({ label: 'Cash', amount: alloCash, pct: (alloCash / alloTotal) * 100, assets: [] })
        }
        const byClass = new Map<string, { amount: number; items: { name: string; amount: number }[] }>()
        for (const a of alloAssets) {
          const cls = (a.assetClass || 'Other').trim() || 'Other'
          const g = byClass.get(cls) || { amount: 0, items: [] }
          g.amount += a.amount
          g.items.push({ name: a.name, amount: a.amount })
          byClass.set(cls, g)
        }
        for (const [cls, { amount, items }] of Array.from(byClass.entries()).sort((a, b) => b[1].amount - a[1].amount)) {
          groups.push({
            label: cls,
            amount,
            pct: (amount / alloTotal) * 100,
            assets: items
              .sort((a, b) => b.amount - a.amount)
              .map(a => ({ name: a.name, amount: a.amount, pct: (a.amount / alloTotal) * 100 })),
          })
        }
        setAllocation(groups.sort((a, b) => b.amount - a.amount))
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

  /* ─── Derived ─── */

  const latestNw = netWorthData.length > 0 ? netWorthData[netWorthData.length - 1] : null
  const prevNw = netWorthData.length > 1 ? netWorthData[netWorthData.length - 2] : null
  const nwChange = latestNw && prevNw ? latestNw.value - prevNw.value : null
  const nwChangePct = nwChange !== null && prevNw && prevNw.value !== 0
    ? (nwChange / Math.abs(prevNw.value)) * 100
    : null

  const chartH = 140

  /* ─── Loading ─── */

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-8 bg-zinc-100 dark:bg-zinc-800 rounded-xl w-48 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3].map(i => <div key={i} className="h-48 bg-zinc-100 dark:bg-zinc-800 rounded-2xl" />)}
        </div>
        <div className="h-64 bg-zinc-100 dark:bg-zinc-800 rounded-2xl animate-pulse" />
      </div>
    )
  }

  /* ─── Empty ─── */

  const hasAny = netWorthData.length > 0 || allocation.length > 0
  if (!hasAny) {
    return (
      <div className="text-center py-16">
        <p className="text-zinc-500 dark:text-zinc-400">Add wealth data in the Tracker tab to see your dashboard.</p>
      </div>
    )
  }

  /* ─── Render ─── */

  return (
    <div className="space-y-10">

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 dark:from-zinc-100 dark:to-zinc-200 rounded-2xl p-5 text-white dark:text-zinc-900">
          <p className="text-xs font-medium opacity-70 uppercase tracking-wider">Net Worth</p>
          <p className="text-2xl font-semibold mt-1 tabular-nums">{latestNw ? formatCurrency(latestNw.value) : '—'}</p>
          {nwChange !== null && (
            <p className={`text-xs mt-1 ${nwChange >= 0 ? 'text-green-300 dark:text-green-600' : 'text-red-300 dark:text-red-600'}`}>
              {nwChange >= 0 ? '+' : ''}{formatCurrency(nwChange)}
              {nwChangePct !== null && ` (${nwChangePct >= 0 ? '+' : ''}${nwChangePct.toFixed(1)}%)`}
              {' '}vs prev month
            </p>
          )}
          {latestNw && <p className="text-xs opacity-50 mt-1">as of {latestNw.month}</p>}
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Income</p>
          <p className="text-2xl font-semibold text-purple-600 dark:text-purple-400 mt-1 tabular-nums">
            {incomeData.length > 0 ? formatCurrency(incomeData[incomeData.length - 1].value) : '—'}
          </p>
          {incomeData.length > 0 && <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">{incomeData[incomeData.length - 1].month}</p>}
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Implied Spending</p>
          <p className="text-2xl font-semibold text-red-600 dark:text-red-400 mt-1 tabular-nums">
            {expenseData.length > 0 ? formatCurrency(expenseData[expenseData.length - 1].value) : '—'}
          </p>
          {expenseData.length > 0 && <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">{expenseData[expenseData.length - 1].month}</p>}
        </div>
      </div>

      {/* ── Evolution: 3 mini charts ── */}
      <div>
        <h2 className="text-lg font-medium text-zinc-800 dark:text-zinc-200 mb-4">Evolution</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Income */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Income</p>
            {incomeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={chartH}>
                <AreaChart data={incomeData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                  <defs>
                    <linearGradient id="wd-inc-g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#71717a" />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="value" name="Income" stroke="#8b5cf6" fill="url(#wd-inc-g)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-zinc-400 dark:text-zinc-500 py-8 text-center">No data</p>}
          </div>

          {/* Implied Expenses */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Expenses (implied)</p>
            {expenseData.length > 0 ? (
              <ResponsiveContainer width="100%" height={chartH}>
                <AreaChart data={expenseData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                  <defs>
                    <linearGradient id="wd-exp-g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#71717a" />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="value" name="Implied" stroke="#ef4444" fill="url(#wd-exp-g)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-zinc-400 dark:text-zinc-500 py-8 text-center">No data</p>}
          </div>

          {/* Net Worth */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-3">Net Worth</p>
            {netWorthData.length > 0 ? (
              <ResponsiveContainer width="100%" height={chartH}>
                <AreaChart data={netWorthData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                  <defs>
                    <linearGradient id="wd-nw-g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#71717a" />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="value" name="Net Worth" stroke="#22c55e" fill="url(#wd-nw-g)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-zinc-400 dark:text-zinc-500 py-8 text-center">No data</p>}
          </div>
        </div>
      </div>

      {/* ── Net Worth Breakdown (stacked area) ── */}
      {nwBreakdown.length > 1 && (
        <div>
          <h2 className="text-lg font-medium text-zinc-800 dark:text-zinc-200 mb-4">Net Worth Breakdown</h2>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={nwBreakdown} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                <defs>
                  <linearGradient id="wd-bk-cash" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="wd-bk-assets" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#71717a" />
                <YAxis hide />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Area type="monotone" dataKey="cash" name="Cash" stackId="1" stroke="#3b82f6" fill="url(#wd-bk-cash)" strokeWidth={1.5} />
                <Area type="monotone" dataKey="assets" name="Investments" stackId="1" stroke="#22c55e" fill="url(#wd-bk-assets)" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Expense Comparison: Tracked (incl. rent) vs Implied ── */}
      {comparisonData.length > 0 && (
        <div>
          <h2 className="text-lg font-medium text-zinc-800 dark:text-zinc-200 mb-1">Expense Comparison</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            Tracked = logged expenses (incl. rent). Implied = Income &minus; &Delta; Net Worth + Asset appreciation.
          </p>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
            <ResponsiveContainer width="100%" height={chartH + 40}>
              <BarChart data={comparisonData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#71717a" />
                <YAxis hide />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Bar dataKey="implied" name="Implied" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="tracked" name="Tracked" fill="#71717a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Savings Rate ── */}
      {savingsData.length > 0 && (
        <div>
          <h2 className="text-lg font-medium text-zinc-800 dark:text-zinc-200 mb-1">Savings Rate</h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
            Percentage of income retained each month (higher is better).
          </p>
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4">
            <ResponsiveContainer width="100%" height={chartH + 20}>
              <BarChart data={savingsData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200 dark:stroke-zinc-700" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#71717a" />
                <YAxis hide />
                <Tooltip content={<PercentTooltip />} />
                <Bar dataKey="rate" name="Savings Rate" radius={[4, 4, 0, 0]}>
                  {savingsData.map((d, i) => (
                    <Cell key={i} fill={d.rate >= 0 ? '#10b981' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Allocation (donut + table) ── */}
      <div>
        <h2 className="text-lg font-medium text-zinc-800 dark:text-zinc-200 mb-4">
          Allocation {allocationMonth && <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">({allocationMonth})</span>}
        </h2>
        {allocation.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Donut chart */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={allocation}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="amount"
                    nameKey="label"
                  >
                    {allocation.map((g, i) => (
                      <Cell key={g.label} fill={ALLOC_COLORS[i % ALLOC_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Table */}
            <div className="md:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Asset Class</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Amount</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider w-20">%</th>
                  </tr>
                </thead>
                <tbody>
                  {allocation.map((group, gi) => {
                    const isCollapsed = collapsedClasses.has(group.label)
                    const hasChildren = group.assets.length > 0
                    return (
                      <React.Fragment key={group.label}>
                        <tr className="border-b border-zinc-50 dark:border-zinc-800/50 bg-zinc-50/50 dark:bg-zinc-800/30">
                          <td className="py-2.5 px-4 font-medium text-zinc-900 dark:text-zinc-100">
                            <button
                              type="button"
                              onClick={() => setCollapsedClasses(prev => {
                                const next = new Set(prev)
                                if (next.has(group.label)) next.delete(group.label)
                                else next.add(group.label)
                                return next
                              })}
                              className="flex items-center gap-2 text-left hover:opacity-80"
                              aria-expanded={!isCollapsed}
                            >
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ALLOC_COLORS[gi % ALLOC_COLORS.length] }} />
                              {hasChildren && <span className="text-zinc-400 text-xs">{isCollapsed ? '▶' : '▼'}</span>}
                              {group.label}
                            </button>
                          </td>
                          <td className="py-2.5 px-4 text-right tabular-nums text-zinc-700 dark:text-zinc-300">{formatCurrency(group.amount)}</td>
                          <td className="py-2.5 px-4 text-right tabular-nums text-zinc-600 dark:text-zinc-400">{group.pct.toFixed(1)}%</td>
                        </tr>
                        {hasChildren && !isCollapsed && group.assets.map(a => (
                          <tr key={`${group.label}-${a.name}`} className="border-b border-zinc-50 dark:border-zinc-800/50 last:border-0">
                            <td className="py-2 px-4 pl-10 text-zinc-600 dark:text-zinc-400 text-sm">{a.name}</td>
                            <td className="py-2 px-4 text-right tabular-nums text-zinc-700 dark:text-zinc-300 text-sm">{formatCurrency(a.amount)}</td>
                            <td className="py-2 px-4 text-right tabular-nums text-zinc-600 dark:text-zinc-400 text-sm">{a.pct.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 px-4 pb-3 pt-2">Cash + all assets = 100% (debts excluded)</p>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Add cash and assets in the Tracker to see your allocation.</p>
          </div>
        )}
      </div>
    </div>
  )
}
