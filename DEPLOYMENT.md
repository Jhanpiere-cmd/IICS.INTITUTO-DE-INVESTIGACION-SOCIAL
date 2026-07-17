# Configuración de Despliegue en Producción

## Variables de Entorno Requeridas

Para que la aplicación funcione correctamente en producción, necesitas configurar las siguientes variables de entorno en tu plataforma de despliegue (Netlify, Vercel, etc.):

### Supabase (CRÍTICO para el login)
```
VITE_SUPABASE_URL=https://kgplubpzrkjyrawafkll.supabase.co
VITE_SUPABASE_ANON_KEY=[Tu clave anon de Supabase]
```

### Google Gemini AI
```
VITE_GEMINI_API_KEY=[Tu clave de Gemini API]
```

### Otras APIs (opcional según funcionalidades requeridas)
```
VITE_OPENROUTER_API_KEY=[Tu clave de OpenRouter]
VITE_MERCURY_API_KEY=[Tu clave de Mercury]
VITE_GROQ_API_KEY=[Tu clave de Groq]
VITE_OPENAI_API_KEY=[Tu clave de OpenAI]
VITE_DEEPSEEK_API_KEY=[Tu clave de DeepSeek]
```

## Configuración en Netlify

1. Ve a tu dashboard de Netlify
2. Selecciona tu sitio
3. Ve a **Site settings** → **Build & deploy** → **Environment variables**
4. Agrega las variables de entorno listadas arriba
5. Haz **Redeploy** del sitio

## Configuración en Vercel

1. Ve a tu dashboard de Vercel
2. Selecciona tu proyecto
3. Ve a **Settings** → **Environment Variables**
4. Agrega las variables de entorno listadas arriba
5. Haz **Redeploy** del proyecto

## Verificación

Después de configurar las variables de entorno:
1. El login debería funcionar con: `jsaenztello@gmail.com` / `cajamarca2026`
2. La conexión con Supabase debería estar activa
3. Las funcionalidades de IA deberían operar correctamente

## Importante

- **Nunca** compartas las `service_role` keys en el frontend
- Las variables de entorno con prefijo `VITE_` están disponibles en el navegador
- Las variables sin prefijo `VITE_` solo están disponibles en el servidor
