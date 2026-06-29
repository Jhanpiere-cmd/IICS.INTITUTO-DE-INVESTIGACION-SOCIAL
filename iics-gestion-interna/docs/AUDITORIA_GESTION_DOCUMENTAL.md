# 📋 Auditoría: Sección de Gestión Documental (SGR-ACS)
**Estado:** Evaluación técnica y funcional para la integración de editor de texto avanzado.

---

## 🔍 1. Análisis de la Implementación Actual

El sistema utiliza actualmente un enfoque híbrido en `DocumentEditor.tsx` que combina un generador basado en plantillas (formularios) y un editor libre basado en **React Quill**.

### ✅ Fortalezas
*   **Interfaz Ribbon (Cinta de Opciones)**: Diseño familiar para usuarios de Office/Word.
*   **Modo Plantilla Inteligente**: La automatización de logotipos, fechas y firmas agiliza los trámites administrativos.
*   **Asistente de IA Integrado**: Capacidad de generar borradores usando Gemini Pro.
*   **Soporte Multitema**: La inclusión del tema "Stitch" mantiene la estética *Executive Blue* del sistema.
*   **Auto-guardado y Shortcuts**: Implementación de Ctrl+S y guardado automático cada 30 segundos.

### ⚠️ Limitaciones Identificadas (Gaps)
1.  **Ausencia de Paginación Real**: El editor fluye como una página web infinita en lugar de mostrar hojas A4 físicas con saltos de página delimitados.
2.  **Exportación Básica**: El motor actual exporta a `.doc` mediante blobs de HTML, lo cual puede perder formato al abrirse en versiones modernas de Word.
3.  **Gestión de Tablas**: El soporte para tablas en Quill es limitado y propenso a errores de renderizado.
4.  **Falta de Metadatos de Secretaría**: No hay control de versiones ni historial de cambios (track changes).

---

## 🚀 2. Propuesta: "Word-Experience" de Nivel Pro

Para llevar la gestión documental al siguiente nivel sin tocar el código existente aún, se propone la siguiente arquitectura para el nuevo editor:

### A. Motor de Renderizado "A4 Canvas"
*   Implementar un contenedor con dimensiones fijas (210mm x 297mm) que emule una hoja real.
*   Uso de `MutationObserver` para detectar cuándo el texto excede el límite de la página y saltar automáticamente a una nueva "hoja" visual.

### B. Funcionalidades de Secretaría Críticas
*   **Comentarios y Sugerencias**: Capacidad de dejar "post-its" virtuales sobre el texto.
*   **Combinación de Correspondencia**: Usar la base de datos de perfiles (profiles) para generar 50 oficios en un solo clic.
*   **Firmas Digitales Estructuradas**: Generación de códigos QR de verificación únicos para cada documento emitido.

### C. Evolución Tecnológica (Sugerencia)
*   **Opción A (Lite)**: Mantener Quill pero añadir el módulo de tablas avanzado y el plugin de paginación.
*   **Opción B (Hardcore)**: Migrar a **TipTap** o **Lexical** (el motor de Facebook). Permiten un control total sobre el árbol de nodos (formatos, tablas, bloques dinámicos).

---

## 📂 3. Estructura de Gestión Documental (Drive)

El actual `DriveExplorer` es sólido, pero se sugiere:
1.  **Filtros por Metadatos**: Buscar archivos por "Firmado/Pendiente de Firma".
2.  **Vista de Previa Rápida**: Un panel lateral para ver el contenido del doc sin abrir el editor.
3.  **Papelera de Reciclaje**: Sistema de recuperación de documentos eliminados por error.

---

## 🎯 Conclusión del Auditor
El sistema actual es funcional y estéticamente superior a la media, pero para ser un "Editor tipo Word" real, el siguiente paso debe ser la **paginación visual** y la **exportación nativa a .docx**. 

**Próxima fase recomendada:** Crear el componente `A4PageWrapper` para envolver el editor libre.
