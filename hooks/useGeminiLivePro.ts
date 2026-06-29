/**
 * useGeminiLivePro — Hook de voz bidireccional con Gemini Live
 * 
 * VERIFICADO y funcional. Bugs corregidos:
 * 1. Modelo: gemini-3.1-flash-live-preview (verificado via /v1beta/models)
 * 2. Audio: { data: base64, mimeType } (verificado en SDK source code)
 * 3. sessionPromise pattern: NO hacer await de connect() directamente.
 *    onopen se dispara ANTES de que connect() resuelva.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';
import { supabase } from '../lib/supabase';

const GEMINI_API_KEY = (import.meta.env.VITE_GEMINI_API_KEY as string);
const LIVE_MODEL = 'gemini-3.1-flash-live-preview';

// ── Utilidad: ArrayBuffer PCM16 → Base64 ──
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function useGeminiLivePro() {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<any>(null);
  const isConnectedRef = useRef(false);

  // Audio de REPRODUCCIÓN (lo que dice Gemini — 24kHz)
  const playbackContextRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Audio de CAPTURA (micrófono del usuario — 16kHz)
  const micStreamRef = useRef<MediaStream | null>(null);
  const captureContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  // ────────────────────────────────────────────────────
  // REPRODUCCIÓN: decodifica PCM16 base64 y lo encola
  // ────────────────────────────────────────────────────
  const playAudioChunk = useCallback((base64Data: string) => {
    if (!playbackContextRef.current) return;
    if (playbackContextRef.current.state === 'suspended') {
      playbackContextRef.current.resume();
    }
    try {
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const view = new DataView(bytes.buffer);
      const float32 = new Float32Array(bytes.byteLength / 2);
      for (let i = 0; i < float32.length; i++) {
        const int16 = view.getInt16(i * 2, true);
        float32[i] = int16 / (int16 < 0 ? 0x8000 : 0x7FFF);
      }
      const audioBuffer = playbackContextRef.current.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);
      const source = playbackContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(playbackContextRef.current.destination);
      if (nextPlayTimeRef.current < playbackContextRef.current.currentTime) {
        nextPlayTimeRef.current = playbackContextRef.current.currentTime;
      }
      source.start(nextPlayTimeRef.current);
      nextPlayTimeRef.current += audioBuffer.duration;
    } catch (e) {
      console.error('Error decoding audio chunk', e);
    }
  }, []);

  // ────────────────────────────────────────────────────
  // DESCONEXIÓN LIMPIA
  // ────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    isConnectedRef.current = false;
    setIsConnected(false);
    setIsSpeaking(false);
    setIsListening(false);

    if (processorRef.current) {
      processorRef.current.onaudioprocess = null;
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (captureContextRef.current) {
      captureContextRef.current.close().catch(() => {});
      captureContextRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    if (playbackContextRef.current) {
      playbackContextRef.current.close().catch(() => {});
      playbackContextRef.current = null;
    }
    if (sessionRef.current) {
      try { sessionRef.current.close?.(); } catch (e) {}
      sessionRef.current = null;
    }
    if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
  }, []);

  // ────────────────────────────────────────────────────
  // CONEXIÓN A GEMINI LIVE (patrón sessionPromise)
  // ────────────────────────────────────────────────────
  const connect = useCallback(async (voiceName: string = 'Zephyr', systemInstruction?: string) => {
    if (!GEMINI_API_KEY) {
      setError('VITE_GEMINI_API_KEY no configurada');
      return;
    }

    try {
      setError(null);

      // 1. Contexto de REPRODUCCIÓN (24kHz — frecuencia de salida de Gemini)
      playbackContextRef.current = new AudioContext({ sampleRate: 24000 });
      await playbackContextRef.current.resume();
      nextPlayTimeRef.current = playbackContextRef.current.currentTime;

      // 2. Captura de MICRÓFONO con cancelación de eco nativa
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      micStreamRef.current = stream;

      // 3. Pipeline de captura (16kHz — frecuencia de entrada de Gemini)
      captureContextRef.current = new AudioContext({ sampleRate: 16000 });
      await captureContextRef.current.resume();
      const micSource = captureContextRef.current.createMediaStreamSource(stream);
      const processor = captureContextRef.current.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      micSource.connect(processor);
      processor.connect(captureContextRef.current.destination);

      // 4. Conectar a Gemini Live
      //    ⚠️ PATRÓN CRÍTICO: Guardar la Promise, NO hacer await aquí.
      //    onopen se dispara ANTES de que connect() resuelva,
      //    por lo que `session` no existiría dentro del callback.
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

      const sessionPromise = ai.live.connect({
        model: LIVE_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName } }
          },
          systemInstruction: systemInstruction || 'Eres HOYR, un asistente de voz amigable y breve. Habla en español.',
          tools: [{
            functionDeclarations: [
              {
                name: "create_task",
                description: "Crea una tarea en el sistema para un miembro del equipo.",
                parameters: {
                  type: "OBJECT",
                  properties: {
                    title: { type: "STRING", description: "Título breve de la tarea" },
                    description: { type: "STRING", description: "Descripción detallada de la tarea" },
                    assigned_to_id: { type: "STRING", description: "El ID del perfil de usuario al que se le asigna la tarea (obtenido del contexto de equipo)" },
                    priority: { type: "STRING", description: "Nivel de prioridad: Baja, Media, Alta o Urgente" },
                    due_date: { type: "STRING", description: "Fecha límite en formato YYYY-MM-DD" }
                  },
                  required: ["title", "description", "assigned_to_id", "priority", "due_date"]
                }
              }
            ]
          }],
        },
        callbacks: {
          onopen: async () => {
            // Resolver la sesión DENTRO del callback
            const session = await sessionPromise;
            sessionRef.current = session;
            isConnectedRef.current = true;
            setIsConnected(true);
            setIsListening(true);

            // Activar envío de audio del mic a Gemini
            processor.onaudioprocess = (e) => {
              if (!isConnectedRef.current || !sessionRef.current) return;

              const inputData = e.inputBuffer.getChannelData(0);
              // Float32 → PCM16
              const pcm16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                const s = Math.max(-1, Math.min(1, inputData[i]));
                pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
              }
              // PCM16 → Base64 (formato que el SDK serializa a JSON)
              const b64 = arrayBufferToBase64(pcm16.buffer);

              try {
                sessionRef.current.sendRealtimeInput({
                  audio: { data: b64, mimeType: 'audio/pcm;rate=16000' },
                });
              } catch (_) {}
            };
          },

          onmessage: async (message: any) => {
            const parts = message?.serverContent?.modelTurn?.parts;
            if (parts) {
              for (const part of parts) {
                const base64Audio = part?.inlineData?.data;
                if (base64Audio) {
                  setIsSpeaking(true);
                  playAudioChunk(base64Audio);
                  if (speakingTimeoutRef.current) clearTimeout(speakingTimeoutRef.current);
                  speakingTimeoutRef.current = setTimeout(() => setIsSpeaking(false), 1500);
                }

                // DETECCIÓN DE FUNCTION CALL
                if (part?.functionCall) {
                  const call = part.functionCall;
                  if (call.name === "create_task") {
                    try {
                      console.log("Ejecutando tool create_task", call.args);
                      const args = call.args;
                      const { error } = await supabase.from('tasks').insert([{
                        title: args.title,
                        description: args.description,
                        assigned_to: args.assigned_to_id,
                        priority: args.priority,
                        due_date: args.due_date,
                        status: 'Pendiente',
                        task_type: 'Documento' // Default
                      }]);

                      const responsePayload = {
                        result: error ? `Error al crear tarea: ${error.message}` : "Tarea creada exitosamente en la base de datos"
                      };

                      if (sessionRef.current) {
                        sessionRef.current.send({
                          clientContent: {
                            turnComplete: true,
                            turns: [{
                              role: "user",
                              parts: [{
                                functionResponse: {
                                  id: call.id,
                                  name: call.name,
                                  response: responsePayload
                                }
                              }]
                            }]
                          }
                        });
                      }
                    } catch (e) {
                      console.error("Error en function call", e);
                    }
                  }
                }
              }
            }
            // Interrupción (barge-in)
            if (message?.serverContent?.interrupted) {
              if (playbackContextRef.current) {
                nextPlayTimeRef.current = playbackContextRef.current.currentTime;
              }
              setIsSpeaking(false);
            }
            // Turno completo
            if (message?.serverContent?.turnComplete) {
              setIsSpeaking(false);
              setIsListening(true);
            }
          },

          onerror: (e: any) => {
            const msg = e?.message || e?.toString() || 'Error WebSocket';
            console.error('Gemini Live error:', msg);
            setError(msg);
            isConnectedRef.current = false;
            setIsConnected(false);
          },

          onclose: (e: any) => {
            console.warn('Gemini Live cerrado:', e?.code, e?.reason);
            isConnectedRef.current = false;
            setIsConnected(false);
            setIsListening(false);
          },
        },
      });

      // Esperar a que la sesión se resuelva
      const session = await sessionPromise;
      if (!sessionRef.current) sessionRef.current = session;

    } catch (err: any) {
      const msg = err?.message || err?.toString() || 'Error desconocido';
      console.error('Fallo al conectar Gemini Live:', msg);
      setError(msg);
      isConnectedRef.current = false;
    }
  }, [playAudioChunk, disconnect]);

  // ────────────────────────────────────────────────────
  // ENVIAR TEXTO (para que Gemini lo lea en voz alta)
  // ────────────────────────────────────────────────────
  const sendMessage = useCallback((text: string) => {
    if (sessionRef.current && isConnectedRef.current) {
      try {
        sessionRef.current.sendClientContent({
          turns: [{ role: 'user', parts: [{ text }] }],
          turnComplete: true,
        });
      } catch (e) {
        console.error('Error enviando mensaje a Gemini Live', e);
      }
    }
  }, []);

  // Limpieza al desmontar
  useEffect(() => {
    return () => disconnect();
  }, [disconnect]);

  return { isConnected, isSpeaking, isListening, error, connect, disconnect, sendMessage, sessionRef };
}
