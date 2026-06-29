import { extractJSON } from './ai';

/**
 * HOYR Mercury AI Integration (Inception Labs)
 * 10M tokens gratuitos — API compatible con OpenAI
 * Docs: https://platform.inceptionlabs.ai
 */

const MERCURY_API_KEY = 'sk_d3c94eabb740124a106c8d51cdd0f5f4';
const MERCURY_BASE_URL = 'https://api.inceptionlabs.ai/v1';

export const MERCURY_MODELS = [
  {
    id: 'mercury-2',
    name: 'Mercury 2',
    provider: 'mercury',
    description: 'Razonamiento rápido · 128K ctx · 10M tokens gratis',
    emoji: '☿',
    badge: 'REASONING',
    color: '#C0C0FF',
    logo: 'https://framerusercontent.com/images/4SickTRQDC4hpfQNLrqR92Nsgs0.svg?width=342&height=66',
  },
] as const;

export type MercuryModelId = typeof MERCURY_MODELS[number]['id'];

/**
 * Chat con HOYR usando Mercury AI — mismo formato agéntico JSON que Gemini.
 */
export const chatWithMercury = async (
  message: string,
  context: any,
  history: Array<{ role: string; content: string }>,
  modelId: string = 'mercury-2',
  onStream?: (chunk: string) => void
): Promise<{ response: string; action: any }> => {
  if (!MERCURY_API_KEY) {
    return {
      response: '⚠️ **Mercury AI no configurado**: Falta `VITE_MERCURY_API_KEY`.',
      action: null,
    };
  }

  const now = new Date();
  const currentDateTime = now.toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
  });

  const systemPrompt = `Eres **HOYR**, el asistente inteligente y orquestador táctico del sistema SGR-ACS. 🚀

🌟 **PERSONALIDAD**: Amigable, proactivo y ejecutivo. 💼 Usa emojis (✅, 📅, 🚀, 💡, 📊).

⏰ **FECHA Y HORA ACTUAL**: ${currentDateTime}

**CONTEXTO OPERATIVO**:
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
- Usa **negrita** para datos importantes.
- NUNCA uses tablas markdown crudas (| col | val |) si la orden es GENERAR UN DOCX. Las tablas para DOCX DEBEN ir estrictamente en el array "sections" con el formato: {"type": "table", "rows": [["Col1", "Col2"], ["Val1", "Val2"]]}. Solo puedes usar markdown para exportar a Google Docs.
- Usa emojis con moderación.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-50).map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    })),
    { role: 'user', content: message },
  ];

  try {
    const response = await fetch(`${MERCURY_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MERCURY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelId,
        messages,
        max_tokens: 2048,
        temperature: 0.75,
        reasoning_effort: 'medium',
        stream: true,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      if (response.status === 429) {
        return { response: '⚠️ **Cuota Mercury excedida**. Has usado tus 10M tokens gratuitos.', action: null };
      }
      throw new Error(`Mercury error ${response.status}: ${JSON.stringify(err)}`);
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
          } catch (e) { }
        }
      }
    }

    return extractJSON(fullContent);
  } catch (e: any) {
    console.error('Mercury error:', e);
    return {
      response: `❌ **Error Mercury AI**: ${e.message || 'Error de conexión.'}`,
      action: null,
    };
  }
};

/**
 * Generación de contenido sin streaming para tareas administrativas (Reportes, etc.)
 */
