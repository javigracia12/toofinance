# Configuración exacta para Cloudflare Pages

En **Cloudflare Pages** → tu proyecto → **Settings** → **Builds & deployments**:

| Campo | Valor |
|-------|--------|
| **Build command** | `npm run build` |
| **Build output directory** | `out` |
| **Root directory** | (vacío) |

Variables de entorno en **Settings** → **Environment variables** (Production):

| Variable | Valor |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Tu URL de Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Tu anon key de Supabase |

**Importante:** El directorio de salida debe ser **`out`**, no `.next`. Este proyecto usa export estático; la carpeta `out` se genera al hacer `npm run build`.
