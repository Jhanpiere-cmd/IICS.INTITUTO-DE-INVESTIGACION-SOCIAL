import OpenAI from 'openai';
import { extractJSON } from './ai';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';

// Inicializar el cliente oficial de OpenAI
const client = new OpenAI({
  apiKey: OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export const OPENAI_MODELS = [
  {
    id: 'gpt-5.4',
    name: 'GPT-5.4 Flagship',
    provider: 'openai',
    description: 'La mejor inteligencia a gran escala para agentes · 1M ctx',
    emoji: '💎',
    badge: 'ULTRA',
    color: '#10A37F',
    logo: '/ai-logos/openai.png',
  },
  {
    id: 'gpt-5.4-mini',
    name: 'GPT-5.4 Mini',
    provider: 'openai',
    description: 'La inteligencia mini más potente para programación.',
    emoji: '🧪',
    badge: 'NEW (SUB-AGENTS)',
    color: '#10A37F',
    logo: '/ai-logos/openai.png',
  },
  {
    id: 'gpt-5.4-nano',
    name: 'GPT-5.4 Nano',
    provider: 'openai',
    description: 'Ultra-veloz y económico para tareas masivas.',
    emoji: '🚀',
    badge: 'NEW (OPTIMIZED)',
    color: '#10A37F',
    logo: '/ai-logos/openai.png',
  },
] as const;

export type OpenAIModelId = typeof OPENAI_MODELS[number]['id'];

/**
 * Chat con HOYR usando OpenAI GPT-5.4 (Responses API con SDK oficial)
 */
export const chatWithOpenAI = async (
  message: string,
  context: any,
  history: Array<{ role: string; content: string }>,
  modelId: string = 'gpt-5.4',
  onStream?: (chunk: string) => void
): Promise<{ response: string; action: any }> => {
  if (!OPENAI_API_KEY) {
    return {
      response: '⚠️ **OpenAI no configurado**: Falta `VITE_OPENAI_API_KEY`.',
      action: null,
    };
  }

  const now = new Date();
  const currentDateTime = now.toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
  });

  const systemPrompt = `Eres **HOYR**, el asistente orquestador táctico SGR-ACS. 🚀
🌟 **TU OBJETIVO**: Analizar el contexto y responder únicamente en formato JSON agéntico.
⏰ **FECHA/HORA**: ${currentDateTime}
**CONTEXTO**: ${JSON.stringify(context)}
**HISTORIAL**: ${history.map(m => `[${m.role.toUpperCase()}]: ${m.content}`).join('\n')}
**ESQUEMA JSON OBLIGATORIO**:
\`\`\`json
{
  "response": "Tu respuesta...",
  "action": { "type": "...", "state": { ... } }
}
\`\`\`
Envuélvelo en \`\`\`json.`;

  const inputString = `${systemPrompt}\n\n[USER]: ${message}`;

  try {
    // Usar la especificación de GPT-5.4 Responses API
    const stream = await (client as any).responses.create({
      model: modelId,
      input: inputString,
      reasoning: { effort: 'medium' },
      stream: true,
    });

    let fullContent = '';
    for await (const chunk of stream) {
      // Capturar del formato delta de la Responses API
      const delta = chunk.output_text_delta || chunk.output_text || '';
      if (delta) {
        fullContent += delta;
        if (onStream) onStream(fullContent);
      }
    }

    if (!fullContent) throw new Error('Respuesta vacía del SDK.');

    const parsed = extractJSON(fullContent);
    return {
      response: parsed.response || fullContent,
      action: parsed.action || null
    };

  } catch (error: any) {
    console.error('OpenAI SDK error:', error);
    
    // Fallback táctico: si la Responses API falla, intentar Chat Completions tradicional
    if (error.message.includes('responses') || error.status === 404) {
      console.warn('⚠️ Responses API no disponible. Intentando Chat Completions tradicional...');
      try {
        const chatCompletion = await client.chat.completions.create({
          model: modelId === 'gpt-5.4' ? 'gpt-4o' : modelId, // Mapeo de seguridad
          messages: [
            { role: 'system', content: systemPrompt },
            ...history.slice(-5).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant' as any, content: m.content })),
            { role: 'user', content: message }
          ],
          stream: true,
        });

        let fallbackContent = '';
        for await (const chunk of chatCompletion) {
          const delta = chunk.choices[0]?.delta?.content || '';
          fallbackContent += delta;
          if (onStream) onStream(fallbackContent);
        }
        
        const parsed = extractJSON(fallbackContent);
        return { response: parsed.response || fallbackContent, action: parsed.action || null };
      } catch (fallbackError: any) {
        return { response: `❌ **Error de OpenAI (V5/V4)**: ${fallbackError.message}`, action: null };
      }
    }

    return {
      response: `❌ **Error de OpenAI SDK**: ${error.message}`,
      action: null,
    };
  }
};

/**
 * Generar imagen usando DALL-E 3 con formato Base64 para evitar problemas de CORS
 */
export const generateImageWithOpenAI = async (prompt: string): Promise<string> => {
  try {
    const response = await client.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      response_format: "b64_json"
    });
    
    const b64 = response.data[0].b64_json;
    if (!b64) throw new Error("No se recibió formato base64 de DALL-E 3.");
    return `data:image/png;base64,${b64}`;
  } catch (error: any) {
    console.error('Error generating image with DALL-E 3:', error);
    throw new Error(error.message || 'Error al conectar con la API de DALL-E 3.');
  }
};

