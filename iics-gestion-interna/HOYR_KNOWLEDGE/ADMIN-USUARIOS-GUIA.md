# 👥 GUÍA COMPLETA: ADMINISTRACIÓN DE USUARIOS Y GESTIÓN DE ROLES

## 🎯 RESUMEN DE LO IMPLEMENTADO

El sistema ahora cuenta con un **módulo completo de administración de usuarios** diseñado para el Director, con capacidades de:

- ✅ Crear nuevos usuarios con correo y contraseña
- ✅ Cambiar roles de usuarios existentes
- ✅ Eliminar usuarios
- ✅ Crear roles/cargos personalizados
- ✅ Editar nombres de roles
- ✅ Eliminar roles (si no tienen usuarios asignados)
- ✅ **TODO sincronizado con Supabase**
- ✅ **Gemini personaliza según el cargo del usuario**

---

## 📊 LINEAMIENTOS ACTUALIZADOS

**Equipo actual:** 8 MIEMBROS ACTIVOS (antes eran 11)

### Estructura Actualizada:

1. **Director** - Edwar Jhanpiere Saenz Tello
   - Supervisión estratégica
   - Capacitaciones
   - **Gestión de usuarios del sistema** ← NUEVO

2. **Subdirectora** - Mayra Eneli García Leiva
   - Apoyo en supervisión
   - Representación en eventos

3. **Secretaria** - Silvana Hernández
   - Gestión de documentación
   - Actas de reuniones

4. **Jefa de Imagen** - Gresia Julissa Victorio Tirado
   - Dirección de imagen
   - Producción audiovisual

5-6. **Auxiliares Técnicos** (2) - Alisson Vásquez, Kevin Castrejón
   - Creación de contenido visual
   - Apoyo en eventos

7. **Gestor de Redes** - Steven Zamora
   - Administración de redes sociales
   - Edición multimedia

8. **Coordinadora de Eventos** - Eliana Chuquimango
   - Planificación de eventos
   - Logística y protocolo

*Nota: "Relaciones Institucionales" por reclutar*

---

## 🔐 ACCESO AL PANEL DE ADMINISTRACIÓN

### **Solo el Director tiene acceso**

1. Iniciar sesión como Director
2. Click en el menú lateral: **"Usuarios"** 👥
3. Se abre el panel de administración completo

---

## 🎨 FUNCIONALIDADES DEL PANEL

### **1. AGREGAR NUEVO USUARIO** ➕

**Botón:** "Agregar Usuario" (azul, esquina superior)

**Formulario:**
```
┌───────────────────────────────────┐
│ Agregar Nuevo Usuario             │
├───────────────────────────────────┤
│ Nombre Completo:                  │
│ [Juan Pérez García]               │
│                                   │
│ Correo Electrónico:               │
│ [correo@example.com]              │
│                                   │
│ Cargo/Rol:                        │
│ [▼ Seleccionar cargo...]          │
│                                   │
│ Contraseña:                       │
│ [********] [Generar]              │
│                                   │
│ [Crear Usuario] [Cancelar]        │
└───────────────────────────────────┘
```

**Proceso:**
1. Completa todos los campos
2. Puedes generar contraseña automática
3. Click en "Crear Usuario"
4. **¡IMPORTANTE!** Guarda el correo y contraseña para dárselos al nuevo miembro
5. El usuario se crea automáticamente en Supabase

**Ejemplo real:**
```
Nombre: María García López
Email: maria.garcia@unc.edu.pe
Cargo: Auxiliar Técnico
Contraseña: AbC12345 (generada automáticamente)

→ Le das estos datos a María
→ María puede iniciar sesión inmediatamente
→ Gemini la reconoce y personaliza según su cargo
```

---

### **2. CAMBIAR ROL DE USUARIO** ✏️

**En la tabla de usuarios:**

```
┌─────────────────────────────────────────────────────┐
│ USUARIO    │ CORREO         │ CARGO    │ ACCIONES  │
├─────────────────────────────────────────────────────┤
│ Juan Pérez │ juan@unc.pe    │[Director]│ [✏️] [🗑️]│
│ María G.   │ maria@unc.pe   │[Auxiliar]│ [✏️] [🗑️]│
└─────────────────────────────────────────────────────┘
```

**Para cambiar rol:**
1. Click en el icono de editar ✏️
2. Se convierte en dropdown
3. Selecciona nuevo cargo
4. Click en guardar ✅
5. **Se actualiza en Supabase automáticamente**
6. **Gemini reconoce el nuevo cargo inmediatamente**

---

### **3. ELIMINAR USUARIO** 🗑️

**Precaución:** Esta acción es **permanente**

**Proceso:**
1. Click en icono de basura 🗑️
2. Confirma la acción
3. Usuario eliminado de:
   - Supabase Auth
   - Tabla de usuarios
   - Sistema completo

**Nota:** No puedes eliminarte a ti mismo (el Director actual)

---

### **4. GESTIONAR ROLES PERSONALIZADOS** 🛡️

