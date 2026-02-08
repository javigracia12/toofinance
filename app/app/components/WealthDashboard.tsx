'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatShortMonth } from '@/lib/format'
import { CATEGORY_COLORS } from '@/lib/constants'
import { Card, SectionTitle } from '@/app/app/components/ui'
import {
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Bar,
  BarChart,
  Line,
  LineChart,
  XAxis,
  YAxis,
  Cell,
} from 'recharts'

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

/* Colors: softer palette matching design */
const CASH_COLOR = '#3b82f6'
const INVEST_COLOR = '#14b8a6'
const INCOME_CHART_COLOR = '#8b5cf6'
const IMPLIED_COLOR = '#6366f1'
const TRACKED_CHART_COLOR = '#94a3b8'
const SAVINGS_POSITIVE = '#06b6d4'
const SAVINGS_NEGATIVE = '#f59e0b'

/* ─── Tooltips ─── */

function ChartTip({ active, payload, label }: {
  active?: boolean
  payload?: { value: number; name?: string; dataKey?: string; color?: string; fill?: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 shadow-lg">
      {label && <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">{label}</p>}
      {payload.map((e, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color || e.fill }} />
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{e.name || e.dataKey}</span>
          <span className="font-medium text-zinc-900 dark:text-zinc-100 ml-auto tabular-nums text-sm">
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
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-3 py-2 shadow-lg">
      {label && <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">{label}</p>}
      {payload.map((e, i) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color || e.fill }} />
          <span className="text-xs text-zinc-500 dark:text-zinc-400">{e.name}</span>
          <span className="font-medium text-zinc-900 dark:text-zinc-100 ml-auto tabular-nums text-sm">
            {Number(e.value).toFixed(1)}%
          </span>
        </div>
      ))}
    </div>
  )
}

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
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)
  const [compositionHover, setCompositionHover] = useState<{ label: string; amount: number; pct: number; color: string } | null>(null)
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

  const latest = netWorthData[netWorthData.length - 1] ?? null
  const prevNw = netWorthData[netWorthData.length - 2] ?? null
  const delta = latest && prevNw ? latest.value - prevNw.value : null
  const deltaPct = delta !== null && prevNw && prevNw.value !== 0 ? (delta / Math.abs(prevNw.value)) * 100 : null

  const latestBreakdown = nwBreakdown[nwBreakdown.length - 1] ?? null
  const totalAssets = latestBreakdown ? latestBreakdown.cash + latestBreakdown.assets : 0
  const cashPct = totalAssets > 0 && latestBreakdown ? (latestBreakdown.cash / totalAssets) * 100 : 0
  const investPct = 100 - cashPct

  if (loading) {
    return (
      <div className="space-y-10">
        <div className="text-center py-8">
          <div className="h-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl w-32 mx-auto mb-4 animate-pulse" />
          <div className="h-14 bg-zinc-100 dark:bg-zinc-800 rounded-xl w-48 mx-auto animate-pulse" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <div key={i} className="h-28 bg-zinc-100 dark:bg-zinc-800 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (!netWorthData.length && !allocation.length) {
    return (
      <div className="text-center py-16">
        <p className="text-zinc-400 dark:text-zinc-500">Add wealth data in the Tracker tab to see your overview.</p>
      </div>
    )
  }

  return (
    <div className="space-y-10">

      {/* Hero — same pattern as expenses dashboard */}
      <div className="text-center py-4 sm:py-6">
        <p className="text-sm text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium">
          Net Worth {latest && `· ${latest.month}`}
        </p>
        <p className="mt-2 text-4xl sm:text-5xl font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">
          {latest ? formatCurrency(latest.value) : '—'}
        </p>
        {delta !== null && (
          <p className={`mt-2 text-sm font-medium ${delta >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {delta >= 0 ? '↑' : '↓'} {delta >= 0 ? '+' : ''}{formatCurrency(delta)}
            {deltaPct !== null && ` (${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(0)}%)`} vs last month
          </p>
        )}
      </div>

      {/* Summary cards — like Predictions */}
      <div>
        <SectionTitle>Summary</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Card className="p-4 sm:p-5">
            <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium">Income</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">
              {incomeData.length > 0 ? formatCurrency(incomeData[incomeData.length - 1].value) : '—'}
            </p>
            {incomeData.length > 0 && <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">{incomeData[incomeData.length - 1].month}</p>}
          </Card>
          <Card className="p-4 sm:p-5">
            <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium">Implied Spending</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">
              {expenseData.length > 0 ? formatCurrency(expenseData[expenseData.length - 1].value) : '—'}
            </p>
            {expenseData.length > 0 && <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">{expenseData[expenseData.length - 1].month}</p>}
          </Card>
          <Card className="p-4 sm:p-5">
            <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium">Savings Rate</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">
              {savingsData.length > 0 ? `${savingsData[savingsData.length - 1].rate}%` : '—'}
            </p>
            {savingsData.length > 0 && <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">{savingsData[savingsData.length - 1].month}</p>}
          </Card>
        </div>
      </div>

      {/* Net Worth Trend — line chart */}
      {netWorthData.length > 0 && (
        <div>
          <SectionTitle>Net Worth Over Time</SectionTitle>
          <Card className="p-4 sm:p-6">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={netWorthData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <defs>
                  <linearGradient id="nw-g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#71717a" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#71717a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#71717a" />
                <YAxis hide domain={['auto', 'auto']} tickFormatter={(v) => formatCurrency(v)} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="value" stroke="none" fill="url(#nw-g)" />
                <Line type="monotone" dataKey="value" name="Net Worth" stroke="#71717a" strokeWidth={2} dot={{ fill: '#71717a', strokeWidth: 0, r: 3 }} activeDot={{ r: 5, fill: '#71717a', stroke: '#fff', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* Composition — like Spend mix with hover tooltips */}
      {(() => {
        const compSegments = allocation.length > 0
          ? allocation.map((g, i) => ({ label: g.label, amount: g.amount, pct: g.pct, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }))
          : latestBreakdown && totalAssets > 0
            ? [
                { label: 'Cash', amount: latestBreakdown.cash, pct: cashPct, color: CASH_COLOR },
                { label: 'Investments', amount: latestBreakdown.assets, pct: investPct, color: INVEST_COLOR },
              ]
            : []
        if (compSegments.length === 0) return null
        const segments = compSegments.filter(s => s.pct > 0)
        return (
          <div>
            <SectionTitle>Composition {allocationMonth && `· ${allocationMonth}`}</SectionTitle>
            <Card className="p-4 sm:p-5 relative overflow-visible">
              <div className="w-full h-8 sm:h-10 rounded-lg flex relative overflow-visible" onMouseLeave={() => setCompositionHover(null)}>
                {segments.map((seg) => (
                  <div
                    key={seg.label}
                    className="h-full transition-all min-w-0 cursor-pointer hover:opacity-90 relative first:rounded-l-lg last:rounded-r-lg overflow-visible"
                    style={{ width: `${seg.pct}%`, backgroundColor: seg.color }}
                    onMouseEnter={() => setCompositionHover(seg)}
                  >
                    {compositionHover?.label === seg.label && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-20 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 shadow-lg whitespace-nowrap text-center">
                        <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">{seg.label}</p>
                        <p className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{formatCurrency(seg.amount)}</p>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{seg.pct.toFixed(1)}%</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[11px] text-zinc-500 dark:text-zinc-400">
                {segments.map((seg) => (
                  <span key={seg.label} className="inline-flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: seg.color }} />
                    {seg.label} {seg.pct.toFixed(0)}% · {formatCurrency(seg.amount)}
                  </span>
                ))}
              </div>
            </Card>
          </div>
        )
      })()}

      {/* Income & Spending — Area charts in Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {incomeData.length > 0 && (
          <div>
            <SectionTitle>Income</SectionTitle>
            <Card className="p-4 sm:p-5">
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={incomeData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                  <defs>
                    <linearGradient id="inc-g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={INCOME_CHART_COLOR} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={INCOME_CHART_COLOR} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#71717a" />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip content={<ChartTip />} />
                  <Area type="monotone" dataKey="value" name="Income" stroke={INCOME_CHART_COLOR} fill="url(#inc-g)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )}
        {expenseData.length > 0 && (
          <div>
            <SectionTitle>Implied Spending</SectionTitle>
            <Card className="p-4 sm:p-5">
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={expenseData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                  <defs>
                    <linearGradient id="exp-g" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={IMPLIED_COLOR} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={IMPLIED_COLOR} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#71717a" />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip content={<ChartTip />} />
                  <Area type="monotone" dataKey="value" name="Spending" stroke={IMPLIED_COLOR} fill="url(#exp-g)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )}
      </div>

      {/* Expense comparison & Savings rate — bar charts in Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {comparisonData.length > 0 && (
          <div>
            <SectionTitle>Expense Comparison</SectionTitle>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-2">Tracked (incl. rent) vs implied from wealth</p>
            <Card className="p-4 sm:p-5">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={comparisonData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#71717a" />
                  <YAxis hide />
                  <Tooltip content={<ChartTip />} />
                  <Bar dataKey="implied" name="Implied" fill={IMPLIED_COLOR} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="tracked" name="Tracked" fill={TRACKED_CHART_COLOR} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: IMPLIED_COLOR }} />Implied</span>
                <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full flex-shrink-0 bg-zinc-400" />Tracked</span>
              </div>
            </Card>
          </div>
        )}
        {savingsData.length > 0 && (
          <div>
            <SectionTitle>Savings Rate</SectionTitle>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-2">% of income retained each month</p>
            <Card className="p-4 sm:p-5">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={savingsData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="#71717a" />
                  <YAxis hide />
                  <Tooltip content={<PctTip />} />
                  <Bar dataKey="rate" name="Savings %" radius={[4, 4, 0, 0]}>
                    {savingsData.map((d, i) => (
                      <Cell key={i} fill={d.rate >= 0 ? SAVINGS_POSITIVE : SAVINGS_NEGATIVE} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )}
      </div>

      {/* Allocation — cards expand inline to show assets */}
      {allocation.length > 0 && (
        <div>
          <SectionTitle>Asset Allocation {allocationMonth && `· ${allocationMonth}`}</SectionTitle>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {allocation.map((group, gi) => {
              const color = CATEGORY_COLORS[gi % CATEGORY_COLORS.length]
              const isOpen = expandedGroup === group.label
              const isOther = expandedGroup && expandedGroup !== group.label
              const hasKids = group.assets.length > 0
              return (
                <div
                  key={group.label}
                  className={`col-span-2 sm:col-span-1 transition-all duration-300 ${isOpen ? 'sm:col-span-2' : ''} ${isOther ? 'opacity-40' : ''}`}
                >
                  <button
                    type="button"
                    onClick={() => hasKids && setExpandedGroup(isOpen ? null : group.label)}
                    className={`w-full relative overflow-hidden rounded-2xl p-4 text-left transition-all ${!hasKids ? 'cursor-default' : 'hover:scale-[1.01]'} ${isOpen ? 'ring-2 ring-zinc-900 dark:ring-zinc-100 ring-offset-2 dark:ring-offset-zinc-900 rounded-b-none' : ''}`}
                    style={{ backgroundColor: `${color}10` }}
                  >
                    <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-30" style={{ backgroundColor: color }} />
                    <div className="relative flex items-start justify-between">
                      <div>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold mb-3" style={{ backgroundColor: color }}>
                          {group.label.slice(0, 2).toUpperCase()}
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">{group.label}</p>
                        <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50 tabular-nums">{formatCurrency(group.amount)}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden max-w-24">
                            <div className="h-full rounded-full transition-all" style={{ width: `${group.pct}%`, backgroundColor: color }} />
                          </div>
                          <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">{group.pct.toFixed(0)}%</span>
                        </div>
                      </div>
                      {hasKids && (
                        <div className="flex-shrink-0">
                          <svg className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                  {isOpen && hasKids && group.assets.length > 0 && (
                    <div
                      className="rounded-b-2xl border-t border-zinc-200 dark:border-zinc-700 overflow-hidden animate-fade-slide-in"
                      style={{ backgroundColor: `${color}08` }}
                    >
                      {group.assets.map((a) => (
                        <div key={a.name} className="px-4 py-3 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 last:border-b-0">
                          <span className="text-sm text-zinc-600 dark:text-zinc-400">{a.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium tabular-nums text-zinc-900 dark:text-zinc-100">{formatCurrency(a.amount)}</span>
                            <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">{a.pct.toFixed(1)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Insight card — like expenses */}
      {allocation[0] && (
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-800 dark:from-zinc-800 dark:to-zinc-900 border-0 p-6 text-white">
          <h2 className="text-xs text-zinc-400 uppercase tracking-wider font-medium mb-3">Insight</h2>
          <p className="text-lg">
            <span className="font-semibold">{allocation[0].label}</span> is your largest allocation at{' '}
            <span className="font-semibold">{allocation[0].pct.toFixed(0)}%</span> of your wealth
            {allocationMonth && ` as of ${allocationMonth}`}.
          </p>
        </Card>
      )}
    </div>
  )
}
