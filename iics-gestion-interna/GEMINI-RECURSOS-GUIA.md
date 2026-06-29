# 🤖 GEMINI CONECTADO A RECURSOS - GUÍA COMPLETA

## ✅ PROBLEMA RESUELTO

**Antes:**
- ❌ Gemini solo veía **nombres** de archivos
- ❌ No podía **leer contenido** de documentos
- ❌ Solo decía "existe un archivo X" pero no respondía sobre su contenido

**Ahora:**
- ✅ Gemini **lee automáticamente** el contenido de archivos de texto
- ✅ Responde preguntas basándose en el **contenido real** de los documentos
- ✅ Puede citar información específica de los archivos
- ✅ **Bonus:** Panel para que el Director cargue documentos directamente

---

## 🔧 CÓMO FUNCIONA AHORA

### **1. Lectura Automática de Recursos**

Cuando inicias el chat, el sistema:

```
1. Se conecta al storage 'resources' de Supabase
2. Lista TODOS los archivos recursivamente
3. Para archivos de TEXTO, descarga y lee su contenido
4. Envía el contenido a Gemini en cada pregunta
```

**Formatos que Gemini puede leer:**
- ✅ `.txt` - Archivos de texto plano
- ✅ `.md` - Markdown (recomendado)
- ✅ `.json` - Datos JSON
- ✅ `.csv` - Datos tabulares
- ✅ `.html` - Páginas web
- ✅ `.css`, `.js`, `.ts` - Código (si es relevante)

**Formatos que NO puede leer directamente:**
- ❌ `.pdf` - Necesita conversión a .txt
- ❌ `.docx` - Necesita conversión a .txt
- ❌ `.xlsx` - Necesita conversión a .csv
- ❌ Imágenes - Solo puede verlas si las adjuntas en el chat

---

## 📚 EJEMPLO DE USO

### **Escenario 1: Pregunta sobre lineamientos**

**Usuario (Secretaria):**
```
¿Cuáles son mis funciones según los lineamientos?
```

**Gemini (antes):**
```
❌ "Tienes acceso al archivo lineamientos.txt. 
   Deberías revisarlo para conocer tus funciones."
```

**Gemini (ahora):**
```
✅ "Según los lineamientos del equipo, como Secretaria 
   tus funciones son:
   
   1. Gestión de documentación
   2. Redacción de actas de reuniones
   3. Administración de agenda del equipo
   
   Fuente: LINEAMIENTOS-EQUIPO-ACS.md"
```

---

### **Escenario 2: Pregunta sobre la revista**

**Usuario (Jefa de Imagen):**
```
¿Qué temas trata el último número de la revista?
```

**Gemini (si subes numero-25.txt):**
```
✅ "El número 25 de la Revista ACS incluye:
   
   1. Artículo sobre desarrollo sostenible en comunidades rurales
   2. Estudio sobre migración juvenil en Cajamarca
   3. Análisis de políticas públicas educativas
   
   Fuente: numero-25.txt"
```

---

## 🎯 PANEL DE CARGA PARA EL DIRECTOR

### **¿Dónde está?**

Solo el **Director** verá una sección especial en la parte superior del chat:

```
┌─────────────────────────────────────────────┐
│ 🌟 Cargar Documentos para IA                │
│ Sube archivos que Gemini podrá leer         │
├─────────────────────────────────────────────┤
│ 📚 Formatos soportados:                     │
│ • Texto: .txt, .md (Recomendado)            │
│ • Código: .json, .csv                       │
│                                             │
│ [Haz clic para seleccionar archivos]       │
└─────────────────────────────────────────────┘
```

### **¿Cómo usarlo?**

**Paso 1:** Convierte tus documentos a formato de texto

```bash
# Opción 1: Copiar y pegar
1. Abre tu PDF/Word
2. Copia todo el texto
3. Pégalo en un archivo .txt

# Opción 2: Herramientas online
- PDF to Text: pdftotext.com
- Word to Text: zamzar.com
```

