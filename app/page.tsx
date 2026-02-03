'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Home() {
  const router = useRouter()
  const [status, setStatus] = useState<'checking' | 'redirecting'>('checking')

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    async function redirect() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (cancelled) return
        setStatus('redirecting')
        if (session) {
          router.replace('/app')
        } else {
          router.replace('/login')
        }
      } catch {
        if (cancelled) return
        setStatus('redirecting')
        router.replace('/login')
      }
    }

    redirect()
    const t = setTimeout(() => {
      if (cancelled) return
      setStatus('redirecting')
      router.replace('/login')
    }, 4000)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [router])

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center">
      <p className="text-zinc-400 dark:text-zinc-500 text-sm">
        {status === 'checking' ? 'Loading...' : 'Redirecting...'}
      </p>
    </div>
  )
}
