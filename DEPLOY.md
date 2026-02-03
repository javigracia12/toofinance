# Desplegar en Cloudflare Pages

Este proyecto está listo para desplegarse en Cloudflare Pages (gratis).

## Paso 1: Preparar Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Ve a **Settings** → **API**
3. Copia tu **Project URL** y **anon public key**
4. Ve a **Authentication** → **URL Configuration**
5. En **Redirect URLs**, añade tu dominio de Cloudflare (lo obtendrás en el paso 3):
   - `https://tu-proyecto.pages.dev/reset-password`

## Paso 2: Crear cuenta en Cloudflare

1. Ve a [Cloudflare Pages](https://pages.cloudflare.com/)
2. Crea una cuenta gratis (si no tienes)
3. Click en **Create a project**

## Paso 3: Conectar tu repositorio

### Opción A: Subir a GitHub primero (Recomendado)

1. Crea un repositorio en GitHub
2. En tu terminal, ejecuta:
   ```bash
   git remote add origin https://github.com/tu-usuario/tu-repo.git
   git push -u origin main
   ```
3. En Cloudflare Pages, selecciona **Connect to Git**
4. Autoriza GitHub y selecciona tu repositorio

### Opción B: Despliegue directo (sin GitHub)

1. En Cloudflare Pages, selecciona **Direct Upload**
2. En tu terminal, ejecuta:
   ```bash
   npm run build
   ```
3. Sube la carpeta `.next` generada

## Paso 4: Configurar el proyecto en Cloudflare

### Build settings:
- **Framework preset**: Next.js
- **Build command**: `npm run build`
- **Build output directory**: `.next`
- **Root directory**: `/` (dejar vacío)

### Environment variables (muy importante):
Añade estas variables en **Settings** → **Environment variables**:

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

## Paso 5: Desplegar

1. Click en **Save and Deploy**
2. Espera a que termine el build (2-3 minutos)
3. ¡Tu app estará disponible en `https://tu-proyecto.pages.dev`!

## Actualizaciones futuras

### Si usaste GitHub:
Cada vez que hagas `git push`, Cloudflare desplegará automáticamente.

### Si usaste Direct Upload:
1. `npm run build`
2. Ve a tu proyecto en Cloudflare Pages
3. Click en **Create deployment**
4. Sube la nueva carpeta `.next`

## Dominio personalizado (opcional)

1. En Cloudflare Pages, ve a **Custom domains**
2. Click en **Set up a custom domain**
3. Sigue las instrucciones para añadir tu dominio
4. Actualiza las **Redirect URLs** en Supabase con tu nuevo dominio

## Solución de problemas

### Error: "Module not found"
- Asegúrate de que todas las dependencias estén en `package.json`
- Verifica que las variables de entorno estén configuradas

### Error: "Invalid redirect URL"
- Verifica que añadiste tu dominio de Cloudflare en Supabase → Authentication → URL Configuration

### Build falla
- Revisa los logs en Cloudflare Pages
- Asegúrate de que `npm run build` funciona localmente
