'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const AUTH_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password']

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    let cancelled = false

    async function check() {
      const isAppProtected = pathname?.startsWith('/app')
      const isAuthPath = pathname ? AUTH_PATHS.some((p) => pathname.startsWith(p)) : false

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (cancelled) return

      if (isAppProtected && !session) {
        router.replace('/login')
        return
      }
      if (isAuthPath && session && !pathname?.startsWith('/reset-password')) {
        router.replace('/app')
        return
      }

      setReady(true)
    }

    check()
    return () => {
      cancelled = true
    }
  }, [pathname, router, supabase.auth])

  if (!ready && pathname?.startsWith('/app')) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center">
        <p className="text-zinc-400 dark:text-zinc-500 text-sm" role="status" aria-live="polite">
          Loading...
        </p>
      </div>
    )
  }

  return <>{children}</>
}
