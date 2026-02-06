'use client'

import { useState, useMemo, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { DEFAULT_CATEGORIES, CATEGORY_COLORS, CURRENCY } from '@/lib/constants'
import type { Expense, RecurringExpense, Category } from '@/lib/types'
import {
  formatCurrency,
  getMonthKey,
  normalizeDate,
  formatShortMonth,
  formatFullMonth,
  formatDayLabel,
  formatVsLastMonth,
  getOrdinalSuffix,
} from '@/lib/format'
import { isRentCategory, sortExpenses, getDayOptions } from '@/lib/expense-utils'
import {
  Card,
  SectionTitle,
  FilterPill,
  Toggle,
  Button,
  Input,
  Select,
} from '@/app/app/components/ui'
import { CategoryPill } from '@/app/app/components/CategoryPill'
import { TransactionRow } from '@/app/app/components/TransactionRow'
import { Modal } from '@/app/app/components/Modal'

const WealthTracker = dynamic(() => import('@/app/app/components/WealthTracker').then(m => ({ default: m.WealthTracker })), { ssr: false })
const WealthDashboard = dynamic(() => import('@/app/app/components/WealthDashboard').then(m => ({ default: m.WealthDashboard })), { ssr: false })

export default function AppPage() {
  const router = useRouter()
  const supabase = createClient()

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [section, setSection] = useState<'expenses' | 'wealth'>('expenses')
  const [wealthView, setWealthView] = useState<'tracker' | 'dashboard'>('tracker')
  const [view, setView] = useState<'add' | 'dashboard' | 'recurring'>('add')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [monthFilter, setMonthFilter] = useState<string | null>(null)
  const [dayFilter, setDayFilter] = useState<string | null>(null)
  const [transactionSort, setTransactionSort] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'category-asc' | 'category-desc'>('date-desc')
  const dayOptions = useMemo(() => getDayOptions(), [])

  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('food')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringDay, setRecurringDay] = useState('1')

  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState(CATEGORY_COLORS[0])

  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editCategoryName, setEditCategoryName] = useState('')
  const [editCategoryColor, setEditCategoryColor] = useState('')

  const [editingRecurring, setEditingRecurring] = useState<RecurringExpense | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editCategory, setEditCategory] = useState('')
  const [editDay, setEditDay] = useState('')
  const [deletingRecurring, setDeletingRecurring] = useState<RecurringExpense | null>(null)

  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseDescription, setExpenseDescription] = useState('')
  const [expenseCategory, setExpenseCategory] = useState('')
  const [expenseDate, setExpenseDate] = useState('')

  const [mutationError, setMutationError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [darkMode, setDarkMode] = useState(false)
  useEffect(() => {
    setDarkMode(typeof document !== 'undefined' && document.documentElement.classList.contains('dark'))
  }, [])
  const toggleDarkMode = () => {
    const next = !darkMode
    if (typeof document === 'undefined') return
    const html = document.documentElement
    html.classList.add('transition-theme')
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setDarkMode(next)
        if (next) {
          html.classList.add('dark')
          localStorage.setItem('theme', 'dark')
        } else {
          html.classList.remove('dark')
          localStorage.setItem('theme', 'light')
        }
        setTimeout(() => html.classList.remove('transition-theme'), 420)
      })
    })
  }

  const getCategory = (id: string): Category =>
    categories.find((c) => c.id === id) || { id: 'other', label: 'Other', color: '#6b7280' }
  const isRent = (catId: string) => isRentCategory(catId, categories)

  // Fetch data and seed default categories
  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const [expRes, recRes, catRes] = await Promise.all([
          supabase.from('expenses').select('*').order('date', { ascending: false }),
          supabase.from('recurring_expenses').select('*'),
          supabase.from('categories').select('*'),
        ])

        if (catRes.data?.length === 0) {
          await supabase.from('categories').insert(
            DEFAULT_CATEGORIES.map((c) => ({
              id: c.id,
              user_id: user.id,
              label: c.label,
              color: c.color,
              is_custom: c.is_custom,
            }))
          )
          const { data } = await supabase.from('categories').select('*')
          setCategories((data || []).map((r) => ({
            id: r.id,
            label: r.label,
            color: r.color,
            isCustom: r.is_custom,
          })))
        } else {
          setCategories((catRes.data || []).map((r) => ({
            id: r.id,
            label: r.label,
            color: r.color,
            isCustom: r.is_custom,
          })))
        }

        setExpenses((expRes.data || []).map((r) => ({
          id: r.id,
          amount: Number(r.amount),
          description: r.description,
          category: r.category,
          date: r.date,
          recurringId: r.recurring_id,
        })))

        setRecurringExpenses((recRes.data || []).map((r) => ({
          id: r.id,
          amount: Number(r.amount),
          description: r.description,
          category: r.category,
          dayOfMonth: r.day_of_month,
          isActive: r.is_active,
          createdAt: r.created_at,
        })))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [supabase])

  const currentMonth = useMemo(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  }, [])

  const expensesExRent = useMemo(
    () => expenses.filter((e) => !isRent(e.category)),
    [expenses, categories]
  )

  const monthlyData = useMemo(() => {
    const data: Record<string, number> = {}
    expensesExRent.forEach((e) => {
      const key = getMonthKey(e.date)
      data[key] = (data[key] || 0) + e.amount
    })
    return Object.entries(data).sort(([a], [b]) => a.localeCompare(b)).slice(-6)
  }, [expensesExRent])

  const activeMonth = monthFilter || currentMonth

  useEffect(() => {
    if (dayFilter && getMonthKey(dayFilter) !== activeMonth) setDayFilter(null)
  }, [activeMonth, dayFilter])

  const activeMonthExpenses = useMemo(
    () => expenses.filter((e) => getMonthKey(e.date) === activeMonth),
    [expenses, activeMonth]
  )

  const activeMonthTotal = activeMonthExpenses.reduce((s, e) => s + e.amount, 0)

  const lastMonthKey = useMemo(() => {
    const [y, m] = activeMonth.split('-').map(Number)
    const d = new Date(y, m - 2)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }, [activeMonth])

  const lastMonthTotal = useMemo(
    () => expenses.filter((e) => getMonthKey(e.date) === lastMonthKey).reduce((s, e) => s + e.amount, 0),
    [expenses, lastMonthKey]
  )

  const percentChange = lastMonthTotal > 0 ? (((activeMonthTotal - lastMonthTotal) / lastMonthTotal) * 100).toFixed(0) : '0'

  const monthlyDataByCategory = useMemo(() => {
    const byMonth: Record<string, Record<string, number>> = {}
    monthlyData.forEach(([month]) => { byMonth[month] = {} })
    expensesExRent.forEach((e) => {
      const key = getMonthKey(e.date)
      if (!(key in byMonth)) return
      byMonth[key][e.category] = (byMonth[key][e.category] || 0) + e.amount
    })
    return monthlyData.map(([month, total]) => ({
      month,
      total,
      segments: Object.entries(byMonth[month] || {})
        .map(([catId, amount]) => ({ category: getCategory(catId), amount }))
        .sort((a, b) => b.amount - a.amount),
    }))
  }, [monthlyData, expensesExRent, categories])

  const filteredExpenses = useMemo(() => {
    let filtered = activeMonthExpenses
    if (categoryFilter) filtered = filtered.filter((e) => e.category === categoryFilter)
    if (dayFilter && getMonthKey(dayFilter) === activeMonth) {
      const target = normalizeDate(dayFilter)
      filtered = filtered.filter((e) => normalizeDate(e.date) === target)
    }
    return filtered.sort((a, b) => b.date.localeCompare(a.date))
  }, [activeMonthExpenses, categoryFilter, dayFilter, activeMonth])

  const filteredTotal = filteredExpenses.reduce((s, e) => s + e.amount, 0)

  const categoryBreakdown = useMemo(() => {
    const data: Record<string, number> = {}
    filteredExpenses.forEach((e) => {
      data[e.category] = (data[e.category] || 0) + e.amount
    })
    return Object.entries(data)
      .map(([id, amount]) => ({ category: getCategory(id), amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [filteredExpenses, categories])

  const filteredExpensesExRent = useMemo(
    () => filteredExpenses.filter((e) => !isRent(e.category)),
    [filteredExpenses, categories]
  )
  const filteredTotalExRent = filteredExpensesExRent.reduce((s, e) => s + e.amount, 0)
  const categoryBreakdownExRent = useMemo(() => {
    const data: Record<string, number> = {}
    filteredExpensesExRent.forEach((e) => {
      data[e.category] = (data[e.category] || 0) + e.amount
    })
    return Object.entries(data)
      .map(([id, amount]) => ({ category: getCategory(id), amount }))
      .sort((a, b) => b.amount - a.amount)
  }, [filteredExpensesExRent, categories])

  const sortedExpenses = useMemo(
    () => sortExpenses(filteredExpenses, transactionSort, getCategory),
    [filteredExpenses, transactionSort, categories]
  )

  const recentExpenses = useMemo(
    () => [...expenses].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5),
    [expenses]
  )

  const maxMonth = Math.max(...monthlyData.map(([, v]) => v), 1)
  const hasFilters = categoryFilter || monthFilter || dayFilter
  const monthlyRecurringTotal = recurringExpenses.filter((r) => r.isActive).reduce((sum, r) => sum + r.amount, 0)
  const monthlyRecurringExRent = recurringExpenses.filter((r) => r.isActive && !isRent(r.category)).reduce((sum, r) => sum + r.amount, 0)

  // Predictions & extra metrics (current month only, no filters). Recurring = full month, not scaled. One-off = scaled.
  const predictionMetrics = useMemo(() => {
    if (monthFilter || categoryFilter || activeMonth !== currentMonth) return null
    const now = new Date()
    const [y, m] = activeMonth.split('-').map(Number)
    const daysInMonth = new Date(y, m, 0).getDate()
    const daysElapsed = Math.min(now.getDate(), daysInMonth)
    const daysRemaining = Math.max(0, daysInMonth - daysElapsed)

    // Filter out rent for variable spending metrics
    const oneOffExpenses = activeMonthExpenses.filter((e) => !e.recurringId)
    const oneOffExRent = oneOffExpenses.filter((e) => !isRent(e.category))
    const oneOffTotal = oneOffExpenses.reduce((s, e) => s + e.amount, 0)
    const oneOffTotalExRent = oneOffExRent.reduce((s, e) => s + e.amount, 0)

    const recurringTotalThisMonth = monthlyRecurringTotal
    const oneOffDailyAvg = daysElapsed > 0 ? oneOffTotal / daysElapsed : 0
    const predictedOneOff = oneOffTotal + oneOffDailyAvg * daysRemaining
    const predictedEndOfMonth = recurringTotalThisMonth + predictedOneOff

    // Metrics excluding rent (variable spending only)
    const dailyAvgExRent = daysElapsed > 0 ? oneOffTotalExRent / daysElapsed : 0
    const weeklyAvgExRent = dailyAvgExRent * 7
    const predictedOneOffExRent = oneOffTotalExRent + dailyAvgExRent * daysRemaining
    const predictedExRent = monthlyRecurringExRent + predictedOneOffExRent

    const byDay: Record<string, number> = {}
    activeMonthExpenses.filter((e) => !isRent(e.category)).forEach((e) => {
      byDay[e.date] = (byDay[e.date] || 0) + e.amount
    })

    // Daily spending data for chart
    const dailySpending: { date: string; amount: number; dayNum: number }[] = []
    for (let d = 1; d <= daysElapsed; d++) {
      const dateStr = `${activeMonth}-${String(d).padStart(2, '0')}`
      dailySpending.push({ date: dateStr, amount: byDay[dateStr] || 0, dayNum: d })
    }

    // Spending velocity: compare to same point last month
    const lastMonthSamePoint = expenses
      .filter((e) => getMonthKey(e.date) === lastMonthKey && new Date(e.date).getDate() <= daysElapsed)
      .reduce((s, e) => s + e.amount, 0)
    const currentSpendingToDate = activeMonthExpenses.reduce((s, e) => s + e.amount, 0)
    const velocityDiff = lastMonthSamePoint > 0 ? ((currentSpendingToDate - lastMonthSamePoint) / lastMonthSamePoint) * 100 : 0

    // Weekend vs weekday (excluding rent)
    let weekendTotal = 0
    let weekdayTotal = 0
    let weekendDays = 0
    let weekdayDays = 0
    for (let d = 1; d <= daysElapsed; d++) {
      const dateStr = `${activeMonth}-${String(d).padStart(2, '0')}`
      const dayOfWeek = new Date(y, m - 1, d).getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      const dayAmount = activeMonthExpenses
        .filter((e) => e.date === dateStr && !isRent(e.category))
        .reduce((s, e) => s + e.amount, 0)
      if (isWeekend) {
        weekendTotal += dayAmount
        weekendDays++
      } else {
        weekdayTotal += dayAmount
        weekdayDays++
      }
    }
    const weekendAvg = weekendDays > 0 ? weekendTotal / weekendDays : 0
    const weekdayAvg = weekdayDays > 0 ? weekdayTotal / weekdayDays : 0

    return {
      predictedEndOfMonth,
      predictedExRent,
      dailyAvgExRent,
      weeklyAvgExRent,
      daysRemaining,
      daysElapsed,
      dailySpending,
      velocityDiff,
      weekendAvg,
      weekdayAvg,
    }
  }, [activeMonth, currentMonth, monthFilter, categoryFilter, activeMonthExpenses, monthlyRecurringTotal, monthlyRecurringExRent, expenses, lastMonthKey, categories])

  const dailySpendingBars = useMemo(() => {
    if (!predictionMetrics) return []
    const daily = predictionMetrics.dailySpending
    if (daily.length === 0) return []
    const maxAmount = Math.max(...daily.map((d) => d.amount), 1)
    return daily.map((d) => ({
      ...d,
      heightPct: maxAmount > 0 ? Math.max((d.amount / maxAmount) * 100, 2) : 2,
    }))
  }, [predictionMetrics])

  const vsLastMonthDiff = predictionMetrics?.velocityDiff ?? 0
  const vsLastMonthClass =
    vsLastMonthDiff > 0
      ? 'text-red-500'
      : vsLastMonthDiff < 0
        ? 'text-green-500'
        : 'text-zinc-400 dark:text-zinc-500'
  const vsLastMonthLabel = formatVsLastMonth(vsLastMonthDiff)

  const clearFilters = () => {
    setCategoryFilter(null)
    setMonthFilter(null)
    setDayFilter(null)
  }

  const handleExportCSV = () => {
    const rows = filteredExpenses.map((e) => ({
      date: e.date,
      description: e.description,
      category: getCategory(e.category).label,
      amount: e.amount.toFixed(2),
    }))
    const header = `Date,Description,Category,Amount (${CURRENCY})\n`
    const body = rows.map((r) => `${r.date},"${r.description.replace(/"/g, '""')}",${r.category},${r.amount}`).join('\n')
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `expenses-${activeMonth}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleAddExpense = async () => {
    if (!amount || !description) return
    setMutationError(null)
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    if (isRecurring) {
      const { data: newRec, error: recErr } = await supabase
        .from('recurring_expenses')
        .insert({
          user_id: user.id,
          amount: parseFloat(amount),
          description,
          category: selectedCategory,
          day_of_month: parseInt(recurringDay),
          is_active: true,
        })
        .select('id')
        .single()

      if (recErr) {
        setMutationError(recErr.message)
        setSaving(false)
        return
      }

      const { data: newExp, error: expErr } = await supabase
        .from('expenses')
        .insert({
          user_id: user.id,
          amount: parseFloat(amount),
          description,
          category: selectedCategory,
          date,
          recurring_id: newRec.id,
        })
        .select('id')
        .single()

      if (expErr) {
        setMutationError(expErr.message)
        setSaving(false)
        return
      }

      setRecurringExpenses((prev) => [
        ...prev,
        {
          id: newRec.id,
          amount: parseFloat(amount),
          description,
          category: selectedCategory,
          dayOfMonth: parseInt(recurringDay),
          isActive: true,
          createdAt: new Date().toISOString(),
        },
      ])
      setExpenses((prev) => [
        {
          id: newExp.id,
          amount: parseFloat(amount),
          description,
          category: selectedCategory,
          date,
          recurringId: newRec.id,
        },
        ...prev,
      ])
    } else {
      const { data: newExp, error } = await supabase
        .from('expenses')
        .insert({
          user_id: user.id,
          amount: parseFloat(amount),
          description,
          category: selectedCategory,
          date,
        })
        .select('id')
        .single()

      if (error) {
        setMutationError(error.message)
        setSaving(false)
        return
      }

      setExpenses((prev) => [
        { id: newExp.id, amount: parseFloat(amount), description, category: selectedCategory, date },
        ...prev,
      ])
    }

    setAmount('')
    setDescription('')
    setSelectedCategory('food')
    setDate(new Date().toISOString().split('T')[0])
    setIsRecurring(false)
    setRecurringDay('1')
    setSaving(false)
  }

  const openEditRecurring = (r: RecurringExpense) => {
    setEditingRecurring(r)
    setEditAmount(r.amount.toString())
    setEditDescription(r.description)
    setEditCategory(r.category)
    setEditDay(r.dayOfMonth.toString())
  }

  const handleSaveRecurring = async () => {
    if (!editingRecurring) return
    setMutationError(null)
    setSaving(true)

    const { error } = await supabase
      .from('recurring_expenses')
      .update({
        amount: parseFloat(editAmount),
        description: editDescription,
        category: editCategory,
        day_of_month: parseInt(editDay),
      })
      .eq('id', editingRecurring.id)

    if (error) {
      setMutationError(error.message)
      setSaving(false)
      return
    }

    setRecurringExpenses((prev) =>
      prev.map((r) =>
        r.id === editingRecurring.id
          ? { ...r, amount: parseFloat(editAmount), description: editDescription, category: editCategory, dayOfMonth: parseInt(editDay) }
          : r
      )
    )
    setEditingRecurring(null)
    setSaving(false)
  }

  const handleToggleRecurring = async (id: string) => {
    const r = recurringExpenses.find((x) => x.id === id)
    if (!r) return
    setMutationError(null)

    const { error } = await supabase.from('recurring_expenses').update({ is_active: !r.isActive }).eq('id', id)

    if (error) {
      setMutationError(error.message)
      return
    }

    setRecurringExpenses((prev) =>
      prev.map((x) => (x.id === id ? { ...x, isActive: !x.isActive } : x))
    )
  }

  const handleDeleteRecurring = async () => {
    if (!deletingRecurring) return
    setMutationError(null)

    const { error: delErr } = await supabase.from('recurring_expenses').delete().eq('id', deletingRecurring.id)
    if (delErr) {
      setMutationError(delErr.message)
      return
    }
    const { error: updErr } = await supabase.from('expenses').update({ recurring_id: null }).eq('recurring_id', deletingRecurring.id)
    if (updErr) {
      setMutationError(updErr.message)
      return
    }

    setRecurringExpenses((prev) => prev.filter((r) => r.id !== deletingRecurring.id))
    setExpenses((prev) => prev.map((e) => (e.recurringId === deletingRecurring.id ? { ...e, recurringId: undefined } : e)))
    setDeletingRecurring(null)
  }

  const openEditExpense = (expense: Expense) => {
    setEditingExpense(expense)
    setExpenseAmount(expense.amount.toString())
    setExpenseDescription(expense.description)
    setExpenseCategory(expense.category)
    setExpenseDate(expense.date)
  }

  const handleSaveExpense = async () => {
    if (!editingExpense) return
    setMutationError(null)
    setSaving(true)

    const { error } = await supabase
      .from('expenses')
      .update({
        amount: parseFloat(expenseAmount),
        description: expenseDescription,
        category: expenseCategory,
        date: expenseDate,
      })
      .eq('id', editingExpense.id)

    if (error) {
      setMutationError(error.message)
      setSaving(false)
      return
    }

    setExpenses((prev) =>
      prev.map((e) =>
        e.id === editingExpense.id
          ? { ...e, amount: parseFloat(expenseAmount), description: expenseDescription, category: expenseCategory, date: expenseDate }
          : e
      )
    )
    setEditingExpense(null)
    setSaving(false)
  }

  const handleDeleteExpense = async (id: string) => {
    setMutationError(null)
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) {
      setMutationError(error.message)
      return
    }
    setExpenses((prev) => prev.filter((e) => e.id !== id))
    setEditingExpense(null)
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return
    setMutationError(null)
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const id = newCategoryName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now()

    const { error } = await supabase.from('categories').insert({
      id,
      user_id: user.id,
      label: newCategoryName.trim(),
      color: newCategoryColor,
      is_custom: true,
    })

    if (error) {
      setMutationError(error.message)
      setSaving(false)
      return
    }

    const cat: Category = { id, label: newCategoryName.trim(), color: newCategoryColor, isCustom: true }
    setCategories((prev) => [...prev, cat])
    setSelectedCategory(id)
    setNewCategoryName('')
    setNewCategoryColor(CATEGORY_COLORS[0])
    setShowNewCategoryModal(false)
    setSaving(false)
  }

  const openEditCategory = (cat: Category) => {
    setEditingCategory(cat)
    setEditCategoryName(cat.label)
    setEditCategoryColor(cat.color)
  }

  const handleSaveCategory = async () => {
    if (!editingCategory || !editCategoryName.trim()) return
    setMutationError(null)
    setSaving(true)

    const { error } = await supabase.from('categories').update({ label: editCategoryName.trim(), color: editCategoryColor }).eq('id', editingCategory.id)

    if (error) {
      setMutationError(error.message)
      setSaving(false)
      return
    }

    setCategories((prev) => prev.map((c) => c.id === editingCategory.id ? { ...c, label: editCategoryName.trim(), color: editCategoryColor } : c))
    setEditingCategory(null)
    setSaving(false)
  }

  const handleDeleteCategory = async (categoryId: string) => {
    setMutationError(null)
    const { error } = await supabase.from('categories').delete().eq('id', categoryId)
    if (error) {
      setMutationError(error.message)
      return
    }
    setCategories((prev) => prev.filter((c) => c.id !== categoryId))
    if (selectedCategory === categoryId) setSelectedCategory('food')
    if (categoryFilter === categoryId) setCategoryFilter(null)
    setEditingCategory(null)
  }

  const handleCategoryClick = (categoryId: string) => {
    setCategoryFilter((prev) => (prev === categoryId ? null : categoryId))
  }

  const handleMonthClick = (month: string) => {
    setMonthFilter((prev) => (prev === month ? null : month))
    setDayFilter(null)
  }

  const handleDayClick = (date: string) => {
    setDayFilter((prev) => (prev === date ? null : date))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400 dark:text-zinc-500 text-sm">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 transition-colors">
      {mutationError && (
        <div
          className="sticky top-0 z-40 flex items-center justify-between gap-3 px-4 py-3 bg-red-50 dark:bg-red-950/80 border-b border-red-200 dark:border-red-900 text-red-800 dark:text-red-200 text-sm"
          role="alert"
        >
          <span>{mutationError}</span>
          <button
            type="button"
            onClick={() => setMutationError(null)}
            className="p-1 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
            aria-label="Dismiss error"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      <header className="border-b border-zinc-100 dark:border-zinc-800">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {(['expenses', 'wealth'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSection(s)}
                  className={`px-3 sm:px-4 py-1.5 text-base sm:text-lg font-semibold transition-colors capitalize ${
                    section === s ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-300 dark:text-zinc-500 hover:text-zinc-500 dark:hover:text-zinc-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title={darkMode ? 'Light mode' : 'Dark mode'}
              >
                {darkMode ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
              <button
                onClick={handleLogout}
                className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                Log out
              </button>
            </div>
          </div>
          {section === 'expenses' && (
            <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 mt-3">
              {(['add', 'dashboard', 'recurring'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setView(tab as typeof view)}
                  className={`flex-1 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-all capitalize ${
                    view === tab ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm' : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}
          {section === 'wealth' && (
            <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1 mt-3">
              {(['tracker', 'dashboard'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setWealthView(tab)}
                  className={`flex-1 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-all capitalize ${
                    wealthView === tab ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm' : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className={`mx-auto px-4 sm:px-6 py-6 sm:py-8 ${section === 'wealth' ? 'max-w-6xl' : 'max-w-2xl'}`}>
        {section === 'wealth' && wealthView === 'tracker' && <WealthTracker />}
        {section === 'wealth' && wealthView === 'dashboard' && <WealthDashboard />}

        {section === 'expenses' && view === 'add' && (
          <div className="space-y-8">
            <div className="text-center py-6 sm:py-8">
              <label className="text-sm text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium">Amount</label>
              <div className="mt-3 flex items-center justify-center">
                <span className="text-3xl sm:text-4xl text-zinc-300 dark:text-zinc-600 mr-2">€</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="0.00"
                  className="text-4xl sm:text-6xl font-light text-zinc-900 dark:text-zinc-50 bg-transparent border-none outline-none w-48 sm:w-64 text-center tabular-nums placeholder:text-zinc-200 dark:placeholder:text-zinc-600"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="text-sm text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What did you spend on?"
                className="mt-2 w-full px-0 py-3 text-lg text-zinc-900 dark:text-zinc-100 bg-transparent border-b border-zinc-200 dark:border-zinc-700 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors placeholder:text-zinc-300 dark:placeholder:text-zinc-500"
              />
            </div>

            <div>
              <label className="text-sm text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium">Category</label>
              <div className="mt-3 flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <CategoryPill
                    key={cat.id}
                    category={cat}
                    selected={selectedCategory === cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    onEdit={cat.isCustom ? () => openEditCategory(cat) : undefined}
                  />
                ))}
                <button
                  onClick={() => setShowNewCategoryModal(true)}
                  className="px-4 py-2 rounded-full text-sm font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 border-2 border-dashed border-zinc-300 dark:border-zinc-600"
                >
                  + New
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-2 w-full px-0 py-3 text-lg text-zinc-900 dark:text-zinc-100 bg-transparent border-b border-zinc-200 dark:border-zinc-700 outline-none focus:border-zinc-900 dark:focus:border-zinc-100 transition-colors"
              />
            </div>

            <Card className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Make it recurring</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Automatically repeat every month</p>
                </div>
                <Toggle checked={isRecurring} onChange={setIsRecurring} />
              </div>
              {isRecurring && (
                <div className="mt-4 pt-4 border-t border-zinc-100">
                  <Select label="Day of month" value={recurringDay} onChange={setRecurringDay} options={dayOptions} />
                </div>
              )}
            </Card>

            <Button onClick={handleAddExpense} disabled={!amount || !description || saving} className="w-full">
              {saving ? 'Saving…' : isRecurring ? 'Add Recurring Expense' : 'Add Expense'}
            </Button>

            {recentExpenses.length > 0 && (
              <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800">
                <SectionTitle>Recent</SectionTitle>
                <div className="space-y-3">
                  {recentExpenses.map((exp) => {
                    const cat = getCategory(exp.category)
                    return (
                      <div key={exp.id} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                          <span className="text-zinc-900 dark:text-zinc-100">{exp.description}</span>
                          {exp.recurringId && (
                            <span className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 text-[10px] font-medium rounded">REC</span>
                          )}
                        </div>
                        <span className="text-zinc-500 dark:text-zinc-400 tabular-nums">{formatCurrency(exp.amount)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {section === 'expenses' && view === 'dashboard' && (
          <div className="space-y-10">
            {hasFilters && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-zinc-400 dark:text-zinc-500">Filters:</span>
                {monthFilter && <FilterPill label={formatFullMonth(monthFilter)} onClear={() => { setMonthFilter(null); setDayFilter(null) }} />}
                {categoryFilter && <FilterPill label={getCategory(categoryFilter).label} onClear={() => setCategoryFilter(null)} />}
                {dayFilter && getMonthKey(dayFilter) === activeMonth && <FilterPill label={formatDayLabel(dayFilter)} onClear={() => setDayFilter(null)} />}
                <button onClick={clearFilters} className="text-sm text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 ml-2">Clear all</button>
              </div>
            )}

            <div className="text-center py-4 sm:py-6">
              <p className="text-sm text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium">
                {monthFilter ? formatFullMonth(monthFilter) : 'This Month'}
                {hasFilters && ' (filtered)'}
              </p>
              <p className="mt-2 text-4xl sm:text-5xl font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">{formatCurrency(hasFilters ? filteredTotal : activeMonthTotal)}</p>
              {!monthFilter && (
                <p className={`mt-2 text-sm font-medium ${+percentChange > 0 ? 'text-red-500' : +percentChange < 0 ? 'text-green-500' : 'text-zinc-400 dark:text-zinc-500'}`}>
                  {+percentChange > 0 ? '↑' : +percentChange < 0 ? '↓' : ''} {Math.abs(+percentChange)}% vs last month
                </p>
              )}
            </div>

            {predictionMetrics && (
              <div className="space-y-6">
                <div>
                  <SectionTitle>Predictions</SectionTitle>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Card className="p-4 sm:p-5">
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium">End of month (total)</p>
                      <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">{formatCurrency(predictionMetrics.predictedEndOfMonth)}</p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">{predictionMetrics.daysRemaining} days left</p>
                      <p className={`text-[11px] mt-1 ${vsLastMonthClass}`}>({vsLastMonthLabel})</p>
                    </Card>
                    <Card className="p-4 sm:p-5">
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium">End of month (ex. rent)</p>
                      <p className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">{formatCurrency(predictionMetrics.predictedExRent)}</p>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">Variable spending only</p>
                      <p className={`text-[11px] mt-1 ${vsLastMonthClass}`}>({vsLastMonthLabel})</p>
                    </Card>
                  </div>
                </div>

                <div>
                  <SectionTitle>Spending Habits (ex. rent)</SectionTitle>
                  <Card className="p-4 sm:p-5">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium">Daily avg</p>
                        <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">{formatCurrency(predictionMetrics.dailyAvgExRent)}</p>
                        <p className={`text-[11px] mt-1 ${vsLastMonthClass}`}>({vsLastMonthLabel})</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium">Weekly avg</p>
                        <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">{formatCurrency(predictionMetrics.weeklyAvgExRent)}</p>
                        <p className={`text-[11px] mt-1 ${vsLastMonthClass}`}>({vsLastMonthLabel})</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium">Weekday avg</p>
                        <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">{formatCurrency(predictionMetrics.weekdayAvg)}</p>
                        <p className={`text-[11px] mt-1 ${vsLastMonthClass}`}>({vsLastMonthLabel})</p>
                      </div>
                      <div>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium">Weekend avg</p>
                        <p className="mt-1 text-lg font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">{formatCurrency(predictionMetrics.weekendAvg)}</p>
                        <p className={`text-[11px] mt-1 ${vsLastMonthClass}`}>({vsLastMonthLabel})</p>
                        {predictionMetrics.weekendAvg > predictionMetrics.weekdayAvg && (
                          <p className="text-xs text-amber-500 mt-0.5">+{((predictionMetrics.weekendAvg / predictionMetrics.weekdayAvg - 1) * 100).toFixed(0)}% vs weekdays</p>
                        )}
                      </div>
                    </div>
                  </Card>
                </div>

                <div>
                  <SectionTitle>Daily Spending (ex. rent)</SectionTitle>
                  <Card className="p-4 sm:p-5">
                    {dailySpendingBars.length === 0 ? (
                      <div className="text-sm text-zinc-400 dark:text-zinc-500 text-center py-8">No spending recorded yet this month.</div>
                    ) : (
                      <>
                        <div className="flex items-end justify-between gap-0.5 sm:gap-1 h-32 sm:h-40">
                          {dailySpendingBars.map((bar) => {
                            const isToday = bar.dayNum === predictionMetrics.daysElapsed
                            const isSelected = dayFilter && normalizeDate(dayFilter) === normalizeDate(bar.date)
                            return (
                              <button
                                type="button"
                                key={bar.date}
                                onClick={() => handleDayClick(bar.date)}
                                className="flex-1 flex flex-col items-center justify-end group min-w-0 h-full"
                                aria-pressed={!!isSelected}
                                aria-label={`Day ${bar.dayNum}: ${formatCurrency(bar.amount)}`}
                                title={`Day ${bar.dayNum}: ${formatCurrency(bar.amount)}`}
                              >
                                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity mb-1 tabular-nums truncate w-full text-center">
                                  {bar.amount > 0 ? formatCurrency(bar.amount) : '—'}
                                </span>
                                <div
                                  className={`w-full max-w-[14px] sm:max-w-[18px] rounded-t-md transition-all duration-200 ${
                                    isSelected
                                      ? 'ring-2 ring-zinc-900 dark:ring-zinc-100 ring-offset-2 dark:ring-offset-zinc-900 bg-zinc-900 dark:bg-zinc-100'
                                      : isToday
                                        ? 'bg-blue-500 dark:bg-blue-400'
                                        : bar.amount > 0
                                          ? 'bg-zinc-300 dark:bg-zinc-600 hover:bg-zinc-400 dark:hover:bg-zinc-500'
                                          : 'bg-zinc-100 dark:bg-zinc-800'
                                  }`}
                                  style={{ height: `${bar.heightPct}%`, minHeight: 4 }}
                                />
                              </button>
                            )
                          })}
                        </div>
                        <div className="flex justify-between mt-3 text-[10px] text-zinc-400 dark:text-zinc-500">
                          <span>1</span>
                          <span>{predictionMetrics.daysElapsed}</span>
                        </div>
                        {dayFilter && (
                          <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400 text-center">
                            Filtering by {formatDayLabel(dayFilter)} · click bar again to clear
                          </p>
                        )}
                      </>
                    )}
                  </Card>
                </div>

              </div>
            )}

            {/* Spend mix: top 5 categories + Other as single stacked bar (ex. rent) */}
            {categoryBreakdownExRent.length > 0 && filteredTotalExRent > 0 && (
              <div>
                <SectionTitle>Spend mix (ex. rent)</SectionTitle>
                <Card className="p-4 sm:p-5">
                  <div className="w-full h-8 sm:h-10 rounded-lg overflow-hidden flex">
                    {(() => {
                      const top5 = categoryBreakdownExRent.slice(0, 5)
                      const otherAmount = categoryBreakdownExRent.slice(5).reduce((s, { amount }) => s + amount, 0)
                      const segments = top5.map(({ category, amount }) => ({ id: category.id, label: category.label, amount, color: category.color }))
                      if (otherAmount > 0) segments.push({ id: 'other', label: 'Other', amount: otherAmount, color: '#a1a1aa' })
                      const totalSeg = segments.reduce((s, { amount }) => s + amount, 0)
                      return segments.map((seg) => {
                        const pct = totalSeg > 0 ? (seg.amount / totalSeg) * 100 : 0
                        return (
                          <button
                            key={seg.id}
                            type="button"
                            onClick={() => seg.id !== 'other' && handleCategoryClick(seg.id)}
                            className={`flex items-center justify-center min-w-0 transition-opacity ${seg.id === 'other' ? 'cursor-default' : 'hover:opacity-90'}`}
                            style={{ width: `${pct}%`, backgroundColor: seg.color }}
                            title={`${seg.label}: ${formatCurrency(seg.amount)} (${pct.toFixed(0)}%)`}
                          >
                            {pct >= 10 && <span className="text-[10px] font-medium text-white truncate px-0.5">{seg.label}</span>}
                          </button>
                        )
                      })
                    })()}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-[11px] text-zinc-500 dark:text-zinc-400">
                    {(() => {
                      const top5 = categoryBreakdownExRent.slice(0, 5)
                      const otherAmount = categoryBreakdownExRent.slice(5).reduce((s, { amount }) => s + amount, 0)
                      return (
                        <>
                          {top5.map(({ category, amount }) => {
                            const pct = (amount / filteredTotalExRent) * 100
                            return (
                              <button key={category.id} type="button" onClick={() => handleCategoryClick(category.id)} className="inline-flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-zinc-200">
                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: category.color }} />
                                <span>{category.label}</span>
                                <span className="tabular-nums">{pct.toFixed(0)}%</span>
                              </button>
                            )
                          })}
                          {otherAmount > 0 && (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-zinc-400 flex-shrink-0" />
                              <span>Other</span>
                              <span className="tabular-nums">{((otherAmount / filteredTotalExRent) * 100).toFixed(0)}%</span>
                            </span>
                          )}
                        </>
                      )
                    })()}
                  </div>
                </Card>
              </div>
            )}

            <div>
              <SectionTitle>6-Month Trend (ex. rent)</SectionTitle>
              <Card className="p-4 sm:p-6">
                <div className="flex items-end gap-2 sm:gap-4 h-48 sm:h-64">
                  {monthlyDataByCategory.map(({ month, total, segments }) => {
                    const isActive = month === activeMonth
                    const isFiltered = monthFilter === month
                    const barHeightPct = maxMonth > 0 ? Math.max((total / maxMonth) * 100, 8) : 8
                    return (
                      <div
                        key={month}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleMonthClick(month)}
                        onKeyDown={(e) => e.key === 'Enter' && handleMonthClick(month)}
                        className="flex-1 flex flex-col items-center gap-2 sm:gap-3 group min-w-0 cursor-pointer"
                      >
                        <span className="text-[10px] sm:text-xs text-zinc-400 dark:text-zinc-500 tabular-nums group-hover:text-zinc-600 dark:group-hover:text-zinc-400 truncate w-full text-center hidden sm:block">{formatCurrency(total)}</span>
                        <div className="w-full h-36 sm:h-48 flex flex-col justify-end items-center">
                          <div
                            className={`w-full max-w-12 sm:max-w-16 flex flex-col rounded-t-lg overflow-hidden transition-all cursor-pointer ${isFiltered ? 'ring-2 ring-zinc-900 dark:ring-zinc-100 ring-offset-2 dark:ring-offset-zinc-900' : ''}`}
                            style={{ height: `${barHeightPct}%`, minHeight: 20 }}
                          >
                            {[...segments].reverse().map(({ category, amount }) => {
                              const segPct = total > 0 ? (amount / total) * 100 : 0
                              const isCatOther = categoryFilter && categoryFilter !== category.id
                              return (
                                <div
                                  key={category.id}
                                  title={`${category.label}: ${formatCurrency(amount)}`}
                                  className={`transition-opacity hover:opacity-90 cursor-pointer ${isCatOther ? 'opacity-30' : ''}`}
                                  style={{ height: `${segPct}%`, minHeight: segPct > 0 ? 4 : 0, backgroundColor: category.color }}
                                  onClick={(e) => { e.stopPropagation(); handleCategoryClick(category.id) }}
                                />
                              )
                            })}
                          </div>
                        </div>
                        <span className={`text-[10px] sm:text-xs font-medium whitespace-nowrap ${isFiltered || isActive ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-400'}`}>
                          {formatShortMonth(month)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </Card>
            </div>

            {categoryBreakdownExRent.length > 0 && (
              <div>
                <SectionTitle>By Category (ex. rent)</SectionTitle>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {categoryBreakdownExRent.map(({ category, amount }) => {
                    const percent = filteredTotalExRent > 0 ? (amount / filteredTotalExRent) * 100 : 0
                    const isFiltered = categoryFilter === category.id
                    const isOther = categoryFilter && categoryFilter !== category.id
                    return (
                      <button
                        key={category.id}
                        onClick={() => handleCategoryClick(category.id)}
                        className={`relative overflow-hidden rounded-2xl p-4 text-left transition-all ${
                          isFiltered ? 'ring-2 ring-zinc-900 dark:ring-zinc-100 ring-offset-2 dark:ring-offset-zinc-900' : ''
                        } ${isOther ? 'opacity-40' : 'hover:scale-[1.02]'}`}
                        style={{ backgroundColor: `${category.color}10` }}
                      >
                        <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl opacity-30" style={{ backgroundColor: category.color }} />
                        <div className="relative">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold mb-3" style={{ backgroundColor: category.color }}>
                            {category.label.slice(0, 2).toUpperCase()}
                          </div>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">{category.label}</p>
                          <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50 tabular-nums">{formatCurrency(amount)}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex-1 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: category.color }} />
                            </div>
                            <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums">{percent.toFixed(0)}%</span>
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {!hasFilters && categoryBreakdownExRent[0] && (
              <Card className="bg-gradient-to-br from-zinc-900 to-zinc-800 dark:from-zinc-800 dark:to-zinc-900 border-0 p-6 text-white">
                <h2 className="text-xs text-zinc-400 uppercase tracking-wider font-medium mb-3">Insight (ex. rent)</h2>
                <p className="text-lg">
                  <span className="font-semibold">{categoryBreakdownExRent[0].category.label}</span> is your biggest variable expense this month, accounting for{' '}
                  <span className="font-semibold">{filteredTotalExRent > 0 ? ((categoryBreakdownExRent[0].amount / filteredTotalExRent) * 100).toFixed(0) : 0}%</span> of your non-rent spending.
                </p>
              </Card>
            )}

            <div>
              <SectionTitle
                action={
                  filteredExpenses.length > 0 ? (
                    <div className="flex items-center gap-3 flex-wrap">
                      <select
                        value={transactionSort}
                        onChange={(e) => setTransactionSort(e.target.value as typeof transactionSort)}
                        className="text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-transparent border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1.5 outline-none focus:border-zinc-400 dark:focus:border-zinc-500"
                      >
                        <option value="date-desc">Date: newest first</option>
                        <option value="date-asc">Date: oldest first</option>
                        <option value="amount-desc">Amount: high to low</option>
                        <option value="amount-asc">Amount: low to high</option>
                        <option value="category-asc">Category: A–Z</option>
                        <option value="category-desc">Category: Z–A</option>
                      </select>
                      <button
                        onClick={handleExportCSV}
                        className="text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                      >
                        Export CSV
                      </button>
                    </div>
                  ) : undefined
                }
              >
                {categoryFilter || monthFilter ? 'Filtered Transactions' : 'All Transactions'}
              </SectionTitle>
              <Card className="overflow-hidden">
                {filteredExpenses.length === 0 ? (
                  <div className="px-5 py-8 text-center text-zinc-400 dark:text-zinc-500">No transactions found</div>
                ) : (
                  sortedExpenses.map((exp, i, arr) => (
                    <TransactionRow
                      key={exp.id}
                      expense={exp}
                      category={getCategory(exp.category)}
                      showBorder={i !== arr.length - 1}
                      isRecurring={!!exp.recurringId}
                      onEdit={() => openEditExpense(exp)}
                    />
                  ))
                )}
              </Card>
            </div>
          </div>
        )}

        {section === 'expenses' && view === 'recurring' && (
          <div className="space-y-8">
            <div className="text-center py-4 sm:py-6">
              <p className="text-sm text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium">Monthly Recurring</p>
              <p className="mt-2 text-3xl sm:text-4xl font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">{formatCurrency(monthlyRecurringTotal)}</p>
              <p className="mt-1 text-sm text-zinc-400 dark:text-zinc-500">{recurringExpenses.filter((r) => r.isActive).length} active expenses</p>
            </div>

            <div>
              <SectionTitle>Recurring Expenses</SectionTitle>
              {recurringExpenses.length === 0 ? (
                <Card className="p-8 text-center">
                  <p className="text-zinc-400 dark:text-zinc-500">No recurring expenses yet</p>
                  <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">Add one from the Add tab</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {recurringExpenses.map((recurring) => {
                    const cat = getCategory(recurring.category)
                    return (
                      <Card key={recurring.id} className={`p-3 sm:p-4 ${!recurring.isActive ? 'opacity-50' : ''}`}>
                        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
                          <div
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-white text-xs sm:text-sm font-medium flex-shrink-0"
                            style={{ backgroundColor: cat.color }}
                          >
                            {cat.label.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{recurring.description}</p>
                              {!recurring.isActive && (
                                <span className="px-1.5 py-0.5 bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400 text-[10px] font-medium rounded">PAUSED</span>
                              )}
                            </div>
                            <p className="text-xs sm:text-sm text-zinc-400 dark:text-zinc-500">
                              {recurring.dayOfMonth}{getOrdinalSuffix(recurring.dayOfMonth)} of month • {cat.label}
                            </p>
                            <p className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums mt-1 sm:hidden">{formatCurrency(recurring.amount)}</p>
                          </div>
                          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums hidden sm:block">{formatCurrency(recurring.amount)}</p>
                        </div>
                        <div className="flex gap-2 mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-zinc-100">
                          <Button variant="secondary" size="small" onClick={() => openEditRecurring(recurring)} className="flex-1">Edit</Button>
                          <Button variant="secondary" size="small" onClick={() => handleToggleRecurring(recurring.id)} className="flex-1">
                            {recurring.isActive ? 'Pause' : 'Resume'}
                          </Button>
                          <Button variant="danger" size="small" onClick={() => setDeletingRecurring(recurring)}>Del</Button>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>

            <Card className="p-5 bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/50">
              <p className="text-sm text-blue-900 dark:text-blue-200 font-medium">Tip</p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Recurring expenses are automatically created each month on the specified day. You can pause or modify them anytime.
              </p>
            </Card>
          </div>
        )}
      </main>

      <Modal isOpen={showNewCategoryModal} onClose={() => setShowNewCategoryModal(false)} title="New Category">
        <div className="space-y-4">
          <Input label="Category Name" value={newCategoryName} onChange={setNewCategoryName} placeholder="e.g., Travel" />
          <div>
            <label className="block text-sm text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewCategoryColor(color)}
                  className={`w-8 h-8 rounded-full transition-all ${newCategoryColor === color ? 'ring-2 ring-offset-2 ring-zinc-900 scale-110' : ''}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowNewCategoryModal(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleAddCategory} disabled={!newCategoryName.trim() || saving} className="flex-1">{saving ? 'Adding…' : 'Add Category'}</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!editingRecurring} onClose={() => setEditingRecurring(null)} title="Edit Recurring Expense">
        <div className="space-y-4">
          <Input label="Amount" type="number" value={editAmount} onChange={setEditAmount} placeholder="0.00" />
          <Input label="Description" value={editDescription} onChange={setEditDescription} placeholder="e.g., Rent" />
          <Select label="Category" value={editCategory} onChange={setEditCategory} options={categories.map((c) => ({ value: c.id, label: c.label }))} />
          <Select label="Day of Month" value={editDay} onChange={setEditDay} options={dayOptions} />
          <div className="flex gap-3 pt-4">
            <Button variant="secondary" onClick={() => setEditingRecurring(null)} className="flex-1" disabled={saving}>Cancel</Button>
            <Button onClick={handleSaveRecurring} className="flex-1" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!editingExpense} onClose={() => setEditingExpense(null)} title="Edit Expense">
        <div className="space-y-4">
          <Input label="Amount" type="number" value={expenseAmount} onChange={setExpenseAmount} placeholder="0.00" />
          <Input label="Description" value={expenseDescription} onChange={setExpenseDescription} placeholder="e.g., Grocery shopping" />
          <Select label="Category" value={expenseCategory} onChange={setExpenseCategory} options={categories.map((c) => ({ value: c.id, label: c.label }))} />
          <Input label="Date" type="date" value={expenseDate} onChange={setExpenseDate} />
          {editingExpense?.recurringId && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 rounded-xl">
              <p className="text-xs text-amber-800 dark:text-amber-200">
                This is a recurring expense. Editing only changes this specific transaction, not future ones.
              </p>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => editingExpense && handleDeleteExpense(editingExpense.id)} className="text-red-500 hover:bg-red-50" disabled={saving}>Delete</Button>
            <Button variant="secondary" onClick={() => setEditingExpense(null)} className="flex-1" disabled={saving}>Cancel</Button>
            <Button onClick={handleSaveExpense} className="flex-1" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!deletingRecurring} onClose={() => setDeletingRecurring(null)} title="Delete Recurring Expense">
        <div className="space-y-4">
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
            <p className="font-medium text-zinc-900 dark:text-zinc-100">{deletingRecurring?.description}</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {formatCurrency(deletingRecurring?.amount || 0)} on the {deletingRecurring?.dayOfMonth}{getOrdinalSuffix(deletingRecurring?.dayOfMonth || 1)} of each month
            </p>
          </div>
          <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 rounded-xl">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Note:</strong> This will only stop future charges. Past expenses from this recurring charge will remain in your history.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setDeletingRecurring(null)} className="flex-1">Cancel</Button>
            <Button variant="danger" onClick={handleDeleteRecurring} className="flex-1">Delete</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!editingCategory} onClose={() => setEditingCategory(null)} title="Edit Category">
        <div className="space-y-4">
          <Input label="Category Name" value={editCategoryName} onChange={setEditCategoryName} placeholder="e.g., Travel" />
          <div>
            <label className="block text-sm text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setEditCategoryColor(color)}
                  className={`w-8 h-8 rounded-full transition-all ${editCategoryColor === color ? 'ring-2 ring-offset-2 ring-zinc-900 scale-110' : ''}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => editingCategory && handleDeleteCategory(editingCategory.id)}
              className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              Delete
            </Button>
            <Button variant="secondary" onClick={() => setEditingCategory(null)} className="flex-1">Cancel</Button>
            <Button onClick={handleSaveCategory} disabled={!editCategoryName.trim()} className="flex-1">Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