export const generateMercuryContent = async (
  prompt: string,
  modelId: string = 'mercury-2'
): Promise<string> => {
  if (!MERCURY_API_KEY) throw new Error('Mercury API Key missing');

  try {
    const response = await fetch(`${MERCURY_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MERCURY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        stream: false,
      }),
    });

    if (!response.ok) throw new Error(`Mercury HTTP Error: ${response.status}`);
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (e: any) {
    console.error('Mercury Content Error:', e);
    throw e;
  }
};

/**
 * Normalización semántica de categorías para gráficos (Mercury)
 */
export const generateMercurySmartChartCategories = async (label: string, rawValues: string[]) => {
    const prompt = `
        Actúa como un analista de datos experto.
        Tengo una lista de respuestas de texto libre para el campo: "${label}".
        Respuestas: ${rawValues.slice(0, 100).join(', ')}
        Tu tarea es agrupar estas respuestas en categorías lógicas y contar su frecuencia.
        Normaliza las categorías (ej. "Ingeniería de Sistemas" y "Sistemas" -> "ING. SISTEMAS").
        Responde SOLO con un objeto JSON:
        { "Categoría 1": 10, "Categoría 2": 5 }
    `;
    try {
        const text = await generateMercuryContent(prompt);
        return extractJSON(text);
    } catch (error) {
        console.error('Error mercury smart charts:', error);
        return null;
    }
};

/**
 * Resumen Ejecutivo de Evento (Mercury)
 */
export const generateMercuryEventSummary = async (eventTitle: string, eventDate: string, stats: any) => {
    const prompt = `
        Actúa como un estratega de eventos de alto nivel de la Revista ACS.
        Analiza las estadísticas del evento "${eventTitle}" (${eventDate}):
        Estadísticas: ${JSON.stringify(stats)}
        Genera un resumen ejecutivo de impacto institucional.
        Responde SOLO con un objeto JSON:
        {
            "executive_summary": "Párrafo breve con conclusiones principales",
            "audience_analysis": "Análisis de quiénes asistieron",
            "attendance_analysis": "Análisis de la tasa de asistencia",
            "proposals": ["Propuesta 1", "Propuesta 2", "Propuesta 3"]
        }
    `;
    try {
        const text = await generateMercuryContent(prompt);
        return extractJSON(text);
    } catch (error) {
        console.error('Error mercury event summary:', error);
        return null;
    }
};

/**
 * Predicciones Pre-Evento (Mercury)
 */
export const generateMercurySurveySummary = async (surveyTitle: string, statsData: any) => {
    const prompt = `
        Actúa como un analista de datos investigativos de la Revista ACS.
        Analiza las estadísticas de la encuesta "${surveyTitle}":
        Estadísticas: ${JSON.stringify(statsData)}
        Genera un resumen ejecutivo de impacto institucional.
        Responde SOLO con un objeto JSON válido (sin usar markdown blocks como \`\`\`json):
        {
            "executive_summary": "Párrafo breve con el hallazgo transversal principal",
            "audience_analysis": "Análisis cualitativo del sentimiento y posturas identificadas en los perfiles",
            "insights": ["Dato clave revelador 1", "Dato clave revelador 2", "Dato clave 3"],
            "proposals": ["Posible acción directiva 1", "Posible acción directiva 2"]
        }
    `;
    try {
        const text = await generateMercuryContent(prompt);
        return extractJSON(text);
    } catch (error) {
        console.error('Error mercury survey summary:', error);
        return null;
    }
};

/**
 * Predicciones Pre-Evento (Mercury)
 */
export const generateMercuryPreEventRecommendations = async (params: {
    eventTitle: string;
    eventDate: string;
    daysUntilEvent: number;
    currentRegistrations: number;
    registrationsPerDay: number;
    topCategories?: string;
    topCareers?: string;
}) => {
    const projectedFinal = Math.round(params.currentRegistrations + (params.registrationsPerDay * params.daysUntilEvent));
    const prompt = `Eres un estratega de marketing digital para la Revista ACS. 
    Analiza el ritmo de inscripciones del evento "${params.eventTitle}".
    Proyección: ${projectedFinal} inscritos. Días restantes: ${params.daysUntilEvent}.
    Top Categorías: ${params.topCategories || 'No info'}.
    Da recomendaciones de marketing y contenido para asegurar el éxito.
    Responde en JSON:
    {
        "momentum_interpretation": "...",
        "risk_level": "good" | "warning" | "critical",
        "marketing_actions": [{"channel": "...", "action": "...", "timing": "...", "why": "..."}]
    }`;
    try {
        const text = await generateMercuryContent(prompt);
        return extractJSON(text);
    } catch (error) {
        console.error('Error mercury pre-event prediction:', error);
        return null;
    }
};
