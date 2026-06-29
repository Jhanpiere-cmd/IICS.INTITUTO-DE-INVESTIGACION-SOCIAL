import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Mic, MicOff, Volume2, VolumeX, Navigation, 
  Sparkles, Bot, Zap, X, Maximize2, Minimize2,
  Calendar, CheckSquare, Gift, DollarSign, Target, Menu, Activity
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useGeminiLivePro } from '../../hooks/useGeminiLivePro';
import { chatWithMercury } from '../../lib/mercury';
import { ACS_KNOWLEDGE_BASE } from '../../lib/acs_data';
import NeuralOrb from './NeuralOrb';
import { VocalWaves } from './VocalWaves';
import { useToast } from '../ui/ToastContext';

// --- CONFIGURACIÓN DE VOZ ---
const FUTURISTIC_VOICE_LANG = 'es-ES';
const VOICE_RATE = 1.0;
const VOICE_PITCH = 1.1;

// Tipos para acciones agénticas
interface PendingAction {
  type: string;
  payload: any;
  label: string;
}

export const AgentBubble: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { showToast } = useToast();
  
  // Estados de la burbuja
  const [isExpanded, setIsExpanded] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [lastTranscript, setLastTranscript] = useState('');
  const [agentResponse, setAgentResponse] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [history, setHistory] = useState<Array<{ role: string, content: string }>>([]);
  const [isCallActive, setIsCallActive] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const hasGreeted = useRef(false);
  const isComponentMounted = useRef(true);
  
  // Referencias para Web Speech API
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis>(window.speechSynthesis);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [userVolume, setUserVolume] = useState(0);
  const [isProMode, setIsProMode] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState('Zephyr');

  // Motor de Voz Pro (AI Studio)
  const proVoice = useGeminiLivePro();
  const isConnectingRef = useRef(false);

  // ✅ FIX CRÍTICO: Ref para processCommand — evita que onresult capture una función vacía
  const processCommandRef = useRef<(cmd: string) => void>(() => {});

  // ✅ FIX 1: Refs espejo para estados críticos — evitan closures stale en eventos del mic
  const isCallActiveRef = useRef(false);
  const isMutedRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const proVoiceIsSpeakingRef = useRef(false);

  // Sincronizar Refs con sus estados correspondientes
  useEffect(() => { isCallActiveRef.current = isCallActive; }, [isCallActive]);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  useEffect(() => { proVoiceIsSpeakingRef.current = proVoice.isSpeaking; }, [proVoice.isSpeaking]);

  // Sincronizar conexión del motor PRO — SOLO CUANDO SE ACTIVA LLAMADA
  // (La conexión real ocurre en toggleListening para incluir el contexto ACS actualizado)
  useEffect(() => {
    if (!isProMode && proVoice.isConnected) {
      proVoice.disconnect();
    }
  }, [isProMode]);

  // --- MEMORIA PERSISTENTE (localStorage) ---
  useEffect(() => {
    const savedHistory = localStorage.getItem('hoyr_history');
    const savedGreeted = localStorage.getItem('hoyr_has_greeted');
    
    if (savedHistory) {
      try {
        const parsed = JSON.parse(savedHistory);
        if (parsed.length > 0) {
          setHistory(parsed.slice(-50));
        }
      } catch (e) { console.error("Error cargando historia"); }
    }
    
    if (savedGreeted === 'true') {
      hasGreeted.current = true;
    }
    return () => { isComponentMounted.current = false; };
  }, []);

  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem('hoyr_history', JSON.stringify(history));
    }
    if (hasGreeted.current) {
      localStorage.setItem('hoyr_has_greeted', 'true');
    }
  }, [history]);

  // --- NOTIFICACIÓN DE CONEXIÓN PRO ---
  useEffect(() => {
    if (proVoice.isConnected && (isExpanded || isCallActive)) {
      showToast({ 
        type: 'success', 
        title: 'HOYR V2 PRO', 
        message: 'Motor de Voz Humana Sincronizado.' 
      });
    }
  }, [proVoice.isConnected, isExpanded, isCallActive]);

  // Mostrar errores de Gemini Live al usuario via Toast
  useEffect(() => {
    if (proVoice.error) {
      showToast({ type: 'error', title: 'Error Voz PRO', message: proVoice.error });
    }
  }, [proVoice.error]);

  // ✅ MOTOR DE ESCUCHA (Solo modo estándar — Gemini Live maneja su propio STT en modo PRO)
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = FUTURISTIC_VOICE_LANG;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      // Reiniciar solo en modo estándar con llamada activa
      if (
        isCallActiveRef.current &&
        !isProMode &&
        !isMutedRef.current &&
        !isSpeakingRef.current &&
        isComponentMounted.current
      ) {
        try { recognition.start(); } catch (e) {}
      }
    };
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        else interimTranscript += event.results[i][0].transcript;
      }
      if (interimTranscript) setLastTranscript(interimTranscript);
      if (finalTranscript) {
        const t = finalTranscript.toLowerCase();
        setLastTranscript(t);
        processCommandRef.current(t);
      }
    };
    recognition.onerror = (e: any) => {
      if (e.error !== 'no-speech' && e.error !== 'aborted') console.warn('STT error:', e.error);
    };
    recognitionRef.current = recognition;
    return () => { recognition.abort(); };
  }, [isProMode]); // se recrea si cambia de modo

  // --- LIMPIEZA DE TEXTO PARA VOZ (Antiapocalipsis de Asteriscos) ---
  const cleanTextForSpeech = (text: string) => {
    return text
      .replace(/\*\*/g, '') // Eliminar negritas
      .replace(/\*/g, '')   // Eliminar cursivas
      .replace(/#/g, '')    // Eliminar encabezados
      .replace(/\[.*\]\(.*\)/g, '') // Eliminar enlaces markdown
      .replace(/!\[.*\]\(.*\)/g, '') // Eliminar imágenes markdown
      .replace(/(\r\n|\n|\r)/gm, " ") // Eliminar saltos de línea para fluidez
      .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, "") // ELIMINAR EMOJIS quirúrgicamente
      .replace(/\s+/g, " ") // Eliminar espacios múltiples
      .trim();
  };

  // --- MOTOR DE VOZ: HABLA HUMANIZADA ---
  const speak = useCallback((text: string) => {
    if (!text || isMuted) return;
    
    const cleanContent = cleanTextForSpeech(text);
    setAgentResponse(cleanContent);
    
    // Segmentar por oraciones para prosodia y evitar recortes
    const sentences = cleanContent.match(/[^.!?]+[.!?]+/g) || [cleanContent];
    
    let currentSentence = 0;
    
    const speakSentence = () => {
      if (currentSentence >= sentences.length) {
        setIsSpeaking(false);
        // Reiniciar escucha solo en modo ESTÁNDAR (en PRO, Gemini maneja el mic)
        if (!isMuted && !isProMode) {
          setTimeout(() => {
            recognitionRef.current?.start();
          }, 400);
        }
        return;
      }

      const sentence = sentences[currentSentence].trim();
      if (!sentence) {
        currentSentence++;
        speakSentence();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(sentence);
      utterance.lang = FUTURISTIC_VOICE_LANG;
      utterance.volume = 1.0;
      
      // Variación de tono para sonar humano (Prosodia simulada)
      utterance.pitch = 0.95 + (Math.random() * 0.15); 
      utterance.rate = 1.05;

      const voices = synthRef.current.getVoices();
      // Buscar voces Neurales o de Google en español
      const preferredVoice = voices.find(v => v.lang.includes('es-ES') && (v.name.includes('Neural') || v.name.includes('Google'))) 
                         || voices.find(v => v.lang.includes('es-ES'));
      if (preferredVoice) utterance.voice = preferredVoice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        currentSentence++;
        setTimeout(speakSentence, 50); // Pequeña pausa entre ideas
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
      };

      synthRef.current.speak(utterance);
    };

    // Detener cualquier habla previa
    synthRef.current.cancel();
    speakSentence();
  }, [isMuted]);
  
  // --- SISTEMA DE ORQUESTACIÓN VOCAL (PRO vs STANDARD) ---
  const smartSpeak = useCallback((text: string) => {
    if (!text || isMuted) return;
    if (isProMode && proVoice.isConnected) {
      // Voz humana Gemini Live
      proVoice.sendMessage(text);
    } else {
      // Fallback SIEMPRE activo: TTS estándar garantizado
      speak(text);
    }
  }, [isProMode, proVoice.isConnected, speak, isMuted]);

  // --- CIERRE DE SESIÓN Y APAGADO TOTAL ---
  const handleShutdown = () => {
    // 1. Detener motores
    synthRef.current.cancel();
    recognitionRef.current?.stop();
    proVoice.disconnect(); // Cerrar Gemini Live
    
    // 2. Limpiar estados
    setIsCallActive(false);
    setIsExpanded(false);
    setIsListening(false);
    setIsSpeaking(false);
    
    // 3. Resetear memoria de sesión
    localStorage.removeItem('hoyr_history');
    localStorage.removeItem('hoyr_has_greeted');
    setHistory([]);
    hasGreeted.current = false;
  };

  // Heartbeat: solo en modo ESTÁNDAR (en PRO, Gemini Live maneja su propio mic)
  useEffect(() => {
    if (isProMode) return; // No hacer nada en modo PRO
    const interval = setInterval(() => {
      if (
        isCallActiveRef.current &&
        !isMutedRef.current &&
        !isSpeakingRef.current &&
        !isListening &&
        isComponentMounted.current
      ) {
        try { recognitionRef.current?.start(); } catch (e) { }
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [isListening, isProMode]);

  // --- CAPTURA DE CONTEXTO TOTAL ---
  const getSystemContext = async () => {
    try {
      // Perfiles con roles
      const { data: profiles } = await supabase.from('profiles').select('id, fullName, role');
      
      // Tareas con asignado principal y colaboradores
      const { data: tasks } = await supabase.from('tasks')
        .select(`
          title,
          assigned_to,
          collaborator_ids,
          profiles:assigned_to (fullName)
        `)
        .eq('status', 'Pendiente')
        .limit(100);
      
      // Estado Financiero de la Revista
      const { data: transactions } = await supabase.from('financial_transactions').select('type, amount');
      let income = 0;
      let expenses = 0;
      if (transactions) {
        transactions.forEach(t => {
          if (t.type === 'income') income += Number(t.amount);
          if (t.type === 'expense') expenses += Number(t.amount);
        });
      }
      const balance = income - expenses;

      const { data: meetings } = await supabase.from('meetings')
        .select('title, scheduled_at')
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(5);

      // Helper para colaboradores
      const getCollaboratorNames = (ids: string[] | null) => {
        if (!ids || ids.length === 0) return '';
        const names = ids.map(id => profiles?.find(p => p.id === id)?.fullName).filter(Boolean);
        return names.length > 0 ? ` (Compartida con: ${names.join(', ')})` : '';
      };

      const misTareas = tasks?.filter(t => t.assigned_to === user?.id || (t.collaborator_ids && t.collaborator_ids.includes(user?.id)));
      const otrasTareas = tasks?.filter(t => t.assigned_to !== user?.id && (!t.collaborator_ids || !t.collaborator_ids.includes(user?.id)));

      return `
      EQUIPO DE TRABAJO ACS (CON ROLES E IDs):
      ${profiles?.map(p => `- ${p.fullName} (Rol/Cargo: ${p.role || 'Miembro'}, ID: ${p.id})`).join('\n')}

      MIS TAREAS PENDIENTES (ASIGNADAS A MÍ Y COMPARTIDAS CONMIGO):
      ${misTareas?.length ? misTareas.map(t => `- Tarea: "${t.title}" | Principal: ${(t.profiles as any)?.fullName || (t.profiles as any[])?.[0]?.fullName || 'Sin asignar'}${getCollaboratorNames(t.collaborator_ids)}`).join('\n') : 'No tengo tareas pendientes.'}
      
      TAREAS DEL RESTO DEL EQUIPO:
      ${otrasTareas?.length ? otrasTareas.map(t => `- Tarea: "${t.title}" | Principal: ${(t.profiles as any)?.fullName || (t.profiles as any[])?.[0]?.fullName || 'Sin asignar'}${getCollaboratorNames(t.collaborator_ids)}`).join('\n') : 'Sin pendientes en el resto del equipo.'}
      
      ESTADO FINANCIERO DE LA REVISTA ACS:
      Ingresos Totales: S/ ${income.toFixed(2)}
      Gastos Totales: S/ ${expenses.toFixed(2)}
      Balance/Dinero Actual: S/ ${balance.toFixed(2)}

      PRÓXIMAS REUNIONES: ${meetings?.map(m => m.title).join(', ') || 'Sin reuniones'}
      RUTA ACTUAL: ${location.pathname}
      USUARIO ACTIVO: ${user?.fullName}
      `;
    } catch (e) {
      return "Error cargando contexto";
    }
  };

  // --- MONITOR DE REACTIVACIÓN INSTANTÁNEA ---
  useEffect(() => {
    if (isProMode) return; // En modo PRO Gemini maneja su propio mic nativo
    if (!proVoice.isSpeaking && isCallActiveRef.current && !isSpeakingRef.current && !isListening) {
      const timer = setTimeout(() => {
        try { recognitionRef.current?.start(); } catch(e) {}
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [proVoice.isSpeaking, isListening, isProMode]);

  // --- MOTOR DE PROACTIVIDAD (Solo una vez) ---
  useEffect(() => {
    if (!hasGreeted.current && proVoice.isConnected) {
      hasGreeted.current = true;
      handleProactiveGreeting();
    }
  }, [isExpanded]);

  const handleProactiveGreeting = async () => {
    setIsThinking(true);
    const context = await getSystemContext();
    const prompt = `Genera un saludo proactivo MUY CONVERSACIONAL Y HUMANO. 
    1. Usa onomatopeyas breves si es natural (ej: "Hmm", "¡Oh!", "Ja, ja").
    2. No uses asteriscos ni markdown en tu respuesta "response".
    3. Menciona el estatus de tareas y cumpleaños como si fueras un colega de confianza.
    4. Sé breve pero detallado. No preguntes qué quiero hacer, solo preséntate y da el estatus.`;
    
    const { response, action } = await chatWithMercury(prompt, context, []);
    setIsThinking(false);
    smartSpeak(response);
    setHistory([{ role: 'assistant', content: response }]);
    // El micrófono se activará solo al terminar de hablar (vía utterance.onend)
  };

  // --- EJECUCIÓN DE ACCIONES ---
  const executeAction = async (action: any) => {
    if (!action) return;
    
    try {
      if (action.type === 'CREATE_TASK' || action.path === '/tasks') {
        const { error } = await supabase.from('tasks').insert([{
          ...action.state,
          created_by: user?.id,
          assigned_to: action.state.assigned_to || user?.id
        }]);
        if (error) throw error;
        smartSpeak("Acción ejecutada. La tarea ha sido integrada en el servidor central.");
      } else if (action.path) {
        smartSpeak(`Navegando al módulo solicitado: ${action.path}`);
        navigate(action.path);
      }
      setPendingAction(null);
    } catch (e) {
      smartSpeak("Error en la ejecución táctica. Reintenta el comando.");
    }
  };

  // --- MOTOR DE COMANDOS (IA MERCURY) — Solo modo ESTÁNDAR ---
  const processCommand = useCallback(async (command: string) => {
    if (!command) return;
    // En modo PRO, Gemini Live maneja TODO (STT+LLM+TTS). No interferir.
    if (isProMode) return;

    if (pendingAction) {
      if (command.includes('si') || command.includes('dale') || command.includes('hazlo') || command.includes('procede')) {
        executeAction(pendingAction.payload);
        return;
      } else if (command.includes('no') || command.includes('cancela')) {
        smartSpeak("Entendido. Acción abortada.");
        setPendingAction(null);
        return;
      }
    }

    setIsThinking(true);
    const context = await getSystemContext();
    const voicePrompt = `[MODO LLAMADA DE VOZ ACTIVA]. 
    - Eres el coordinador social. 
    - Si te piden crear una tarea y NO sabes a quién o para cuándo, PREGUNTA explícitamente.
    - Usa la lista de EQUIPO DE TRABAJO del contexto para identificar a las personas por su nombre.
    - SIEMPRE confirma los datos antes de emitir la acción JSON.
    - Sé muy humano y breve.
    - IMPORTANTE: Tus respuestas serán leídas por un motor de voz. No uses markdown. Usa pausas (hm, oh, ya veo) para sonar natural.`;
    
    const { response, action } = await chatWithMercury(`${command}\n\n${voicePrompt}`, context, history);
    setIsThinking(false);
    smartSpeak(response);
    setHistory(prev => [...prev, { role: 'user', content: command }, { role: 'assistant', content: response }]);

    // ✅ Reactivar mic explícitamente después de la respuesta (cubre casos donde Gemini o TTS no disparan onend)
    setTimeout(() => {
      if (isCallActiveRef.current && !isMutedRef.current && isComponentMounted.current) {
        try { recognitionRef.current?.start(); } catch(e) {}
      }
    }, 2500);

    if (action) {
      setPendingAction({ type: action.type || 'NAVIGATE', payload: action, label: action.response || "Acción sugerida" });
      setTimeout(() => { smartSpeak("¿Deseas que proceda con esto?"); }, 1500);
    }
  }, [pendingAction, history, smartSpeak]);

  // ✅ Mantener la Ref actualizada con la última versión de processCommand
  useEffect(() => {
    processCommandRef.current = processCommand;
  }, [processCommand]);


  const toggleListening = () => {
    if (isCallActive) {
      // --- DETENER LLAMADA ---
      setIsCallActive(false);
      recognitionRef.current?.stop();
      synthRef.current.cancel();
      if (proVoice.isConnected) proVoice.disconnect();
    } else {
      // --- INICIAR LLAMADA ---
      setIsCallActive(true);
      setLastTranscript('');
      setAgentResponse('');

      if (isProMode) {
        // MODO PRO: Gemini Live escucha y habla directamente (STT+LLM+TTS nativo)
        const startGeminiLive = async () => {
          if (proVoice.isConnected || isConnectingRef.current) return;
          isConnectingRef.current = true;
          try {
            const context = await getSystemContext();
            
            // Inyectar memoria (últimos 10 mensajes)
            const memoryText = history.length > 0 
              ? history.slice(-10).map(h => `${h.role === 'user' ? 'Usuario' : 'Asistente'}: ${h.content}`).join('\n')
              : 'Sin conversación previa hoy.';

            const instruction = `
              Eres HOYR, el asistente de voz del Sistema de Gestión ACS.
              PERSONALIDAD: Cálido, humano, muy breve. Máximo 2 oraciones por respuesta.
              NO uses markdown, asteriscos ni negritas. Habla naturalmente.
              Usa pausas (hmm, ah, ya veo) para sonar humano.

              MEMORIA DE LA CONVERSACIÓN PREVIA:
              ${memoryText}

              CONTEXTO ACTUAL DEL SISTEMA ACS:
              ${context}

              Al conectarte, salúda brevemente al usuario mencionando su nombre y 1 cosa del contexto.
            `;
            // Sin muteMic — Gemini Live escucha el micrófono directamente
            await proVoice.connect(selectedVoice, instruction);
          } finally {
            isConnectingRef.current = false;
          }
        };
        startGeminiLive();
      } else {
        // MODO ESTÁNDAR: SpeechRecognition + Mercury + TTS
        const greet = async () => {
          setIsThinking(true);
          const context = await getSystemContext();
          const { response } = await chatWithMercury(
            'Salúdame brevemente. 1 oración. Sin markdown.',
            context, history
          );
          setIsThinking(false);
          speak(response);
          setTimeout(() => {
            if (isCallActiveRef.current) {
              try { recognitionRef.current?.start(); } catch(e) {}
            }
          }, 2000);
        };
        greet();
      }
    }
  };

  return (
    <div className={`fixed z-[9999] transition-all duration-700 ease-out ${
      isExpanded
        ? 'inset-0 md:inset-auto md:bottom-8 md:right-8'          /* móvil: fullscreen | desktop: posicionado */
        : 'bottom-24 right-4 md:bottom-6 md:right-6'              /* móvil: sobre BottomNav | desktop: esquina */
    }`}>
      {isExpanded && (
        <div className="bg-[#0A0A0A] border-t md:border border-[#262626] backdrop-blur-3xl shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-500
          h-full rounded-t-2xl
          md:h-auto md:rounded-sm md:w-96 md:max-h-[600px]">
          <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${isProMode ? 'bg-cyan-500/20 text-cyan-500 shadow-[0_0_10px_rgba(0,240,255,0.3)]' : 'bg-red-500/20 text-red-500'}`}>
                <Activity size={18} className={isProMode ? 'animate-pulse' : ''} />
              </div>
              <div>
                <h3 className="text-white font-black text-xs uppercase tracking-widest text-shadow-glow">HOYR V2 PRO</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-gray-500 uppercase font-bold">Vocal Engine:</span>
                  <button 
                    onClick={() => {
                      if (isProMode) {
                        proVoice.disconnect();
                        setIsProMode(false);
                      } else {
                        setIsProMode(true);
                      }
                    }}
                    className={`text-[9px] font-black px-1.5 py-0.5 rounded-sm transition-all ${isProMode ? 'bg-cyan-500 text-black' : 'bg-white/5 text-gray-400'}`}
                  >
                    {isProMode ? 'GEMINI LIVE (HYBRID)' : 'STANDARD'}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsExpanded(false)}
                className="p-1.5 text-gray-500 hover:text-white hover:bg-white/5 transition-all group"
                title="Minimizar (Seguir hablando)"
              >
                <Minimize2 size={14} className="group-hover:scale-110 transition-transform" />
              </button>
              <button 
                onClick={handleShutdown}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-sm text-red-500 hover:bg-red-500/20 transition-all group shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                title="Finalizar Llamada"
              >
                <MicOff size={14} className="group-hover:rotate-12 transition-transform" />
                <span className="text-[9px] font-black uppercase tracking-widest text-shadow-glow">Finalizar</span>
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center p-6 relative bg-black">
            {/* Orbe Neural Gigante */}
            <div className={`transition-all duration-1000 ${isThinking ? 'scale-110 blur-sm opacity-50' : 'scale-125'}`}>
              <VocalWaves 
                isConnected={proVoice.isConnected}
                isSpeaking={proVoice.isSpeaking || isSpeaking}
                isListening={proVoice.isListening || isListening}
                color={isProMode ? '#00F0FF' : '#FF4444'}
              />
              <NeuralOrb 
                size={220} 
                isThinking={isThinking} 
                isSpeaking={isSpeaking || proVoice.isSpeaking} 
                isListening={isListening || proVoice.isListening}
                userVolume={userVolume}
              />
            </div>

            {/* Subtítulos Efímeros de HOYR */}
            {agentResponse && isSpeaking && (
              <div className="absolute bottom-10 left-0 right-0 px-8 text-center animate-in fade-in slide-in-from-bottom-5 duration-700">
                <p className="text-sm font-medium text-gray-400 leading-relaxed italic">
                  "{agentResponse}"
                </p>
              </div>
            )}

            {isThinking && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm transition-all duration-500">
                <div className="w-16 h-16 border-2 border-exec-blue/20 border-t-exec-blue rounded-full animate-spin mb-4" />
                <p className="text-[10px] text-exec-blue font-bold uppercase tracking-[0.3em] animate-pulse">Sincronizando Mente...</p>
              </div>
            )}

            {pendingAction && (
              <div className="absolute top-10 left-6 right-6 p-4 bg-exec-blue/10 border border-exec-blue/20 rounded-sm animate-in zoom-in-95 duration-500">
                <div className="flex items-center gap-2 mb-1">
                  <Zap size={12} className="text-exec-blue" />
                  <span className="text-[10px] font-bold text-white uppercase">{pendingAction.label}</span>
                </div>
                <p className="text-[10px] text-gray-500 italic">Di "Sí" para confirmar</p>
              </div>
            )}
          </div>

          <div className="p-6 bg-black border-t border-[#262626]">
            <div className="flex items-center gap-4 mb-4 h-8">
               {isListening && (
                 <div className="flex-1 flex items-center gap-1">
                   {[...Array(12)].map((_, i) => (
                     <div key={i} className="flex-1 h-1 bg-exec-blue/30 rounded-full animate-pulse" style={{ animationDelay: `${i * 50}ms` }} />
                   ))}
                 </div>
               )}
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e: any) => {
                    const file = e.target.files[0];
                    if (file) {
                      smartSpeak(`He recibido la imagen. ¿Qué quieres que haga con ella?`);
                    }
                  };
                  input.click();
                }}
                className="p-4 bg-white/5 border border-white/10 rounded-sm text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                title="Adjuntar Imagen/Archivo"
              >
                <Menu size={16} /> {/* Sustituyendo Icono por Menu si no está Paperclip */}
              </button>
              
              <button 
                onClick={toggleListening}
                className={`flex-1 py-4 rounded-sm border flex items-center justify-center gap-3 transition-all duration-500 ${isCallActive ? 'bg-exec-red/10 border-exec-red/50 text-exec-red shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 'bg-exec-blue/10 border-exec-blue/50 text-exec-blue hover:bg-exec-blue/20'}`}
              >
                {isCallActive ? (
                  <>
                    <div className="w-2 h-2 rounded-full bg-exec-red animate-ping" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Sesión de Voz Activa (Manos Libres)</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.3em]">Iniciar Llamada de Voz</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BURBUJA COMPACTA (ESTILO RAYO - DIAMANTE) */}
      {!isExpanded && (
        <div className="relative group">
          {/* Aura de Energía Emanante */}
          <div className="absolute inset-x-[-15px] inset-y-[-15px] bg-exec-blue/20 blur-xl rounded-full animate-pulse opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
          
          <button 
            onClick={() => setIsExpanded(true)}
            className="relative w-12 h-12 md:w-16 md:h-16 flex items-center justify-center bg-black transition-all duration-500 hover:scale-110 active:scale-95 shadow-[0_0_30px_rgba(0,0,0,0.8)] overflow-hidden"
            style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
          >
            {/* Borde Neón Giratorio */}
            <div className="absolute inset-0 bg-[conic-gradient(from_0deg,#3B82F6,transparent,transparent,#3B82F6)] animate-rotate-glow opacity-60 group-hover:opacity-100 transition-opacity" />
            
            {/* Fondo Sólido Interno (para el recorte) */}
            <div 
              className="absolute inset-[2px] bg-black z-10" 
              style={{ clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}
            />

            {/* Orbe Neural Central — escala reducida en móvil */}
            <div className="relative z-20 flex items-center justify-center scale-75 md:scale-100">
               {isCallActive && lastTranscript && !isSpeaking && !proVoice.isSpeaking && (
                 <div className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/90 backdrop-blur-md border border-exec-blue/40 px-2.5 py-1 rounded-sm shadow-[0_0_15px_rgba(59,130,246,0.3)] pointer-events-none z-50">
                    <span className="text-[9px] text-exec-blue font-black uppercase tracking-wider animate-pulse">
                      {lastTranscript.length > 30 ? '...' + lastTranscript.slice(-30) : lastTranscript}
                    </span>
                 </div>
               )}
               <NeuralOrb 
                  size={42} 
                  isThinking={isThinking} 
                  isSpeaking={isSpeaking || proVoice.isSpeaking} 
                  isListening={isListening || proVoice.isListening}
                  userVolume={userVolume}
               />
            </div>

            {/* Brillo de Escaneo Linear */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-exec-blue/20 to-transparent h-1/2 w-full -translate-y-full group-hover:animate-scan z-30 pointer-events-none" />
          </button>
        </div>
      )}

      {/* Estilos Globales */}
      <style>{`
        @keyframes rotate-glow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-rotate-glow {
          animation: rotate-glow 3s linear infinite;
        }
        @keyframes scan {
          0% { transform: translateY(-150%); }
          100% { transform: translateY(250%); }
        }
        .animate-scan {
          animation: scan 2.5s linear infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #000;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #262626;
          border-radius: 0px;
        }
      `}</style>
    </div>
  );
};