**Paso 2:** Sube los archivos en el panel

```
1. Director abre el chat
2. Ve el panel de carga en la parte superior
3. Selecciona uno o varios archivos
4. Click en "Subir X archivo(s) para IA"
5. ✅ ¡Listo! Gemini puede leer el contenido
```

**Paso 3:** Todos pueden usar la información

```
✅ El Director sube "plan-trabajo-2025.txt"
✅ TODOS los usuarios pueden preguntarle a Gemini sobre el plan
✅ Gemini responde con información específica del archivo
```

---

## 📋 DOCUMENTOS RECOMENDADOS PARA SUBIR

### **Prioridad Alta:**

1. **Lineamientos del Equipo** (ya en el código)
   - Estructura del equipo
   - Funciones de cada cargo
   - Base legal

2. **Números de la Revista** (convertidos a .txt)
   - numero-25.txt
   - numero-24.txt
   - etc.

3. **Planes de Trabajo**
   - plan-anual-2025.txt
   - plan-marketing-2025.txt

4. **Protocolos y Guías**
   - protocolo-eventos.txt
   - guia-redes-sociales.txt
   - manual-diseno.txt

### **Prioridad Media:**

5. **Actas de Reuniones Importantes**
   - acta-reunion-enero-2025.txt
   - decisiones-comite-editorial.txt

6. **Información de la Revista**
   - sobre-la-revista.txt
   - comite-editorial.txt
   - proceso-publicacion.txt

7. **Plantillas y Ejemplos**
   - plantilla-flyer.txt
   - plantilla-comunicado.txt

---

## 🔄 FLUJO TÉCNICO (Para desarrolladores)

### **Carga de Contexto:**

```typescript
// 1. Listar archivos recursivamente
await supabase.storage.from('resources').list()

// 2. Para archivos de texto, descargar contenido
if (extension === 'txt' || extension === 'md') {
  const file = await supabase.storage
    .from('resources')
    .download(path)
  
  const content = await file.text()
}

// 3. Incluir en contexto de Gemini
const context = `
RECURSOS DISPONIBLES:
- archivo1.txt (CONTENIDO DISPONIBLE)
  Contenido: [primeros 500 caracteres...]

- archivo2.pdf (archivo PDF - no legible directamente)
`
```

### **Prompt a Gemini:**

```typescript
const prompt = `
CONTEXTO DEL USUARIO: ${userInfo}

CONTENIDO DE ARCHIVOS:
${fileContents}

PREGUNTA DEL USUARIO:
${userQuestion}

INSTRUCCIONES:
- Si encuentras información en los archivos, úsala
- Cita la fuente: "Según [nombre archivo]..."
- Si no hay info, dilo claramente
`
```

---

## 💡 TIPS Y MEJORES PRÁCTICAS

### **Para el Director:**

✅ **Sube archivos en formato .txt o .md**
- Son los más fáciles de leer para Gemini
- Usa nombres descriptivos: `lineamientos-2025.txt`

✅ **Organiza los archivos en carpetas**
- `AI-Knowledge/lineamientos/`
- `AI-Knowledge/revistas/`
- `AI-Knowledge/planes/`

✅ **Actualiza regularmente**
- Sube nuevos números de la revista
- Actualiza planes de trabajo
- Agrega actas importantes

❌ **Evita:**
- Archivos enormes (>10MB de texto)
- Archivos con información sensible/confidencial
- PDFs sin convertir

---

### **Para los Usuarios:**

✅ **Sé específico en tus preguntas**
```
❌ Malo: "¿Qué dice sobre eventos?"
✅ Bueno: "¿Cuál es el protocolo para organizar eventos según los lineamientos?"
```

✅ **Menciona el documento si lo conoces**
```
✅ "¿Qué dice el plan de trabajo 2025 sobre redes sociales?"
```

✅ **Pide citas**
```
✅ "Muéstrame la cita textual del lineamiento sobre mi cargo"
```

---

