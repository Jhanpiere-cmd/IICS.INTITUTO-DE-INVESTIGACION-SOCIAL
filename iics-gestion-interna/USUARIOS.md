# Gestión de Usuarios - Sistema ACS

## 📋 Usuarios Registrados

### Director
- **Nombre**: Edwar Jhanpiere Saenz Tello
- **Email**: jsaenztello@gmail.com
- **Rol**: Director
- **Contraseña**: Director2025!
- **Estado**: Activo ✅

---

## 🔧 Cómo Agregar Nuevos Usuarios

### Opción 1: Usando el Script (Recomendado)

1. **Editar el archivo** `scripts/create-director.ts`

2. **Modificar los datos del usuario:**
   ```typescript
   const { data, error } = await supabase.auth.signUp({
     email: 'nuevo@email.com',           // Cambiar email
     password: 'ContraseñaSegura123!',   // Cambiar contraseña
     options: {
       data: {
         full_name: 'Nombre Completo',   // Cambiar nombre
         role: 'Subdirector',            // Cambiar rol
       },
     },
   });
   ```

3. **Ejecutar el script:**
   ```bash
   npx tsx scripts/create-director.ts
   ```

### Opción 2: Desde Supabase Dashboard

1. Ir a: https://supabase.com/dashboard/project/ififktotbpnseqwqjkyh/auth/users

2. Hacer clic en "Add User"

3. Llenar los datos:
   - Email
   - Password
   - User Metadata (JSON):
     ```json
     {
       "full_name": "Nombre Completo",
       "role": "Subdirector"
     }
     ```

4. Hacer clic en "Create User"

---

## 👥 Roles Disponibles

Los siguientes roles están disponibles en el sistema:

1. **Director** - Acceso total al sistema
2. **Subdirector** - Segundo al mando
3. **Secretario** - Gestión de documentos
4. **Tesorero** - Gestión financiera
5. **Diseñador** - Diseño gráfico
6. **Redes sociales** - Gestión de redes
7. **Editor** - Edición de contenido
8. **Relaciones** - Relaciones públicas

---

## 📝 Plantilla para Nuevos Usuarios

Cuando agregues un nuevo usuario, usa esta plantilla:

```
### [Rol]
- **Nombre**: [Nombre Completo]
- **Email**: [email@ejemplo.com]
- **Rol**: [Rol]
- **Contraseña**: [ContraseñaTemporal]
- **Estado**: Pendiente ⏳ / Activo ✅
```

---

## ⚠️ Notas Importantes

1. **Contraseñas Temporales**: Todos los usuarios deben cambiar su contraseña después del primer inicio de sesión.

2. **Confirmación de Email**: Si está habilitada, los usuarios deben confirmar su email antes de poder iniciar sesión.

3. **Seguridad**: 
   - Las contraseñas deben tener al menos 6 caracteres
   - Se recomienda usar combinación de mayúsculas, minúsculas, números y símbolos

4. **Roles**: El rol determina los permisos y accesos del usuario en el sistema.

---

## 🔐 Cambiar Contraseña de Usuario

Si un usuario necesita cambiar su contraseña:

1. **Desde la aplicación**: 
   - Implementar función de "Olvidé mi contraseña"
   - Usar `supabase.auth.resetPasswordForEmail(email)`

2. **Desde Supabase Dashboard**:
   - Ir a Authentication > Users
   - Seleccionar el usuario
   - Hacer clic en "Reset Password"

---

## 📊 Lista de Usuarios a Agregar

A medida que me proporciones más correos y datos, los agregaré aquí:

<!-- Agregar nuevos usuarios aquí -->
