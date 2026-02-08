'use client'

import { useEffect, useState, useRef, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

// ============================================================================
// HOOKS
// ============================================================================

function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { threshold }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, isVisible }
}

function useCounter(target: number, duration = 2000, start = false) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!start) return

    let startTime: number
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      setCount(Math.floor(progress * target))
      if (progress < 1) requestAnimationFrame(step)
    }

    requestAnimationFrame(step)
  }, [target, duration, start])

  return count
}

// ============================================================================
// COMPONENTS
// ============================================================================

function AnimatedText({ text, className = '' }: { text: string; className?: string }) {
  const words = text.split(' ')
  return (
    <span className={className}>
      {words.map((word, i) => (
        <span
          key={i}
          className="inline-block animate-slide-up"
          style={{ animationDelay: `${i * 0.08}s` }}
        >
          {word}&nbsp;
        </span>
      ))}
    </span>
  )
}

function RevealSection({ children, className = '', direction = 'up' }: { children: ReactNode; className?: string; direction?: 'up' | 'left' | 'right' }) {
  const { ref, isVisible } = useInView(0.15)
  const dirClass = direction === 'left' ? 'reveal-left' : direction === 'right' ? 'reveal-right' : 'reveal'

  return (
    <div ref={ref} className={`${dirClass} ${isVisible ? 'visible' : ''} ${className}`}>
      {children}
    </div>
  )
}

function StatCounter({ value, suffix = '', label }: { value: number; suffix?: string; label: string }) {
  const { ref, isVisible } = useInView(0.3)
  const count = useCounter(value, 1500, isVisible)

  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl sm:text-5xl font-semibold text-zinc-900 tabular-nums tracking-[-0.02em]">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="mt-2 text-[13px] text-zinc-500 uppercase tracking-wider">{label}</div>
    </div>
  )
}

