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
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

/* ═══════════════════════════════════════════
   DESIGN SYSTEM – Constrained, intentional
   ═══════════════════════════════════════════ */

const PALETTE = {
  nw:      '#18181b', // Net Worth — zinc 900 (the hero)
  income:  '#7c3aed', // Violet 600
  expense: '#e11d48',  // Rose 600
  savings: '#059669', // Emerald 600
  cash:    '#2563eb', // Blue 600
  invest:  '#10b981', // Emerald 500
  tracked: '#a1a1aa', // Zinc 400
}

const ALLOC_COLORS = ['#2563eb', '#10b981', '#7c3aed', '#f59e0b', '#e11d48', '#06b6d4', '#84cc16', '#6366f1']

/* Tooltip — frosted glass, minimal */
function Tip({ active, payload, label }: {
  active?: boolean
  payload?: { value: number; name?: string; dataKey?: string; color?: string; fill?: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-2xl bg-white/90 dark:bg-zinc-800/90 backdrop-blur-xl px-4 py-3 shadow-2xl shadow-black/10 dark:shadow-black/30 border border-white/20 dark:border-zinc-700/30">
      {label && <p className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 mb-1.5 tracking-wide">{label}</p>}
      {payload.map((e, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="w-[7px] h-[7px] rounded-full" style={{ backgroundColor: e.color || e.fill }} />
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{e.name || e.dataKey}</span>
          <span className="font-semibold text-[13px] text-zinc-900 dark:text-zinc-100 ml-auto pl-4 tabular-nums">
            {formatCurrency(Number(e.value) || 0)}
          </span>
        </div>
      ))}
    </div>
  )
}

function PctTip({ active, payload, label }: {
  active?: boolean
  payload?: { value: number; name?: string; color?: string; fill?: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-2xl bg-white/90 dark:bg-zinc-800/90 backdrop-blur-xl px-4 py-3 shadow-2xl shadow-black/10 dark:shadow-black/30 border border-white/20 dark:border-zinc-700/30">
      {label && <p className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500 mb-1.5 tracking-wide">{label}</p>}
      {payload.map((e, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="w-[7px] h-[7px] rounded-full" style={{ backgroundColor: e.color || e.fill }} />
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{e.name}</span>
          <span className="font-semibold text-[13px] text-zinc-900 dark:text-zinc-100 ml-auto pl-4 tabular-nums">
            {Number(e.value).toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════
   DATA TYPES
   ═══════════════════════════════════════════ */

type ChartPoint = { month: string; value: number }
type ComparisonPoint = { month: string; implied: number; tracked: number }
type SavingsPoint = { month: string; rate: number }
type NWBreakdownPoint = { month: string; cash: number; assets: number }
type AllocationGroup = {
  label: string; amount: number; pct: number
  assets: { name: string; amount: number; pct: number }[]
}

/* ═══════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════ */

export function WealthDashboard() {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [incomeData, setIncomeData] = useState<ChartPoint[]>([])
  const [expenseData, setExpenseData] = useState<ChartPoint[]>([])
  const [netWorthData, setNetWorthData] = useState<ChartPoint[]>([])
  const [nwBreakdown, setNwBreakdown] = useState<NWBreakdownPoint[]>([])
  const [allocation, setAllocation] = useState<AllocationGroup[]>([])
  const [allocationMonth, setAllocationMonth] = useState('')
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const [comparisonData, setComparisonData] = useState<ComparisonPoint[]>([])
  const [savingsData, setSavingsData] = useState<SavingsPoint[]>([])

  /* ── Data loading (unchanged logic) ── */
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
        .from('wealth_snapshots').select('id, year, month').eq('user_id', user.id)
        .order('year', { ascending: true }).order('month', { ascending: true })

      if (!snapshots?.length) {
        setIncomeData([]); setNetWorthData([]); setExpenseData([])
        setNwBreakdown([]); setAllocation([]); setAllocationMonth('')
        setComparisonData([]); setSavingsData([])
        setLoading(false); return
      }

      const ids = snapshots.map(s => s.id)
      const [cashRes, assetsRes, debtsRes, earningsRes, investmentsRes, expensesRes] = await Promise.all([
        supabase.from('wealth_cash_accounts').select('snapshot_id, name, amount').in('snapshot_id', ids),
        supabase.from('wealth_assets').select('snapshot_id, name, amount, asset_class').in('snapshot_id', ids),
        supabase.from('wealth_debts').select('snapshot_id, amount').in('snapshot_id', ids),
        supabase.from('wealth_earnings').select('snapshot_id, amount').in('snapshot_id', ids),
        supabase.from('wealth_investments').select('snapshot_id, amount').in('snapshot_id', ids),
        supabase.from('expenses').select('date, amount, category'),
      ])

      const sum = (arr: { snapshot_id: string; amount: number }[]) => {
        const m = new Map<string, number>()
        arr.forEach(r => m.set(r.snapshot_id, (m.get(r.snapshot_id) || 0) + Number(r.amount)))
        return m
      }
      const cashBySnap = sum((cashRes.data || []) as { snapshot_id: string; amount: number }[])
      const assetsBySnap = sum((assetsRes.data || []) as { snapshot_id: string; amount: number }[])
      const debtsBySnap = sum((debtsRes.data || []) as { snapshot_id: string; amount: number }[])
      const earningsBySnap = sum((earningsRes.data || []) as { snapshot_id: string; amount: number }[])
      const investmentsBySnap = sum((investmentsRes.data || []) as { snapshot_id: string; amount: number }[])

      const assetsDetailBySnap = new Map<string, { name: string; amount: number; assetClass: string }[]>()
      for (const r of (assetsRes.data || []) as { snapshot_id: string; name: string; amount: number; asset_class?: string }[]) {
        const list = assetsDetailBySnap.get(r.snapshot_id) || []
        list.push({ name: r.name, amount: Number(r.amount), assetClass: r.asset_class || 'Other' })
        assetsDetailBySnap.set(r.snapshot_id, list)
      }

      const isCompleted = (y: number, m: number) => m === 0 || y < curYear || (y === curYear && m < curMonth)
      const hasData = (id: string) => (cashBySnap.get(id) || 0) + (assetsBySnap.get(id) || 0) + (debtsBySnap.get(id) || 0) > 0
      const populated = snapshots.filter(s => isCompleted(s.year, s.month) && hasData(s.id))

      if (!populated.length) {
        setIncomeData([]); setNetWorthData([]); setExpenseData([])
        setNwBreakdown([]); setAllocation([]); setAllocationMonth('')
        setComparisonData([]); setSavingsData([])
        setLoading(false); return
      }

      const fmt = (y: number, m: number) => m === 0 ? `${y - 1}-12` : `${y}-${String(m).padStart(2, '0')}`

      const nwPts: ChartPoint[] = [], incPts: ChartPoint[] = [], expPts: ChartPoint[] = []
      const bkPts: NWBreakdownPoint[] = [], savPts: SavingsPoint[] = []
      let prev: typeof populated[0] | null = null

      for (const snap of populated) {
        const c = cashBySnap.get(snap.id) || 0, a = assetsBySnap.get(snap.id) || 0
        const d = debtsBySnap.get(snap.id) || 0, e = earningsBySnap.get(snap.id) || 0
        const nw = c + a - d, lbl = fmt(snap.year, snap.month)
        nwPts.push({ month: lbl, value: nw })
        bkPts.push({ month: lbl, cash: c, assets: a })
        if (snap.month >= 1 && prev) {
          incPts.push({ month: lbl, value: e })
          const pNw = (cashBySnap.get(prev.id) || 0) + (assetsBySnap.get(prev.id) || 0) - (debtsBySnap.get(prev.id) || 0)
          const deltaA = a - (assetsBySnap.get(prev.id) || 0)
          const inv = investmentsBySnap.get(snap.id) || 0
          const implied = e - (nw - pNw) + (deltaA - inv)
          expPts.push({ month: lbl, value: implied })
          if (e > 0) savPts.push({ month: lbl, rate: Math.round(((e - implied) / e) * 100) })
        }
        prev = snap
      }

      setNetWorthData(nwPts); setIncomeData(incPts); setExpenseData(expPts)
      setNwBreakdown(bkPts); setSavingsData(savPts)

      const trackedByMonth = new Map<string, number>()
      for (const r of (expensesRes.data || []) as { date: string; amount: number }[]) {
        const [y, m] = r.date.split('-')
        trackedByMonth.set(`${y}-${m}`, (trackedByMonth.get(`${y}-${m}`) || 0) + Number(r.amount))
      }
      setComparisonData(expPts.map(p => ({ month: p.month, implied: p.value, tracked: trackedByMonth.get(p.month) || 0 })))

      const last = populated[populated.length - 1]
      const aC = cashBySnap.get(last.id) || 0
      const aD = assetsDetailBySnap.get(last.id) || []
      const tot = aC + aD.reduce((s, x) => s + x.amount, 0)
      if (tot > 0) {
        setAllocationMonth(fmt(last.year, last.month))
        const groups: AllocationGroup[] = []
        if (aC > 0) groups.push({ label: 'Cash', amount: aC, pct: (aC / tot) * 100, assets: [] })
        const byC = new Map<string, { amount: number; items: { name: string; amount: number }[] }>()
        for (const x of aD) {
          const cls = (x.assetClass || 'Other').trim() || 'Other'
          const g = byC.get(cls) || { amount: 0, items: [] }
          g.amount += x.amount; g.items.push({ name: x.name, amount: x.amount }); byC.set(cls, g)
        }
        for (const [cls, { amount, items }] of Array.from(byC.entries()).sort((a, b) => b[1].amount - a[1].amount)) {
          groups.push({
            label: cls, amount, pct: (amount / tot) * 100,
            assets: items.sort((a, b) => b.amount - a.amount).map(x => ({ name: x.name, amount: x.amount, pct: (x.amount / tot) * 100 })),
          })
        }
        setAllocation(groups.sort((a, b) => b.amount - a.amount))
      } else { setAllocation([]); setAllocationMonth('') }
    } finally { setLoading(false) }
  }, [supabase])

  useEffect(() => { loadDashboardData() }, [loadDashboardData])

  /* ── Derived values ── */
  const latest = netWorthData[netWorthData.length - 1] ?? null
  const prev = netWorthData[netWorthData.length - 2] ?? null
  const delta = latest && prev ? latest.value - prev.value : null
  const deltaPct = delta !== null && prev && prev.value !== 0 ? (delta / Math.abs(prev.value)) * 100 : null

  const latestBreakdown = nwBreakdown[nwBreakdown.length - 1] ?? null
  const totalAssets = latestBreakdown ? latestBreakdown.cash + latestBreakdown.assets : 0
  const cashPct = totalAssets > 0 && latestBreakdown ? (latestBreakdown.cash / totalAssets) * 100 : 0
  const investPct = 100 - cashPct

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */

  if (loading) {
    return (
      <div className="space-y-6 py-2">
        <div className="h-44 rounded-[28px] bg-zinc-100 dark:bg-zinc-800/40 animate-pulse" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-2xl bg-zinc-100 dark:bg-zinc-800/40 animate-pulse" />)}
        </div>
        <div className="h-56 rounded-2xl bg-zinc-100 dark:bg-zinc-800/40 animate-pulse" />
      </div>
    )
  }

  if (!netWorthData.length && !allocation.length) {
    return (
      <div className="flex flex-col items-center justify-center py-28 text-center">
        <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800/60 flex items-center justify-center mb-5">
          <svg className="w-7 h-7 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
          </svg>
        </div>
        <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-1">No data yet</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs">Start tracking in the Tracker tab to see your financial overview.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-6">

      {/* ════════════════════════════════
         1. HERO — Net Worth
         Apple Card inspired: big number, clean surface
         ════════════════════════════════ */}
      <div className="relative rounded-[28px] bg-zinc-950 dark:bg-white overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-white/[0.02] dark:from-black/[0.03] dark:to-transparent" />
        <div className="relative px-8 pt-8 pb-10 sm:px-10 sm:pt-10 sm:pb-12">
          <p className="text-[13px] font-medium tracking-wide text-zinc-500 dark:text-zinc-400">Net Worth</p>
          <p className="mt-2 text-[42px] sm:text-[52px] font-bold tabular-nums tracking-tight leading-none text-white dark:text-zinc-900">
            {latest ? formatCurrency(latest.value) : '—'}
          </p>
          {delta !== null && (
            <div className="mt-4 flex items-center gap-3">
              <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[13px] font-semibold tabular-nums ${
                delta >= 0
                  ? 'bg-emerald-500/15 text-emerald-400 dark:bg-emerald-500/10 dark:text-emerald-600'
                  : 'bg-red-500/15 text-red-400 dark:bg-red-500/10 dark:text-red-600'
              }`}>
                {delta >= 0 ? '↑' : '↓'} {delta >= 0 ? '+' : ''}{formatCurrency(delta)}
                {deltaPct !== null && ` (${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}%)`}
              </span>
              <span className="text-[13px] text-zinc-500">vs previous month</span>
            </div>
          )}

          {/* Net Worth mini-chart embedded in hero */}
          {netWorthData.length > 1 && (
            <div className="mt-6 -mx-2">
              <ResponsiveContainer width="100%" height={80}>
                <AreaChart data={netWorthData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hero-nw" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ffffff" stopOpacity={0.12} />
                      <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="hero-nw-dark" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#18181b" stopOpacity={0.08} />
                      <stop offset="100%" stopColor="#18181b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="value" stroke="rgba(255,255,255,0.25)" fill="url(#hero-nw)" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ════════════════════════════════
         2. KPI GRID — 2x2 on mobile, 4 on desktop
         Minimal: just the number, the label, the meaning
         ════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Income', value: incomeData[incomeData.length - 1]?.value ?? null, color: PALETTE.income },
          { label: 'Spending', value: expenseData[expenseData.length - 1]?.value ?? null, color: PALETTE.expense },
          { label: 'Savings Rate', value: savingsData[savingsData.length - 1]?.rate ?? null, color: PALETTE.savings, suffix: '%' },
          { label: 'Cash Ratio', value: totalAssets > 0 ? Math.round(cashPct) : null, color: PALETTE.cash, suffix: '%' },
        ].map(m => (
          <div
            key={m.label}
            className="rounded-2xl bg-white dark:bg-zinc-900 p-5 transition-shadow hover:shadow-lg"
            style={{ borderLeft: `3px solid ${m.color}` }}
          >
            <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">{m.label}</p>
            <p className="mt-2 text-[22px] font-bold tabular-nums text-zinc-900 dark:text-zinc-100 leading-tight">
              {m.value != null ? (m.suffix ? `${m.value}${m.suffix}` : formatCurrency(m.value)) : '—'}
            </p>
          </div>
        ))}
      </div>

      {/* ════════════════════════════════
         3. NET WORTH EVOLUTION — full-width, clean
         Apple Health style: large chart, no gridlines
         ════════════════════════════════ */}
      {netWorthData.length > 1 && (
        <section className="rounded-2xl bg-white dark:bg-zinc-900 p-6">
          <p className="text-[13px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-6">Net Worth Over Time</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={netWorthData} margin={{ top: 4, right: 0, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="nw-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={PALETTE.nw} stopOpacity={0.08} />
                  <stop offset="100%" stopColor={PALETTE.nw} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
              <YAxis hide domain={['auto', 'auto']} />
              <Tooltip content={<Tip />} />
              <Area type="monotone" dataKey="value" name="Net Worth" stroke={PALETTE.nw} className="dark:stroke-zinc-300" fill="url(#nw-fill)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* ════════════════════════════════
         4. INCOME vs EXPENSES — side by side area charts
         Paired for comparison
         ════════════════════════════════ */}
      {(incomeData.length > 0 || expenseData.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[
            { data: incomeData, label: 'Income', color: PALETTE.income, id: 'inc' },
            { data: expenseData, label: 'Spending (implied)', color: PALETTE.expense, id: 'exp' },
          ].map(({ data, label, color, id }) => (
            <section key={id} className="rounded-2xl bg-white dark:bg-zinc-900 p-6">
              <p className="text-[13px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-5">{label}</p>
              {data.length > 0 ? (
                <ResponsiveContainer width="100%" height={140}>
                  <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 4 }}>
                    <defs>
                      <linearGradient id={`${id}-f`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.15} />
                        <stop offset="100%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip content={<Tip />} />
                    <Area type="monotone" dataKey="value" name={label} stroke={color} fill={`url(#${id}-f)`} strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[140px] flex items-center justify-center text-sm text-zinc-400">No data</div>
              )}
            </section>
          ))}
        </div>
      )}

      {/* ════════════════════════════════
         5. COMPOSITION BAR — Apple Storage style
         Single horizontal segmented bar
         ════════════════════════════════ */}
      {latestBreakdown && totalAssets > 0 && (
        <section className="rounded-2xl bg-white dark:bg-zinc-900 p-6">
          <p className="text-[13px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-5">
            Composition {latest && <span className="font-normal normal-case">· {latest.month}</span>}
          </p>
          {/* The bar */}
          <div className="h-3 rounded-full overflow-hidden flex bg-zinc-100 dark:bg-zinc-800">
            <div className="h-full transition-all duration-500" style={{ width: `${cashPct}%`, backgroundColor: PALETTE.cash }} />
            <div className="h-full transition-all duration-500" style={{ width: `${investPct}%`, backgroundColor: PALETTE.invest }} />
          </div>
          {/* Legend */}
          <div className="mt-4 flex gap-8">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PALETTE.cash }} />
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Cash</span>
              <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{cashPct.toFixed(0)}%</span>
              <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">{formatCurrency(latestBreakdown.cash)}</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PALETTE.invest }} />
              <span className="text-sm text-zinc-600 dark:text-zinc-400">Investments</span>
              <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{investPct.toFixed(0)}%</span>
              <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">{formatCurrency(latestBreakdown.assets)}</span>
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════════════════
         6. EXPENSE COMPARISON + SAVINGS — side by side
         ════════════════════════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {comparisonData.length > 0 && (
          <section className="rounded-2xl bg-white dark:bg-zinc-900 p-6">
            <p className="text-[13px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Expense Comparison</p>
            <p className="text-[12px] text-zinc-400 dark:text-zinc-500 mb-5">Tracked (incl. rent) vs implied from wealth</p>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={comparisonData} margin={{ top: 4, right: 0, left: 0, bottom: 4 }} barGap={2}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<Tip />} />
                <Bar dataKey="implied" name="Implied" fill={PALETTE.expense} radius={[4, 4, 0, 0]} />
                <Bar dataKey="tracked" name="Tracked" fill={PALETTE.tracked} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 flex gap-5">
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: PALETTE.expense }} /><span className="text-[11px] text-zinc-400">Implied</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: PALETTE.tracked }} /><span className="text-[11px] text-zinc-400">Tracked</span></div>
            </div>
          </section>
        )}

        {savingsData.length > 0 && (
          <section className="rounded-2xl bg-white dark:bg-zinc-900 p-6">
            <p className="text-[13px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Savings Rate</p>
            <p className="text-[12px] text-zinc-400 dark:text-zinc-500 mb-5">% of income retained each month</p>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={savingsData} margin={{ top: 4, right: 0, left: 0, bottom: 4 }}>
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<PctTip />} />
                <Bar dataKey="rate" name="Savings Rate" radius={[4, 4, 0, 0]}>
                  {savingsData.map((d, i) => (
                    <Cell key={i} fill={d.rate >= 0 ? PALETTE.savings : PALETTE.expense} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </section>
        )}
      </div>

      {/* ════════════════════════════════
         7. ALLOCATION — Donut + list in one surface
         ════════════════════════════════ */}
      {allocation.length > 0 && (
        <section className="rounded-2xl bg-white dark:bg-zinc-900 overflow-hidden">
          <div className="px-6 pt-6 pb-2">
            <p className="text-[13px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
              Allocation
            </p>
            {allocationMonth && <p className="text-[12px] text-zinc-400 dark:text-zinc-500 mt-0.5">As of {allocationMonth}</p>}
          </div>

          <div className="flex flex-col md:flex-row">
            {/* Donut */}
            <div className="md:w-64 flex items-center justify-center py-6 px-4">
              <div className="w-44 h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={allocation} cx="50%" cy="50%" innerRadius="58%" outerRadius="88%" paddingAngle={2} dataKey="amount" nameKey="label" stroke="none">
                      {allocation.map((g, i) => (
                        <Cell key={g.label} fill={ALLOC_COLORS[i % ALLOC_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<Tip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 border-t md:border-t-0 md:border-l border-zinc-100 dark:border-zinc-800/60">
              {allocation.map((group, gi) => {
                const color = ALLOC_COLORS[gi % ALLOC_COLORS.length]
                const isOpen = expandedGroup === group.label
                const hasKids = group.assets.length > 0
                return (
                  <div key={group.label} className="border-b border-zinc-50 dark:border-zinc-800/50 last:border-0">
                    <button
                      type="button"
                      onClick={() => hasKids && setExpandedGroup(isOpen ? null : group.label)}
                      className={`w-full flex items-center px-5 py-3.5 text-left ${hasKids ? 'hover:bg-zinc-50 dark:hover:bg-zinc-800/30 cursor-pointer' : 'cursor-default'} transition-colors`}
                    >
                      <span className="w-[10px] h-[10px] rounded-full shrink-0 mr-3" style={{ backgroundColor: color }} />
                      <span className="flex-1 font-medium text-[14px] text-zinc-900 dark:text-zinc-100">{group.label}</span>
                      <span className="text-[14px] font-semibold tabular-nums text-zinc-900 dark:text-zinc-100 mr-3">{formatCurrency(group.amount)}</span>
                      <span className="text-[13px] tabular-nums text-zinc-400 dark:text-zinc-500 w-12 text-right">{group.pct.toFixed(0)}%</span>
                      {hasKids && (
                        <svg className={`w-4 h-4 ml-2 text-zinc-300 dark:text-zinc-600 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </button>
                    {hasKids && isOpen && (
                      <div className="pb-2">
                        {group.assets.map(a => (
                          <div key={`${group.label}-${a.name}`} className="flex items-center px-5 py-2 pl-11">
                            <span className="flex-1 text-[13px] text-zinc-500 dark:text-zinc-400">{a.name}</span>
                            <span className="text-[13px] font-medium tabular-nums text-zinc-700 dark:text-zinc-300 mr-3">{formatCurrency(a.amount)}</span>
                            <span className="text-[12px] tabular-nums text-zinc-400 dark:text-zinc-500 w-12 text-right">{a.pct.toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
