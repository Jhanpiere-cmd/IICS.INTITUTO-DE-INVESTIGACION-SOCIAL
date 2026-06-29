import { extractJSON, getMasterTacticalPrompt } from './ai';

const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY || 'sk-59a83b6b020547d28905c73b1e1880f7';
const BASE_URL = 'https://api.deepseek.com';

export const DEEPSEEK_MODELS = [
  {
    id: 'deepseek-chat',
    name: 'DeepSeek-V3',
    provider: 'deepseek',
    description: 'Modo chat ultra-rápido y eficiente (V3.2) · 128K ctx',
    emoji: '🐋',
    badge: 'FAST & SMART',
    color: '#3B82F6',
    logo: '/ai-logos/deepseek_official.png',
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek-R1 (Reasoner)',
    provider: 'deepseek',
    description: 'Modo razonamiento avanzado (R1) · Ideal para lógica y auditoría',
    emoji: '⚛️',
    badge: 'REASONER',
    color: '#8B5CF6',
    logo: '/ai-logos/deepseek_official.png',
  }
] as const;

export const chatWithDeepSeek = async (
  message: string,
  context: any,
  history: Array<{ role: string; content: string }>,
  modelId: string = 'deepseek-chat',
  onStream?: (chunk: string) => void,
  userName: string = 'Usuario',
  userRole: string = 'Miembro'
): Promise<{ response: string; action: any }> => {
  const now = new Date();
  const currentDateTime = now.toLocaleDateString('es-ES', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short'
  });

  const systemPrompt = getMasterTacticalPrompt(currentDateTime, typeof context === 'string' ? context : JSON.stringify(context), userName, userRole);

  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY.trim()}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: 'system', content: systemPrompt },
          ...history.slice(-50).map(m => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content
          })),
          { role: 'user', content: message }
        ],
        temperature: modelId === 'deepseek-reasoner' ? 0.6 : 0.1,
        stream: true
      }),
    });

    if (!response.ok) {
      let errorDetail = '';
      try {
        const errorJson = await response.json();
        errorDetail = errorJson.error?.message || errorJson.message || JSON.stringify(errorJson);
      } catch (e) {
        errorDetail = await response.text() || response.statusText;
      }
      throw new Error(`API Error (${response.status}): ${errorDetail}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    if (!reader) throw new Error("No se pudo inicializar el lector de stream.");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.trim().startsWith('data: ') && line.trim() !== 'data: [DONE]') {
          try {
            const data = JSON.parse(line.trim().substring(6));
            const delta = data.choices?.[0]?.delta?.content || "";
            fullText += delta;
            if (onStream) onStream(fullText);
          } catch (e) {
            // Ignorar chunks incompletos
          }
        }
      }
    }

    const parsed = extractJSON(fullText);
    return {
      response: parsed.response || fullText,
      action: parsed.action || null
    };

  } catch (error: any) {
    console.error('DeepSeek connection error:', error);
    return { 
      response: `❌ **Error de DeepSeek**: ${error.message || 'Error de conexión desconocido.'}`, 
      action: null 
    };
  }
};