**Botón:** "Gestionar Roles" (morado, esquina superior)

#### **Crear Nuevo Rol:**

```
┌───────────────────────────────────┐
│ Crear Nuevo Rol                   │
├───────────────────────────────────┤
│ Nombre del rol:                   │
│ [Fotógrafo]                       │
│                                   │
│ Descripción:                      │
│ [Captura fotográfica de eventos   │
│  y edición de imágenes]           │
│                                   │
│ [Crear Rol]                       │
└───────────────────────────────────┘
```

**Ejemplos de roles que puedes crear:**
- Fotógrafo
- Editor de Video
- Community Manager
- Diseñador Web
- Redactor
- Investigador
- Analista de Datos
- Etc.

#### **Ver Roles Existentes:**

```
┌─────────────────────────────────────────┐
│ Roles Existentes (9)                    │
├─────────────────────────────────────────┤
│ Director                          [🗑️]  │
│ • Supervisión estratégica...             │
│ • 1 usuario(s) con este rol              │
│                                          │
│ Subdirector                       [🗑️]  │
│ • Apoyo en supervisión...                │
│ • 1 usuario(s) con este rol              │
│                                          │
│ [... más roles ...]                      │
└─────────────────────────────────────────┘
```

#### **Eliminar Rol:**

**Condición:** Solo se puede eliminar si **0 usuarios** tienen ese rol

**Proceso:**
1. Si hay usuarios: "No se puede eliminar. X usuario(s) tienen este rol"
2. Si no hay usuarios: Click en 🗑️ → Confirmar → Eliminado

---

## 🤖 GEMINI - PERSONALIZACIÓN AUTOMÁTICA

**Gemini ahora personaliza según el cargo de cada usuario:**

### **Ejemplos de personalización:**

**Director:**
```
Usuario: ¿Qué necesito revisar hoy?
Gemini: Como Director, te sugiero:
        1. Revisar métricas del equipo
        2. Supervisar tareas pendientes de alta prioridad
        3. Coordinar con la Dra. Doris sobre el próximo evento
        4. Verificar avance de propuestas en revisión
```

**Auxiliar Técnico:**
```
Usuario: ¿Qué necesito hacer hoy?
Gemini: Como Auxiliar Técnico, te recomiendo:
        1. Terminar el flyer para el evento del viernes
        2. Editar el video de la reunión anterior
        3. Preparar material visual para redes
```

**Secretaria:**
```
Usuario: ¿Qué pendientes tengo?
Gemini: Como Secretaria, tus pendientes son:
        1. Redactar acta de la reunión de ayer
        2. Organizar agenda para la próxima semana
        3. Archivar documentos del mes anterior
```

**Gemini conoce:**
- ✅ Los 8 miembros actuales del equipo
- ✅ Los lineamientos operativos actualizados
- ✅ La base legal (Constitución, Ley N° 28740, Estatuto UNC)
- ✅ El rol específico de cada usuario
- ✅ Funciones de cada cargo

---

## 📋 BASE DE DATOS - ESTRUCTURA

### **Tabla: `custom_roles`**

```sql
CREATE TABLE custom_roles (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE,        -- Nombre del rol
  description TEXT,        -- Descripción de funciones
  created_by UUID,         -- Quién creó el rol
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Roles incluidos por defecto:**
- Director
- Subdirector
- Secretario
- Jefe de Imagen
- Auxiliar Técnico
- Gestor de Redes
- Coordinador de Eventos
- Relaciones Institucionales
- Asesor

### **Tabla: `users`** (actualizada)

```sql
-- El rol ahora puede ser cualquier valor de custom_roles
role TEXT  -- Ya no está limitado a valores fijos
```

---

## 🔄 FLUJO COMPLETO: AGREGAR NUEVO MIEMBRO

### **Escenario:** Contratar a un nuevo "Fotógrafo"

**Paso 1: Crear el cargo (si no existe)**
```
1. Panel Usuarios → "Gestionar Roles"
2. Crear Nuevo Rol:
   - Nombre: Fotógrafo
   - Descripción: Captura fotográfica de eventos, edición de imágenes, cobertura visual
3. Click "Crear Rol"
```

**Paso 2: Agregar usuario**
```
1. Panel Usuarios → "Agregar Usuario"
2. Llenar formulario:
   - Nombre: Carlos Mendoza Ruiz
   - Email: carlos.mendoza@unc.edu.pe
   - Cargo: Fotógrafo (seleccionar del dropdown)
   - Contraseña: [Generar] → "Xy7Km2Pq"
3. Click "Crear Usuario"
```

**Paso 3: Entregar credenciales**
```
WhatsApp/Email a Carlos:
"Hola Carlos, ya tienes acceso al sistema SGR:

📧 Correo: carlos.mendoza@unc.edu.pe
🔑 Contraseña: Xy7Km2Pq

Ingresa a: [URL del sistema]

