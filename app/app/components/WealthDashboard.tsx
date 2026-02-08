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

/* ─── Tooltips ─── */

function ChartTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { value: number; name?: string; dataKey?: string; color?: string; fill?: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm px-4 py-2.5 shadow-xl text-left ring-1 ring-zinc-900/5 dark:ring-white/5">
      {label && <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">{label}</p>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2.5 py-0.5">
          <span className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white dark:ring-zinc-900 shadow-sm" style={{ backgroundColor: entry.color || entry.fill }} />
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{entry.name || entry.dataKey}</span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100 ml-auto pl-3 tabular-nums text-sm">
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
    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm px-4 py-2.5 shadow-xl text-left ring-1 ring-zinc-900/5 dark:ring-white/5">
      {label && <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">{label}</p>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2.5 py-0.5">
          <span className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white dark:ring-zinc-900 shadow-sm" style={{ backgroundColor: entry.color || entry.fill }} />
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{entry.name}</span>
          <span className="font-semibold text-zinc-900 dark:text-zinc-100 ml-auto pl-3 tabular-nums text-sm">
            {Number(entry.value).toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  )
}

// Tooltip for 100% stacked bar: shows both % and absolute values
function BreakdownTooltip({ active, payload, label }: {
  active?: boolean
  payload?: { value: number; name?: string; dataKey?: string; color?: string; fill?: string; payload?: { cash?: number; assets?: number } }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  const p = payload[0]?.payload as { cash?: number; assets?: number } | undefined
  return (
    <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm px-4 py-2.5 shadow-xl text-left ring-1 ring-zinc-900/5 dark:ring-white/5 min-w-[180px]">
      {label && <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-2">{label}</p>}
      {payload.map((entry, i) => {
        const abs = p && (entry.dataKey === 'cashPct' ? p.cash : p.assets)
        return (
          <div key={i} className="flex items-center justify-between gap-4 py-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white dark:ring-zinc-900 shadow-sm" style={{ backgroundColor: entry.color || entry.fill }} />
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{entry.name || entry.dataKey}</span>
            </div>
            <div className="text-right">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums text-sm">{Number(entry.value).toFixed(1)}%</span>
              {abs != null && <span className="block text-[10px] text-zinc-400 dark:text-zinc-500 tabular-nums">{formatCurrency(abs)}</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ─── Types ─── */

type ChartPoint = { month: string; value: number }
type ComparisonPoint = { month: string; implied: number; tracked: number }
type SavingsPoint = { month: string; rate: number }
type NWBreakdownPoint = { month: string; cash: number; assets: number }
type NWBreakdownPctPoint = { month: string; cashPct: number; assetsPct: number; cash: number; assets: number }
type AllocationGroup = {
  label: string
  amount: number
  pct: number
  assets: { name: string; amount: number; pct: number }[]
}

const ALLOC_COLORS = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899',
  '#06b6d4', '#84cc16', '#14b8a6', '#6366f1', '#f43f5e',
]

/* ─── Component ─── */

export function WealthDashboard() {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [incomeData, setIncomeData] = useState<ChartPoint[]>([])
  const [expenseData, setExpenseData] = useState<ChartPoint[]>([])
  const [netWorthData, setNetWorthData] = useState<ChartPoint[]>([])
  const [nwBreakdown, setNwBreakdown] = useState<NWBreakdownPoint[]>([])
  const [nwBreakdownPct, setNwBreakdownPct] = useState<NWBreakdownPctPoint[]>([])
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

      const now = new Date()
      const curYear = now.getFullYear()
      const curMonth = now.getMonth() + 1

      const { data: snapshots } = await supabase
        .from('wealth_snapshots')
        .select('id, year, month')
        .eq('user_id', user.id)
        .order('year', { ascending: true })
        .order('month', { ascending: true })

      if (!snapshots?.length) {
        setIncomeData([]); setNetWorthData([]); setExpenseData([])
        setNwBreakdown([]); setNwBreakdownPct([]); setAllocation([]); setAllocationMonth('')
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
      const earningsBySnap = new Map<string, number>()
      const investmentsBySnap = new Map<string, number>()
      for (const r of (debtsRes.data || []) as { snapshot_id: string; amount: number }[]) {
        debtsBySnap.set(r.snapshot_id, (debtsBySnap.get(r.snapshot_id) || 0) + Number(r.amount))
      }
      for (const r of (earningsRes.data || []) as { snapshot_id: string; amount: number }[]) {
        earningsBySnap.set(r.snapshot_id, (earningsBySnap.get(r.snapshot_id) || 0) + Number(r.amount))
      }
      for (const r of (investmentsRes.data || []) as { snapshot_id: string; amount: number }[]) {
        investmentsBySnap.set(r.snapshot_id, (investmentsBySnap.get(r.snapshot_id) || 0) + Number(r.amount))
      }

      const isCompleted = (y: number, m: number) => {
        if (m === 0) return true
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
        setNwBreakdown([]); setNwBreakdownPct([]); setAllocation([]); setAllocationMonth('')
        setComparisonData([]); setSavingsData([])
        setLoading(false)
        return
      }

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

      // 100% stacked bar data: cash% + assets% = 100 per month
      const pctPts: NWBreakdownPctPoint[] = nwBkPts.map(p => {
        const total = p.cash + p.assets
        if (total <= 0) return { ...p, cashPct: 50, assetsPct: 50 }
        return {
          month: p.month,
          cashPct: Math.round((p.cash / total) * 1000) / 10,
          assetsPct: Math.round((p.assets / total) * 1000) / 10,
          cash: p.cash,
          assets: p.assets,
        }
      })
      setNwBreakdownPct(pctPts)

      const trackedByMonth = new Map<string, number>()
      for (const r of (expensesRes.data || []) as { date: string; amount: number; category: string }[]) {
        const [y, m] = r.date.split('-')
        trackedByMonth.set(`${y}-${m}`, (trackedByMonth.get(`${y}-${m}`) || 0) + Number(r.amount))
      }

      setComparisonData(expensePts.map(wp => ({
        month: wp.month,
        implied: wp.value,
        tracked: trackedByMonth.get(wp.month) || 0,
      })))

      setSavingsData(savPts)

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
            assets: items.sort((a, b) => b.amount - a.amount).map(a => ({ name: a.name, amount: a.amount, pct: (a.amount / alloTotal) * 100 })),
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

  const latestNw = netWorthData.length > 0 ? netWorthData[netWorthData.length - 1] : null
  const prevNw = netWorthData.length > 1 ? netWorthData[netWorthData.length - 2] : null
  const nwChange = latestNw && prevNw ? latestNw.value - prevNw.value : null
  const nwChangePct = nwChange !== null && prevNw && prevNw.value !== 0
    ? (nwChange / Math.abs(prevNw.value)) * 100
    : null

  const chartH = 160

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-36 rounded-3xl bg-zinc-100 dark:bg-zinc-800/60" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-52 rounded-2xl bg-zinc-100 dark:bg-zinc-800/60" />
          ))}
        </div>
        <div className="h-72 rounded-2xl bg-zinc-100 dark:bg-zinc-800/60" />
      </div>
    )
  }

  const hasAny = netWorthData.length > 0 || allocation.length > 0
  if (!hasAny) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <div className="w-20 h-20 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-zinc-400 dark:text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">No dashboard data yet</h2>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-sm">Add wealth data in the Tracker tab to see your overview here.</p>
      </div>
    )
  }

  return (
    <div className="space-y-12 pb-4">

      {/* ── Hero: Net Worth ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 dark:from-zinc-100 dark:via-zinc-200 dark:to-zinc-100 p-8 sm:p-10 shadow-xl shadow-zinc-900/10 dark:shadow-none ring-1 ring-zinc-900/5 dark:ring-zinc-800/50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.15),transparent)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.08),transparent)]" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 mb-2">Net Worth</p>
          <p className="text-4xl sm:text-5xl font-bold tabular-nums text-white dark:text-zinc-900 tracking-tight">
            {latestNw ? formatCurrency(latestNw.value) : '—'}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1">
            {nwChange !== null && (
              <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${nwChange >= 0 ? 'text-emerald-400 dark:text-emerald-600' : 'text-red-400 dark:text-red-600'}`}>
                {nwChange >= 0 ? '↑' : '↓'} {nwChange >= 0 ? '+' : ''}{formatCurrency(nwChange)}
                {nwChangePct !== null && (
                  <span className="opacity-90">({nwChangePct >= 0 ? '+' : ''}{nwChangePct.toFixed(1)}%)</span>
                )}
                <span className="text-zinc-500 dark:text-zinc-500 font-normal">vs previous</span>
              </span>
            )}
            {latestNw && (
              <span className="text-sm text-zinc-500 dark:text-zinc-500">as of {latestNw.month}</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Secondary metrics ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: 'Income',
            value: incomeData.length > 0 ? incomeData[incomeData.length - 1].value : null,
            sub: incomeData.length > 0 ? incomeData[incomeData.length - 1].month : null,
            accent: 'text-violet-600 dark:text-violet-400',
            icon: (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
          },
          {
            label: 'Implied Spending',
            value: expenseData.length > 0 ? expenseData[expenseData.length - 1].value : null,
            sub: expenseData.length > 0 ? expenseData[expenseData.length - 1].month : null,
            accent: 'text-red-600 dark:text-red-400',
            icon: (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            ),
          },
          {
            label: 'Savings Rate',
            value: savingsData.length > 0 ? savingsData[savingsData.length - 1].rate : null,
            sub: savingsData.length > 0 ? savingsData[savingsData.length - 1].month : null,
            accent: 'text-emerald-600 dark:text-emerald-400',
            suffix: '%',
            icon: (
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            ),
          },
        ].map((m, i) => (
          <div
            key={m.label}
            className="group rounded-2xl bg-white dark:bg-zinc-900/80 p-5 shadow-lg shadow-zinc-900/5 dark:shadow-none ring-1 ring-zinc-200/80 dark:ring-zinc-800/80 hover:shadow-xl hover:ring-zinc-300/60 dark:hover:ring-zinc-700/60 transition-all duration-300"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">{m.label}</p>
                <p className={`mt-1.5 text-2xl font-bold tabular-nums ${m.accent}`}>
                  {m.value != null ? (m.suffix ? `${m.value}${m.suffix}` : formatCurrency(m.value)) : '—'}
                </p>
                {m.sub && <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">{m.sub}</p>}
              </div>
              <div className={`rounded-xl p-2 ${m.accent} opacity-60 group-hover:opacity-100 transition-opacity`}>
                {m.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Evolution charts ── */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-5 border-l-2 border-violet-500/60 dark:border-violet-400/60 pl-3">
          Evolution
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {[
            { data: incomeData, label: 'Income', color: '#8b5cf6', id: 'inc' },
            { data: expenseData, label: 'Expenses (implied)', color: '#ef4444', id: 'exp' },
            { data: netWorthData, label: 'Net Worth', color: '#10b981', id: 'nw' },
          ].map(({ data, label, color, id }) => (
            <div
              key={id}
              className="rounded-2xl bg-white dark:bg-zinc-900/80 p-5 shadow-lg shadow-zinc-900/5 dark:shadow-none ring-1 ring-zinc-200/80 dark:ring-zinc-800/80 hover:shadow-xl transition-all duration-300"
            >
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-4">{label}</p>
              {data.length > 0 ? (
                <ResponsiveContainer width="100%" height={chartH}>
                  <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                    <defs>
                      <linearGradient id={`wd-${id}-g`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200/60 dark:stroke-zinc-700/60" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#71717a" />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="value" name={label} stroke={color} fill={`url(#wd-${id}-g)`} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[140px] flex items-center justify-center text-sm text-zinc-400 dark:text-zinc-500">No data</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── Net Worth Breakdown: 100% stacked bar ── */}
      {nwBreakdownPct.length > 1 && (
        <section>
          <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1 border-l-2 border-blue-500/60 dark:border-blue-400/60 pl-3">
            Net Worth Composition
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5 pl-4">Share of cash vs investments over time (each bar = 100%)</p>
          <div className="rounded-2xl bg-white dark:bg-zinc-900/80 p-5 shadow-lg shadow-zinc-900/5 dark:shadow-none ring-1 ring-zinc-200/80 dark:ring-zinc-800/80">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={nwBreakdownPct} margin={{ top: 12, right: 12, left: 12, bottom: 12 }} barCategoryGap="12%">
                <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200/60 dark:stroke-zinc-700/60" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#71717a" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="#71717a" unit="%" />
                <Tooltip content={<BreakdownTooltip />} />
                <Legend />
                <Bar dataKey="cashPct" name="Cash" stackId="nw" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="assetsPct" name="Investments" stackId="nw" fill="#10b981" radius={[0, 0, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* ── Two-column: Expense Comparison + Savings Rate ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {comparisonData.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1 border-l-2 border-amber-500/60 dark:border-amber-400/60 pl-3">
              Expense Comparison
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5 pl-4">Tracked (incl. rent) vs implied from wealth</p>
            <div className="rounded-2xl bg-white dark:bg-zinc-900/80 p-5 shadow-lg shadow-zinc-900/5 dark:shadow-none ring-1 ring-zinc-200/80 dark:ring-zinc-800/80">
              <ResponsiveContainer width="100%" height={chartH + 30}>
                <BarChart data={comparisonData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200/60 dark:stroke-zinc-700/60" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#71717a" />
                  <YAxis hide />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend />
                  <Bar dataKey="implied" name="Implied" fill="#ef4444" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="tracked" name="Tracked" fill="#71717a" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {savingsData.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1 border-l-2 border-emerald-500/60 dark:border-emerald-400/60 pl-3">
              Savings Rate
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5 pl-4">% of income retained each month</p>
            <div className="rounded-2xl bg-white dark:bg-zinc-900/80 p-5 shadow-lg shadow-zinc-900/5 dark:shadow-none ring-1 ring-zinc-200/80 dark:ring-zinc-800/80">
              <ResponsiveContainer width="100%" height={chartH + 30}>
                <BarChart data={savingsData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-zinc-200/60 dark:stroke-zinc-700/60" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#71717a" />
                  <YAxis hide />
                  <Tooltip content={<PercentTooltip />} />
                  <Bar dataKey="rate" name="Savings %" radius={[6, 6, 0, 0]}>
                    {savingsData.map((d, i) => (
                      <Cell key={i} fill={d.rate >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}
      </div>

      {/* ── Allocation ── */}
      <section>
        <h2 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1 border-l-2 border-rose-500/60 dark:border-rose-400/60 pl-3">
          Asset Allocation
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5 pl-4">
          {allocationMonth ? `As of ${allocationMonth} — Cash + assets = 100%` : 'Add cash and assets in the Tracker to see allocation.'}
        </p>
        {allocation.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 rounded-2xl bg-white dark:bg-zinc-900/80 p-6 shadow-lg shadow-zinc-900/5 dark:shadow-none ring-1 ring-zinc-200/80 dark:ring-zinc-800/80 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={allocation}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="amount"
                    nameKey="label"
                  >
                    {allocation.map((g, i) => (
                      <Cell key={g.label} fill={ALLOC_COLORS[i % ALLOC_COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="lg:col-span-8 rounded-2xl bg-white dark:bg-zinc-900/80 overflow-hidden shadow-lg shadow-zinc-900/5 dark:shadow-none ring-1 ring-zinc-200/80 dark:ring-zinc-800/80">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-zinc-100 dark:border-zinc-800">
                    <th className="text-left py-4 px-5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Asset Class</th>
                    <th className="text-right py-4 px-5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Amount</th>
                    <th className="text-right py-4 px-5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider w-24">%</th>
                  </tr>
                </thead>
                <tbody>
                  {allocation.map((group, gi) => {
                    const isCollapsed = collapsedClasses.has(group.label)
                    const hasChildren = group.assets.length > 0
                    return (
                      <React.Fragment key={group.label}>
                        <tr className="border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                          <td className="py-3 px-5">
                            <button
                              type="button"
                              onClick={() => setCollapsedClasses(prev => {
                                const next = new Set(prev)
                                if (next.has(group.label)) next.delete(group.label)
                                else next.add(group.label)
                                return next
                              })}
                              className="flex items-center gap-2.5 text-left font-medium text-zinc-900 dark:text-zinc-100 hover:opacity-80"
                              aria-expanded={!isCollapsed}
                            >
                              <span className="w-3 h-3 rounded-full shrink-0 ring-2 ring-white dark:ring-zinc-900 shadow-sm" style={{ backgroundColor: ALLOC_COLORS[gi % ALLOC_COLORS.length] }} />
                              {hasChildren && <span className="text-zinc-400 text-xs">{isCollapsed ? '▶' : '▼'}</span>}
                              {group.label}
                            </button>
                          </td>
                          <td className="py-3 px-5 text-right tabular-nums font-medium text-zinc-700 dark:text-zinc-300">{formatCurrency(group.amount)}</td>
                          <td className="py-3 px-5 text-right tabular-nums text-zinc-600 dark:text-zinc-400">{group.pct.toFixed(1)}%</td>
                        </tr>
                        {hasChildren && !isCollapsed && group.assets.map(a => (
                          <tr key={`${group.label}-${a.name}`} className="border-b border-zinc-50 dark:border-zinc-800/50 bg-zinc-50/30 dark:bg-zinc-800/20">
                            <td className="py-2.5 px-5 pl-12 text-zinc-600 dark:text-zinc-400 text-sm">{a.name}</td>
                            <td className="py-2.5 px-5 text-right tabular-nums text-zinc-700 dark:text-zinc-300 text-sm">{formatCurrency(a.amount)}</td>
                            <td className="py-2.5 px-5 text-right tabular-nums text-zinc-600 dark:text-zinc-400 text-sm">{a.pct.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-white dark:bg-zinc-900/80 p-12 text-center shadow-lg shadow-zinc-900/5 dark:shadow-none ring-1 ring-zinc-200/80 dark:ring-zinc-800/80">
            <p className="text-zinc-500 dark:text-zinc-400">Add cash and assets in the Tracker to see your allocation.</p>
          </div>
        )}
      </section>
    </div>
  )
}
