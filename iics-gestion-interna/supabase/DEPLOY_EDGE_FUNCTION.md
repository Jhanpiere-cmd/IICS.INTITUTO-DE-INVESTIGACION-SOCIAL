# Guía de Deployment: Edge Function create-user

Esta guía te ayudará a deployar la Edge Function que permite crear usuarios auto-verificados.

## 📋 Requisitos Previos

- Cuenta de Supabase activa
- Proyecto de Supabase ya creado
- Node.js instalado (para Supabase CLI)

---

## 🚀 Paso 1: Instalar Supabase CLI

### Windows (PowerShell como Administrador):

**Opción A - Usando Scoop:**
```powershell
# Si no tienes Scoop, instálalo primero:
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
irm get.scoop.sh | iex

# Luego instala Supabase CLI:
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Opción B - Usando npm:**
```powershell
npm install -g supabase
```

**Verificar instalación:**
```powershell
supabase --version
```

---

## 🔐 Paso 2: Autenticación

```powershell
cd "d:\Sistema oficial de Gestion ACS"
supabase login
```

Se abrirá tu navegador para autorizar el acceso.

---

## 🔗 Paso 3: Vincular tu Proyecto

```powershell
supabase link --project-ref <TU_PROJECT_ID>
```

**¿Dónde encontrar el PROJECT_ID?**
1. Ve a tu Dashboard de Supabase
2. Selecciona tu proyecto
3. Ve a Settings → General
4. Copia el "Reference ID"

---

## 🔑 Paso 4: Configurar Service Role Key

La Service Role Key es necesaria para que la Edge Function pueda crear usuarios.

**¿Dónde encontrarla?**
1. Dashboard de Supabase → Settings → API
2. Busca la sección "Project API keys"
3. Copia la clave `service_role` (secreta - ⚠️ nunca la compartas)

**Configurarla como secret:**
```powershell
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="eyJ... (tu clave completa)"
```

**Verificar que se guardó:**
```powershell
supabase secrets list
```

Deberías ver `SUPABASE_SERVICE_ROLE_KEY` en la lista.

---

## 📦 Paso 5: Deploy de la Edge Function

```powershell
supabase functions deploy create-user
```

Salida esperada:
```
Deploying Function create-user
✓ Function create-user deployed successfully
Function URL: https://<tu-project-ref>.supabase.co/functions/v1/create-user
```

---

## ✅ Paso 6: Verificar Deployment

### Listar funciones deployadas:
```powershell
supabase functions list
```

Deberías ver algo como:
```
create-user    deployed    2024-01-24
```

### Test básico de la función:
```powershell
# Reemplaza <PROJECT_REF> con tu Project Reference ID
curl -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/create-user" ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer <TU_ANON_KEY>" ^
  -d "{\"test\": true}"
```

Debería retornar un error de autenticación (lo cual es correcto, significa que la función está activa).

---

## 🔧 Paso 7: Configurar en tu Frontend

La Edge Function ya está deployada. Ahora asegúrate de que tu código frontend la está llamando correctamente.

**El código en `UserManagement.tsx` debe tener:**
```typescript
const { data, error } = await supabase.functions.invoke('create-user', {
  body: {
    email: newUser.email,
    password: newUser.password,
    full_name: newUser.full_name,
    role: newUser.role
  }
});
```

---

## 🧪 Paso 8: Probar la Función

1. Inicia sesión como Director en tu aplicación
2. Ve a http://localhost:3000/users
3. Haz clic en "Agregar Miembro"
4. Completa el formulario y crea un usuario de prueba
5. Cierra sesión
6. Intenta iniciar sesión con el nuevo usuario
7. ✅ **Verificar:** NO debe pedir verificación de email

---

## 🐛 Troubleshooting

### Error: "Function not found"
- Verifica que hiciste `supabase link` correctamente
- Ejecuta `supabase functions list` para ver si la función está deployada

### Error: "Service role key not configured"
- Ejecuta `supabase secrets list` para verificar que la key está configurada
- Asegúrate de que el nombre sea exactamente `SUPABASE_SERVICE_ROLE_KEY`

### Error: "Solo el Director puede crear usuarios"
- Verifica que estás iniciado sesión como usuario con rol "Director"
- Revisa la tabla `users` en Supabase para confirmar tu rol

### Ver logs de la función:
```powershell
supabase functions logs create-user --tail
```

---

## 📝 Comandos Útiles

```powershell
# Ver logs en tiempo real
supabase functions logs create-user --tail

# Re-deployar después de cambios
supabase functions deploy create-user

# Eliminar la función (si es necesario)
supabase functions delete create-user

# Listar todos los secrets configurados
supabase secrets list

# Actualizar un secret
supabase secrets set NOMBRE_SECRET="nuevo-valor"
```

---

## 🎉 ¡Listo!

Tu Edge Function de auto-verificación de usuarios está deployada y funcionando. Ahora cuando el Director cree usuarios, estos podrán iniciar sesión inmediatamente sin necesidad de verificar su email.
