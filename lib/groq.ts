import { extractJSON, getMasterTacticalPrompt } from './ai';

/**
 * HOYR Groq AI Integration
 * Motores LPU ultrarrápidos (Llama 3)
 * Docs: https://console.groq.com/docs/quickstart
 */

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

export const GROQ_MODELS = [
  {
    id: 'groq/llama-3.3-70b-versatile',
    name: 'Royer (Llama 3.3)',
    provider: 'groq',
    description: 'Motor Llama 3.3 70B (LPU) · Máxima potencia y estabilidad Royer.',
    emoji: '🦙',
    badge: 'UNLIMITED (ULTRA-FAST)',
    color: '#0088FF',
    logo: '/ai-logos/meta.png',
  }
] as const;

export type GroqModelId = typeof GROQ_MODELS[number]['id'];

/**
 * Trunca el contexto para no exceder los límites de tokens por minuto (TPM) de Groq.
 */
const truncateContext = (ctx: any): string => {
  const str = typeof ctx === 'string' ? ctx : JSON.stringify(ctx);
  if (str.length > 12000) {
    return str.substring(0, 12000) + '\n... [CONTEXTO RECORTADO POR SEGURIDAD DE CUOTA]';
  }
  return str;
};

/**
 * Chat con HOYR usando Groq AI — Mismo formato agéntico JSON de Mercury.
 */
export const chatWithGroq = async (
  message: string,
  context: any,
  history: Array<{ role: string; content: string }>,
  modelId: string = 'llama-3.3-70b-versatile',
  onStream?: (chunk: string) => void,
  attempt: number = 1,
  userName: string = 'Usuario',
  userRole: string = 'Miembro'
): Promise<{ response: string; action: any }> => {
  if (!GROQ_API_KEY) {
    return {
      response: '⚠️ **Groq AI no configurado**: Falta `VITE_GROQ_API_KEY`.',
      action: null,
    };
  }

  const now = new Date();
  const currentDateTime = now.toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
  });

  const truncatedContext = truncateContext(context);

  const systemPrompt = getMasterTacticalPrompt(currentDateTime, truncatedContext, userName, userRole);

  // Construir mensajes con Inyección One-Shot
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: 'Genera un informe rápido.' },
    { role: 'assistant', content: '```json\n{\n  "response": "¡Claro! He generado el informe táctico solicitado. Puedes revisarlo a continuación. ✅",\n  "action": {\n    "type": "GENERATE_DOCX",\n    "state": {\n      "title": "INFORME_RAPIDO_ACS",\n      "sections": [\n        { "heading": "RESUMEN", "text": "Contenido del informe..." }\n      ]\n    }\n  }\n}\n```' },
    ...history.slice(-50).map(m => ({ // Ampliamos historial a 50 para fluidez ejecutiva
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    })),
    { role: 'user', content: message },
  ];

  const groqModelId = modelId.replace('groq/', '');

  try {
    const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: groqModelId,
        messages,
        max_tokens: 4096,
        temperature: 0,
        stream: true,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const errorMessage = err.error?.message || JSON.stringify(err);
      
      // 🔄 LÓGICA DE REINTENTO PARA ERROR 429 (Rate Limit)
      if (response.status === 429 && attempt < 3) {
        const delay = attempt * 2000; // 2s, 4s...
        console.warn(`⚠️ Cuota excedida (429). Reintentando en ${delay}ms... (Intento ${attempt})`);
        await new Promise(r => setTimeout(r, delay));
        return chatWithGroq(message, context, history, modelId, onStream, attempt + 1, userName, userRole);
      }

      if (response.status === 429 || errorMessage.includes('rate_limit')) {
        return { 
          response: '⚠️ **Cuota de Groq saturada**. La LPU de Groq está recibiendo demasiadas peticiones. Por favor, espera 1 minuto o cambia temporalmente a **Mercury** o **Gemini**.', 
          action: null 
        };
      }
      throw new Error(`Groq error ${response.status}: ${errorMessage}`);
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
          } catch (e) {}
        }
      }
    }

    let finalResponse = fullContent;
    let finalAction = null;

    try {
      const parsed = extractJSON(fullContent);
      if (parsed) {
        const rawResponse = parsed.response || parsed.respuesta || parsed.mensaje || parsed.message || parsed.content || "";
        const rawAction = parsed.action || parsed.accion || parsed.actividad || null;

        if (rawResponse) {
          finalResponse = rawResponse;
          finalAction = rawAction;
        } else {
          const firstString = Object.values(parsed).find(v => typeof v === 'string' && v.length > 5);
          finalResponse = (firstString as string) || fullContent;
        }
      }
    } catch (e) {
      console.error('Error parseando JSON de Groq:', e);
    }

    return { response: finalResponse, action: finalAction };

  } catch (error: any) {
    if (error?.status === 429 && attempt < 3) {
      await new Promise(r => setTimeout(r, 2000));
      return chatWithGroq(message, context, history, modelId, onStream, attempt + 1, userName, userRole);
    }
    console.error('Groq chat error:', error);
    return {
      response: '❌ **Error de conexión con Groq LPU**: No se pudo obtener respuesta del modelo. Reintenta o cambia de proveedor.',
      action: null,
    };
  }
};
