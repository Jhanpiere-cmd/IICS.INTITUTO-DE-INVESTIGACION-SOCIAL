# 📦 INSTALACIÓN Y CONFIGURACIÓN - GEMINI + STORAGE

## ✅ **ARREGLOS REALIZADOS**

### **1. Sanitización de nombres de archivos**
- ✅ Los espacios se reemplazan por guiones bajos (`_`)
- ✅ Se eliminan caracteres especiales
- ✅ Se convierte todo a minúsculas
- ✅ Ejemplo: `LINEAMIENTOS OPERATIVOS.pdf` → `lineamientos_operativos.pdf`

### **2. Mejoras en la carga**
- ✅ Validación de formatos antes de subir
- ✅ Mensajes claros sobre qué formatos funcionan
- ✅ Instrucciones para convertir PDFs a TXT

---

## 🚀 **PASOS DE INSTALACIÓN**

### **PASO 1: Configurar Supabase Storage**

1. **Ve a Supabase Dashboard**: https://app.supabase.com
2. **Selecciona tu proyecto**: `ififktotbpnseqwqjkyh`
3. **Ve a Storage** (icono de carpeta en el menú lateral)

4. **Verificar bucket `resources`**:
   - Si NO existe, créalo:
     * Click "Create bucket"
     * Name: `resources`
     * ✅ Marcar "Public bucket"
     * File size limit: `52428800` (50MB)
     * Click "Create bucket"
   
   - Si YA existe:
     * Click en `resources`
     * Click en ⚙️ Settings
     * Verifica que "Public" esté activado

5. **Configurar Policies del Storage**:
   - Click en `resources` bucket
   - Click en "Policies" (tab superior)
   - Asegúrate de tener estas políticas:

   ```sql
   -- Policy 1: SELECT (Descargar)
   CREATE POLICY "Authenticated users can download"
   ON storage.objects FOR SELECT
   TO authenticated
   USING (bucket_id = 'resources');

   -- Policy 2: INSERT (Subir)
   CREATE POLICY "Authenticated users can upload"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'resources');

   -- Policy 3: DELETE (Eliminar)
   CREATE POLICY "Users can delete own files"
   ON storage.objects FOR DELETE
   TO authenticated
   USING (bucket_id = 'resources' AND auth.uid() = owner);
   ```

---

### **PASO 2: Configurar Tabla `resources` en Supabase**

1. **Ve a SQL Editor** en Supabase Dashboard
2. **Copia y pega este script completo**:

```sql
-- Crear tabla resources si no existe
CREATE TABLE IF NOT EXISTS public.resources (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  category text,
  folder text,
  file_urls text[],
  uploaded_by uuid REFERENCES auth.users(id),
  visibility text DEFAULT 'interno',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_resources_uploaded_by ON public.resources(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_resources_folder ON public.resources(folder);

-- Habilitar RLS
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Todos pueden ver recursos" ON public.resources;
CREATE POLICY "Todos pueden ver recursos" 
ON public.resources FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Autenticados pueden crear" ON public.resources;
CREATE POLICY "Autenticados pueden crear" 
ON public.resources FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = uploaded_by);
```

3. **Click "Run"** para ejecutar el script

---

### **PASO 3: Crear carpeta AI-Knowledge**

1. **Ve a Storage > resources**
2. **Click "Upload file"** o "Create folder"
3. **Crea carpeta**: `AI-Knowledge`
4. **(Opcional)** Sube un archivo `.keep` vacío para mantener la carpeta

---

### **PASO 4: Verificar conexión**

Ejecuta este comando en tu terminal dentro del proyecto:

```bash
npm install
npx tsx scripts/setup-ai-storage.ts
```

Este script verificará:
- ✅ Que el bucket existe
- ✅ Que la carpeta AI-Knowledge existe
- ✅ Que la tabla resources es accesible
- ✅ Que puedes subir archivos

---

## 📝 **CÓMO USAR EL SISTEMA**

### **Para el Director:**

#### **1. Convertir PDF a TXT** (IMPORTANTE)

**Opción A - Manual (Recomendado):**
```
1. Abre el PDF en Adobe Reader o navegador
2. Selecciona todo el texto (Ctrl+A)
3. Copia (Ctrl+C)
4. Abre Bloc de notas (Notepad)
5. Pega (Ctrl+V)
6. Guarda como .txt con nombre descriptivo
   Ejemplo: "lineamientos_equipo_2025.txt"
```

**Opción B - Herramientas online:**
- https://pdftotext.com
- https://convertio.co/es/pdf-txt/
- https://www.ilovepdf.com/es/pdf_a_texto

#### **2. Subir el archivo TXT**

```
1. Inicia sesión como Director
2. Ve al Asistente IA (chat)
3. Verás un panel morado arriba:
   "📄 Cargar Documentos para IA"
4. Click en "Haz clic para seleccionar archivos"
5. Selecciona tu archivo .txt
6. Click "Subir X archivo(s) para IA"
7. ✅ ¡Listo! Gemini ahora puede leerlo
```

#### **3. Verificar que se subió**

```
Opción 1 - Supabase Dashboard:
1. Ve a Storage > resources > AI-Knowledge
2. Deberías ver tu archivo con formato:
   [timestamp]-nombre_archivo.txt

Opción 2 - En la app:
1. Pregúntale a Gemini:
   "¿Qué archivos tienes disponibles?"
2. Debería listar tu archivo
```

---

### **Para todos los usuarios:**

#### **Hacer preguntas a Gemini**

