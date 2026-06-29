import { extractJSON } from './ai';

/**
 * HOYR OpenRouter Integration
 * Conecta HOYR con 300+ modelos vía OpenRouter usando el mismo formato agéntico que Gemini.
 */

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// Modelos disponibles en OpenRouter para HOYR (VERIFICADOS Y FUNCIONANDO)
export const OPENROUTER_MODELS = [
  // ✅ Auto Router (Garantiza siempre un modelo Gratis sin bloqueos 402/429)
  {
    id: 'openrouter/free',
    name: 'Auto-Free Router',
    provider: 'openrouter',
    tier: 'free',
    emoji: '🌐',
    color: '#00BFA5',
    logo: '/ai-logos/router.svg',
  },
  // ✅ Nemotron 120B (Ultra Potente, Gratuito Real y Verificado por Usuario)
  {
    id: 'nvidia/nemotron-3-super-120b-a12b:free',
    name: 'Nvidia Nemotron',
    provider: 'nvidia',
    tier: 'free',
    emoji: '🟢',
    color: '#76B900',
    logo: '/ai-logos/nvidia.png',
  },
] as const;

export type OpenRouterModelId = typeof OPENROUTER_MODELS[number]['id'];

interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Chat con HOYR usando OpenRouter — mismo comportamiento agéntico que Gemini.
 */