Una vez dentro, puedes cambiar tu contraseña en Ajustes.
¡Bienvenido al equipo!"
```

**Paso 4: Carlos inicia sesión**
```
1. Carlos va al sistema
2. Inicia sesión con sus credenciales
3. Gemini lo reconoce automáticamente:
   "¡Hola Carlos! Como Fotógrafo del equipo, puedo ayudarte con..."
4. Ve su dashboard personalizado
5. Tiene acceso según su rol
```

---

## 🎯 CASOS DE USO PRÁCTICOS

### **Caso 1: Cambio de Cargo**

**Situación:** Alisson pasa de "Auxiliar Técnico" a "Jefa de Imagen"

```
1. Panel Usuarios → Buscar a Alisson
2. Click en ✏️ (editar)
3. Cambiar rol: "Auxiliar Técnico" → "Jefa de Imagen"
4. Click en ✅ (guardar)

Resultado:
- Alisson ahora tiene permisos de Jefa de Imagen
- Gemini la trata como Jefa de Imagen
- Su perfil muestra el nuevo cargo
```

### **Caso 2: Miembro Sale del Equipo**

**Situación:** Kevin deja el equipo

```
1. Panel Usuarios → Buscar a Kevin
2. Click en 🗑️ (eliminar)
3. Confirmar: "¿Estás seguro...?"
4. Usuario eliminado

Resultado:
- Kevin no puede iniciar sesión
- Sus datos se eliminan del sistema
- Sus tareas se pueden reasignar
```

### **Caso 3: Crear Nuevo Cargo**

**Situación:** Necesitas un "Analista de Métricas"

```
1. Gestionar Roles → Crear Nuevo Rol
2. Nombre: "Analista de Métricas"
3. Descripción: "Análisis de datos, estadísticas de engagement, reportes mensuales"
4. Crear Rol

Resultado:
- Nuevo cargo disponible en el dropdown
- Puedes asignar usuarios a este cargo
- Gemini conoce este rol y sus funciones
```

---

## 🔒 SEGURIDAD Y PERMISOS

### **Row Level Security (RLS)**

✅ **Usuarios:** Solo ven su propia información
✅ **Roles:** Todos pueden ver roles, solo Director puede editarlos
✅ **Gestión de usuarios:** Solo accesible para Director

### **Validaciones:**

- ✅ No puedes eliminar un rol si tiene usuarios asignados
- ✅ No puedes eliminarte a ti mismo como Director
- ✅ Contraseñas mínimo 6 caracteres
- ✅ Emails únicos en el sistema
- ✅ Roles únicos (no duplicados)

---

## 📱 INTERFAZ RESPONSIVE

El panel funciona perfectamente en:
- ✅ Desktop (experiencia completa)
- ✅ Tablet (adaptado)
- ✅ Móvil (optimizado)

---

## ✅ CHECKLIST DE FUNCIONALIDADES

| Funcionalidad | Estado |
|--------------|--------|
| Crear usuarios | ✅ |
| Editar roles de usuarios | ✅ |
| Eliminar usuarios | ✅ |
| Crear roles personalizados | ✅ |
| Eliminar roles | ✅ |
| Generar contraseñas automáticas | ✅ |
| Sincronización con Supabase | ✅ |
| Gemini personalizado por cargo | ✅ |
| Lineamientos actualizados (8 miembros) | ✅ |
| Base de datos de roles | ✅ |
| RLS y seguridad | ✅ |
| Interfaz responsive | ✅ |
| Validaciones de formularios | ✅ |
| Mensajes de éxito/error | ✅ |

---

## 🎓 CAPACITACIÓN PARA EL DIRECTOR

### **Video Tutorial Sugerido:**

1. **Introducción** (2 min)
   - Qué es la gestión de usuarios
   - Cuándo usarla

2. **Agregar Usuario** (5 min)
   - Demostración paso a paso
   - Generar contraseña
   - Entregar credenciales

3. **Cambiar Roles** (3 min)
   - Cómo editar roles
   - Cuándo hacerlo

4. **Gestionar Roles Personalizados** (4 min)
   - Crear nuevos cargos
   - Eliminar roles

5. **Mejores Prácticas** (2 min)
   - Seguridad de contraseñas
   - Documentar cambios

---

## 📞 SOPORTE

**Dudas o problemas:**
- 📧 Contacta al desarrollador del sistema
- 📚 Consulta `LINEAMIENTOS-EQUIPO-ACS.md`
- 🤖 Pregunta al Asistente IA dentro del sistema

---

## 🚀 PRÓXIMOS PASOS SUGERIDOS

1. **Crear usuarios** para los 8 miembros actuales
2. **Capacitar** al equipo en el uso del sistema
3. **Documentar** contraseñas en lugar seguro
4. **Revisar** roles personalizados según necesidades
5. **Actualizar** información conforme cambie el equipo

---

**¡SISTEMA DE GESTIÓN DE USUARIOS COMPLETO Y OPERATIVO!** 🎉👥

*Última actualización: Octubre 2025*
*Equipo: 8 miembros activos*
