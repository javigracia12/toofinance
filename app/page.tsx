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
      <div className="text-4xl sm:text-5xl font-bold text-zinc-900 tabular-nums">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="mt-2 text-sm text-zinc-500 uppercase tracking-wider">{label}</div>
    </div>
  )
}

function DeviceMockup() {
  const [activeScreen, setActiveScreen] = useState(0)
  const screens = [
    { label: 'Add Expense', color: 'bg-blue-500' },
    { label: 'Dashboard', color: 'bg-emerald-500' },
    { label: 'Recurring', color: 'bg-violet-500' },
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveScreen((prev) => (prev + 1) % screens.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [screens.length])

  return (
    <div className="relative mx-auto w-full max-w-sm">
      {/* Glow effect */}
      <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 via-violet-500/20 to-emerald-500/20 rounded-[3rem] blur-2xl animate-gradient-xy" />
      
      {/* Phone frame */}
      <div className="relative bg-zinc-900 rounded-[2.5rem] p-3 shadow-2xl">
        <div className="bg-white rounded-[2rem] overflow-hidden">
          {/* Status bar */}
          <div className="h-6 bg-zinc-100 flex items-center justify-center">
            <div className="w-20 h-4 bg-zinc-900 rounded-full" />
          </div>
          
          {/* App content */}
          <div className="p-4 h-[400px] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="text-lg font-semibold text-zinc-900">Expenses</div>
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
            <div className="flex-1 relative">
              {screens.map((screen, i) => (
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
    const supabase = createClient()

    async function check() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (cancelled) return
        if (session) {
          setStatus('redirecting')
          router.replace('/app')
        } else {
          setStatus('landing')
        }
      } catch {
        if (cancelled) return
        setStatus('landing')
      }
    }

    check()
    return () => { cancelled = true }
  }, [router])

  if (status === 'checking' || status === 'redirecting') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-200 border-t-zinc-900 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Decorative floating elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute top-20 left-[10%] w-64 h-64 rounded-full bg-blue-100/50 blur-3xl animate-float-slow" />
        <div className="absolute top-1/3 right-[5%] w-48 h-48 rounded-full bg-violet-100/50 blur-3xl animate-float-medium" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-1/4 left-[15%] w-56 h-56 rounded-full bg-emerald-100/40 blur-3xl animate-float-slow" style={{ animationDelay: '4s' }} />
      </div>

      {/* Navigation */}
      <nav className="relative z-20 max-w-6xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold text-zinc-900">
            Expenses
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-zinc-600 hover:text-zinc-900 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="px-5 py-2.5 text-sm font-medium bg-zinc-900 text-white rounded-full hover:bg-zinc-700 transition-colors"
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
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-zinc-900 leading-[1.1] tracking-tight">
              <AnimatedText text="Know where your money goes." />
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-zinc-500 max-w-xl mx-auto lg:mx-0 animate-slide-up" style={{ animationDelay: '0.5s' }}>
              Track expenses, visualize trends, and take control of your spending. Simple, fast, and always in sync.
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
      <section className="relative z-10 bg-zinc-50 border-y border-zinc-100">
        <div className="max-w-6xl mx-auto px-6 py-16 sm:py-20">
          <RevealSection>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <StatCounter value={10000} suffix="+" label="Expenses tracked" />
              <StatCounter value={500} suffix="+" label="Happy users" />
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
            Simple tools that work together to give you complete visibility into your spending.
          </p>
        </RevealSection>

        <div className="grid md:grid-cols-3 gap-6">
          <RevealSection direction="left">
            <FeatureCard
              icon={
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-2.9-2.165-2.9-3.182v-.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              title="Quick expense entry"
              description="Add expenses in seconds with smart categories and instant sync across all your devices."
            />
          </RevealSection>
          <RevealSection>
            <FeatureCard
              icon={
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              }
              title="Visual insights"
              description="Beautiful charts show monthly trends, category breakdowns, and predictions at a glance."
            />
          </RevealSection>
          <RevealSection direction="right">
            <FeatureCard
              icon={
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 00-3.7-3.7 48.678 48.678 0 00-7.324 0 4.006 4.006 0 00-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3l-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 003.7 3.7 48.656 48.656 0 007.324 0 4.006 4.006 0 003.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3l-3 3" />
                </svg>
              }
              title="Recurring made easy"
              description="Set up rent, subscriptions, and bills once. They repeat automatically every month."
            />
          </RevealSection>
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 bg-zinc-900 text-white">
        <div className="max-w-6xl mx-auto px-6 py-24 sm:py-32">
          <RevealSection className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold">How it works</h2>
            <p className="mt-4 text-lg text-zinc-400 max-w-xl mx-auto">
              Get started in under a minute. No credit card required.
            </p>
          </RevealSection>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Create your account', description: 'Sign up with your email. It takes 30 seconds.' },
              { step: '02', title: 'Add your expenses', description: 'Log purchases as they happen or add them later in bulk.' },
              { step: '03', title: 'See the big picture', description: 'Watch your dashboard reveal patterns and insights.' },
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
            Ready to take control of your spending?
          </h2>
          <p className="mt-6 text-lg text-zinc-500">
            Join hundreds of users who track their expenses effortlessly.
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
      <footer className="relative z-10 border-t border-zinc-100">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-sm text-zinc-400">Expenses App</span>
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