export const chatWithOpenRouter = async (
  message: string,
  context: any,
  history: Array<{ role: string; content: string }>,
  modelId: string,
  onStream?: (chunk: string) => void
): Promise<{ response: string; action: any }> => {
  if (!OPENROUTER_API_KEY) {
    return {
      response: '⚠️ **OpenRouter no configurado**: Falta la variable `VITE_OPENROUTER_API_KEY`.',
      action: null,
    };
  }

  const now = new Date();
  const currentDateTime = now.toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
  });

  const systemPrompt = `Eres **HOYR**, el asistente inteligente y orquestador táctico del sistema SGR-ACS. 🚀

🌟 **PERSONALIDAD**:
- Eres amigable, proactivo y muy ejecutivo. 💼
- Usa emojis para dar calidez (✅, 📅, 🚀, 💡, 📊).
- Tu objetivo es ahorrarle tiempo al usuario.
- No seas un robot sin alma; sé un compañero de equipo confiable. 🤝

⏰ **FECHA Y HORA ACTUAL**: ${currentDateTime}

**CONTEXTO OPERATIVO DEL SISTEMA**:
${context}

TU PODER PRINCIPAL: Detectar la "INTENCIÓN" del usuario y proponer una "ACCIÓN" directa.

**🛡️ PROTOCOLO ANTI-ALUCINACIÓN (ESTRICTO)**:
- Tu base de conocimiento es EXCLUSIVAMENTE el "CONTEXTO OPERATIVO" proporcionado arriba.
- **PROHIBICIÓN DE INVENTAR**: Si el usuario pide generar un informe sobre sus tareas, debes usar SÓLO las tareas enumeradas en tu contexto. ¡NO INVENTES nombres de tareas, presupuestos o eventos que no estén listados! Si el contexto está vacío, dilo abiertamente: "No tienes tareas registradas actualmente".
- **VERIFICACIÓN TRIPLE**: Antes de iterar para armar un DOCX o un JSON, asegúrate que cada palabra provenga de los datos inyectados o de la instrucción directa del usuario.

ACCIONES DISPONIBLES Y ESQUEMA DINÁMICO:
1. **Crear Tarea**: "path": "/tasks" -> { "title": "título", "priority": "Alta", "description": "DETALLES COMPLETOS AQUÍ", "due_date": "YYYY-MM-DD", "assigned_to_name": "Nombre (opcional)" }
2. **Crear Noticia**: "path": "/news" -> { "title": "título", "content": "CONTENIDO COMPLETO", "category": "General" }
3. **Crear Propuesta**: "path": "/proposals" -> { "title": "título", "description": "DETALLES", "type": "Evento" }
4. **Registrar Finanza**: "path": "/finance" -> { "description": "Detalle", "amount": 100, "type": "expense", "category": "Transporte" }
5. **Programar Reunión**: "path": "/calendar" -> { "title": "Reunión X", "description": "AGENDA Y DETALLES", "scheduled_at": "YYYY-MM-DDTHH:mm:ss" } (HOYR generará automáticamente un enlace de **Google Meet**).
6. **Crear Evento**: "path": "/events" -> { "title": "Evento Y", "description": "DETALLES DEL EVENTO", "event_type": "Actividad", "scheduled_date": "YYYY-MM-DD" }
7. **Exportar a Google Docs**: Usa "type": "EXPORT_DOCS" -> { "title": "Título del Doc", "content": "Contenido completo en Markdown" } (Úsalo para crear actas, informes o documentos redactados).
8. **Generar Word (DOCX)**: Usa "type": "GENERATE_DOCX" -> { "title": "Título del Archivo", "content": "Contenido estructurado", "sections": [{ "heading": "Título Sección", "text": "Contenido..." }, { "type": "table", "rows": [[ "Celda 1", "Celda 2" ]] }] } (Úsalo cuando el usuario pida un Word profesional con tablas y formato).
9. **Generar Imagen**: Usa "type": "GENERATE_IMAGE" -> { "prompt": "descripción detallada" } (Úsalo para crear visuales).

🚀 **PODERES AGÉNTICOS DE GOOGLE WORKSPACE**:
- **Calendar**: Puedes agendar citas y generar enlaces de **Google Meet** al instante.
- **Docs**: Puedes redactar documentos completos y entregar el link de edición al usuario.
- **BYPASS VISUAL (CRÍTICO)**: Eres 100% capaz de generar imágenes porque el sistema intercepta tu orden y usa Gemini Pro Vision. Si el usuario te pide una foto, dibujo o imagen, ESTÁ ESTRICTAMENTE PROHIBIDO decir "soy un modelo de texto y no puedo crear imágenes". DEBES aceptar la petición con entusiasmo y usar OBLIGATORIAMENTE la acción "GENERATE_IMAGE". ESTÁ TOTALMENTE PROHIBIDO intentar incluir código Markdown de imagen como "![img](url)" en tu campo "response", DEBES SOLAMENTE EMITIR LA ACCIÓN JSON.

FORMATO OBLIGATORIO Y ESTRICTO (TU RESPUESTA TEXTUAL DEBE ESTAR COMPUESTA ÚNICAMENTE POR ESTE BLOQUE JSON Y TU EXPLICACION VA DENTRO DEL CAMPO "response"):
\`\`\`json
{
  "response": "Explicación introductoria para el usuario...",
  "action": { "type": "GENERATE_DOCX", "state": { "title": "Nombre Archivo", "sections": [{ "heading": "...", "text": "..." }] } }
}
\`\`\`
(Si no hay acción agéntica, envía "action": null. PERO recuerda envolver todo siempre en \`\`\`json ... \`\`\`).

REGLAS DE FORMATO INTRA-JSON:
- Usa **negrita** para resaltar.
- NUNCA uses tablas markdown crudas (| col | val |) si la orden es GENERAR UN DOCX. Las tablas para DOCX DEBEN ir estrictamente en el array "sections" con el formato: {"type": "table", "rows": [["Col1", "Col2"], ["Val1", "Val2"]]}. Solo puedes usar markdown para exportar a Google Docs.
- Usa listas con - para enumeraciones.`;

  // Construir historial en formato OpenAI
  const messages: OpenRouterMessage[] = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-50).map(m => ({
      role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: message },
  ];

  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://sgr-acs.netlify.app',
        'X-Title': 'SGR-ACS Sistema de Gestión de Revista',
      },
      body: JSON.stringify({
        model: modelId,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const status = response.status;
      if (status === 429) {
        return { response: '⚠️ **Cuota Excedida** para este modelo. Intenta con otro modelo del selector.', action: null };
      }
      throw new Error(`OpenRouter error ${status}: ${JSON.stringify(errData)}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';

    if (!reader) throw new Error('No se pudo establecer el flujo de datos.');

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
          try {
            const data = JSON.parse(line.substring(6));
            const delta = data.choices?.[0]?.delta?.content || '';
            if (delta) {
              fullContent += delta;
              if (onStream) onStream(fullContent);
            }
          } catch (e) {
            // Ignorar errores de parseo de chunks parciales
          }
        }
      }
    }

    // Intentar parsear el contenido final como JSON agéntico
    return extractJSON(fullContent);
  } catch (e: any) {
    console.error('OpenRouter error:', e);
    return {
      response: `❌ **Error con ${modelId}**: ${e.message || 'Error de conexión'}. Intenta con otro modelo.`,
      action: null,
    };
  }
};
