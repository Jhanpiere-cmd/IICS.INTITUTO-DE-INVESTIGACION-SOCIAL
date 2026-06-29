# 🎨 LOGO EN PANTALLA DE LOGIN - INSTRUCCIONES

## ✅ **CAMBIOS REALIZADOS**

### **Archivo modificado:**
- `components/common/Logo.tsx` ✅

### **¿Qué se hizo?**
Se actualizó el componente Logo para mostrar la imagen en un diseño circular atractivo con:
- ✅ Forma circular perfecta
- ✅ Borde decorativo con gradiente
- ✅ Sombra elegante
- ✅ Efecto de marco blanco
- ✅ Responsive a diferentes tamaños

---

## 📋 **PASO IMPORTANTE: Copiar la imagen**

Para que el logo se vea correctamente, necesitas copiar la imagen a la carpeta pública:

### **Opción 1: Manual (Recomendado)**

**Paso a paso:**

1. **Copia el archivo:**
   ```
   Origen: d:\Sistema oficial de Gestion ACS\images\Image_fx (34).jpg
   Destino: d:\Sistema oficial de Gestion ACS\public\images\
   ```

2. **Si la carpeta `public\images\` no existe:**
   - Crea la carpeta `images` dentro de `public`
   - Pega el archivo allí

3. **Renombra el archivo (opcional pero recomendado):**
   ```
   De: Image_fx (34).jpg
   A: logo-acs.jpg
   ```

4. **Si renombraste, actualiza Logo.tsx:**
   ```tsx
   // Línea 21 en Logo.tsx
   src="/images/logo-acs.jpg"  // Cambia esto si renombraste
   ```

### **Opción 2: Comando (Windows PowerShell)**

```powershell
# 1. Crear carpeta si no existe
New-Item -ItemType Directory -Force -Path "d:\Sistema oficial de Gestion ACS\public\images"

# 2. Copiar imagen
Copy-Item "d:\Sistema oficial de Gestion ACS\images\Image_fx (34).jpg" "d:\Sistema oficial de Gestion ACS\public\images\"

# 3. Renombrar (opcional)
Rename-Item "d:\Sistema oficial de Gestion ACS\public\images\Image_fx (34).jpg" "logo-acs.jpg"
```

---

## 🎨 **DISEÑO DEL LOGO**

### **Características visuales:**

```
┌─────────────────────────────────────┐
│                                     │
│         ╔═══════════════╗          │
│         ║    ┌─────┐    ║          │
│         ║    │     │    ║          │
│         ║    │ IMG │    ║  Círculo │
│         ║    │     │    ║          │
│         ║    └─────┘    ║          │
│         ╚═══════════════╝          │
│          Borde gradiente            │
│                                     │
└─────────────────────────────────────┘
```

### **Capas del diseño:**

1. **Capa externa:** Borde decorativo translúcido
2. **Capa media:** Gradiente indigo-purple
3. **Capa interna:** Círculo blanco
4. **Imagen:** Logo centrado y recortado en círculo

---

## 🎯 **CÓMO SE VE EN LOGIN**

### **Pantalla de inicio de sesión:**

```
┌──────────────────────────────────────┐
│                                      │
│           ⭕ LOGO CIRCULAR            │
│                                      │
│           SGR-ACS                    │
│   Sistema de Gestión de Revista     │
│  Equipo de Comunicación y Marketing  │
│   Facultad de Ciencias Sociales      │
│                                      │
│   ┌────────────────────────────┐    │
│   │ 📧 Email                   │    │
│   └────────────────────────────┘    │
│   ┌────────────────────────────┐    │
│   │ 🔒 Contraseña              │    │
│   └────────────────────────────┘    │
│                                      │
│   [ INICIAR SESIÓN ]                │
│                                      │
└──────────────────────────────────────┘
```

---

## 🔧 **PERSONALIZACIÓN**

### **Cambiar el tamaño del logo:**

En `Login.tsx` línea 38:
```tsx
<Logo useImage={true} size={120} />  // Cambia 120 por el tamaño deseado
```

Tamaños recomendados:
- **Pequeño:** `size={80}`
- **Mediano:** `size={120}` ✅ (actual)
- **Grande:** `size={150}`

---

### **Cambiar los colores del borde:**

En `Logo.tsx` línea 16:
```tsx
// Cambiar gradiente del borde
className="... from-indigo-100 to-purple-100 ..."

// Opciones:
// Azul: from-blue-100 to-cyan-100
// Verde: from-green-100 to-emerald-100
// Rojo: from-red-100 to-pink-100
// Naranja: from-orange-100 to-yellow-100
```

---

### **Cambiar el borde decorativo:**

En `Logo.tsx` línea 38:
```tsx
className="... border-4 border-indigo-500/20"

// border-4 = grosor (1-8)
// border-indigo-500 = color
// /20 = opacidad (0-100)
```

---

## 🎭 **VARIANTES DE DISEÑO**

### **Opción 1: Logo circular actual** ✅
```tsx
// Ya implementado
- Forma: Círculo perfecto
- Borde: Gradiente + anillo decorativo
- Efecto: Sombra suave
```

### **Opción 2: Logo cuadrado con esquinas redondeadas**
```tsx
// En Logo.tsx, cambiar:
className="rounded-full" → className="rounded-3xl"
```

### **Opción 3: Logo sin borde decorativo**
```tsx
// Eliminar líneas 36-40 en Logo.tsx
{/* Anillo decorativo */}
<div className="..."></div>
```

---

## 🚀 **VERIFICACIÓN**

### **Checklist:**

- [ ] Imagen copiada a `public/images/`
- [ ] Ruta correcta en `Logo.tsx`
- [ ] Servidor reiniciado
- [ ] Logo se ve en pantalla de login
- [ ] Logo es circular
- [ ] Logo tiene borde decorativo
- [ ] Logo se ve bien en diferentes tamaños

### **Si el logo NO aparece:**

1. **Verifica la ruta:**
   ```tsx
   // En Logo.tsx línea 21
   src="/images/Image_fx (34).jpg"  // ¿Es correcta?
   ```

2. **Verifica que la imagen existe:**
   ```
   d:\Sistema oficial de Gestion ACS\public\images\Image_fx (34).jpg
   ```

3. **Reinicia el servidor de desarrollo:**
   ```bash
   npm run dev
   ```

4. **Limpia caché del navegador:**
   ```
   Ctrl + Shift + R (Windows/Linux)
   Cmd + Shift + R (Mac)
   ```

---

## 🎨 **ALTERNATIVA: Usar SVG por defecto**

Si prefieres no usar imagen, el sistema ya tiene un SVG hermoso con:
- Escorpión estilizado (símbolo de ACS)
- Gradiente indigo-purple
- Texto "SGR"

Para usarlo:
```tsx
// En Login.tsx línea 38
<Logo useImage={false} size={120} />  // false en lugar de true
```

---

## 📝 **RESUMEN RÁPIDO**

1. **Copia la imagen** de `images/` a `public/images/`
2. **Reinicia el servidor** (`npm run dev`)
3. **Abre el login** y verás el logo circular
4. **¡Listo!** El logo se verá profesional y atractivo

---

## 🆘 **SOPORTE**

Si tienes problemas:
1. Verifica que la imagen esté en la carpeta correcta
2. Verifica que la ruta en `Logo.tsx` sea correcta
3. Limpia caché del navegador
4. Reinicia el servidor

---

**¡LOGO CONFIGURADO!** 🎉

*El login ahora tiene un diseño profesional con tu logo circular*