function DeviceMockup() {
  const [activeTab, setActiveTab] = useState<'expenses' | 'wealth'>('expenses')
  const [activeScreen, setActiveScreen] = useState(0)

  const expenseScreens = [
    { label: 'Add Expense', color: 'bg-blue-500' },
    { label: 'Dashboard', color: 'bg-emerald-500' },
    { label: 'Recurring', color: 'bg-violet-500' },
  ]
  const wealthScreens = [
    { label: 'Tracker', color: 'bg-teal-500' },
    { label: 'Dashboard', color: 'bg-indigo-500' },
    { label: 'Allocation', color: 'bg-amber-500' },
  ]

  const screens = activeTab === 'expenses' ? expenseScreens : wealthScreens

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveScreen((prev) => (prev + 1) % 3)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    setActiveScreen(0)
  }, [activeTab])

  return (
    <div className="relative mx-auto w-full max-w-sm">
      {/* Tab switcher - z-10 so it stays above glow and is clickable */}
      <div className="relative z-10 flex justify-center mb-6">
        <div
          role="tablist"
          aria-label="Product demo"
          className="inline-flex bg-zinc-200/80 rounded-full p-1 shadow-inner"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'expenses'}
            aria-controls="device-demo"
            onClick={() => setActiveTab('expenses')}
            className={`px-6 py-2.5 text-[15px] font-medium rounded-full transition-all duration-300 ease-out ${
              activeTab === 'expenses'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800 hover:bg-white/50'
            }`}
          >
            Expenses
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'wealth'}
            aria-controls="device-demo"
            onClick={() => setActiveTab('wealth')}
            className={`px-6 py-2.5 text-[15px] font-medium rounded-full transition-all duration-300 ease-out ${
              activeTab === 'wealth'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800 hover:bg-white/50'
            }`}
          >
            Wealth
          </button>
        </div>
      </div>

      {/* Glow effect - pointer-events-none so toggle stays clickable */}
      <div className="absolute -inset-4 rounded-[3rem] blur-2xl overflow-hidden pointer-events-none">
        <div
          className={`absolute inset-0 bg-gradient-to-r from-blue-500/20 via-violet-500/20 to-emerald-500/20 animate-gradient-xy transition-opacity duration-500 ${
            activeTab === 'expenses' ? 'opacity-100' : 'opacity-0'
          }`}
        />
        <div
          className={`absolute inset-0 bg-gradient-to-r from-teal-500/20 via-indigo-500/20 to-amber-500/20 animate-gradient-xy transition-opacity duration-500 ${
            activeTab === 'wealth' ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </div>

      {/* Phone frame */}
      <div id="device-demo" className="relative bg-zinc-900 rounded-[2.5rem] p-3 shadow-2xl" role="tabpanel">
        <div className="bg-white rounded-[2rem] overflow-hidden">
          {/* Status bar */}
          <div className="h-6 bg-zinc-100 flex items-center justify-center">
            <div className="w-20 h-4 bg-zinc-900 rounded-full" />
          </div>

          {/* App content */}
          <div className="p-4 h-[400px] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="text-lg font-semibold text-zinc-900 capitalize">{activeTab}</div>
              <div className="flex gap-1">
                {screens.map((s, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                      i === activeScreen ? s.color : 'bg-zinc-200'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Screen content */}
            <div className="flex-1 relative overflow-hidden">
              {activeTab === 'expenses' && (
                <>
                  {expenseScreens.map((_, i) => (
                    <div
                      key={i}
                      className={`absolute inset-0 transition-all duration-500 ${
                        i === activeScreen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
                      }`}
                    >
                      {i === 0 && (
                        <div className="space-y-4">
                          <div className="text-center py-6">
                            <div className="text-3xl font-light text-zinc-300">€</div>
                            <div className="text-5xl font-light text-zinc-900 mt-1">47.50</div>
                          </div>
                          <div className="h-12 bg-zinc-100 rounded-xl" />
                          <div className="flex gap-2 flex-wrap">
                            {['Food', 'Transport', 'Shopping'].map((cat, j) => (
                              <div
                                key={cat}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                                  j === 0 ? 'bg-orange-500 text-white' : 'bg-zinc-100 text-zinc-600'
                                }`}
                              >
                                {cat}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {i === 1 && (
                        <div className="space-y-4">
                          <div className="text-center">
                            <div className="text-xs text-zinc-400 uppercase">This Month</div>
                            <div className="text-3xl font-semibold text-zinc-900 mt-1">€1,247</div>
                          </div>
                          <div className="flex items-end justify-between h-24 px-2">
                            {[40, 65, 45, 80, 55, 70].map((h, j) => (
                              <div
                                key={j}
                                className="w-6 rounded-t-lg bg-gradient-to-t from-blue-500 to-blue-400 animate-grow-bar"
                                style={{ height: `${h}%`, animationDelay: `${j * 0.1}s` }}
                              />
                            ))}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="p-3 bg-zinc-50 rounded-xl">
                              <div className="text-xs text-zinc-400">Daily avg</div>
                              <div className="font-semibold text-zinc-900">€41</div>
                            </div>
                            <div className="p-3 bg-zinc-50 rounded-xl">
                              <div className="text-xs text-zinc-400">vs last month</div>
                              <div className="font-semibold text-emerald-500">-12%</div>
                            </div>
                          </div>
                        </div>
                      )}
                      {i === 2 && (
                        <div className="space-y-3">
                          <div className="text-center mb-4">
                            <div className="text-xs text-zinc-400 uppercase">Monthly Recurring</div>
                            <div className="text-2xl font-semibold text-zinc-900 mt-1">€890</div>
                          </div>
                          {[
                            { name: 'Rent', amount: '€650', color: 'bg-violet-500' },
                            { name: 'Netflix', amount: '€15', color: 'bg-red-500' },
                            { name: 'Gym', amount: '€45', color: 'bg-emerald-500' },
                          ].map((item, j) => (
                            <div key={j} className="flex items-center gap-3 p-3 bg-zinc-50 rounded-xl">
                              <div className={`w-8 h-8 ${item.color} rounded-lg`} />
                              <div className="flex-1">
                                <div className="font-medium text-zinc-900">{item.name}</div>
                              </div>
                              <div className="font-semibold text-zinc-900">{item.amount}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}

              {activeTab === 'wealth' && (
                <>
                  {wealthScreens.map((_, i) => (
                    <div
                      key={i}
                      className={`absolute inset-0 transition-all duration-500 ${
                        i === activeScreen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
                      }`}
                    >
                      {i === 0 && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-zinc-900 text-white rounded-xl p-3 text-center">
                              <div className="text-[10px] uppercase opacity-70">Net Worth</div>
                              <div className="text-lg font-semibold mt-0.5">€124K</div>
                            </div>
                            <div className="bg-zinc-50 rounded-xl p-3 text-center">
                              <div className="text-[10px] text-zinc-400 uppercase">Assets</div>
                              <div className="text-sm font-semibold text-emerald-600 mt-0.5">€142K</div>
                            </div>
                            <div className="bg-zinc-50 rounded-xl p-3 text-center">
                              <div className="text-[10px] text-zinc-400 uppercase">Debts</div>
                              <div className="text-sm font-semibold text-red-600 mt-0.5">€18K</div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {['Cash ›', 'Assets ›', 'Debts ›'].map((row, j) => (
                              <div key={j} className="flex items-center justify-between py-2 border-b border-zinc-100">
                                <span className="text-sm text-zinc-600">{row}</span>
                                <span className="text-sm font-medium text-zinc-900">€—</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {i === 1 && (
                        <div className="space-y-4">
                          <div className="text-center">
                            <div className="text-xs text-zinc-400 uppercase">Net Worth · Jan</div>
                            <div className="text-2xl font-semibold text-zinc-900 mt-1">€124,500</div>
                            <div className="text-xs text-emerald-500 font-medium mt-1">↑ +2.3% vs last month</div>
                          </div>
                          <div className="h-20 flex items-end gap-1">
                            {[35, 42, 38, 48, 55, 60, 65].map((h, j) => (
                              <div
                                key={j}
                                className="flex-1 rounded-t bg-zinc-300 animate-grow-bar"
                                style={{ height: `${h}%`, animationDelay: `${j * 0.08}s` }}
                              />
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <div className="flex-1 h-3 rounded-full overflow-hidden flex">
                              <div className="bg-blue-500" style={{ width: '35%' }} />
                              <div className="bg-emerald-500" style={{ width: '65%' }} />
                            </div>
                          </div>
                          <div className="flex justify-between text-[10px] text-zinc-400">
                            <span>Cash 35%</span>
                            <span>Investments 65%</span>
                          </div>
                        </div>
                      )}
                      {i === 2 && (
                        <div className="space-y-3">
                          <div className="text-xs text-zinc-400 uppercase mb-2">Asset Allocation</div>
                          {[
                            { label: 'Cash', amount: '€43K', pct: 35, color: 'bg-blue-500' },
                            { label: 'ETF', amount: '€62K', pct: 50, color: 'bg-emerald-500' },
                            { label: 'Real Estate', amount: '€18K', pct: 15, color: 'bg-amber-500' },
                          ].map((item, j) => (
                            <div key={j} className="p-3 rounded-xl" style={{ backgroundColor: `${j === 0 ? '#3b82f6' : j === 1 ? '#22c55e' : '#f59e0b'}15` }}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium text-zinc-900">{item.label}</span>
                                <span className="text-sm font-semibold text-zinc-900">{item.amount}</span>
                              </div>
                              <div className="h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${item.color} animate-grow-bar`}
                                  style={{ width: `${item.pct}%`, animationDelay: `${j * 0.15}s` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FeatureCard({ icon, title, description, delay = 0 }: { icon: ReactNode; title: string; description: string; delay?: number }) {
  return (
    <div
      className="group p-6 sm:p-8 rounded-3xl bg-white border border-zinc-200 hover:border-zinc-300 hover:shadow-xl transition-all duration-300"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="w-14 h-14 rounded-2xl bg-zinc-100 group-hover:bg-zinc-900 flex items-center justify-center mb-5 transition-colors duration-300">
        <div className="text-zinc-600 group-hover:text-white transition-colors duration-300">{icon}</div>
      </div>
      <h3 className="text-xl font-semibold text-zinc-900 mb-2">{title}</h3>
      <p className="text-zinc-500 leading-relaxed">{description}</p>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Home() {
  const router = useRouter()
  const [status, setStatus] = useState<'checking' | 'landing' | 'redirecting'>('checking')

  useEffect(() => {
    let cancelled = false
    const timeout = setTimeout(() => {
      if (cancelled) return
      setStatus('landing')
    }, 3000)

    async function check() {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (cancelled) return
        clearTimeout(timeout)
        if (session) {
          setStatus('redirecting')
          router.replace('/app')
        } else {
          setStatus('landing')
        }
      } catch {
        if (cancelled) return
        clearTimeout(timeout)
        setStatus('landing')
      }
    }

    check()
    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [router])

  if (status === 'checking' || status === 'redirecting') {
    return (
      <div className="min-h-screen bg-[#fbfbfd] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-200 border-t-[#0071e3] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fbfbfd] overflow-x-hidden">
      {/* Apple-style subtle gradient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-blue-50/80 to-transparent blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-[400px] h-[400px] rounded-full bg-gradient-to-tr from-indigo-50/60 to-transparent blur-3xl" />
        <div className="absolute -bottom-40 right-1/4 w-[350px] h-[350px] rounded-full bg-gradient-to-t from-emerald-50/50 to-transparent blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className="relative z-20 max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-[17px] font-semibold text-zinc-900 tracking-[-0.02em]">
            Valora
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-[15px] font-medium text-zinc-600 hover:text-zinc-900 transition-colors duration-200"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-[15px] font-medium text-white bg-[#0071e3] hover:bg-[#0077ed] px-5 py-2 rounded-full transition-colors duration-200"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pt-16 sm:pt-24 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left: Text */}
          <div className="text-center lg:text-left">
            <h1 className="text-[2.75rem] sm:text-5xl lg:text-[3.5rem] font-semibold text-zinc-900 leading-[1.05] tracking-[-0.03em]">
              <AnimatedText text="Your money, tracked." />
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-zinc-500 max-w-xl mx-auto lg:mx-0 animate-slide-up" style={{ animationDelay: '0.5s' }}>
              Track expenses, monitor net worth, and build wealth. One place for spending insights, asset allocation, and savings rate.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-slide-up" style={{ animationDelay: '0.7s' }}>
              <Link
                href="/signup"
                className="group px-8 py-4 text-base font-medium bg-zinc-900 text-white rounded-full hover:bg-zinc-700 transition-all shadow-lg shadow-zinc-900/20 hover:shadow-xl hover:shadow-zinc-900/25 hover:-translate-y-0.5"
              >
                Start for free
                <span className="inline-block ml-2 group-hover:translate-x-1 transition-transform">→</span>
              </Link>
              <Link
                href="/login"
                className="px-8 py-4 text-base font-medium text-zinc-700 hover:text-zinc-900 transition-colors"
              >
                I have an account
              </Link>
            </div>
          </div>

          {/* Right: Device mockup */}
          <div className="animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <DeviceMockup />
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 bg-white/80 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 sm:px-8 py-20 sm:py-24">
          <RevealSection>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <StatCounter value={10000} suffix="+" label="Expenses tracked" />
              <StatCounter value={5000} suffix="+" label="Wealth snapshots" />
              <StatCounter value={15} label="Categories" />
              <StatCounter value={99} suffix="%" label="Uptime" />
            </div>
          </RevealSection>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-24 sm:py-32">
        <RevealSection className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900">Everything you need to manage money</h2>
          <p className="mt-4 text-lg text-zinc-500 max-w-2xl mx-auto">
            Expenses and wealth in one place. Complete visibility into spending, net worth, and asset allocation.
          </p>
        </RevealSection>

        <div className="space-y-16">
          {/* Expenses features */}
          <RevealSection>
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-6">Expenses</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <FeatureCard
                icon={
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-2.9-2.165-2.9-3.182v-.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                title="Quick expense entry"
                description="Add expenses in seconds with smart categories and instant sync across all your devices."
              />
              <FeatureCard
                icon={
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                }
                title="Visual insights"
                description="Beautiful charts show monthly trends, category breakdowns, and predictions at a glance."
              />
              <FeatureCard
                icon={
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
                  </svg>
                }
                title="Recurring made easy"
                description="Set up rent, subscriptions, and bills once. They repeat automatically every month."
              />
            </div>
          </RevealSection>

          {/* Wealth features */}
          <RevealSection>
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-6">Wealth</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <FeatureCard
                icon={
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                  </svg>
                }
                title="Net worth tracking"
                description="Track cash, assets, and debts by month in an editable table. See your net worth evolve over time."
              />
              <FeatureCard
                icon={
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                }
                title="Wealth dashboard"
                description="Line charts for net worth, income vs spending, savings rate, and expense comparison."
              />
              <FeatureCard
                icon={
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
                  </svg>
                }
                title="Asset allocation"
                description="See composition at a glance. Drill into Cash, ETF, real estate—expand to view individual holdings."
              />
            </div>
          </RevealSection>
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 bg-zinc-900 text-white">
        <div className="max-w-5xl mx-auto px-6 sm:px-8 py-24 sm:py-32">
          <RevealSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold">How it works</h2>
            <p className="mt-4 text-lg text-zinc-400 max-w-xl mx-auto">
              Get started in under a minute. No credit card required.
            </p>
          </RevealSection>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Create your account', description: 'Sign up with your email. It takes 30 seconds.' },
              { step: '02', title: 'Add expenses and wealth data', description: 'Log purchases and track cash, assets, and debts in the tracker.' },
              { step: '03', title: 'See spending and net worth insights', description: 'Dashboards reveal patterns, allocation, and savings rate.' },
            ].map((item, i) => (
              <RevealSection key={i} className="text-center md:text-left">
                <div className="inline-block px-4 py-2 bg-white/10 rounded-full text-sm font-mono text-zinc-300 mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-zinc-400">{item.description}</p>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 py-24 sm:py-32">
        <RevealSection className="text-center">
          <h2 className="text-3xl sm:text-5xl font-bold text-zinc-900 max-w-2xl mx-auto leading-tight">
            Ready to understand your money?
          </h2>
          <p className="mt-6 text-lg text-zinc-500">
            Track expenses and net worth in one place.
          </p>
          <div className="mt-10">
            <Link
              href="/signup"
              className="inline-flex items-center px-10 py-5 text-lg font-medium bg-zinc-900 text-white rounded-full hover:bg-zinc-700 transition-all shadow-lg shadow-zinc-900/20 hover:shadow-xl hover:shadow-zinc-900/25 hover:-translate-y-0.5"
            >
              Get started free
              <svg className="ml-3 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </RevealSection>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-zinc-200/80">
        <div className="max-w-5xl mx-auto px-6 sm:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-sm text-zinc-400">Valora</span>
            <div className="flex gap-6">
              <Link href="/login" className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors">Log in</Link>
              <Link href="/signup" className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors">Sign up</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