## 🎯 CASOS DE USO REALES

### **Caso 1: Nueva integrante del equipo**

**Situación:** Eliana acaba de unirse como Coordinadora de Eventos

**Ella pregunta:**
```
"Hola, soy nueva. ¿Cuáles son mis funciones?"
```

**Gemini responde:**
```
¡Bienvenida Eliana! Como Coordinadora de Eventos, según 
los lineamientos del equipo, tus funciones son:

1. Planificación integral de eventos
2. Coordinación logística y protocolo
3. Trabajo conjunto con:
   - Relaciones Institucionales
   - Jefa de Imagen
   - Gestor de Redes

También te recomiendo revisar el protocolo-eventos.txt 
para más detalles.
```

---

### **Caso 2: Diseño de flyer**

**Situación:** Kevin necesita hacer un flyer para un evento

**Él pregunta:**
```
"Necesito hacer un flyer para el lanzamiento de la revista. 
¿Qué información debe incluir?"
```

**Gemini responde:**
```
Según la guía de diseño (guia-diseno-acs.txt), 
un flyer de lanzamiento debe incluir:

1. **Título del evento:** Lanzamiento Revista ACS #26
2. **Fecha y hora:** [especificar]
3. **Lugar:** [especificar]
4. **Logo de la revista:** Usar versión oficial
5. **Colores institucionales:** Azul #1E40AF, Naranja #F59E0B
6. **Call to action:** "¡No te lo pierdas!"
7. **Contacto:** redes sociales oficiales

¿Necesitas ayuda con el texto específico?
```

---

### **Caso 3: Director supervisando**

**Situación:** Edwar quiere revisar el progreso del equipo

**Él pregunta:**
```
"Dame un resumen de las tareas pendientes del equipo y 
compáralas con el plan de trabajo 2025"
```

**Gemini responde:**
```
Comparando con el plan-trabajo-2025.txt, 
aquí está el progreso:

**COMPLETADAS:**
✅ Diseño de portada #26 (Gresia - META: Enero)
✅ Publicación en redes del call for papers (Steven - META: Enero)

**EN PROGRESO:**
🔄 Coordinación evento de lanzamiento (Eliana - META: Febrero)

**PENDIENTES:**
⏳ Redacción acta reunión enero (Silvana - META: Esta semana)

El equipo va según cronograma. Solo una tarea tiene retraso leve.
```

---

## 🚀 FUTURAS MEJORAS

### **En desarrollo:**
- 📄 Lectura de PDFs directamente (sin conversión)
- 🖼️ Análisis de imágenes en recursos
- 🔍 Búsqueda semántica en documentos
- 📊 Integración con Google Drive

---

## ❓ PREGUNTAS FRECUENTES

**P: ¿Gemini puede leer PDFs?**
R: No directamente. Conviértelos a .txt primero.

**P: ¿Cuántos archivos puede leer?**
R: Todos los que subas, pero el contexto tiene límite. 
   Prioriza los más importantes.

**P: ¿Los archivos son seguros?**
R: Sí, están en tu Supabase privado con RLS activado.

**P: ¿Todos los usuarios ven los mismos documentos?**
R: Sí, Gemini usa los mismos recursos para todos. 
   Es conocimiento compartido del equipo.

**P: ¿Puedo eliminar archivos?**
R: Sí, desde el gestor de recursos o desde Supabase.

**P: ¿Gemini recuerda conversaciones anteriores?**
R: Sí, tiene "aprendizaje del usuario" basado en 
   tus últimas 100 conversaciones.

---

## 📞 SOPORTE

Si tienes problemas o dudas:
- 🤖 Pregúntale a Gemini en el chat
- 📧 Contacta al Director del equipo
- 📚 Revisa esta guía

---

**¡GEMINI AHORA ESTÁ COMPLETAMENTE CONECTADO A TUS RECURSOS!** 🎉

*Sistema de Gestión de Revista - Equipo ACS*
*Actualizado: Octubre 2025*
