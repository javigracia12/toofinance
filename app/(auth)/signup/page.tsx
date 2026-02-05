'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  }
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  )
}

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.signUp({ email, password })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    // Check if email confirmation is required
    const { data } = await supabase.auth.getSession()
    if (data.session) {
      router.push('/app')
      router.refresh()
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-zinc-900 mb-8">Expenses</h1>
        <div className="p-6 bg-zinc-50 border border-zinc-100 rounded-2xl">
          <p className="text-zinc-700">
            Check your email to confirm your account. Once confirmed, you can sign in.
          </p>
          <p className="text-sm text-zinc-500 mt-2">
            (Check your spam folder if you don&apos;t see it)
          </p>
        </div>
        <p className="mt-6 text-center text-sm text-zinc-500">
          <Link href="/login" className="font-medium text-zinc-900 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold text-zinc-900 mb-8">Expenses</h1>

      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm text-zinc-500 uppercase tracking-wider font-medium mb-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            aria-invalid={!!error}
            aria-describedby={error ? 'signup-error' : undefined}
            className="w-full px-4 py-3 text-zinc-900 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-zinc-400 transition-colors"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm text-zinc-500 uppercase tracking-wider font-medium mb-2">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              aria-invalid={!!error}
              aria-describedby={error ? 'signup-error' : undefined}
              className="w-full px-4 py-3 pr-12 text-zinc-900 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-zinc-400 transition-colors"
              placeholder="At least 6 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm text-zinc-500 uppercase tracking-wider font-medium mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              aria-invalid={!!error}
              aria-describedby={error ? 'signup-error' : undefined}
              className="w-full px-4 py-3 pr-12 text-zinc-900 bg-zinc-50 border border-zinc-200 rounded-xl outline-none focus:border-zinc-400 transition-colors"
              placeholder="Repeat your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
        </div>

        {error && (
          <div id="signup-error" className="p-3 bg-red-50 border border-red-100 rounded-xl" role="alert">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-3 bg-zinc-900 text-white font-medium rounded-xl hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400 transition-all"
        >
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-zinc-900 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
