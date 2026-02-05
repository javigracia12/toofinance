'use client'

import { ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl ${className}`}>
      {children}
    </div>
  )
}

export function MetricCard({ label, value, subtext }: { label: string; value: string; subtext?: ReactNode }) {
  return (
    <Card className="p-5">
      <p className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium">{label}</p>
      <p className="mt-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">{value}</p>
      {subtext && <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">{subtext}</p>}
    </Card>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-sm text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium">{children}</h2>
      {action}
    </div>
  )
}

export function FilterPill({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button
      onClick={onClear}
      className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium rounded-full hover:bg-zinc-700 dark:hover:bg-white transition-colors"
    >
      {label}
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
        className={`w-12 h-7 rounded-full transition-colors relative ${checked ? 'bg-zinc-900' : 'bg-zinc-200'}`}
      >
        <div
          className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </div>
      {label && <span className="text-sm text-zinc-700">{label}</span>}
    </label>
  )
}

export function Button({
  children, onClick, disabled = false, variant = 'primary', size = 'default', className = '',
}: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; variant?: 'primary' | 'secondary' | 'danger'; size?: 'default' | 'small'; className?: string
}) {
  const baseStyles = 'font-medium rounded-xl transition-all'
  const sizeStyles = size === 'small' ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'
  const variants = {
    primary: 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white disabled:bg-zinc-200 dark:disabled:bg-zinc-700 disabled:text-zinc-400 dark:disabled:text-zinc-500',
    secondary: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700',
    danger: 'bg-red-500 text-white hover:bg-red-600',
  }
  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyles} ${sizeStyles} ${variants[variant]} ${className}`}>
      {children}
    </button>
  )
}

export function Input({
  label, type = 'text', value, onChange, placeholder, className = '',
}: {
  label?: string; type?: string; value: string; onChange: (value: string) => void; placeholder?: string; className?: string
}) {
  return (
    <div className={className}>
      {label && <label className="block text-sm text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium mb-2">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onWheel={type === 'number' ? (e) => e.currentTarget.blur() : undefined}
        placeholder={placeholder}
        className="w-full px-4 py-3 text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors placeholder:text-zinc-300 dark:placeholder:text-zinc-500"
      />
    </div>
  )
}

export function Select({
  label, value, onChange, options,
}: {
  label?: string; value: string | number; onChange: (value: string) => void; options: { value: string | number; label: string }[]
}) {
  return (
    <div>
      {label && <label className="block text-sm text-zinc-400 dark:text-zinc-500 uppercase tracking-wider font-medium mb-2">{label}</label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none focus:border-zinc-400 dark:focus:border-zinc-500 transition-colors"
      >
        {options.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  )
}
