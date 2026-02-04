# Supabase

## Migraciones

### Opción 1: SQL en el dashboard (sin CLI)

1. Entra en [Supabase Dashboard](https://supabase.com/dashboard) → tu proyecto.
2. **SQL Editor** → New query.
3. Pega y ejecuta el contenido del archivo que quieras aplicar (p. ej. `migrations/002_split_food_dining.sql`).

### Opción 2: CLI (`db push`)

1. Enlaza el proyecto (solo la primera vez):
   ```bash
   npx supabase login
   npx supabase link --project-ref cxpcuwgfcsawxdcvkcic
   ```
2. Aplica las migraciones pendientes:
   ```bash
   npm run db:push
   ```

El **project ref** (`cxpcuwgfcsawxdcvkcic`) sale de tu `NEXT_PUBLIC_SUPABASE_URL` en `.env.local`.