```
✅ CORRECTO:
"¿Qué dice el lineamiento sobre mi cargo como Secretaria?"
"Según el plan de trabajo, ¿cuáles son las metas de febrero?"
"Dame un resumen del contenido del archivo lineamientos"

❌ INCORRECTO:
"Lee el PDF" (Gemini no puede leer PDFs directamente)
"Abre el Word" (Gemini no puede abrir Word)
```

#### **Ejemplos de uso:**

**Pregunta 1:**
```
Usuario: ¿Cuáles son mis funciones como Jefa de Imagen?
Gemini: Según lineamientos_equipo_2025.txt, como Jefa de Imagen 
tus funciones son:
1. Dirección de imagen institucional
2. Producción audiovisual y fotográfica
3. Supervisión de diseño gráfico
...
```

**Pregunta 2:**
```
Usuario: ¿Qué eventos tenemos programados según el plan?
Gemini: Según plan_trabajo_2025.txt, los eventos programados son:
- Febrero: Lanzamiento Revista #26
- Marzo: Taller de redacción académica
- Abril: Feria del libro universitario
...
```

---

## 🐛 **SOLUCIÓN DE PROBLEMAS**

### **Error: "Invalid key: AI-Knowledge/..."**

**Causa**: Nombre de archivo con espacios o caracteres especiales

**Solución**: Ya está arreglado en el código. El sistema automáticamente sanitiza los nombres.

**Verifica que**:
- El archivo se llame `nombre_sin_espacios.txt`
- No tenga caracteres como: `()[]{}#@!%&`

---

### **Error: "storage/object-not-found"**

**Causa**: El bucket 'resources' no existe o no es público

**Solución**:
1. Ve a Supabase > Storage
2. Verifica que 'resources' exista
3. Click en Settings del bucket
4. Marca "Public bucket"
5. Save

---

### **Error: "permission denied for table resources"**

**Causa**: Las políticas RLS no están configuradas

**Solución**:
1. Ve a Supabase > SQL Editor
2. Ejecuta el script del PASO 2 completo
3. Verifica con:
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename = 'resources';
   ```

---

### **El archivo se sube pero Gemini no lo lee**

**Causa**: El archivo no es formato de texto

**Verifica**:
1. El archivo es `.txt`, `.md`, `.json`, `.csv` o `.html`
2. NO es `.pdf`, `.docx`, `.doc`
3. El contenido del archivo es texto plano

**Prueba**:
1. Abre el archivo en Bloc de notas
2. Si puedes leer el texto, está bien
3. Si ves caracteres raros o binario, conviértelo a .txt

---

### **Gemini dice "No tengo acceso a ese archivo"**

**Causa**: El archivo puede estar en otra carpeta

**Solución**:
1. Pregunta a Gemini: "¿Qué archivos tienes disponibles?"
2. Verifica el nombre exacto del archivo
3. El archivo debe estar en: `Storage > resources > AI-Knowledge`

---

## 📊 **VERIFICACIÓN FINAL**

Ejecuta estas consultas en Supabase SQL Editor:

```sql
-- 1. Verificar tabla resources
SELECT COUNT(*) as total_recursos FROM public.resources;

-- 2. Ver archivos subidos
SELECT title, folder, created_at 
FROM public.resources 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Verificar políticas
SELECT policyname, cmd FROM pg_policies 
WHERE tablename = 'resources';

-- 4. Ver archivos en Storage (necesitas hacerlo desde Dashboard)
-- Ve a: Storage > resources > AI-Knowledge
```

---

## ✅ **CHECKLIST DE VERIFICACIÓN**

Antes de usar el sistema, verifica:

- [ ] Bucket 'resources' existe y es público
- [ ] Tabla 'resources' existe con todas las columnas
- [ ] Políticas RLS están activas
- [ ] Carpeta 'AI-Knowledge' existe
- [ ] Puedes subir un archivo de prueba .txt
- [ ] El archivo aparece en Storage
- [ ] Gemini puede listar el archivo
- [ ] Gemini puede responder preguntas sobre el archivo

---

## 📚 **ARCHIVOS RECOMENDADOS PARA SUBIR**

### **Prioridad Alta:**
1. `lineamientos_equipo_2025.txt` - Lineamientos operativos
2. `plan_trabajo_2025.txt` - Plan anual
3. `protocolo_eventos.txt` - Protocolo de eventos
4. `guia_redes_sociales.txt` - Guía de redes

### **Prioridad Media:**
5. `revista_numero_25.txt` - Último número publicado
6. `manual_diseno.txt` - Manual de identidad visual
7. `actas_reuniones.txt` - Actas importantes

### **Formato de nombres recomendado:**
```
✅ BIEN:
lineamientos_equipo_2025.txt
plan_trabajo_marketing.txt
protocolo_eventos_v2.txt

❌ MAL:
LINEAMIENTOS (ACTUALIZADO).pdf
Plan de Trabajo - 2025.docx
Protocolo de eventos #2.txt
```

---

## 🎯 **PRÓXIMOS PASOS**

1. ✅ Configura Supabase (PASOS 1-3)
2. ✅ Convierte tus PDFs importantes a .txt
3. ✅ Sube los archivos usando el panel del Director
4. ✅ Prueba preguntándole a Gemini
5. ✅ Comparte con el equipo cómo usar el sistema

---

## 📞 **SOPORTE**

Si tienes problemas:
1. Revisa esta guía completa
2. Verifica el CHECKLIST
3. Prueba los ejemplos de SOLUCIÓN DE PROBLEMAS
4. Pregúntale a Gemini en el chat (si está funcionando)

---

**¡GEMINI AHORA PUEDE LEER TUS DOCUMENTOS!** 🚀

*Sistema actualizado: Octubre 2025*
*Versión: 2.0 con sanitización de nombres*
