import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    throw new Error(
      'Supabase no configurado. Añade NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en Cloudflare (Variables) y vuelve a desplegar.'
    )
  }
  return createBrowserClient(url, key)
}
