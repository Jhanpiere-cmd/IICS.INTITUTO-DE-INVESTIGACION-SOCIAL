# IICS — Instituto de Investigación Científica Social

Sitio web institucional y portal del **Instituto de Investigación Científica Social (IICS)**, centro privado de investigación en sociología de precisión con sede en Cajamarca, Perú.

Incluye la landing pública, el portal de observatorio sociológico y el acceso al sistema de gestión interna (`/admin`).

## Stack

- **Frontend:** React 19, Vite 6, Tailwind CSS 4, Motion
- **Backend / datos:** Supabase (PostgreSQL, Auth, Edge Functions)
- **Despliegue:** Vercel

## Requisitos

- Node.js 18+
- Cuenta y proyecto en [Supabase](https://supabase.com)

## Configuración local

1. Instalar dependencias:

```bash
npm install
```

2. Crear `.env.local` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
GEMINI_API_KEY=tu_clave_gemini
```

3. Iniciar el servidor de desarrollo:

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`.

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo (puerto 3000) |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Vista previa del build |
| `npm run lint` | Verificación TypeScript de la landing |

## Estructura del proyecto

```
src/                  Landing pública (Hero, Observatorio, Publicaciones…)
components/           Panel administrativo compartido
contexts/             Autenticación (AuthContext)
lib/                  Cliente Supabase y utilidades
supabase/             Edge Functions y migraciones
iics-gestion-interna/ Sistema interno de gestión (admin extendido)
```

## Rutas principales

| Ruta | Descripción |
|------|-------------|
| `/` | Landing institucional |
| `/admin` | Sistema de gestión interna (requiere rol autorizado) |

## Despliegue

El proyecto está configurado para Vercel (`vercel.json`). Variables de entorno requeridas en producción:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY` (funciones de IA)

## Contacto

- **Web:** [iics.org](https://iics.org)
- **Email:** contacto@iics.org
- **Dirección:** Av. Atahualpa 1050, Cajamarca, Perú

## Desarrollo

Desarrollado y mantenido por [Zolexy Solutions](https://zolexy.com).
