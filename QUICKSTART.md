# 🚀 Guía Rápida de Despliegue

## Opción 1: Despliegue Automático con GitHub (Recomendado)

### 1️⃣ Sube tu código a GitHub

```bash
# Crea un nuevo repositorio en github.com
# Luego ejecuta:

git remote add origin https://github.com/tu-usuario/expenses-app.git
git push -u origin main
```

### 2️⃣ Conecta con Cloudflare Pages

1. Ve a [dash.cloudflare.com](https://dash.cloudflare.com/)
2. **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
3. Autoriza GitHub y selecciona tu repositorio
4. Configura el build:
   - **Build command**: `npm run build`
   - **Build output directory**: `out`

### 3️⃣ Añade Variables de Entorno

En Cloudflare Pages → **Settings** → **Environment variables**:

```
NEXT_PUBLIC_SUPABASE_URL=https://cxpcuwgfcsawxdcvkcic.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

### 4️⃣ Configura Supabase

En [supabase.com](https://supabase.com/dashboard) → tu proyecto:

1. **Authentication** → **URL Configuration** → **Redirect URLs**
2. Añade: `https://tu-proyecto.pages.dev/reset-password`
3. Guarda

### ✅ ¡Listo!

Tu app estará en: `https://tu-proyecto.pages.dev`

Cada vez que hagas `git push`, se desplegará automáticamente.

---

## Opción 2: Despliegue Manual (Sin GitHub)

### 1️⃣ Build local

```bash
npm run build
```

### 2️⃣ Instala Wrangler (CLI de Cloudflare)

```bash
npm install -g wrangler
wrangler login
```

### 3️⃣ Despliega

```bash
npx wrangler pages deploy out --project-name=toofinance
```

### 4️⃣ Añade variables de entorno

```bash
wrangler pages secret put NEXT_PUBLIC_SUPABASE_URL
wrangler pages secret put NEXT_PUBLIC_SUPABASE_ANON_KEY
```

---

## 🔧 Solución de Problemas

### Build falla en Cloudflare
- Verifica que `npm run build` funciona localmente
- Revisa los logs en Cloudflare Pages

### "Invalid redirect URL" al hacer reset password
- Añade tu dominio en Supabase → Authentication → URL Configuration

### No puedo hacer login después de desplegar
- Verifica que las variables de entorno estén correctas
- Revisa la consola del navegador (F12) para errores

---

## 📱 Próximos Pasos

1. **Dominio personalizado**: Cloudflare Pages → Custom domains
2. **Analytics**: Cloudflare Web Analytics (gratis)
3. **Email personalizado**: Configura SMTP en Supabase para emails desde tu dominio
