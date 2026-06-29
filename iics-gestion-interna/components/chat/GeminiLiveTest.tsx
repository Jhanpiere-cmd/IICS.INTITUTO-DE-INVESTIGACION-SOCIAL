/**
 * GeminiLiveTest — Botón flotante conversacional
 * 
 * BUGS CORREGIDOS EN ESTA VERSIÓN:
 * 1. sessionPromise pattern: NO hacer await de ai.live.connect() directamente.
 *    onopen se dispara ANTES de que el await resuelva, así que session es undefined.
 *    Solución: guardar la Promise y await-earla dentro de los callbacks.
 * 2. Modelo verificado: gemini-3.1-flash-live-preview (listado real con la API key)
 * 3. Audio: { data: base64, mimeType: 'audio/pcm;rate=16000' } (verificado en SDK src)
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
const MODEL = 'gemini-3.1-flash-live-preview';

type Status = 'idle' | 'connecting' | 'listening' | 'speaking' | 'error';

export const GeminiLiveTest: React.FC = () => {
  const [status, setStatus] = useState<Status>('idle');
  const [log, setLog] = useState<string[]>([]);
  const [showLog, setShowLog] = useState(false);

  const sessionRef     = useRef<any>(null);
  const connectedRef   = useRef(false);
  const playCtxRef     = useRef<AudioContext | null>(null);
  const nextPlayRef    = useRef(0);
  const speakTimerRef  = useRef<any>(null);
  const captureCtxRef  = useRef<AudioContext | null>(null);
  const processorRef   = useRef<ScriptProcessorNode | null>(null);
  const micStreamRef   = useRef<MediaStream | null>(null);

  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString();
    setLog(prev => [`[${ts}] ${msg}`, ...prev].slice(0, 50));
  }, []);

  // ── Convertir ArrayBuffer PCM16 a Base64 ─────────────
  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // ── Reproducir chunk PCM16 base64 de Gemini ──────────
  const playChunk = useCallback((b64: string) => {
    const ctx = playCtxRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    try {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const view = new DataView(bytes.buffer);
      const f32 = new Float32Array(bytes.byteLength / 2);
      for (let i = 0; i < f32.length; i++) {
        const v = view.getInt16(i * 2, true);
        f32[i] = v / (v < 0 ? 0x8000 : 0x7FFF);
      }
      const buf = ctx.createBuffer(1, f32.length, 24000);
      buf.getChannelData(0).set(f32);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      if (nextPlayRef.current < ctx.currentTime) nextPlayRef.current = ctx.currentTime;
      src.start(nextPlayRef.current);
      nextPlayRef.current += buf.duration;
    } catch (e) { addLog(`⚠️ Error audio: ${e}`); }
  }, [addLog]);

  // ── Limpiar todo ──────────────────────────────────────
  const stopAll = useCallback(() => {
    connectedRef.current = false;
    if (processorRef.current) {
      processorRef.current.onaudioprocess = null;
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (captureCtxRef.current) { captureCtxRef.current.close().catch(() => {}); captureCtxRef.current = null; }
    if (micStreamRef.current) { micStreamRef.current.getTracks().forEach(t => t.stop()); micStreamRef.current = null; }
    if (playCtxRef.current) { playCtxRef.current.close().catch(() => {}); playCtxRef.current = null; }
    if (sessionRef.current) { try { sessionRef.current.close?.(); } catch (_) {} sessionRef.current = null; }
    if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
    setStatus('idle');
    addLog('🔴 Llamada finalizada');
  }, [addLog]);

  // ── CONECTAR / DESCONECTAR ────────────────────────────
  const toggle = useCallback(async () => {
    if (connectedRef.current || status !== 'idle') {
      stopAll();
      return;
    }

    setStatus('connecting');
    addLog('📡 Iniciando conexión...');

    try {
      // 1. AudioContext de reproducción (24kHz — salida de Gemini)
      playCtxRef.current = new AudioContext({ sampleRate: 24000 });
      await playCtxRef.current.resume();
      nextPlayRef.current = playCtxRef.current.currentTime;

      // 2. Micrófono
      addLog('🎙 Solicitando micrófono...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      addLog('🎙 Micrófono OK ✅');

      // 3. AudioContext de captura (16kHz — entrada de Gemini)
      captureCtxRef.current = new AudioContext({ sampleRate: 16000 });
      await captureCtxRef.current.resume();
      const micSrc = captureCtxRef.current.createMediaStreamSource(stream);
      const proc = captureCtxRef.current.createScriptProcessor(4096, 1, 1);
      processorRef.current = proc;
      micSrc.connect(proc);
      proc.connect(captureCtxRef.current.destination);

      // 4. Conectar a Gemini Live
      //    ⚠️ PATRÓN CRÍTICO: NO hacer await aquí.
      //    onopen se dispara ANTES de que connect() resuelva,
      //    así que la variable `session` no existiría dentro de onopen.
      //    Guardamos la PROMESA y la await-eamos dentro de los callbacks.
      addLog(`🔌 Conectando a ${MODEL}...`);
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

      const sessionPromise = ai.live.connect({
        model: MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
          systemInstruction:
            'Eres un asistente de voz conversacional. Habla siempre en español. ' +
            'Responde de forma breve y natural, como en una llamada telefónica. ' +
            'Saluda al usuario cuando inicie la conversación. Máximo 2 oraciones.',
        },
        callbacks: {
          onopen: async () => {
            addLog('✅ WebSocket abierto — obteniendo sesión...');

            // Obtener la sesión RESOLVIDA
            const session = await sessionPromise;
            sessionRef.current = session;
            connectedRef.current = true;
            setStatus('listening');
            addLog('✅ Sesión obtenida — activando mic...');

            // Activar envío de audio del mic a Gemini
            proc.onaudioprocess = (e) => {
              if (!connectedRef.current || !sessionRef.current) return;

              const input = e.inputBuffer.getChannelData(0);
              // Float32 → PCM16
              const pcm = new Int16Array(input.length);
              for (let i = 0; i < input.length; i++) {
                const s = Math.max(-1, Math.min(1, input[i]));
                pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
              }
              // PCM16 → Base64
              const b64 = arrayBufferToBase64(pcm.buffer);

              try {
                sessionRef.current.sendRealtimeInput({
                  audio: { data: b64, mimeType: 'audio/pcm;rate=16000' },
                });
              } catch (_) {}
            };

            addLog('🎤 Mic → Gemini ACTIVO. ¡Habla!');
          },

          onmessage: (msg: any) => {
            const parts = msg?.serverContent?.modelTurn?.parts ?? [];
            let gotAudio = false;

            for (const p of parts) {
              // Audio de respuesta
              if (p?.inlineData?.data) {
                gotAudio = true;
                playChunk(p.inlineData.data);
              }
            }

            if (gotAudio) {
              setStatus('speaking');
              if (speakTimerRef.current) clearTimeout(speakTimerRef.current);
              speakTimerRef.current = setTimeout(() => {
                if (connectedRef.current) {
                  setStatus('listening');
                  addLog('👂 Tu turno...');
                }
              }, 2000);
            }

            // Interrupción (barge-in: el usuario habló mientras Gemini hablaba)
            if (msg?.serverContent?.interrupted) {
              addLog('🔄 Interrumpida');
              if (playCtxRef.current) nextPlayRef.current = playCtxRef.current.currentTime;
              setStatus('listening');
            }

            // Turno completo de Gemini
            if (msg?.serverContent?.turnComplete) {
              addLog('✔ Turno Gemini completo');
              setStatus('listening');
            }
          },

          onerror: (e: any) => {
            const errMsg = e?.message ?? e?.error?.message ?? String(e) ?? '?';
            addLog(`❌ ERROR: ${errMsg}`);
            setStatus('error');
            setTimeout(() => { if (!connectedRef.current) setStatus('idle'); }, 3000);
          },

          onclose: (e: any) => {
            addLog(`🔌 Cerrado: code=${e?.code ?? '?'}`);
            connectedRef.current = false;
            setStatus('idle');
          },
        },
      });

      // Esperamos que la sesión se resuelva para confirmar que todo está listo
      const session = await sessionPromise;
      if (!sessionRef.current) sessionRef.current = session;
      addLog('📡 Todo listo — conversación activa');

    } catch (err: any) {
      const msg = err?.message ?? String(err);
      addLog(`❌ FALLO: ${msg}`);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
      stopAll();
    }
  }, [status, stopAll, playChunk, addLog]);

  useEffect(() => () => stopAll(), [stopAll]);

  // ── UI ────────────────────────────────────────────────
  const btnStyle: Record<Status, string> = {
    idle:       'bg-violet-600 hover:bg-violet-500 shadow-violet-500/40',
    connecting: 'bg-amber-500 animate-pulse shadow-amber-400/40',
    listening:  'bg-emerald-600 shadow-emerald-400/40 animate-pulse',
    speaking:   'bg-cyan-500 shadow-cyan-400/60',
    error:      'bg-red-600 shadow-red-500/40',
  };
  const btnIcon: Record<Status, string> = {
    idle: '🎙', connecting: '⏳', listening: '👂', speaking: '🔊', error: '❌',
  };
  const btnLabel: Record<Status, string> = {
    idle: 'PROBAR', connecting: '...', listening: 'ACTIVO', speaking: 'VOZ', error: 'ERROR',
  };

  return (
    <div className="fixed bottom-6 left-6 z-[99999] flex flex-col items-start gap-2">
      {showLog && (
        <div className="w-80 max-h-52 overflow-y-auto bg-black/95 backdrop-blur border border-white/10 rounded-xl p-3 text-[9px] font-mono text-green-400 shadow-2xl">
          {log.length === 0
            ? <p className="text-white/30 italic">Sin actividad...</p>
            : log.map((l, i) => <div key={i} className="mb-0.5 leading-tight border-b border-white/5 pb-0.5">{l}</div>)
          }
        </div>
      )}
      <div className="flex items-center gap-2">
        <button
          onClick={toggle}
          className={`w-16 h-16 rounded-full text-white font-black shadow-lg transition-all duration-300 flex flex-col items-center justify-center gap-0.5 ${btnStyle[status]}`}
          title={status === 'idle' ? 'Iniciar llamada de prueba' : 'Terminar'}
        >
          <span className="text-xl leading-none">{btnIcon[status]}</span>
          <span className="text-[8px] uppercase tracking-wider leading-none">{btnLabel[status]}</span>
        </button>
        <button
          onClick={() => setShowLog(v => !v)}
          className="w-8 h-8 rounded-full bg-black/70 border border-white/15 text-white/60 text-[11px] hover:bg-white/10 hover:text-white transition-all"
        >
          {showLog ? '✕' : '📋'}
        </button>
      </div>
    </div>
  );
};
