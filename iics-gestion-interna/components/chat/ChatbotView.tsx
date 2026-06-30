import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as pdfjsLib from 'pdfjs-dist';
import { supabase, supabaseUrl } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
  generateImageWithGemini, 
  GEMINI_MODELS, 
  chatWithGemini,
  getGenerativeModel,
  MERCURY_MODELS,
  chatWithMercury,
  DEEPSEEK_MODELS,
  chatWithDeepSeek
} from '../../lib/ai';
import { chatWithGroq, GROQ_MODELS } from '../../lib/groq';
import { googleDocsService } from '../../lib/googleDocs';
import { googleCalendarService } from '../../lib/googleCalendar';
import { googleAuthService } from '../../lib/googleAuth';
import { downloadAndExtractPDF } from '../../lib/pdfExtractor';
import { generateProfessionalDocx } from '../../lib/docxGenerator';
import { generateEmailHtml, generateBirthdayEmailTemplate } from '../../lib/emailTemplates';
import { youtubeService } from '../../lib/youtube';
import { metaService, META_IDS } from '../../lib/meta';
import hoyrKnowledge from '../../lib/knowledge_db.json';


// Configurar worker de pdfjs (CDN para evitar problemas de bundler)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

/** Extrae texto de un File PDF usando pdfjs-dist en el navegador */
async function extractPDFText(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const texts: string[] = [];
    for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) { // máx 20 páginas
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item: any) => item.str).join(' ');
      texts.push(`[Página ${i}]\n${pageText}`);
    }
    return texts.join('\n\n').substring(0, 8000);
  } catch (e) {
    console.error('Error extrayendo PDF:', e);
    return `[No se pudo leer el contenido de ${file.name}]`;
  }
}

/** Extrae y limpia JSON de un texto con posibles bloques de código o basura */
function extractJSON(text: string): any {
  try {
    let clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const firstBrace = clean.indexOf('{');
    const lastBrace = clean.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      return JSON.parse(clean.substring(firstBrace, lastBrace + 1));
    }
    // Si no hay llaves pero el texto parece JSON
    return JSON.parse(clean);
  } catch (e) {
    // Si falla el parseo, devolvemos un objeto con el mensaje como response
    return { response: text.replace(/{[\s\S]*}/g, '').trim() };
  }
}
import { 
  CornerDownRight, 
  Paperclip,  
  Image as ImageIcon, 
  FileText, 
  Zap, 
  Loader2, 
  X, 
  Download, 
  ImagePlus, 
  Upload, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  Moon,
  Bell,
  User,
  Settings,
  LogOut,
  MessageSquare,
  ClipboardList,
  Calendar,
  Mail,
  FileBarChart,
  ShieldAlert,
  Smile,
  PanelLeft
} from 'lucide-react';
import { UploadResourcesForAI } from './UploadResourcesForAI';
import { DocumentGeneratorButton } from './DocumentGeneratorButton';

interface Message {
  id?: string | number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  attachments?: Array<{ name: string; type: string; url: string }>;
  actionResult?: any;
  isAchievement?: boolean;
  model?: string; // ID del modelo que generó la respuesta
}

interface ResourceFile {
  name: string;
  path: string;
  size?: number;
  updated_at?: string;
  content?: string;
  contentType?: string;
  publicUrl?: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export const ChatbotView: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [userContext, setUserContext] = useState<any>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentContext, setCurrentContext] = useState('GENERAL');
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [userLearnings, setUserLearnings] = useState<string>('');
  const [pendingAction, setPendingAction] = useState<any>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [responseTime, setResponseTime] = useState(0);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [editedActionData, setEditedActionData] = useState<any>(null);
  const [showBodyPreview, setShowBodyPreview] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setResponseTime(p => p + 1);
      }, 1000);
    } else {
      setResponseTime(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  // Multi-model selector: Prioridad Mercury (Muchas Tokens)
  const [selectedModel, setSelectedModel] = useState<string>('mercury-2');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [mercuryTokenBalance, setMercuryTokenBalance] = useState<{used: number, total: number} | null>(null);

  // Cargar balance de tokens de Mercury
  useEffect(() => {
    const fetchUsage = async () => {
      const { data, error } = await supabase
        .from('ai_usage')
        .select('used_tokens, total_quota')
        .eq('provider', 'mercury')
        .single();
      
      if (!error && data) {
        setMercuryTokenBalance({
          used: Number(data.used_tokens),
          total: Number(data.total_quota)
        });
      }
    };
    fetchUsage();
    // Refrescar cada 30 segundos
    const interval = setInterval(fetchUsage, 30000);
    return () => clearInterval(interval);
  }, []);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleInputResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      // Si está vacío resetea instantáneo
      if (e.target.value === '') {
        textareaRef.current.style.height = 'auto';
      } else {
        // En lugar de resetear a "auto" cada vez (lo cual colapsa el padre Flex y causa saltamontes visual en el chat), 
        // simplemente forzamos height hacia el valor superior del scrollHeight
        textareaRef.current.style.height = `${Math.min(Math.max(textareaRef.current.scrollHeight, textareaRef.current.clientHeight), 128)}px`;
      }
    }
  };

  useEffect(() => {
    if (input === '' && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [input]);

  // Función para renderizar el texto enriquecido (Markdown) a HTML - Core SGR-ACS Style
  const renderMarkdown = (text: string) => {
    if (!text) return { __html: '' };

    // 1. Escapar HTML básico
    let html = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // 1.5. Imágenes y Enlaces (Markdown)
    html = html.replace(/!\[([^\]]*)\]\s*\(([^)]+)\)/g, '<div class="my-4 flex items-center justify-start group relative w-fit"><img src="$2" alt="$1" class="max-h-72 w-auto max-w-full rounded-none border border-[#1a1a1a] shadow-[0_0_15px_rgba(0,136,255,0.15)] object-contain cursor-zoom-in hover:brightness-110 transition-all" /></div>');
    html = html.replace(/\[([^\]]+)\]\s*\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[#0088ff] font-bold underline hover:text-white transition-colors">$1</a>');

    // 2. Bloques de código multilínea ``` ... ```
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<div class="my-4"><div class="bg-[#001429] px-3 py-1 text-[10px] text-[#0088ff] font-bold uppercase border border-b-0 border-[#1a1a1a]">$1 CODE</div><pre class="bg-[#0a0a0a] border border-[#1a1a1a] p-4 overflow-x-auto"><code class="text-gray-300 font-mono text-sm">$2</code></pre></div>');

    // 3. Formato en línea
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#0088ff] font-bold">$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em class="italic">$1</em>');
    html = html.replace(/`([^`]+)`/g, '<code class="bg-[#111] text-[#0088ff] border border-[#333] px-1.5 py-0.5 rounded-none font-mono text-xs">$1</code>');

    // 4. Encabezados
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-white font-bold text-lg mt-6 mb-3 flex items-center gap-2"><div class="w-2 h-2 bg-[#0088ff]"></div>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-white font-bold text-xl mt-6 mb-3 border-b border-[#1a1a1a] pb-2">$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1 class="text-[#0088ff] font-black text-2xl mt-6 mb-4">$1</h1>');

    // 5. Procesamiento línea por línea para Tablas y Listas
    const lines = html.split('\n');
    let inTable = false;
    let tableHtml = '';
    const processedLines = [];

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();

        // Detectar Tablas
        if (line.startsWith('|') && line.endsWith('|')) {
            if (!inTable) {
                inTable = true;
                tableHtml = '<div class="overflow-x-auto my-6 border border-[#1a1a1a] rounded-none shadow-lg"><table class="w-full text-left border-collapse text-sm"><thead>';
                // Extraer cabeceras
                const cols = line.split('|').slice(1, -1).map(c => c.trim());
                tableHtml += '<tr class="bg-[#001429] border-b border-[#1a1a1a]">' + cols.map(c => `<th class="p-3 text-[#0088ff] font-bold uppercase tracking-wider">${c}</th>`).join('') + '</tr></thead><tbody class="divide-y divide-[#1a1a1a]">';
            } else {
                // Saltar fila separadora |---|---|
                if (line.match(/^\|[\s-:]+\|.*$/)) {
                    continue; 
                }
                // Extraer celdas normales
                const cols = line.split('|').slice(1, -1).map(c => c.trim());
                tableHtml += '<tr class="hover:bg-[#111] transition-colors bg-[#0a0a0a]">' + cols.map(c => `<td class="p-3 text-gray-300 align-top">${c}</td>`).join('') + '</tr>';
            }
        } else {
            if (inTable) {
                inTable = false;
                tableHtml += '</tbody></table></div>';
                processedLines.push(tableHtml);
                tableHtml = '';
            }
            
            // Detectar Listas
            if (line.match(/^-\s/) || line.match(/^\*\s/)) {
                line = line.replace(/^[-*]\s(.*$)/, '<div class="flex gap-2 items-start my-1.5"><div class="w-1.5 h-1.5 bg-[#0088ff] mt-2 shrink-0"></div><span class="text-gray-300">$1</span></div>');
                processedLines.push(line);
            } else if (line.length > 0) {
               // Párrafos normales
                processedLines.push(`<p class="mb-2 text-gray-300">${line}</p>`);
            } else {
                processedLines.push('<div class="h-2"></div>'); // Espaciado para líneas vacías
            }
        }
    }
    
    if (inTable) {
        tableHtml += '</tbody></table></div>';
        processedLines.push(tableHtml);
    }

    return { __html: processedLines.join('') };
  };

  const briefingFired = useRef(false);

  useEffect(() => {
    if (!user || briefingFired.current) return;
    
    // Solo disparar una vez por carga de componente
    const t = setTimeout(() => {
        loadUserContext();
        loadConversations();
        loadUserLearnings();
        checkDailyBriefing();
        briefingFired.current = true;
    }, 1000); // Pequeño delay inicial para evitar picos
    
    return () => clearTimeout(t);
  }, [user?.id]);

  useEffect(() => {
    if (userContext && messages.length === 0 && !currentConversationId) {
      createNewConversation();
    }
  }, [userContext]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadUserContext = async () => {
    if (!user?.id) return null;

    try {
      // 1. Usar datos de usuario directamente del AuthContext (ya procesados y validados)
      const profileData = {
        full_name: user?.fullName || user?.email?.split('@')[0] || 'Usuario',
        role: user?.role || 'Miembro del Equipo',
        email: user?.email,
        id: user?.id,
        avatar_url: user?.avatarUrl
      };

      console.log('👤 Contexto de usuario (Chatbot):', profileData);

      const [
        tasksResult,
        meetingsResult,
        newsResult,
        proposalsResult,
        teamResult,
        benefitsResult,
        alliancesResult,
        docsResult,
        financeActivitiesResult,
        financeTransactionsResult,
        coursesResult,
        modulesResult,
        eventsResult,
        audiovisualResult,
        birthdaysResult,
        certificatesResult,
        whatsappMessagesResult,
        whatsappContactsResult,
        eventParticipantsResult,
        eventResponsibilitiesResult,
        enrollmentsResult,
        userProgressResult,
        meetingParticipantsResult,
        eventSessionsResult,
        eventosVivoResult,
        emailLogsResult,
        emailInboxResult,
        collaborationsResult,
        resourcesTableResult,
        documentsTableResult,
        youtubeStats,
        fbOverview,
        igOverview,
        recentSocialContent,
        recentIgContent,
        benefitApplicationsResult,
        financialSummaryResult,
        surveysResult,
        surveyQuestionsResult,
        surveyResponsesResult
      ] = await Promise.all([
        supabase.from('tasks').select('*').order('created_at', { ascending: false }),
        supabase.from('meetings').select('*').order('scheduled_at', { ascending: false }),
        supabase.from('news').select('*').eq('status', 'Publicado'),
        supabase.from('proposals').select('*'),
        supabase.from('profiles').select('id, "fullName", role, "avatarUrl", email, birth_date'),
        supabase.from('benefits').select('*').eq('status', 'Publicado'),
        supabase.from('alliances').select('*').eq('status', 'Activo'),
        supabase.from('system_documentation').select('*'),
        supabase.from('financial_activities').select('*'),
        supabase.from('financial_transactions').select('*').order('date', { ascending: false }).limit(50),
        supabase.from('courses').select('*'),
        supabase.from('modules').select('*, lessons(*)'),
        supabase.from('events').select('*').order('scheduled_date', { ascending: false }),
        supabase.from('audiovisual_planning').select('*'),
        supabase.from('birthday_plans').select('*'),
        supabase.from('certificates').select('*'),
        supabase.from('whatsapp_messages').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('whatsapp_contacts').select('*'),
        supabase.from('event_participants').select('*'),
        supabase.from('event_responsibilities').select('*'),
        supabase.from('enrollments').select('*').eq('user_id', user.id),
        supabase.from('user_progress').select('*').eq('user_id', user.id),
        supabase.from('meeting_participants').select('*'),
        supabase.from('event_sessions').select('*'),
        supabase.from('eventos_en_vivo').select('*'),
        supabase.from('email_logs').select('*').order('sent_at', { ascending: false }).limit(10),
        supabase.from('email_inbox').select('*').order('received_at', { ascending: false }).limit(10),
        supabase.from('birthday_collaborations').select('*, profile:profiles(full_name:"fullName", avatar_url:"avatarUrl")'),
        supabase.from('resources').select('*'),
        supabase.from('documents').select('*'),
        youtubeService.getChannelStats().catch(() => null),
        metaService.getPageOverview(META_IDS.FACEBOOK_PAGE).catch(() => null),
        metaService.getInstagramOverview(META_IDS.INSTAGRAM_BUSINESS).catch(() => null),
        metaService.getRecentContent(META_IDS.FACEBOOK_PAGE, false).catch(() => ({ data: [] })),
        metaService.getRecentContent(META_IDS.INSTAGRAM_BUSINESS, true).catch(() => ({ data: [] })),
        supabase.from('benefit_applications').select('*').eq('user_id', user.id),
        supabase.rpc('get_financial_summary'),
        supabase.from('surveys').select('*'),
        supabase.from('survey_questions').select('*'),
        supabase.from('survey_responses').select('*')
      ]);

      // Obtener TODOS los recursos recursivamente CON SU CONTENIDO
      // Nota: Esto puede ser pesado, idealmente debería ser paginado o bajo demanda,
      // pero mantenemos la lógica actual optimizada.
      const allResources: ResourceFile[] = [];

      const listAllFiles = async (path: string = '') => {
        const { data, error } = await supabase.storage
          .from('resources')
          .list(path, { limit: 500 }); // Incrementar límite para asegurar visibilidad completa

        if (error) {
          console.error('Error listing files:', error);
          return;
        }

        const filePromises = (data || []).map(async (item) => {
          const fullPath = path ? `${path}/${item.name}` : item.name;

          if (!item.name.includes('.') && item.id === undefined) {
            await listAllFiles(fullPath); // Recursión secuencial para carpetas
          } else if (item.name !== '.keep') {
            const resource: ResourceFile = {
              name: item.name,
              path: fullPath,
              size: item.metadata?.size,
              updated_at: item.updated_at
            };

            const extension = item.name.split('.').pop()?.toLowerCase();
            const textExtensions = ['txt', 'md', 'json', 'csv', 'html', 'css', 'js', 'ts', 'tsx', 'jsx'];
            const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];

            // Procesar archivos de texto normales
            if (textExtensions.includes(extension || '')) {
              try {
                const { data: fileData } = await supabase.storage
                  .from('resources')
                  .download(fullPath);

                if (fileData) {
                  const text = await fileData.text();
                  resource.content = text;
                  resource.contentType = 'text';
                }
              } catch (err) {
                console.error(`Error reading file ${fullPath}:`, err);
              }
            }

            // Procesar imágenes (enviar URL para visión)
            if (imageExtensions.includes(extension || '')) {
              const { data: { publicUrl } } = supabase.storage
                .from('resources')
                .getPublicUrl(fullPath);
              resource.content = `[Imagen: Accede a ${publicUrl} para ver el contenido visual]`;
              resource.contentType = 'image';
              resource.publicUrl = publicUrl;
            }

            // 🆕 NUEVO: Procesar archivos PDF
            if (extension === 'pdf') {
              try {
                console.log(`📄 Procesando PDF: ${fullPath}`);
                const pdfResult = await downloadAndExtractPDF(fullPath);
                resource.content = pdfResult.text;
                resource.contentType = 'pdf';
                console.log(`✅ PDF extraído exitosamente: ${fullPath} (${pdfResult.pageCount} páginas, ${pdfResult.cached ? 'desde caché' : 'nuevo'})`);
              } catch (err) {
                console.error(`❌ Error extrayendo PDF ${fullPath}:`, err);
                // Marcar que existe pero no se pudo leer
                resource.contentType = 'pdf-error';
              }
            }
            return resource;
          }
          return null;
        });

        const results = await Promise.all(filePromises);
        results.forEach(r => r && allResources.push(r));
      };

      await listAllFiles();

      const newContext = {
        user: profileData,
        tasks: tasksResult.data || [],
        meetings: (meetingsResult.data || []).map((m: any) => ({
          ...m,
          attendees: (meetingParticipantsResult.data || [])
            .filter((p: any) => p.meeting_id === m.id)
            .map((p: any) => p.user_id)
        })),
        news: newsResult.data || [],
        proposals: proposalsResult.data || [],
        team: (teamResult.data || []).map((p: any) => ({
          id: p.id,
          full_name: p.fullName || 'Sin nombre',
          role: p.role,
          avatar_url: p.avatarUrl,
          email: p.email,
          birth_date: p.birth_date
        })),
        benefits: (benefitsResult.data || []).map((b: any) => {
          const app = (benefitApplicationsResult.data || []).find((a: any) => a.benefit_id === b.id);
          return {
            ...b,
            user_status: app ? app.status : 'disponible'
          };
        }),
        alliances: alliancesResult.data || [],
        docs: docsResult.data || [],
        financeActivities: financeActivitiesResult.data || [],
        financeTransactions: financeTransactionsResult.data || [],
        courses: coursesResult.data || [],
        modules: modulesResult.data || [],
        events: eventsResult.data || [],
        emailLogs: emailLogsResult.data || [],
        emailInbox: emailInboxResult.data || [],
        audiovisual: audiovisualResult.data || [],
        birthdays: birthdaysResult.data || [],
        birthday_collaborations: collaborationsResult.data || [],
        certificates: certificatesResult.data || [],
        whatsapp: {
          messages: whatsappMessagesResult.data || [],
          contacts: whatsappContactsResult.data || []
        },
        events_details: {
          participants: eventParticipantsResult.data || [],
          responsibilities: eventResponsibilitiesResult.data || []
        },
        training_details: {
          enrollments: enrollmentsResult.data || [],
          progress: userProgressResult.data || []
        },
        resources: allResources,
        resources_metadata: resourcesTableResult.data || [],
        documents_table: documentsTableResult.data || [],
        event_sessions: eventSessionsResult.data || [],
        event_reports: eventosVivoResult.data || [],
        metrics: {
          youtube: youtubeStats,
          facebook: fbOverview,
          instagram: igOverview,
          recent_content: {
            facebook: recentSocialContent?.data || [],
            instagram: recentIgContent?.data || []
          }
        },
        financialSummary: financialSummaryResult.data || [],
        surveys: surveysResult.data || [],
        survey_questions: surveyQuestionsResult.data || [],
        survey_responses: surveyResponsesResult.data || []
      };

      setUserContext(newContext);
      return newContext;
    } catch (error) {
      console.error('Error loading context:', error);
      return null;
    }
  };

  const buildTacticalBrief = (ctx: any) => {
    if (!ctx) return '';

    const pendingTasks = (ctx.tasks || []).filter((t: any) => t.status !== 'Completada').length;
    const completedTasks = (ctx.tasks || []).filter((t: any) => t.status === 'Completada').length;
    const activeProposals = (ctx.proposals || []).filter((p: any) => p.status === 'Pendiente').length;
    
    // 🗳️ ENCUESTAS Y PARTICIPACIÓN
    const activeSurveys = (ctx.surveys || []).filter((s: any) => s.is_active).length;
    const totalResponses = (ctx.survey_responses || []).length;
    
    // Obtener nombres de autores para propuestas recientes (acceso milimétrico)
    const recentProposalsSummary = (ctx.proposals || [])
      .slice(0, 8)
      .map((p: any) => {
        const author = ctx.team?.find((u: any) => u.id === p.created_by)?.full_name || 'Desconocido';
        const date = new Date(p.created_at).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        return `- **${p.title}** (Autor: ${author}, Estado: ${p.status}, Creado: ${date})`;
      })
      .join('\n');

    const yt = ctx.metrics?.youtube;
    const fb = ctx.metrics?.facebook;
    const ig = ctx.metrics?.instagram;

    // 🎓 LOGROS Y RECONOCIMIENTOS (Añadido: Auditoría de Certificados)
    const userCerts = (ctx.certificates || []).filter((c: any) => c.user_id === ctx.user?.id);
    const teamCerts = (ctx.certificates || []).length;
    
    let brief = `
### 📊 REPORTE DE AUDITORÍA ESTRATÉGICA (ESTADO ACTUAL)

**1. Desempeño Social (Métricas Milimétricas):**
- **YouTube:** ${yt ? `**${yt.title}** | ${yt.subscribers.toLocaleString()} subs | ${yt.views.toLocaleString()} vistas | ${yt.videos} videos publicados.` : '🔴 Sin conexión (Requiere OAuth)'}
- **Facebook:** ${fb ? `**${fb.name}** | ${fb.followers.toLocaleString()} seguidores | Alcance (30d): ${fb.reach.toLocaleString()} | Interacciones: ${fb.engagement.toLocaleString()}.` : '🔴 Sin conexión'}
- **Instagram:** ${ig ? `**Account** | ${ig.followers.toLocaleString()} seguidores | Alcance (30d): ${ig.reach.toLocaleString()} | Interacciones reales: ${ig.engagement.toLocaleString()}.` : '🔴 Sin conexión'}

**2. Productividad del Equipo y Sistema:**
- **Tareas Pendientes:** ${pendingTasks} (HOYR debe ayudar a priorizar el cuello de botella).
- **Tareas Finalizadas:** ${completedTasks} (Rendimiento acumulado).
- **Control de Proyectos:** ${(ctx.events || []).length} eventos activos y ${(ctx.news || []).length} noticias publicadas.

**3. Logros Académicos y Reconocimientos (NUEVO):**
- **Tus Certificados:** Has obtenido **${userCerts.length}** reconocimientos oficiales.
- **Impacto Institucional:** Se han emitido **${teamCerts}** certificaciones totales al equipo.
- **Estado de HOYR:** Capacitado para auditar credenciales y asistir en la emisión (Solo Director).

**4. Historial de Propuestas Recientes (Detalle Milimétrico):**
${recentProposalsSummary || '- No hay propuestas recientes.'}

**5. Participación y Consultas (Encuestas):**
- **Encuestas Activas:** ${activeSurveys} formularios recibiendo respuestas.
- **Participación Acumulada:** ${totalResponses} respuestas registradas en total.
- **Acción HOYR:** Tienes acceso total para auditar respuestas individuales y proponer nuevas encuestas estratégicas (/surveys/propose).

**6. Correlación y Labores:**
- HOYR debe asociar el cumplimiento de tareas del equipo con las fluctuaciones en el alcance de Facebook/YouTube.
- Si el alcance baja, HOYR debe proponer tareas específicas de redacción o diseño basadas en las propuestas pendientes.
- Utiliza las encuestas para medir la satisfacción del equipo o de la audiencia según sea necesario.
`;
    return brief;
  };

  const initializeChat = async () => {
    if (!userContext?.user) return;
    // El usuario solicitó que HOYR no hable primero. 
    // La interfaz mostrará el estado inicial centrado.
  };

  const loadConversations = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadUserLearnings = async () => {
    if (!user?.id) return;

    try {
      // 🧠 SUB-AGENTE DE MEMORIA HISTÓRICA: Recuperar contexto de múltiples sesiones anteriores
      const { data: recentConvos } = await supabase
        .from('chat_conversations')
        .select('id, title, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(20); // Analizamos las últimas 20 sesiones completas

      if (!recentConvos || recentConvos.length === 0) return;

      const convoIds = recentConvos.map(c => c.id);

      // Obtener mensajes significativos de esas conversaciones
      const { data: pastMessages, error } = await supabase
        .from('chat_messages')
        .select('role, content, created_at')
        .in('conversation_id', convoIds)
        .order('created_at', { ascending: false })
        .limit(300); // Recuperamos un bloque masivo de mensajes para destilar

      if (error) throw error;

      // Destilar aprendizajes: Temas recurrentes y preferencias detectadas
      const userContent = pastMessages?.filter(m => m.role === 'user').slice(0, 150) || [];
      const assistantContent = pastMessages?.filter(m => m.role === 'assistant').slice(0, 50) || [];
      
      const sessionSummary = recentConvos.map(c => `• ${c.title}`).join(', ');
      const rawMemory = userContent.map(m => m.content).join(' | ');
      
      const refinedMemory = `HISTORIAL DE TEMAS: ${sessionSummary}. PREFERENCIAS DETECTADAS: ${rawMemory.substring(0, 5000)}`;

      setUserLearnings(refinedMemory);
    } catch (error) {
      console.error('Error loading user learnings (Long-term memory):', error);
    }
  };

  const checkDailyBriefing = async () => {
    if (!user?.id) return;

    const today = new Date().toDateString();
    const lastBriefing = localStorage.getItem(`last_briefing_${user.id}`);

    if (lastBriefing !== today) {
      try {
        console.log('🌅 Generando Briefing Matutino...');

        // 1. Obtener contexto específico para briefing desde DB
        const { data: briefingContext, error } = await supabase
          .rpc('get_daily_briefing_context', { check_user_id: user.id });

        if (error) {
          console.warn('⚠️ No se pudo cargar el contexto de briefing (RPC):', error.message);
          // Fallback silencioso: se usará el contexto general cargado en el chat
          return;
        }

        // 2. Generar mensaje de bienvenida proactivo
        const contextStr = JSON.stringify(briefingContext);
        const prompt = `
          ACT COMO: Asistente Ejecutivo de Alto Nivel.
          CONTEXTO ACTUAL: ${contextStr}
          TAREA: Generar un "Briefing Matutino" para el usuario.
          
          ESTRUCTURA:
          1. Saludo cordial (según la hora actual).
          2. 🎯 ENFOQUE DE HOY: Lista las 2-3 tareas/reuniones más críticas (Prioridad Urgente/Alta primero).
          3. ⚠️ ATENCIÓN REQUERIDA: Si hay notificaciones no leídas o solicitudes pendientes.
          4. 💡 SUGERENCIA ESTRATÉGICA: Una recomendación breve basada en su rol.
          
          TONO: Profesional, conciso, inspirador. Usa emojis elegantes.
          NO inventes información. Si no hay tareas, dilo positivamente ("Agenda despejada").
        `;

        // 3. Llamar a Gemini directamente (sin pasar por Orquestador para evitar loops)
        const model = getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent(prompt);
        const response = result.response.text();

        // 4. Agregar mensaje al chat
        const briefingMessage: Message = {
          role: 'assistant',
          content: response,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, briefingMessage]);

        // 5. Guardar flag
        localStorage.setItem(`last_briefing_${user.id}`, today);

      } catch (error) {
        console.error('Error generating daily briefing:', error);
      }
    }
  };

  const createNewConversation = async () => {
    if (!user?.id || !userContext) return;

    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .insert({
          user_id: user.id,
          title: `Nueva Sesión`
        })
        .select()
        .single();

      if (error) throw error;
      setCurrentConversationId(data.id);
      await loadConversations();
      await initializeChat();
      return data.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  };

  const handleNewChat = async () => {
    setMessages([]);
    setCurrentConversationId(null);
    setPendingAction(null);
    setInput('');
    setAttachments([]);
    await createNewConversation();
  };

  const loadConversation = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const loadedMessages: Message[] = data.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at),
        model: msg.model_id || msg.model // Soporte para columna en DB
      }));

      setMessages(loadedMessages);
      setCurrentConversationId(conversationId);
      setShowHistory(false);
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const saveMessage = async (role: 'user' | 'assistant', content: string, modelId?: string, forceConversationId?: string) => {
    const targetId = forceConversationId || currentConversationId;
    if (!targetId) return;

    try {
      await supabase
        .from('chat_messages')
        .insert({
          conversation_id: targetId,
          role,
          content,
          model_id: modelId // Intentar guardar modelo si la columna existe
        });

      // Actualizar timestamp de conversación
      await supabase
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', targetId);

      // 📝 MEJORAR TÍTULO: Si es el primer mensaje del usuario, usarlo como título de la conversación
      if (role === 'user') {
        const { data: convo } = await supabase
          .from('chat_conversations')
          .select('title')
          .eq('id', targetId)
          .single();

        if (convo && convo.title.startsWith('Chat ')) {
          const cleanTitle = content.substring(0, 40).replace(/\n/g, ' ').trim() + (content.length > 40 ? '...' : '');
          if (cleanTitle) {
            await supabase
              .from('chat_conversations')
              .update({ title: cleanTitle })
              .eq('id', targetId);
          }
        }
      }

      await loadConversations();
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    if (!confirm('¿Eliminar esta conversación?')) return;

    try {
      await supabase
        .from('chat_conversations')
        .delete()
        .eq('id', conversationId);

      await loadConversations();

      if (conversationId === currentConversationId) {
        createNewConversation();
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  const buildContext = (overrideContext?: any) => {
    const ctx = overrideContext || userContext;
    if (!ctx) return '';

    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      || window.innerWidth < 768;

    const baseSystem = `
ROL: Eres HOYR, el asistente ejecutivo de élite del equipo ACS.
PERSONALIDAD: Eres un asistente táctico, asertivo, militarmente preciso y altamente ejecutivo. No hablas de más, reportas datos reales.
REGLA DE ORO (PRECISIÓN): Tienes prohibido redondear o estimar cifras. Si el resumen operativo dice que hay "24 tareas pendientes", debes decir exactamente "24". Si te equivocas en una cifra, estarías fallando al Director. Revisa SIEMPRE el bloque *** RESUMEN OPERATIVO *** antes de responder cualquier conteo.
CONTEXTO ACTUAL: ${currentContext}
INSTRUCCIÓN DE PROXIMIDAD: Si el usuario pregunta por un evento, revisa si está "LIVE" o próximo.
INSTRUCCIÓN DE AUDITORÍA: Analiza la relación entre el flujo de tareas completadas y el crecimiento de las métricas sociales. Si el alcance social baja, identifica qué propuestas pendientes o tareas de marketing podrían revertir la tendencia.
INSTRUCCIÓN DE BENEFICIOS: Al hablar de beneficios, audita el estado "TU ESTADO" del usuario. Dile explícitamente qué tiene activo (APPROVED), qué está pendiente (PENDING) y qué otros existen pero están marcados como DISPONIBLE.
INSTRUCCIÓN DE ACADEMIA: Al hablar de la Academia o cursos, audita el progreso "TU ESTADO" del usuario. Dile explícitamente qué porcentaje lleva, qué temas está viendo y quién es su DOCENTE/CAPACITADOR. Motívale a completar sus capacitaciones para mejorar su desempeño en las tareas actuales.
INSTRUCCIÓN DE CERTIFICADOS: HOYR tiene acceso total a la lista de diplomas y reconocimientos. Si el usuario pregunta por "quién ha sido premiado" o "mis certificados", audita la lista y reporta los últimos logros y credenciales del equipo, asociándolos SIEMPRE con el evento o curso origen.
INSTRUCCIÓN AGENTE (DIRECTOR): Solo si el usuario es "Director", HOYR puede emitir reconocimientos usando la acción {"path": "/certificates/emit", "state": {"user_id": "...", "title": "...", "description": "..."}}. 
IMPORTANTE: HOYR nunca debe pedir el ID o UUID del usuario. Debe resolverlo automáticamente buscando en el contexto *** EQUIPO ACS *** donde cada nombre tiene su ID. Si HOYR conoce el nombre (ej. "Silvana"), debe buscar su ID en la lista y rellenar el campo "user_id" directamente.
INSTRUCCIÓN DE CUMPLEAÑOS: HOYR es el coordinador táctico de celebraciones. Puede planificar eventos con {"path": "/birthdays/plan", "state": {"profile_id": "...", "year": 2024, "plan_type": "...", "scheduled_date": "...", "scheduled_time": "...", "details": "...", "collaborators": [{"profile_name": "...", "contribution": "..."}]}} y enviar saludos oficiales con {"path": "/birthdays/greet", "state": {"user_id": "..."}}. Al planificar, HOYR debe asignar responsables específicos y sus aportes para asegurar el éxito del operativo.
PROTOCOLO_SIGILO_OPERATIVO: HOYR tiene estrictamente PROHIBIDO revelar detalles de una planificación (quién trae qué, hora, lugar, existencia del plan) al usuario que es el agasajado. Si el usuario actual (${user?.fullName || 'Miembro'}) pregunta por su propio cumpleaños, HOYR debe aplicar "Distracción Táctica": responder que no hay nada confidencial reportado y que cualquier evento será una sorpresa, manteniendo el suspenso. Solo reporta detalles logísticos a usuarios ajenos al agasajado.
INSTRUCCIÓN DE ALIANZAS: HOYR tiene acceso total a los convenios institucionales. Al hablar de una alianza, debe mencionar los beneficios asociados y, si el usuario lo solicita, buscar y leer el contenido de los contratos (PDF) guardados en el Storage para reportar cláusulas o detalles legales de forma milimétrica. Debe asociar este conocimiento con el estado de los beneficios y las propuestas tácticas del equipo.
TERMINOLOGÍA TÁCTICA: "Plata", "Guita", "Money", "Lucas" se refieren SIEMPRE a la sección *** AUDITORÍA FINANCIERA ***. Ignora cualquier referencia a "Plantas" a menos que el contexto botánico sea explícito.
INSTRUCCIÓN DE FORMATO: Usa SIEMPRE markdown con tablas (| col | col |) y negrita (**texto**) para mejor visualización.
`;

    const userLearnings = localStorage.getItem(`hoyr_learning_${user?.id}`) || '';

    try {
      let filteredContext = '';
      const includeUser = `USUARIO: ${ctx.user?.full_name} (${ctx.user?.role})\n`;

    // 👥 EQUIPO — Pre-resolución de nombres para evitar UUIDs
    const team = ctx.team || [];
    const getName = (id: string) => team.find((m: any) => m.id === id)?.full_name || 'Desconocido/Sistema';

    const teamMap = team.map((m: any) => `  - ID: [${m.id}] | "${m.full_name}" | Rol: ${m.role} | Email: ${m.email} | Cumpleaños: ${m.birth_date || 'No registrado'}`).join('\n');
    const teamContext = `\n*** EQUIPO ACS ***\n${teamMap || 'Sin datos de equipo'}\n`;
    
      const tasks = ctx.tasks || [];
      const misTareas = tasks.filter((t: any) => t.assigned_to === ctx.user?.id || (t.collaborator_ids && t.collaborator_ids.includes(ctx.user?.id)));
      const tareasEquipo = tasks.filter((t: any) => t.assigned_to !== ctx.user?.id && (!t.collaborator_ids || !t.collaborator_ids.includes(ctx.user?.id)));
      
      const myPending = misTareas.filter((t: any) => t.status === 'Pendiente').length;
      const teamPending = tareasEquipo.filter((t: any) => t.status === 'Pendiente').length;
      
      const inProgressTasks = tasks.filter((t: any) => t.status === 'En progreso').length;
      const completedTasks = tasks.filter((t: any) => t.status === 'Completada').length;
      const now = new Date();
      const expiredTasks = tasks.filter((t: any) => t.status !== 'Completada' && t.due_date && new Date(t.due_date) < now).length;

      const formatTask = (t: any) => {
        const collabs = (t.collaborator_ids || []).map((id: string) => getName(id)).join(', ');
        return `- "${t.title}" | Estado: ${t.status} | Autor: ${getName(t.created_by)} | Resp: ${getName(t.assigned_to)}${collabs ? ` | Compartida con: ${collabs}` : ''} | Vence: ${t.due_date}`;
      };

      const myTaskList = misTareas.slice(0, 30).map(formatTask).join('\n');
      const teamTaskList = tareasEquipo.slice(0, 15).map(formatTask).join('\n');
      
      const allMeetings = ctx.meetings || [];
      
      const upcomingMeetings = allMeetings.filter((m: any) => new Date(m.scheduled_at) >= now).slice(0, 15).map((m: any) => {
        const participantsNames = (m.attendees || []).map((id: string) => getName(id)).join(', ');
        return `- [PRÓXIMA] "${m.title}" | Fecha: ${m.scheduled_at} | Organiza: ${getName(m.created_by)} | Asistentes: ${participantsNames || 'Solo el organizador'} | Meet/Link: ${m.meeting_link || m.location} | Descripción: ${m.description || 'Sin detalle'}`;
      }).join('\n');

      const pastMeetings = allMeetings.filter((m: any) => new Date(m.scheduled_at) < now).slice(0, 5).map((m: any) => {
        const participantsNames = (m.attendees || []).map((id: string) => getName(id)).join(', ');
        return `- [PASADA] "${m.title}" | Fecha: ${m.scheduled_at} | Organiza: ${getName(m.created_by)} | Asistentes: ${participantsNames || 'Sin datos'} | Contexto: ${m.description || 'Sin detalle'}`;
      }).join('\n');
      
      filteredContext += `
*** HECHOS DE ALTA FIDELIDAD (HARD_DATA - PROHIBIDO ESTIMAR) ***
- TOTAL TAREAS GLOBALES: ${tasks.length}
- MIS TAREAS PENDIENTES (Responsable o Compartido): ${myPending}
- TAREAS DEL RESTO DEL EQUIPO (Pendientes): ${teamPending}
- TAREAS GLOBALES EN PROGRESO: ${inProgressTasks}
- TAREAS GLOBALES COMPLETADAS: ${completedTasks}
- TAREAS GLOBALES VENCIDAS: ${expiredTasks}
- REUNIONES PROGRAMADAS: ${allMeetings.filter((m: any) => new Date(m.scheduled_at) >= now).length}

!!! REGLA DE ORO DE PRECISIÓN PARA HOYR !!!
1. Usa EXCLUSIVAMENTE los números anteriores para reportar cantidades. 
2. No intentes contar manualmente a partir de las listas de texto.
3. Diferencia siempre "TUS TAREAS" (las del usuario) de "TAREAS DEL EQUIPO".

*** MIS TAREAS DETALLADAS (INDIVIDUALES Y COMPARTIDAS) ***
${myTaskList || 'NO TIENES TAREAS ASIGNADAS NI COMPARTIDAS'}

*** TAREAS DEL EQUIPO (EXTRACTO) ***
${teamTaskList || 'EL EQUIPO NO TIENE TAREAS PENDIENTES'}

*** REUNIONES (PRÓXIMAS) ***
${upcomingMeetings || 'NO HAY REUNIONES PROGRAMADAS'}

*** REUNIONES (PASADAS - HISTORIAL) ***
${pastMeetings || 'NO HAY HISTORIAL RECUPERADO'}

*** CARGA DE TRABAJO POR MIEMBRO (AUDITORÍA 360) ***
${team.map((m: any) => {
    const userTasks = tasks.filter((t: any) => t.assigned_to === m.id);
    const p = userTasks.filter((t: any) => t.status === 'Pendiente').length;
    const c = userTasks.filter((t: any) => t.status === 'Completada').length;
    return `- ${m.full_name}: ${p} Pendientes | ${c} Completadas | Total: ${userTasks.length}`;
}).join('\n')}`;
      
      // WhatsApp
      const waMsgs = (ctx.whatsapp?.messages || []).slice(0, 5).map((m: any) => `- [${m.from_name || 'Desconocido'}] ${m.text || 'Sin texto'}`).join('\n');
      if (waMsgs) {
        filteredContext += `\n*** ÚLTIMOS MENSAJES WHATSAPP ***\n${waMsgs}`;
      } else if (currentContext === 'OPERATIVO') {
        filteredContext += `\n*** ÚLTIMOS MENSAJES WHATSAPP ***\nNO HAY MENSAJES RECIENTES`;
      }
    
    // 💰 FINANZAS (Siempre On - Omnisciencia Total)
    {
      const summary = ctx.financialSummary || [];
      const allTrans = ctx.financeTransactions || [];
      const activities = ctx.financeActivities || [];
      const currentYear = new Date().getFullYear();
      
      let financeStr = `\n*** AUDITORÍA FINANCIERA MULTI-AÑO (MEMORIA TOTAL) ***\n`;
      
      // Resumen Histórico por Año
      const yearlyData = summary.reduce((acc: any, curr: any) => {
        if (!acc[curr.year]) acc[curr.year] = { income: 0, expense: 0, balance: 0 };
        acc[curr.year].income += Number(curr.income);
        acc[curr.year].expense += Number(curr.expense);
        acc[curr.year].balance += Number(curr.balance);
        return acc;
      }, {});

      Object.keys(yearlyData).sort((a,b) => Number(b) - Number(a)).forEach(year => {
        const d = yearlyData[year];
        financeStr += `- AÑO ${year}: Ingresos S/ ${d.income.toFixed(2)} | Gastos S/ ${d.expense.toFixed(2)} | Balance S/ ${d.balance.toFixed(2)}\n`;
      });

      // Flujo Mensual Detallado (Año Actual)
      financeStr += `\n*** FLUJO MENSUAL ${currentYear} (SOLO SI HAY REGISTROS) ***\n`;
      const currentYearData = summary.filter((s: any) => Number(s.year) === currentYear);
      
      if (currentYearData.length > 0) {
        currentYearData.forEach((s: any) => {
          const monthName = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date(2024, Number(s.month) - 1));
          financeStr += `- ${monthName.toUpperCase()}: Ingresos S/ ${Number(s.income).toFixed(2)} | Gastos S/ ${Number(s.expense).toFixed(2)} | Balance S/ ${Number(s.balance).toFixed(2)}\n`;
        });
      } else {
        financeStr += `NO HAY MOVIMIENTOS REGISTRADOS EN ${currentYear} SEGÚN EL RESUMEN RPC. REVISANDO HISTORIAL GLOBAL...\n`;
        summary.slice(0, 12).forEach((s: any) => {
          const monthName = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date(2024, Number(s.month) - 1));
          financeStr += `- ${monthName.toUpperCase()} ${s.year}: Ingresos S/ ${Number(s.income).toFixed(2)} | Balance S/ ${Number(s.balance).toFixed(2)}\n`;
        });
      }

      // Detalle de Actividades y Presupuestos
      if (activities.length > 0) {
        financeStr += `\n*** PROYECTOS Y PRESUPUESTOS ACTIVOS ***\n`;
        activities.forEach((a: any) => {
          const projectExpenses = allTrans.filter((t: any) => t.activity_id === a.id && t.type === 'expense').reduce((acc: number, t: any) => acc + Number(t.amount), 0);
          financeStr += `- Título: "${a.title}" | Presupuesto Inicial: S/ ${Number(a.initial_budget).toFixed(2)} | Gasto Real: S/ ${projectExpenses.toFixed(2)} | Disponible: S/ ${(Number(a.initial_budget) - projectExpenses).toFixed(2)} | Estado: ${a.status}\n`;
        });
      }

      // Últimas Transacciones (Acceso Milimétrico)
      financeStr += `\n*** ÚLTIMOS MOVIMIENTOS DETALLADOS ***\n`;
      filteredContext += financeStr + allTrans.slice(0, 15).map((t: any) => {
        const activityName = activities.find((a: any) => a.id === t.activity_id)?.title || 'General';
        const author = ctx.team?.find((m: any) => m.id === t.created_by)?.full_name || 'Sistema';
        return `- Fecha: ${new Date(t.transaction_date).toLocaleDateString()} | "${t.title}" | Actividad: ${activityName} | Monto: ${t.type === 'income' ? '+' : '-'} S/ ${Number(t.amount).toFixed(2)} | Ejecutó: ${author} | Categoría: ${t.category}`;
      }).join('\n');
    }
    // 📄 RECURSOS Y GESTIÓN DOCUMENTAL (Siempre On)
    {
      const allRes = ctx.resources || [];
      const pdfs = allRes.filter((r: any) => r.contentType === 'pdf' || r.path.toLowerCase().endsWith('.pdf'));
      const images = allRes.filter((r: any) => r.contentType === 'image');
      const others = allRes.filter((r: any) => r.contentType !== 'pdf' && r.contentType !== 'image' && !r.path.toLowerCase().endsWith('.pdf'));

      // Priorizar PDFs e imágenes, limitar el total para no saturar tokens
      const prioritizedResources = [...pdfs, ...images, ...others].slice(0, 50);
      
      filteredContext += `\n*** RECURSOS PRIORITARIOS (STORAGE) ***\n${prioritizedResources.map((r: any) => `- 📄 ${r.path} [${r.contentType?.toUpperCase() || 'FILE'}] (${r.content ? 'Contenido disponible' : 'Solo metadatos'})`).join('\n') || 'NO HAY ARCHIVOS EN STORAGE'}`;
      
      if (allRes.length > 50) {
        filteredContext += `\n... (Y ${allRes.length - 50} archivos más en storage)`;
      }

      const metadataToInclude = (ctx.resources_metadata || []).slice(0, 30);
      if (metadataToInclude.length > 0) {
        const metadata = metadataToInclude.map((m: any) => `- Metadato: "${m.title || m.name}" | Tipo: ${m.category || m.type} | Folder: ${m.folder || m.folder_name} | Relación: ${m.task_id ? 'Tarea' : 'General'}`).join('\n');
        filteredContext += `\n\n*** METADATOS DE RECURSOS (DATABASE) ***\n${metadata}`;
      }

      const docsToInclude = (ctx.documents_table || []).slice(0, 20);
      if (docsToInclude.length > 0) {
        const docs = docsToInclude.map((d: any) => `- Documento: "${d.title}" | Creado: ${d.created_at} | Contenido: ${d.content ? d.content.substring(0, 500) : 'Sin contenido'}`).join('\n');
        filteredContext += `\n\n*** GESTIÓN DOCUMENTAL (DOCUMENTOS OFICIALES) ***\n${docs}`;
      }

      // 📰 NOTICIAS (Contexto de Novedades)
      const newsToInclude = (ctx.news || []).slice(0, 10);
      if (newsToInclude.length > 0) {
        const news = newsToInclude.map((n: any) => `- Noticia: "${n.title}" | Categoría: ${n.category} | Fecha: ${n.published_at} | Resumen: ${n.summary || n.content?.substring(0, 100)}...`).join('\n');
        filteredContext += `\n\n*** NOTICIAS Y NOVEDADES PUBLICADAS ***\n${news}`;
      }

      if (currentContext === 'RECURSOS') {
        const contents = pdfs.slice(0, 5); // Priorizar contenido de PDFs en este modo
        filteredContext += `\n\nCONTENIDOS EXTRAÍDOS (DETALLE):${contents.length > 0 ? '' : ' Ninguno disponible.'}\n${contents.map((r: any) => `DOC: ${r.name}\n${(r.content || '').substring(0, 3000)}...`).join('\n\n')}`;
      }
    }
    
    // 🎭 DETALLES ESPECÍFICOS (Solo en modo General o cuando sea relevante)
    // 🏟️ ECOSISTEMA ACS TOTAL (Siempre On)
    {
      // 📅 EVENTOS (HOYR Tactical Context)
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const allEvents = ctx.events || [];
      
      const eventsToday = allEvents.filter((e: any) => e.scheduled_date === todayStr);
      const upcomingEvents = allEvents.filter((e: any) => e.scheduled_date > todayStr).slice(0, 5);
      const pastEvents = allEvents.filter((e: any) => e.scheduled_date < todayStr).slice(0, 5);

      let eventContext = '\n*** GESTIÓN DE EVENTOS ACS ***\n';
      
      if (eventsToday.length > 0) {
        eventContext += `🚨 EVENTOS DE HOY:\n${eventsToday.map((e: any) => {
          const sessions = (ctx.event_sessions || []).filter((s: any) => s.event_id === e.id);
          return `- "${e.title}" | Tipo: ${e.event_type} | Modalidad: ${e.is_online ? 'VIRTUAL' : 'PRESENCIAL'} | Inicio: ${e.start_time}\n  - Programa/Sesiones: ${sessions.map((s: any) => `${s.start_time} ${s.title}`).join(', ') || 'Sin sesiones'}`;
        }).join('\n')}\n`;
      }

      if (upcomingEvents.length > 0) {
        eventContext += `📅 PRÓXIMOS EVENTOS:\n${upcomingEvents.map((e: any) => {
          const partCount = (ctx.events_details?.participants || []).filter((p: any) => p.event_id === e.id).length;
          return `- "${e.title}" | Fecha: ${e.scheduled_date} | Costo: ${e.is_paid ? `S/ ${e.cost}` : 'GRATIS'} | Registrados: ${partCount}`;
        }).join('\n')}\n`;
      }

      if (pastEvents.length > 0) {
        eventContext += `📜 HISTORIAL DE EVENTOS (PASADOS):\n${pastEvents.map((e: any) => {
          const report = (ctx.event_reports || []).find((r: any) => r.evento_id === e.id);
          return `- "${e.title}" (${e.scheduled_date}) | Resumen/Reporte: ${report ? 'Disponible en sistema' : 'Sin reporte'}`;
        }).join('\n')}\n`;
      }

      filteredContext += eventContext || '\nNO HAY EVENTOS REGISTRADOS';
      
      // Academia
      const enroll = ctx.training_details?.enrollments || [];
      if (enroll.length > 0) {
        filteredContext += `\n*** TU ACADEMIA (PROGRESO) ***\n${enroll.map((en: any) => {
          const course = (ctx.courses || []).find((c: any) => c.id === en.course_id);
          return `- Curso: ${course?.title || 'Curso'} | Estado: ${en.status}`;
        }).join('\n')}`;
      }

      // Cumpleaños
      const today = new Date();
      const monthBirthdays = (ctx.birthdays || []).filter((b: any) => {
        const bDate = new Date(b.date);
        return bDate.getMonth() === today.getMonth();
      });
      if (monthBirthdays.length > 0) {
        filteredContext += `\n*** CUMPLEAÑOS DEL MES ***\n${monthBirthdays.map((b: any) => `- ${b.full_name}: ${b.date}`).join('\n')}`;
      }

      // Otras Secciones (Alianzas, Propuestas, Beneficios)
      if (ctx.proposals?.length > 0) {
        filteredContext += `\n*** PROPUESTAS Y PROYECTOS TÁCTICOS ***\n${ctx.proposals.map((p: any) => `- ID: [${p.id}] | Título: "${p.title}" | Estado: ${p.status} | Autor: ${getName(p.created_by)} | Creado: ${p.created_at}\n  - Descripción: ${p.description?.substring(0, 150)}...\n  - Tarjeta Operación: ${JSON.stringify(p.tactical_metadata || {})}`).join('\n')}`;
      }
      
      // 🎓 ACADEMIA ACS (AUDITORÍA MILIMÉTRICA)
      if (ctx.courses?.length > 0) {
        let academyStr = '\n*** ACADEMIA ACS: CATÁLOGO Y PROGRESO MILIMÉTRICO ***\n';
        ctx.courses.forEach((course: any) => {
          const instructor = ctx.team.find((p: any) => p.id === course.created_by);
          const enrollment = ctx.training_details?.enrollments.find((e: any) => e.course_id === course.id);
          const courseModules = (ctx.modules || []).filter((m: any) => m.course_id === course.id);
          const totalLessons = courseModules.reduce((acc: number, m: any) => acc + (m.lessons?.length || 0), 0);
          
          let progressPercent = 0;
          let statusLabel = enrollment ? (enrollment.status === 'completed' ? 'COMPLETADO' : 'EN CURSO') : 'DISPONIBLE';
          
          if (enrollment) {
            const completedInCourse = (ctx.training_details?.progress || []).filter((p: any) => 
               courseModules.some((m: any) => m.lessons?.some((l: any) => l.id === p.lesson_id)) && p.completed
            ).length;
            progressPercent = totalLessons > 0 ? Math.round((completedInCourse / totalLessons) * 100) : 0;
          }

          const typeLabel = course.type === 'presencial' ? '🏢 PRESENCIAL' : '💻 ONLINE';
          const scheduleStr = course.schedule ? ` | Horario: ${course.schedule}` : '';
          
          academyStr += `- "${course.title}" [${typeLabel}${scheduleStr}] | DOCENTE: ${instructor?.full_name || 'Profesor'} | TU ESTADO: ${statusLabel} (${progressPercent}%)\n`;
          
          const scheduledLessons = courseModules.flatMap((m: any) => (m.lessons || []).filter((l: any) => l.scheduled_date));
          if (scheduledLessons.length > 0) {
            academyStr += `  - CALENDARIO CLASES: ${scheduledLessons.slice(0, 3).map((l: any) => `${l.scheduled_date} (${l.start_time || 'Horario por definir'}): ${l.title}`).join(' | ')}\n`;
          }
          
          academyStr += `  - Módulos Principales: ${courseModules.map((m: any) => m.title).join(', ') || 'Cargando contenido...'}\n`;
        });
        filteredContext += academyStr;
      }
      if (ctx.alliances?.length > 0) {
        filteredContext += `\n*** AUDITORÍA DE ALIANZAS E INSTITUCIONES ***\n${ctx.alliances.map((a: any) => {
          const linkedBenefits = (ctx.benefits || []).filter((b: any) => b.partner_name === a.institution || b.partner_name === a.title);
          return `- INSTITUCIÓN: "${a.institution || a.title}" | Estado: ${a.status} | Contrato: ${a.contract_url ? 'PDF Vinculado' : 'No reportado'}\n  - Descripción: ${a.description || 'Sin descripción'}${linkedBenefits.length > 0 ? `\n  - Beneficios Asociados: ${linkedBenefits.map((b: any) => b.title).join(', ')}` : ''}`;
        }).join('\n')}`;
      }
      if (ctx.benefits?.length > 0) {
        filteredContext += `\n*** BENEFICIOS PERSONALIZADOS (ESTADO DEL USUARIO) ***\n${ctx.benefits.map((b: any) => `- Beneficio: "${b.title}" | Aliado: ${b.partner_name} | TU ESTADO: ${b.user_status?.toUpperCase() || 'DISPONIBLE'}\n  - Descripción: ${b.description?.substring(0, 100)}...`).join('\n')}`;
      }

      // 🏆 CERTIFICADOS Y RECONOCIMIENTOS (AUDITORÍA MILIMÉTRICA)
      if (ctx.certificates?.length > 0) {
        let certStr = '\n*** AUDITORÍA DE CREDENCIALES Y RECONOCIMIENTOS ***\n';
        const courseCerts = ctx.certificates.filter((c: any) => c.type === 'curso');
        const recognitions = ctx.certificates.filter((c: any) => c.type === 'reconocimiento');
        
        certStr += `- Certificados de Academia Emitidos: ${courseCerts.length}\n`;
      // 🎓 CERTIFICADOS Y RECONOCIMIENTOS (Añadido: Asociación de Secciones)
      const certs = ctx.certificates || [];
      if (certs.length > 0) {
        let certStr = '\n\n*** CERTIFICADOS Y LOGROS (MEMORIA INSTITUCIONAL) ***\n';
        
        // Correlación con Eventos y Cursos
        const enrichedCerts = certs.slice(0, 30).map((c: any) => {
          const owner = ctx.team.find((p: any) => p.id === c.user_id)?.full_name || 'Miembro';
          const event = c.event_id ? ctx.events.find((e: any) => e.id === c.event_id)?.title : null;
          const course = c.course_id ? ctx.courses.find((co: any) => co.id === c.course_id)?.title : null;
          const source = event ? `Evento: ${event}` : (course ? `Curso: ${course}` : 'Reconocimiento Especial');
          
          return `- [${c.certificate_code}] Para: ${owner} | Título: ${c.metadata?.title || 'Logro'} | Origen: ${source} | Fecha: ${new Date(c.created_at).toLocaleDateString()}`;
        }).join('\n');

        certStr += enrichedCerts;
        filteredContext += certStr;
      }
      }

      // 📊 MÉTRICAS Y AUDITORIA SOCIAL (NUEVO: Acceso Milimétrico)
      if (ctx.metrics) {
        const { youtube, facebook, instagram, recent_content } = ctx.metrics;
        let metricsStr = '\n\n*** AUDITORÍA ESTRATÉGICA Y MÉTRICAS SOCIALES (REAL-TIME) ***\n';
        
        if (youtube) {
          metricsStr += `- YOUTUBE: ${youtube.title} | Subs: ${youtube.subscribers?.toLocaleString()} | Vistas: ${youtube.views?.toLocaleString()} | Videos: ${youtube.videos}\n`;
        }
        if (facebook) {
          metricsStr += `- FACEBOOK: ${facebook.name} | Seguidores: ${facebook.followers?.toLocaleString()} | Alcance: ${facebook.reach?.toLocaleString()} | Engagement: ${facebook.engagement?.toLocaleString()}\n`;
        }
        if (instagram) {
          metricsStr += `- INSTAGRAM: ${instagram.followers?.toLocaleString()} seguidores | Alcance: ${instagram.reach?.toLocaleString()} | Engagement Real: ${instagram.engagement?.toLocaleString()}\n`;
        }

        // Agregar contenido reciente hasta el límite razonable del contexto
        if (recent_content?.facebook?.length > 0) {
          metricsStr += `\nÚLTIMOS POSTS FACEBOOK (DESEMPEÑO):\n${recent_content.facebook.slice(0, 5).map((p: any) => `- [${new Date(p.created_time).toLocaleDateString()}] ${p.message?.substring(0, 80).replace(/\n/g, ' ')}... | Likes: ${p.likes?.summary?.total_count || 0} | Shares: ${p.shares?.count || 0}`).join('\n')}\n`;
        }
        if (recent_content?.instagram?.length > 0) {
          metricsStr += `\nÚLTIMOS POSTS INSTAGRAM (DESEMPEÑO):\n${recent_content.instagram.slice(0, 5).map((p: any) => `- [${new Date(p.timestamp).toLocaleDateString()}] ${p.caption?.substring(0, 80).replace(/\n/g, ' ')}... | Likes: ${p.like_count} | Comm: ${p.comments_count}`).join('\n')}\n`;
        }

        filteredContext += metricsStr;
      }

      // 🎂 NEXO DE CUMPLEAÑOS (AUDITORÍA DE CELEBRACIONES)
      const birthdayPlans = ctx.birthdays || [];
      if (birthdayPlans.length > 0) {
        let bDayStr = '\n\n*** NEXO DE CUMPLEAÑOS (ESTADO DE CELEBRACIONES) ***\n';
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        
        // Filtrar cumpleaños del mes o próximos
        const upcomingBDays = ctx.team.filter((m: any) => {
          if (!m.birthday) return false;
          const bMonth = new Date(m.birthday).getMonth() + 1;
          return bMonth === currentMonth;
        }).map((m: any) => {
          const plan = birthdayPlans.find((p: any) => p.profile_id === m.id && p.year === now.getFullYear());
          const collaborations = (ctx.birthday_collaborations || []).filter((c: any) => c.profile_id === m.id);
          const status = plan?.greeting_sent ? '✅ SALUDO ENVIADO' : '⏳ PENDIENTE';
          
          let collabStr = '';
          if (collaborations.length > 0) {
            collabStr = ` | Colaboradores: ${collaborations.map((c: any) => `${c.profile?.full_name || 'Miembro'} (${c.contribution || 'Sin aporte'})`).join(', ')}`;
          }

          return `- [${new Date(m.birthday).toLocaleDateString('es-ES', { day: '2-digit', month: 'long' })}] ${m.full_name} | Estado: ${status} | Plan: ${plan?.plan_type || 'No definido'}${collabStr}\n  - Detalles Logística: ${plan?.details || 'Por planificar'}`;
        }).join('\n');

        if (upcomingBDays) {
          bDayStr += upcomingBDays;
          filteredContext += bDayStr;
        }
      }
    }

    const knowledgeContext = (hoyrKnowledge.items || []).map((item: any) => 
      `### DOC: ${item.source}\n${item.content.substring(0, 5000)}`
    ).join('\n\n');

    const finalContext = isMobileDevice 
      ? `${includeUser}${teamContext}\n${filteredContext.substring(0, 8000)}`
      : `${includeUser}${teamContext}\n${filteredContext}\n\n*** BASE DE CONOCIMIENTO (FUENTE DE VERDAD) ***\n${knowledgeContext}`;

    return `${baseSystem}\n${finalContext}\n\n*** MEMORIA HISTÓRICA DEL USUARIO (SUB-AGENTE RECALL) ***\n${userLearnings.substring(0, 3000)}`;

    } catch (err) {
      console.error('Error building context:', err);
      return `${baseSystem}\nERROR TÁCTICO: Algunos datos no pudieron ser procesados, pero el sistema base sigue operativo.`;
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setAttachments(prev => [...prev, ...files]);
      // Limpiar el value del input para permitir volver a subir el mismo archivo si se elimina
      e.target.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerateImage = async (prompt: string) => {
    setLoading(true);
    setGeneratingImage(true);

    const loadingId = Date.now();
    setMessages(prev => [...prev, {
      id: loadingId,
      role: 'assistant',
      content: `🎨 **Generando imagen con Gemini AI...**\n\n*Prompt:* \`${prompt.substring(0, 150)}${prompt.length > 150 ? '...' : ''}\`\n\n⏳ Esto puede tardar 10-20 segundos...`,
      timestamp: new Date()
    }]);

    try {
      console.log('🎨 Generando imagen con Gemini:', prompt);
      const dataUrl = await generateImageWithGemini(prompt);

      const assistantMessage: Message = {
        role: 'assistant',
        content: `¡Aquí tienes el diseño generado con Gemini AI!\n\n![Diseño IA HOYR](${dataUrl})`,
        timestamp: new Date()
      };

      setMessages(prev => [
        ...prev.filter(m => m.id !== loadingId),
        assistantMessage
      ]);

      // Guardar referencia (no el base64 completo para no saturar BD)
      await saveMessage('assistant', '📸 Imagen generada con Gemini AI (base64)');
      setGeneratedImages(prev => [...prev, dataUrl]);

    } catch (error: any) {
      console.error('Error generating image with Gemini:', error);
      const isQuota = error.message?.includes('429') || error.message?.includes('quota');
      setMessages(prev => [
        ...prev.filter(m => m.id !== loadingId),
        {
          role: 'assistant',
          content: isQuota
            ? `⚠️ **Cuota de Gemini API alcanzada.**\n\nHas agotado el límite gratuito de generación de imágenes por hoy. Vuelve a intentarlo mañana o verifica tu cuota en [Google AI Studio](https://aistudio.google.com).`
            : `❌ **Error al generar la imagen:** ${error.message || 'Error desconocido'}\n\n¿Podrías intentar con una descripción diferente?`,
          timestamp: new Date()
        }
      ]);
    } finally {
      setGeneratingImage(false);
      setLoading(false);
    }
  };

  const resolveTeamMemberId = (nameHint: string) => {
    if (!userContext || !userContext.team || !nameHint) return user?.id || '';
    
    // Si ya parece ser un UUID, retornarlo directamente
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(nameHint.trim())) {
      return nameHint.trim();
    }

    // Limpieza: Si viene como "Nombre (Rol)", quedarnos solo con el nombre
    const cleanNameHint = nameHint.split('(')[0].trim();
    const hint = cleanNameHint.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    console.log(`🔍 Resolviendo Miembro: "${nameHint}" -> Hint: "${hint}"`);

    // 1. Buscar por nombre exacto o parcial
    const nameMatch = userContext.team.find((m: any) => {
      const fullName = (m.full_name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const firstName = fullName.split(' ')[0];
      // Coincidencia más fuerte: Nombre completo contiene el hint o viceversa
      return fullName.includes(hint) || hint.includes(fullName) || hint.includes(firstName);
    });
    
    if (nameMatch) {
      console.log(`✅ Coincidencia por NOMBRE: ${nameMatch.full_name} (${nameMatch.id})`);
      return nameMatch.id;
    }

    // 2. Buscar por rol (ej. "secretaria")
    const roleMatch = userContext.team.find((m: any) => {
      const role = (m.role || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return role.includes(hint) || hint.includes(role);
    });
    
    if (roleMatch) {
      console.log(`✅ Coincidencia por ROL: ${roleMatch.role} -> ${roleMatch.full_name} (${roleMatch.id})`);
      return roleMatch.id;
    }
    
    console.warn(`⚠️ No se pudo resolver: "${nameHint}". Usando fallback: ${user?.id}`);
    return user?.id || '';
  };

  const executeAgenticAction = async (actionData: any) => {
    if (!user?.id) return;
    setIsExecuting(true);
    
    try {
      const { type, path, state } = actionData;
      console.log('⚡ Ejecutando Acción Agente:', type, path, state);
      
      let successMessage = '';
      let resultMetadata: any = null;
      let isAchievement = false;
      
      if (type === 'EXPORT_DOCS' || path === '/docs/export') {
        const title = state.title || state.data?.title || 'Documento HOYR';
        const content = state.content || state.data?.content || '';
        
        if (!content) throw new Error("El documento no tiene contenido.");
        
        const doc = await googleDocsService.createFullDocument(title, content);
        successMessage = `¡Documento **"${title}"** generado con éxito! 📝\n\n🔗 **Enlace de edición:** [Abrir en Google Docs](${doc.documentUrl})`;
        
      } else if (type === 'GENERATE_DOCX' || path === '/docs/word') {
        const title = state.title || state.data?.title || 'Documento_HOYR';
        const sections = state.sections || state.data?.sections || [{ text: state.content || state.data?.content || '' }];
        
        await generateProfessionalDocx({ title, sections });
        successMessage = `¡Archivo Word **"${title}.docx"** generado y descargado! 📄✨\n\nEste documento incluye el formato profesional solicitado (tablas y encabezados).`;

      } else if (path === '/tasks') {
        const title = state.data?.title || state.title || state.data?.name || state.name || 'Nueva Tarea';
        const description = state.data?.description || state.description || state.data?.details || state.details || state.data?.content || state.content || '';
        const priority = state.data?.priority || state.priority || 'Media';
        const dueDate = state.data?.due_date || state.due_date || state.data?.dueDate || state.dueDate || new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0];
        // 🔑 Resolución inteligente de asignado
        const assignedToInput = state.data?.assigned_to_id || state.assigned_to_id || 
                               (state.data?.assignedToIds ? state.data.assignedToIds[0] : null) || 
                               state.data?.assigned_to_name || state.assigned_to_name || 
                               state.data?.assignedTo || state.assignedTo || '';
        const assignedToId = assignedToInput ? resolveTeamMemberId(String(Array.isArray(assignedToInput) ? assignedToInput[0] : assignedToInput)) : user.id;

        const { error } = await supabase.from('tasks').insert({
          created_by: user.id,
          assigned_to: assignedToId,
          title: String(title),
          description: String(description),
          priority: String(priority),
          status: 'Pendiente',
          due_date: dueDate
        });
        if (error) throw error;
        const assignedName = userContext?.team?.find((m: any) => m.id === assignedToId)?.full_name || 'ti';
        successMessage = `¡Tarea **"${title}"** creada y asignada a **${assignedName}**! ✅`;

      } else if (path === '/tasks/update') {
        // Actualizar estado de tarea existente
        const taskName = state.data?.title || state.title || '';
        const newStatus = state.data?.status || state.status || 'Completada';
        if (taskName) {
          const { data: found } = await supabase.from('tasks').select('id, title').ilike('title', `%${taskName}%`).limit(1).single();
          if (found) {
            const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', found.id);
            if (error) throw error;
            successMessage = `¡Tarea **"${found.title}"** marcada como **${newStatus}**! ✅`;
          } else {
            successMessage = `⚠️ No encontré ninguna tarea con el nombre "${taskName}"."`;
          }
        }

      } else if (type === 'CALENDAR' || path === '/calendar/create') {
        const title = state.title || state.data?.title || 'Reunión ACS';
        const description = state.description || state.data?.description || '';
        const scheduledAt = state.scheduled_at || state.data?.scheduled_at || state.scheduledAt || state.data?.scheduledAt || new Date(Date.now() + 3600000).toISOString();
        const duration = state.duration_minutes || state.data?.duration_minutes || state.durationMinutes || state.data?.durationMinutes || 60;
        const location = state.location || state.data?.location || 'Virtual';
        
        const participantInput = state.data?.participantIds || state.participantIds || state.data?.participants || state.participants || [];
        const participantIds = Array.isArray(participantInput) 
          ? participantInput.map((n: any) => resolveTeamMemberId(String(n)))
          : [resolveTeamMemberId(String(participantInput))];

        // 📅 Integración con Google Calendar + Meet
        let meetLink = '';
        try {
          const gEvent = await googleCalendarService.createEvent({
            summary: String(title),
            description: String(description),
            start: { dateTime: new Date(scheduledAt).toISOString() },
            end: { dateTime: new Date(new Date(scheduledAt).getTime() + 3600000).toISOString() }
          });
          if (gEvent.meetLink) meetLink = gEvent.meetLink;
        } catch (gErr) {
          console.warn('Google Calendar sync failed:', gErr);
        }

        const { data: meetingData, error } = await supabase.from('meetings').insert({
          created_by: user.id,
          title: String(title),
          description: String(description),
          scheduled_at: scheduledAt,
          duration_minutes: Number(duration),
          location: location || (meetLink ? 'Virtual' : 'Oficina / Remoto'),
          meeting_link: meetLink || state.meeting_link || state.data?.meeting_link || ''
        }).select('id').single();

        if (error) throw error;

        // 👥 Insertar Participantes
        if (meetingData && participantIds.length > 0) {
          const participantRecords = participantIds
            .filter((pid: any) => pid && pid !== user.id)
            .map((pid: any) => ({
              meeting_id: meetingData.id,
              user_id: pid,
              status: 'Pendiente'
            }));

          if (participantRecords.length > 0) {
            const { error: pError } = await supabase.from('meeting_participants').insert(participantRecords);
            if (pError) console.error('Error insertando participantes:', pError);
          }
        }
        
        const finalMeetLink = meetLink || state.meeting_link || state.data?.meeting_link;
        successMessage = finalMeetLink 
          ? `¡Reunión **"${title}"** agendada! 📅\n\n🔗 **Enlace de Meet:** [Unirse ahora](${finalMeetLink})`
          : `¡Reunión **"${title}"** agendada correctamente! 📅`;

      } else if (path === '/events') {
        const title = state.data?.title || state.title || state.data?.name || state.name || 'Nuevo Evento';
        const description = state.data?.description || state.description || state.data?.details || state.details || state.data?.content || state.content || '';
        const scheduledDate = state.data?.scheduled_date || state.scheduled_date || state.data?.scheduledDate || state.scheduledDate || new Date().toISOString().split('T')[0];
        const rawEventType = String(state.data?.event_type || state.event_type || 'otro').toLowerCase();
        
        const allowedTypes = ['webinar', 'conversatorio', 'taller', 'feria', 'visita_aula', 'transmision', 'pollada', 'curso_extracurricular', 'reunion_coordinacion', 'ceremonia', 'otro'];
        let eventType = 'otro';
        if (allowedTypes.includes(rawEventType)) {
            eventType = rawEventType;
        } else if (rawEventType.includes('reunión') || rawEventType.includes('reunion') || rawEventType.includes('meeting')) {
            eventType = 'reunion_coordinacion';
        } else if (rawEventType.includes('charla') || rawEventType.includes('talk')) {
            eventType = 'conversatorio';
        } else if (rawEventType.includes('conferencia') || rawEventType.includes('webinar')) {
            eventType = 'webinar';
        }

        const isOnline = state.data?.is_online || state.is_online || false;
        const isPaid = state.data?.is_paid || state.is_paid || false;
        const cost = state.data?.cost || state.cost || 0;
        const coverImageUrl = state.data?.cover_image_url || state.cover_image_url || '';
        const sessions = state.data?.sessions || state.sessions || [];

        const { data: eventData, error } = await supabase.from('events').insert({
          created_by: user?.id || userContext?.user?.id,
          title: String(title),
          description: String(description),
          event_type: eventType,
          scheduled_date: scheduledDate,
          is_online: Boolean(isOnline),
          meeting_link: String(state.data?.meeting_link || state.meeting_link || ''),
          is_paid: Boolean(isPaid),
          cost: Number(cost),
          cover_image_url: String(coverImageUrl),
          status: 'Programado'
        }).select('id').single();

        if (error) {
          console.error('❌ Error Supabase Event Insert:', error);
          throw error;
        }

        // 🔗 Insertar Sesiones (Micro-sesiones)
        if (eventData && Array.isArray(sessions) && sessions.length > 0) {
          const sessionRecords = sessions.map((s: any, idx: number) => {
            let startTime = s.time || s.start_time || '09:00';
            if (startTime.toLowerCase().includes('am') || startTime.toLowerCase().includes('pm')) {
               const match = startTime.match(/(\d+)(?::(\d+))?\s*(am|pm)/i);
               if (match) {
                 let hours = parseInt(match[1]);
                 const mins = match[2] || '00';
                 if (match[3].toLowerCase() === 'pm' && hours < 12) hours += 12;
                 if (match[3].toLowerCase() === 'am' && hours === 12) hours = 0;
                 startTime = `${hours.toString().padStart(2, '0')}:${mins}`;
               }
            }
            if (startTime.length === 4 && /^\d+:\d+$/.test(startTime)) startTime = `0${startTime}`;
            if (!/^\d{2}:\d{2}$/.test(startTime.substring(0, 5))) startTime = '09:00';

            return {
              event_id: eventData.id,
              title: s.title || `Sesión ${idx + 1}`,
              start_time: startTime.substring(0, 5),
              session_date: scheduledDate
            };
          });
          const { error: sError } = await supabase.from('event_sessions').insert(sessionRecords);
          if (sError) console.error('❌ Error Supabase Sessions Insert:', sError);
        }

        successMessage = `¡Evento **"${title}"** registrado con éxito! 🚀${sessions.length > 0 ? ` Se incluyeron **${sessions.length}** sesiones en el programa.` : ''}`;

      } else if (path === '/certificates/emit') {
        // 🛡️ VALIDACIÓN DE ROL: Solo Director
        if (user.role !== 'Director') {
           successMessage = "❌ **Acceso Denegado:** Lo siento, tus credenciales actuales no te permiten emitir certificaciones oficiales. Esta facultad es exclusiva de la **Dirección General** por protocolos de seguridad institucional.";
        } else {
            const targetUserId = state.user_id || resolveTeamMemberId(state.user_name || state.member_name);
            const title = state.title || 'Reconocimiento al Mérito Institucional';
            const description = state.description || 'Por su destacada contribución y compromiso con los objetivos de la Revista ACS.';
            const issueDate = new Date().toISOString().split('T')[0];

            const { error } = await supabase.from('certificates').insert({
                user_id: targetUserId,
                type: 'reconocimiento',
                certificate_code: `REC-AI-${Date.now().toString().slice(-6)}`,
                pdf_url: `${supabaseUrl}/storage/v1/object/public/certificates/templates/pending_review.pdf`, 
                metadata: { 
                    title, 
                    description,
                    issue_date: issueDate,
                    emitted_by_ai: true,
                    ai_prompt: input
                }
            });

            if (error) throw error;
            const targetMember = userContext?.team?.find((m: any) => m.id === targetUserId);
            const targetName = targetMember?.full_name || 'Miembro ACS';
            
            successMessage = `✅ **Reconocimiento Emitido:** He generado formalmente el reconocimiento **"${title}"** para **${targetName}**. Queda registrado en la base de datos institucional.`;
            
            // 🏅 Capturar datos para la Tarjeta de Logro
            isAchievement = true;
            resultMetadata = {
                type: 'recognition',
                title: title,
                description: description,
                recipient_name: targetName,
                recipient_avatar: targetMember?.avatar_url,
                issuer_name: userContext?.user?.full_name || 'Director General',
                date: issueDate,
                certificate_id: `REC-AI-${Date.now().toString().slice(-6)}`
            };
        }

      } else if (path === '/birthdays/greet') {
        const targetUserId = state.user_id || resolveTeamMemberId(state.user_name || state.member_name);
        if (!targetUserId) throw new Error("No se pudo identificar al cumpleañero/a.");
        
        const targetMember = userContext?.team?.find((m: any) => m.id === targetUserId);
        if (!targetMember) throw new Error("Miembro no encontrado en el Nexo.");

        const birthdayHtml = generateBirthdayEmailTemplate(targetMember.full_name);

        const { error: edgeError } = await supabase.functions.invoke('send-direct-email', {
          body: {
            to: targetMember.email,
            subject: `¡Feliz Cumpleaños ${targetMember.full_name}! - Revista ACS 🎂`,
            html: birthdayHtml,
            type: 'birthday',
            member_name: targetMember.full_name,
            role: targetMember.role
          }
        });

        if (edgeError) throw edgeError;

        // Persistir en DB
        const currentYear = new Date().getFullYear();
        const { error: dbError } = await supabase.from('birthday_plans').upsert({
          profile_id: targetUserId,
          year: currentYear,
          greeting_sent: true,
          greeting_sent_at: new Date().toISOString()
        }, { onConflict: 'profile_id, year' });

        if (dbError) throw dbError;

        successMessage = `🚀 **Protocolo de Aniversario Ejecutado:** He enviado el saludo oficial Cyber-Deep Tech a **${targetMember.full_name}** (${targetMember.email}). El registro ha sido actualizado en el Nexo.`;

      } else if (path === '/birthdays/plan') {
        const targetId = state.profile_id || resolveTeamMemberId(state.profile_name || state.member_name);
        if (!targetId) throw new Error("No se pudo identificar al agasajado/a.");
        
        const targetMember = userContext?.team?.find((m: any) => m.id === targetId);
        const planType = state.plan_type || 'Operación Sorpresa';
        const year = state.year || new Date().getFullYear();
        const scheduledDate = state.scheduled_date || new Date().toISOString().split('T')[0];
        const scheduledTime = state.scheduled_time || '17:00';
        const details = state.details || '';
        const collaborators = Array.isArray(state.collaborators) ? state.collaborators : [];

        // 1. Guardar/Actualizar el Plan de Cumpleaños
        const { data: planData, error: planError } = await supabase
          .from('birthday_plans')
          .upsert({
            profile_id: targetId,
            year,
            plan_type: planType,
            scheduled_date: scheduledDate,
            scheduled_time: scheduledTime,
            details,
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (planError) throw planError;

        // 2. Sincronizar Colaboraciones
        if (collaborators.length > 0) {
          // Limpiar colaboraciones previas para este plan/año
          await supabase.from('birthday_collaborations').delete().eq('profile_id', targetId);
          
          const collabsToInsert = collaborators.map((c: any) => ({
            profile_id: targetId,
            collaborator_id: c.profile_id || resolveTeamMemberId(c.profile_name || c.name || c.member_name),
            contribution: c.contribution || 'Por definir',
            status: 'Pendiente'
          })).filter((c: any) => c.collaborator_id);

          if (collabsToInsert.length > 0) {
            const { error: collabError } = await supabase.from('birthday_collaborations').insert(collabsToInsert);
            if (collabError) console.error('Error al insertar colaboraciones:', collabError);
          }
        }

        // 3. Crear Evento en Calendario Institucional
        await supabase.from('events').insert({
          title: `🎂 CUMPLE: ${targetMember?.full_name || 'Miembro'} (${planType})`,
          description: `Planificación coordinada por HOYR.\n\nDetalles Logística: ${details}\n\nColaboradores Asignados: ${collaborators.map((c: any) => c.profile_name || c.name || 'Miembro').join(', ')}`,
          scheduled_date: scheduledDate,
          start_time: scheduledTime,
          event_type: 'Interno',
          status: 'Confirmado',
          created_by: user.id,
          is_online: false
        });

        successMessage = `🎯 **Operación Sorpresa Activada:** He configurado la planificación estratégica para **${targetMember?.full_name || 'el miembro'}**. \n\n- **Logística:** ${details || 'Por definir'}\n- **Equipo:** ${collaborators.length} colaboradores asignados con sus tareas básicas.\n- **Evento:** Registrado en el calendario del Nexo.`;

        // Reiniciar variables
        setIsExecuting(false);
        await loadUserContext();
        await saveMessage('assistant', successMessage);

      } else if (path === '/news') {
        const title = state.data?.title || state.title || 'Nueva Noticia';
        const content = state.data?.content || state.content || state.data?.description || state.description || '';
        const category = state.data?.category || state.category || 'General';

        const { error } = await supabase.from('news').insert({
          published_by: user.id,
          title: String(title),
          summary: content.substring(0, 150),
          content: String(content),
          category: String(category),
          status: 'Publicado',
          published_at: new Date().toISOString()
        });
        if (error) throw error;
        successMessage = `¡Noticia **"${title}"** publicada! 📰`;

      } else if (path === '/proposals') {
        const title = state.data?.title || state.title || 'Nueva Propuesta';
        const description = state.data?.description || state.description || state.data?.content || state.content || '';
        const tacticalMetadata = state.data?.tactical_metadata || state.tactical_metadata || {};
        
        const aiMetadata = {
          generated_by_hoyr: true,
          model: selectedModel,
          timestamp: new Date().toISOString()
        };

        const { error } = await supabase.from('proposals').insert({
          created_by: user.id,
          title: String(title),
          description: String(description),
          status: 'Pendiente',
          tactical_metadata: tacticalMetadata,
          ai_metadata: aiMetadata
        });
        if (error) throw error;
        successMessage = `¡Propuesta **"${title}"** enviada para revisión! 💡 Se ha generado la Tarjeta de Operación correspondiente.`;

      } else if (path === '/proposals/update') {
        const id = state.data?.id || state.id;
        if (!id) throw new Error("Se requiere el ID de la propuesta para editarla.");
        
        const updateData: any = {};
        if (state.data?.title || state.title) updateData.title = state.data?.title || state.title;
        if (state.data?.description || state.description) updateData.description = state.data?.description || state.description;
        if (state.data?.status || state.status) {
          updateData.status = state.data?.status || state.status;
          updateData.reviewed_by = user.id;
          updateData.reviewed_at = new Date().toISOString();
        }
        if (state.data?.tactical_metadata || state.tactical_metadata) {
          updateData.tactical_metadata = state.data?.tactical_metadata || state.tactical_metadata;
        }

        const { error } = await supabase.from('proposals').update(updateData).eq('id', id);
        if (error) throw error;
        successMessage = `¡Propuesta actualizada con éxito! 🔄`;

      } else if (type === 'GENERATE_IMAGE') {
        const prompt = state.prompt || state.data?.prompt || state.content || '';
        if (!prompt) throw new Error("Falta la descripción para generar la imagen.");
        
        const imageUrl = await generateImageWithGemini(Array.isArray(prompt) ? prompt.join(' ') : String(prompt));
        if (imageUrl) {
          setGeneratedImages(prev => [imageUrl, ...prev]);
          successMessage = `¡Imagen generada con éxito! 🎨✨\n\n![Flyer Generado](${imageUrl})\n\nHe usado el motor de Gemini para crear lo que pediste basado en: "${prompt}"`;
        } else {
          throw new Error("No se pudo generar la imagen.");
        }

      } else if (path === '/finance') {
        const { data: acts } = await supabase.from('financial_activities').select('id').limit(1);
        const activityId = acts?.[0]?.id;
        const amount = state.data?.amount || state.amount || 0;
        const desc = state.data?.description || state.description || state.data?.title || state.title || 'Movimiento HOYR';

        const { error } = await supabase.from('financial_transactions').insert({
          created_by: user.id,
          activity_id: activityId,
          title: String(desc),
          description: String(desc),
          amount: Number(amount),
          type: String(state.data?.type || state.type || 'expense'),
          category: String(state.data?.category || state.category || 'General'),
          transaction_date: new Date().toISOString().split('T')[0]
        });
        if (error) throw error;
        successMessage = `¡Movimiento financiero de **S/ ${amount}** registrado! 💰`;
      } else if (path === '/email/send') {
        const to = state.data?.to || state.to || '';
        const subject = state.data?.subject || state.subject || 'Sin Asunto';
        const body = state.data?.body || state.body || state.data?.message || state.message || '';

        if (!to || !body) throw new Error("Faltan campos obligatorios (destinatario o cuerpo).");

        console.log('HOYR_DEBUG: Invocando función send-direct-email via FETCH (Sincronizado con MailCenter)...');
        
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(`${supabaseUrl}/functions/v1/send-direct-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`
          },
          body: JSON.stringify({
            to: editedActionData?.to || to,
            subject: editedActionData?.subject || subject,
            html: generateEmailHtml(editedActionData?.subject || subject, editedActionData?.body || editedActionData?.message || body),
            attachments: editedActionData?.attachments || []
          })
        });

        const data = await response.json();
        console.log('Resultado fetch:', data);

        if (!response.ok) throw new Error(data?.error || `Error del servidor (${response.status})`);
        if (!data?.success) throw new Error(data?.error || "Error en la respuesta de la función.");
        
        successMessage = `¡Correo enviado con éxito a **${editedActionData?.to || to}**! 🚀📧`;
      } else if (path === '/surveys/propose') {
        const title = state.title || state.data?.title || 'Nueva Encuesta';
        const description = state.description || state.data?.description || '';
        const questions = state.questions || state.data?.questions || [];
        const category = state.category || state.data?.category || 'General';

        if (questions.length === 0) throw new Error("La encuesta no tiene preguntas.");

        // 1. Generar Slug único (Requerido por DB)
        const safeBase = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const finalSlug = `${safeBase}-${Date.now().toString(36)}`;

        // 2. Insertar Encuesta con campos obligatorios
        const { data: surveyData, error: sError } = await supabase.from('surveys').insert({
          title,
          slug: finalSlug,
          type: 'general',
          category,
          description,
          created_by: user.id,
          is_active: true // Publicada por defecto tras confirmación táctica
        }).select('id').single();

        if (sError) throw sError;

        // 3. Insertar Preguntas
        const questionRecords = questions.map((q: any, idx: number) => {
          let safeType = (q.type || 'text').toLowerCase().trim();
          const validTypes = ['text', 'textarea', 'radio', 'select', 'checkbox', 'email', 'tel', 'number'];
          if (!validTypes.includes(safeType)) {
             if (safeType.includes('multiple') || safeType.includes('choice')) safeType = 'radio';
             else safeType = 'text';
          }

          return {
            survey_id: surveyData.id,
            question: q.question,
            type: safeType,
            options: q.options || [],
            required: q.required !== undefined ? q.required : true,
            order_index: idx + 1
          };
        });

        const { error: qError } = await supabase.from('survey_questions').insert(questionRecords);
        if (qError) throw qError;

        successMessage = `¡Encuesta **"${title}"** creada y publicada con éxito! 🗳️🚀\n\nHe registrado **${questions.length}** preguntas en el sistema. Ya está disponible para que los miembros comiencen a responder.`;
      } else if (path === '/birthdays/plan') {
        const profileId = state.profile_id || resolveTeamMemberId(state.full_name || state.member_name || state.name);
        const year = state.year || new Date().getFullYear();
        const planType = state.plan_type || 'Compartir';
        const scheduledDate = state.scheduled_date || new Date().toISOString().split('T')[0];
        const scheduledTime = state.scheduled_time || '15:00';
        const details = state.details || '';

        const { error } = await supabase.from('birthday_plans').upsert({
            profile_id: profileId,
            year,
            plan_type: planType,
            scheduled_date: scheduledDate,
            scheduled_time: scheduledTime,
            details
        }, { onConflict: 'profile_id, year' });

        if (error) throw error;
        const memberName = userContext?.team?.find((m: any) => m.id === profileId)?.full_name || 'Miembro';
        successMessage = `¡Plan de cumpleaños para **${memberName}** sincronizado! 🎂✨\n\nHOYR ha registrado la logística en el **Nexo de Cumpleaños ACS**. Se ha notificado a los responsables pertinentes.`;
      }

      const feedbackMsg: Message = {
        role: 'assistant',
        content: successMessage || '¡Acción ejecutada con éxito! ✅',
        timestamp: new Date(),
        actionResult: resultMetadata,
        isAchievement: isAchievement
      };
      
      setMessages(prev => [...prev, feedbackMsg]);
      await saveMessage('assistant', feedbackMsg.content, selectedModel);
      setPendingAction(null);
      setEditedActionData(null); // Limpiar datos editados también
      
    } catch (error: any) {
      console.error('Error al ejecutar acción agente:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ **Error al ejecutar la acción:** ${error.message || 'Error de conexión con la base de datos.'}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSend = async () => {
    const currentInput = input.trim();
    if (!currentInput && attachments.length === 0) return;

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: currentInput,
      timestamp: new Date(),
      attachments: attachments.map(f => ({
        name: f.name,
        type: f.type,
        url: URL.createObjectURL(f)
      }))
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // INTERCEPTOR DE CRÉDITOS OPENAI
    if (selectedModel.startsWith('gpt-')) {
      const warningMsg: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: `⚠️ **Aviso de Créditos**: El motor **${selectedModel.toUpperCase()}** requiere créditos de pago que aún no han sido recargados. \n\nPor ahora, te recomiendo usar **Gemini 2.5 Flash** o **Mercury Ultra**, que son gratuitos y ofrecen un rendimiento excepcional para las tareas actuales.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, warningMsg]);
      return; // No intentar llamar a la API
    }

    setLoading(true);

    try {
      // 🔄 ASEGURAR QUE EXISTE CONVERSACIÓN ACTIVA
      let currentId = currentConversationId;
      if (!currentId) {
        currentId = await createNewConversation();
      }

      await saveMessage('user', currentInput, selectedModel, currentId || undefined);

      // 📝 TÍTULO DINÁMICO: Si es el primer mensaje, generar un título descriptivo
      if (messages.length === 0 && currentId) {
        const titleDraft = currentInput.split(' ').slice(0, 5).join(' ');
        const cleanTitle = titleDraft.length > 40 ? titleDraft.substring(0, 37) + '...' : titleDraft;
        await supabase
          .from('chat_conversations')
          .update({ title: cleanTitle || `Sesión ${new Date().toLocaleDateString()}` })
          .eq('id', currentId);
        
        // Refrescar lista de conversaciones para mostrar el nuevo título
        loadConversations();
      }

      // Cargar contexto fresco
      const activeContext = userContext || await loadUserContext();
      const contextStr = buildContext(activeContext);

      // Procesar adjuntos para modelos no-Gemini (extracción de texto)
      let fileTextContent = '';
      if (!selectedModel.startsWith('gemini-') && attachments.length > 0) {
        for (const file of attachments) {
          if (file.type === 'application/pdf') {
            const pdfText = await extractPDFText(file);
            fileTextContent += `\n\n📄 **PDF: ${file.name}**\n${pdfText}`;
          } else if (file.type.startsWith('text/') || file.name.endsWith('.md')) {
            const text = await file.text();
            fileTextContent += `\n\n📎 **Archivo: ${file.name}**\n\`\`\`\n${text.substring(0, 5000)}\n\`\`\``;
          }
        }
      }

      const fullPrompt = currentInput + fileTextContent;
      const assistantMessageId = Date.now() + 1;

      // Crear mensaje vacío para streaming
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date()
      }]);

      const onStream = (fullText: string) => {
        let displayContent = fullText;
        
        // Extraer dinámicamente el contenido de "response": "..." mientras llega el JSON
        const responseMatch = fullText.match(/"response"\s*:\s*"([\s\S]*?)(?:",\s*"action"|"\s*,\s*"action"|"$|$)/);
        
        if (responseMatch) {
            displayContent = responseMatch[1]
                .replace(/\\n/g, '\n')
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\');
        } else {
            // Fallback para modelos que envían pre-texto o no usan JSON puro al inicio
            if (fullText.includes('```json')) {
                displayContent = fullText.split('```json')[0].trim();
            } else if (fullText.includes('{') && fullText.includes('"response"')) {
                const lastBrace = fullText.lastIndexOf('{');
                displayContent = fullText.substring(0, lastBrace).trim();
            }
        }

        if (displayContent) {
          setMessages(prev => prev.map(m => 
            m.id === assistantMessageId ? { ...m, content: displayContent } : m
          ));
        }
      };

      let result: { response: string; action: any };
      const conversationHistory = messages.slice(-50).map(m => ({ role: m.role, content: m.content }));

      // ENRUTAMIENTO DE PROVEEDORES
      if (selectedModel === 'mercury-2') {
        result = await chatWithMercury(fullPrompt, contextStr, conversationHistory, selectedModel, onStream, activeContext.user.full_name, activeContext.user.role);
      } else if (selectedModel.includes('llama') || selectedModel.includes('groq')) {
        result = await chatWithGroq(fullPrompt, contextStr, conversationHistory, selectedModel, onStream, activeContext.user.full_name, activeContext.user.role);
      } else if (selectedModel.includes('deepseek')) {
        result = await chatWithDeepSeek(fullPrompt, contextStr, conversationHistory, selectedModel, onStream, activeContext.user.full_name, activeContext.user.role);
      } else {
        result = await chatWithGemini(fullPrompt, contextStr, conversationHistory, selectedModel, onStream, activeContext.user.full_name, activeContext.user.role);
      }

      // Finalizar mensaje
      const finalResponse = result.response || "No se recibió respuesta del servidor. Intenta cambiar de modelo.";
      setMessages(prev => prev.map(m => 
        m.id === assistantMessageId ? { ...m, content: finalResponse } : m
      ));
      
      await saveMessage('assistant', finalResponse, selectedModel, currentId || undefined);

      // 🛡️ Filtro de Acciones Fantasma (NONE)
      if (result.action && result.action.type !== 'NONE' && result.action.path !== 'NONE') {
        const action = result.action;
        
        // ⚡ AUTO-EJECUCIÓN: Solo para imágenes, para agilizar el flujo visual
        const isAutoExecute = action.type === 'GENERATE_IMAGE';

        if (isAutoExecute) {
          console.log('🚀 Auto-ejecutando generación de imagen de HOYR...');
          await executeAgenticAction(action);
        } else {
          setPendingAction(action);
          // Inicializar datos editables y activar vista previa si es correo
          setEditedActionData(action.state?.data || action.state || {});
          if (action.path === '/email/send') {
            setShowBodyPreview(true);
          }
        }
      }

      setAttachments([]);
    } catch (error: any) {
      console.error('Error en handleSend:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `❌ **Error de HOYR**: ${error.message || 'Error de conexión.'}`,
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const getGreetingName = () => {
    return userContext?.user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Equipo';
  };

  return (
    <div className="flex h-screen bg-black text-gray-400 font-sans text-sm overflow-hidden selection:bg-[#0088ff]/30 selection:text-white">
      
      {/* Estilos globales - Estilo REXIS / Core SGR-ACS */}
      <style>{`
        .dark ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .dark ::-webkit-scrollbar-track {
          background: #000000; 
        }
        .dark ::-webkit-scrollbar-thumb {
          background: #111; 
          border-radius: 10px;
        }
        .dark ::-webkit-scrollbar-thumb:hover {
          background: #0088ff; 
        }
        .dark * {
          scrollbar-width: thin;
          scrollbar-color: #111 #000;
        }
        @keyframes orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes slow-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-orbit {
          animation: orbit 20s linear infinite;
        }
        .animate-slow-spin {
          animation: slow-spin 10s linear infinite;
        }
        .animate-pulse-slow {
          animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>

      {/* Barra Lateral (Historial de Sesiones) - Estética REXIS */}
      <div className={`hidden md:flex flex-col z-40 flex-shrink-0 relative transition-all duration-300 ease-in-out bg-black ${isSidebarOpen ? 'w-[280px] opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
        <div className="w-[280px] flex flex-col h-full border-r border-[#111]">
          {/* Header del Sidebar Estilo REXIS */}
          <div className="p-4 flex flex-col gap-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-[#0088ff] rounded-full animate-pulse shadow-[0_0_8px_#0088ff]"></div>
                <span className="text-white font-black text-[9px] tracking-[0.3em] uppercase">NEXO_SESIONES</span>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="p-1.5 text-gray-600 hover:text-white transition-colors"
              >
                <PanelLeft size={16} />
              </button>
            </div>

            <button 
              onClick={handleNewChat}
              className="w-full flex items-center justify-center gap-2 bg-[#0088ff] text-black font-black py-3 px-4 rounded-xl text-[10px] tracking-[0.2em] uppercase hover:bg-white transition-all shadow-[0_5px_20px_rgba(0,136,255,0.2)] active:scale-95"
            >
              <Plus size={16} strokeWidth={3} />
              Nueva Sesión
            </button>
          </div>

          <div className="px-6 py-2">
            <span className="text-gray-700 font-black text-[8px] tracking-[0.4em] uppercase">AUDITORÍA_RECIENTE</span>
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-4 custom-scrollbar mt-2">
            {conversations.map((conv) => (
              <div 
                key={conv.id}
                onClick={() => loadConversation(conv.id)}
                className={`group relative flex items-center gap-3 p-3 mb-1.5 cursor-pointer transition-all rounded-xl border ${
                  currentConversationId === conv.id 
                    ? 'border-[#0088ff]/30 bg-[#0088ff]/10 shadow-[inset_0_0_15px_rgba(0,136,255,0.05)]' 
                    : 'border-transparent hover:bg-[#0a0a0a] hover:border-[#1a1a1a]'
                }`}
              >
                <MessageSquare 
                  size={14} 
                  className={`shrink-0 ${currentConversationId === conv.id ? 'text-[#0088ff]' : 'text-gray-700 group-hover:text-gray-500'}`} 
                />
                
                <div className="flex-1 min-w-0">
                  <div className={`font-bold text-[11px] truncate leading-tight ${currentConversationId === conv.id ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}`}>
                    {conv.title || 'Nueva Sesión'}
                  </div>
                  {currentConversationId === conv.id && (
                    <div className="text-[#0088ff]/60 text-[8px] mt-0.5 font-mono uppercase tracking-tighter">
                      AUDITANDO_AHORA
                    </div>
                  )}
                </div>

                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-700 hover:text-red-500 transition-all"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Área Principal Estilo REXIS */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-black">
        
        {/* Cabecera Minimalista */}
        <header className="h-16 flex items-center justify-between px-6 bg-transparent z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-2 hover:bg-[#111] transition-all rounded-lg flex items-center justify-center border ${isSidebarOpen ? 'border-transparent opacity-0 pointer-events-none' : 'border-[#1a1a1a]'}`}
            >
              <PanelLeft size={18} className="text-gray-600" />
            </button>
            <div className="flex flex-col">
              <span className="text-[10px] font-black tracking-[0.3em] text-[#0088ff] uppercase">Sistema_Núcleo_HOYR</span>
              <span className="text-[8px] text-gray-600 tracking-widest font-mono uppercase">SGR-ACS v2.5 // PROTOCOLO_ACTIVO</span>
            </div>
          </div>

          <div className={`flex items-center gap-6 transition-opacity duration-500 ${messages.length === 0 ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            {loading && (
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <div className="w-1 h-3 bg-[#0088ff] animate-bounce" style={{ animationDelay: '0s' }}></div>
                  <div className="w-1 h-3 bg-[#0088ff] animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-1 h-3 bg-[#0088ff] animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
                <span className="text-[9px] font-mono text-[#0088ff] animate-pulse">PROCESANDO_AUDITORÍA</span>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${loading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
              <span className="text-[9px] font-bold text-gray-500 tracking-tighter">STATUS: {loading ? 'COMPUTING' : 'READY'}</span>
            </div>

            <button 
              onClick={() => setShowUploadModal(true)}
              className="group flex items-center gap-2 px-3 py-1.5 border border-[#1a1a1a] hover:border-[#0088ff] transition-all bg-[#0a0a0a]"
            >
              <Upload size={14} className="text-gray-500 group-hover:text-[#0088ff]" />
              <span className="text-[9px] font-black tracking-widest uppercase">Subir</span>
            </button>
          </div>
        </header>

        {/* Contenido Principal */}
        <main className="flex-1 overflow-y-auto relative scroll-smooth custom-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-6 max-w-4xl mx-auto animate-in fade-in duration-1000">
              {/* Logo Central REXIS Style */}
              <div className="relative mb-12 group">
                <div className="absolute inset-0 bg-[#0088ff]/20 blur-[100px] rounded-full group-hover:bg-[#0088ff]/30 transition-all duration-700"></div>
                <div className="relative w-24 h-24 md:w-32 md:h-32 flex items-center justify-center">
                  {/* Anillos de Datos Orbitales */}
                  <div className="absolute inset-0 border-[1px] border-[#0088ff]/10 rounded-full animate-orbit"></div>
                  <div className="absolute inset-4 border-[1px] border-[#0088ff]/20 rounded-full animate-orbit" style={{ animationDirection: 'reverse', animationDuration: '12s' }}></div>
                  <div className="absolute inset-8 border-[1px] border-[#0088ff]/30 rounded-full animate-orbit" style={{ animationDuration: '8s' }}></div>
                  
                  {/* Puntos de Datos en Órbita */}
                  <div className="absolute inset-0 animate-orbit">
                    <div className="w-1.5 h-1.5 bg-[#0088ff] rounded-full absolute -top-0.5 left-1/2 -translate-x-1/2 shadow-[0_0_10px_#0088ff]"></div>
                  </div>

                  {/* Núcleo Hexagonal SGR */}
                  <div className="relative w-14 h-14 md:w-20 md:h-20 flex items-center justify-center">
                    <div className="absolute inset-0 bg-[#0088ff]/5 rounded-2xl rotate-45 animate-pulse"></div>
                    <div className="w-10 h-10 md:w-14 md:h-14 bg-black border border-[#0088ff]/30 flex items-center justify-center relative shadow-[0_0_30px_rgba(0,136,255,0.1)] rotate-45">
                       <span className="text-white font-black text-xl md:text-2xl tracking-tighter -rotate-45">H</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Títulos REXIS Style */}
              <div className="text-center mb-10 space-y-3">
                <h1 className="text-white font-black text-2xl md:text-4xl tracking-tight leading-none uppercase">
                  Bienvenido, {userContext?.user?.full_name?.split(' ')[0] || 'Líder'}
                </h1>
                <p className="text-[#0088ff] font-medium text-[9px] md:text-[11px] uppercase tracking-[0.5em] opacity-60">
                  SISTEMA_NÚCLEO_HOYR // SGR-ACS v2.5
                </p>
              </div>

              {/* Caja de Entrada Central */}
              <div className="w-full max-w-2xl group animate-in slide-in-from-bottom-4 duration-700 delay-300">
                <div className="chat-input-container relative border border-[#1a1a1a] bg-[#0a0a0a] rounded-2xl flex flex-col p-2 transition-all duration-300 focus-within:border-[#0088ff]/50 focus-within:shadow-[0_0_30px_rgba(0,136,255,0.1)] hover:border-[#333]">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={handleInputResize}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Ingresar comando o consulta estratégica..."
                    className="chat-textarea w-full bg-transparent border-none outline-none text-white px-6 py-6 font-sans text-lg placeholder-gray-900 resize-none max-h-48 min-h-[80px] leading-relaxed"
                    rows={1}
                  />
                  
                  <div className="flex items-center justify-between px-4 pb-2 border-t border-[#111] pt-2">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-[#1a1a1a]"
                        title="Adjuntar Archivos"
                      >
                        <Paperclip size={18} className="-rotate-45" />
                      </button>
                    </div>

                    <button 
                      onClick={handleSend}
                      disabled={loading || (!input.trim() && attachments.length === 0)}
                      className={`chat-send-btn flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                        loading || !input.trim() 
                          ? 'bg-gray-900 text-gray-700 cursor-not-allowed' 
                          : 'bg-white text-black hover:scale-105 active:scale-95 shadow-lg shadow-white/5'
                      }`}
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <CornerDownRight size={16} />}
                      {loading ? 'PROCESANDO' : 'ENVIAR'}
                    </button>
                  </div>
                </div>

                {/* Sugerencias Rápidas */}
                <div className="flex flex-wrap items-center justify-center gap-4 mt-12">
                  {[
                    { icon: Calendar, label: "Auditar Agenda Social", q: "Muestra mi resumen táctico de hoy" },
                    { icon: ClipboardList, label: "Resumen de Tareas", q: "¿Qué tareas críticas tengo pendientes?" },
                    { icon: FileBarChart, label: "Reporte de Gestión", q: "Genera un reporte de la situación actual" }
                  ].map((action, i) => (
                    <button 
                      key={i}
                      onClick={() => { setInput(action.q); handleSend(); }}
                      className="chat-suggestion-btn flex items-center gap-3 px-6 py-3 bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#0088ff]/30 hover:bg-[#111] transition-all group rounded-full"
                    >
                      <action.icon size={14} className="text-gray-600 group-hover:text-[#0088ff] transition-colors" />
                      <span className="text-[11px] font-medium text-gray-500 group-hover:text-gray-300 tracking-tight uppercase">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Icono Smiley REXIS Style (Bottom Right) */}
              <div className="fixed bottom-8 right-8 hidden md:block">
                <div className="w-12 h-12 rounded-full border border-[#1a1a1a] flex items-center justify-center hover:border-[#333] transition-all cursor-pointer group bg-[#050505]">
                  <Smile size={20} className="text-gray-700 group-hover:text-white transition-colors" />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-12 pb-32 max-w-5xl mx-auto px-4 mt-8">
              {messages.map((msg, i) => (
                <div 
                  key={i} 
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                >
                  {msg.role === 'user' ? (
                    /* Mensaje del Usuario: Píldora REXIS Blue */
                    <div className="bg-[#0088ff] text-white px-6 py-3 rounded-[2rem] shadow-[0_10px_40px_rgba(0,136,255,0.2)] max-w-[85%] lg:max-w-[70%] text-sm font-medium leading-relaxed">
                      {msg.content}
                    </div>
                  ) : (
                    /* Respuesta de HOYR: Texto Fluido sobre Negro */
                    <div className="flex flex-col w-full max-w-[90%] lg:max-w-[85%]">
                      {/* Indicador de Motor Minimalista */}
                      <div className="flex items-center gap-3 mb-4 ml-1">
                        {/* Logo dinámico en la burbuja del asistente */}
                        <div className="w-3 h-3 flex items-center justify-center shrink-0">
                          {(() => {
                            const allModels = [...GEMINI_MODELS, ...MERCURY_MODELS, ...GROQ_MODELS, ...DEEPSEEK_MODELS];
                            const m = allModels.find(mod => mod.id === (msg.model || selectedModel));
                            if (!m) return <div className="w-1.5 h-1.5 bg-[#0088ff] rounded-full shadow-[0_0_8px_#0088ff] animate-pulse"></div>;
                            return m.logo ? (
                              <img src={m.logo} alt="" className="chat-model-logo max-w-full max-h-full object-contain brightness-125" />
                            ) : <span className="text-[10px]">{m.emoji}</span>;
                          })()}
                        </div>
                        <span className="text-[8px] font-black tracking-[0.4em] text-gray-700 uppercase">
                          {(msg.model || selectedModel).replace(/-/g, '_').toUpperCase()}
                        </span>
                      </div>
                      <div className="chat-assistant-response text-gray-200 text-[15px] leading-relaxed font-sans px-1 space-y-4">
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({...props}) => <p className="mb-4 last:mb-0" {...props} />,
                            code: ({...props}) => <code className="bg-[#111] px-1.5 py-0.5 rounded border border-[#222] text-[#0088ff] font-mono text-xs" {...props} />,
                            strong: ({...props}) => <strong className="text-white font-black" {...props} />,
                            ul: ({...props}) => <ul className="list-disc ml-4 space-y-2 mb-4" {...props} />,
                            ol: ({...props}) => <ol className="list-decimal ml-4 space-y-2 mb-4" {...props} />,
                            li: ({...props}) => <li className="pl-2" {...props} />,
                            table: ({...props}) => <div className="overflow-x-auto my-6 border border-[#111]"><table className="w-full border-collapse text-xs" {...props} /></div>,
                            th: ({...props}) => <th className="bg-[#0a0a0a] border border-[#111] p-3 text-left text-[#0088ff] font-black uppercase tracking-widest" {...props} />,
                            td: ({...props}) => <td className="border border-[#111] p-3 text-gray-400" {...props} />,
                            h1: ({...props}) => <h1 className="text-white font-black text-xl mb-4 tracking-tight uppercase" {...props} />,
                            h2: ({...props}) => <h2 className="text-[#0088ff] font-black text-lg mb-3 tracking-tight uppercase" {...props} />,
                            h3: ({...props}) => <h3 className="text-white font-bold text-base mb-2 tracking-tight uppercase" {...props} />
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                        {/* Timestamp minimalista estilo terminal */}
                        <div className={`text-[8px] font-mono mt-4 tracking-tighter opacity-30 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                          {msg.role === 'assistant' ? 'ORIGIN: ACS_SECURE_NODE' : 'USER_TRACE'}: {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                        </div>

                        {msg.role === 'assistant' && msg.content === '' && loading && (
                          <div className="flex items-center gap-3 py-2 px-1">
                            <div className="flex items-end gap-1 h-3">
                              <div className="w-1.5 h-1.5 bg-[#0088ff] animate-bounce" style={{ animationDelay: '0ms' }}></div>
                              <div className="w-1.5 h-1.5 bg-[#0088ff] animate-bounce" style={{ animationDelay: '150ms' }}></div>
                              <div className="w-1.5 h-1.5 bg-[#0088ff] animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                            <span className="text-[#0088ff] text-[10px] font-mono tracking-widest bg-[#0088ff]/10 px-2 py-0.5 border border-[#0088ff]/30">{responseTime}s</span>
                          </div>
                        )}

                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className={`mt-4 flex flex-wrap gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            {msg.attachments.map((file, idx) => (
                              <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-black/50 border border-[#1a1a1a] text-[10px] text-gray-500 rounded-none font-mono tracking-tighter">
                                <Paperclip size={10} />
                                {file.name.toUpperCase()}
                              </div>
                            ))}
                          </div>
                        )}
                      {/* El cierre del div principal se mueve al final para incluir las tarjetas */}

                      {/* 🏅 TARJETA DE LOGRO (Achievement Card) */}
                      {msg.role === 'assistant' && msg.isAchievement && msg.actionResult && (
                        <div className="mt-4 w-full max-w-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-700">
                          <div className="relative p-8 bg-[#0a0a0a] border border-[#0088ff]/40 shadow-[0_0_50px_rgba(0,136,255,0.15)] overflow-hidden group">
                            
                            <div className="absolute top-0 right-0 p-2 text-[8px] font-black text-[#0088ff]/30 tracking-[0.4em] uppercase select-none">ACS_SECURE_AUTH</div>
                            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#0088ff]/5 rounded-full blur-3xl group-hover:bg-[#0088ff]/10 transition-all"></div>
                            
                            <div className="flex justify-between items-start mb-10 border-b border-[#1a1a1a] pb-4">
                               <div className="flex flex-col">
                                  <span className="text-[#0088ff] text-[10px] font-black tracking-[0.5em] uppercase mb-1">CREDENCIAL_DE_RECONOCIMIENTO</span>
                                  <span className="text-gray-500 text-[8px] font-mono whitespace-nowrap uppercase">VERIFICACION_IA_NIVEL_ALPHA // {msg.actionResult.certificate_id}</span>
                               </div>
                               <div className="w-10 h-10 border border-[#0088ff]/30 p-1">
                                  <img src="/images/Logo-HOYR-animado/logo hoyr animado.webp" alt="HOYR" className="w-full h-full object-contain brightness-125" />
                               </div>
                            </div>

                            {/* Cuerpo del Certificado */}
                            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
                               <div className="relative group shrink-0">
                                  <div className="absolute inset-0 bg-[#0088ff]/20 blur-xl group-hover:bg-[#0088ff]/40 transition-all rounded-full animate-pulse"></div>
                                  <div className="w-24 h-24 bg-black border-2 border-[#0088ff]/50 relative z-10 p-1 flex items-center justify-center overflow-hidden">
                                     {msg.actionResult.recipient_avatar ? (
                                       <img src={msg.actionResult.recipient_avatar} alt="" className="w-full h-full object-cover transition-all" />
                                     ) : (
                                       <User size={40} className="text-[#0088ff]/30" />
                                     )}
                                  </div>
                               </div>

                               <div className="flex-1 flex flex-col justify-center">
                                  <h4 className="text-gray-500 text-[10px] font-black tracking-[0.3em] uppercase mb-2">OTORGADO_A:</h4>
                                  <h3 className="text-white text-2xl font-black uppercase tracking-tight mb-4 drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">
                                     {msg.actionResult.recipient_name}
                                  </h3>
                                  
                                  <div className="bg-[#001429]/50 border-l-2 border-[#0088ff] p-4 mb-6">
                                     <p className="text-[#0088ff] text-[13px] font-bold uppercase leading-tight italic">
                                        "{msg.actionResult.title}"
                                     </p>
                                     <p className="text-gray-400 text-[11px] mt-2 leading-relaxed">
                                        {msg.actionResult.description}
                                     </p>
                                  </div>
                               </div>
                            </div>

                            {/* Footer del Certificado */}
                            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-[#1a1a1a]">
                               <div className="flex flex-col">
                                  <span className="text-gray-600 text-[8px] font-black uppercase tracking-widest mb-1">EMITIDO_POR:</span>
                                  <span className="text-white text-[10px] font-bold uppercase">{msg.actionResult.issuer_name}</span>
                               </div>
                               <div className="flex flex-col text-right">
                                  <span className="text-gray-600 text-[8px] font-black uppercase tracking-widest mb-1">FECHA_DE_EMISIÓN:</span>
                                  <span className="text-[#0088ff] text-[10px] font-mono">{msg.actionResult.date}</span>
                               </div>
                            </div>

                            {/* Acciones del Logro */}
                            <div className="mt-8 flex justify-center">
                               <button 
                                 onClick={() => navigate('/admin/certificates')}
                                 className="px-6 py-2 bg-transparent border border-[#0088ff]/50 text-[#0088ff] text-[9px] font-black tracking-[0.2em] uppercase hover:bg-[#0088ff] hover:text-black transition-all flex items-center gap-2 group/btn"
                               >
                                  <ClipboardList size={12} className="group-hover/btn:scale-110" />
                                  ACCEDER_AL_EXPEDIENTE_FORMAL
                               </button>
                            </div>
                          </div>
                        </div>
                      )}

                        {/* Tarjeta de Confirmación de Acción Agente - Solo si es una acción REAL del sistema */}
                        {msg.role === 'assistant' && i === messages.length - 1 && pendingAction && (
                          ['CREATE', 'UPDATE', 'GENERATE', 'EXPORT', 'AUDIT', 'SEND'].some(t => pendingAction.type?.toUpperCase().includes(t)) || 
                          pendingAction.path === '/events' ||
                          pendingAction.path === '/email/send'
                        ) && (
                          <div className="mt-6 p-12 border border-[#00ff88]/40 bg-[#0a0a0a] backdrop-blur-sm rounded-none border-t-2 border-t-[#00ff88] animate-in zoom-in-95 duration-500 shadow-[0_0_60px_rgba(0,255,136,0.2)] w-full max-w-4xl overflow-hidden flex flex-col relative tracking-wide">
                            <div className="flex items-center gap-3 mb-4">
                              <div className="p-2 bg-[#0088ff] text-black">
                                <Zap size={16} />
                              </div>
                              <div>
                                <div className="text-[#0088ff] text-[10px] font-black uppercase tracking-[0.2em]">{pendingAction.type}</div>
                                <div className="text-white text-xs font-bold uppercase mt-0.5">Autorización de Operación</div>
                              </div>
                            </div>
                            
                            <div className="bg-black/40 border border-[#1a1a1a] p-4 space-y-3 mb-5 font-mono text-[11px]">
                                 <div className="flex justify-between items-start border-b border-[#111] pb-2">
                                <span className="text-gray-500 uppercase tracking-tighter">Acción</span>
                                <span className="text-white uppercase">{pendingAction?.type || 'OPERACIÓN_NÚCLEO'}</span>
                              </div>
                              <div className="flex flex-col gap-3">
                                <span className="text-gray-500 uppercase tracking-tighter text-[10px] font-bold mb-1">MÉTRICAS DE OPERACIÓN PARA VALIDACIÓN:</span>
                                <div className="grid grid-cols-1 gap-1 p-4 bg-black/60 border border-[#222]">
                                  {pendingAction?.state && typeof pendingAction.state === 'object' && Object.entries((pendingAction.state as any).data || pendingAction.state).map(([key, val]: [string, any]) => {
                                    if (typeof val === 'object' && val !== null) {
                                      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'string') {
                                        val = val.join(', ');
                                      } else return null;
                                    }
                                    if (['authCode', 'platform', 'assigned_to_id', 'assignedToIds'].includes(key)) return null;

                                    const stateObj = (pendingAction?.state as any)?.data || pendingAction?.state;
                                    const uuidFromState = stateObj?.assigned_to_id || stateObj?.assignedToIds?.[0];
                                    
                                    let displayValue = String(val || '');
                                    let avatarUrl = null;

                                    const labelMap: Record<string, string> = {
                                      'title': 'TÍTULO',
                                      'priority': 'PRIORIDAD',
                                      'description': 'DESCRIPCIÓN',
                                      'due_date': 'VENCIMIENTO',
                                      'due_time': 'HORA',
                                      'assigned_to_name': 'RESPONSABLE',
                                      'assignedtoids': 'RESPONSABLE',
                                      'assigned_to_id': 'ID RESPONSABLE',
                                      'scheduled_at': 'FECHA/HORA',
                                      'scheduled_date': 'FECHA',
                                      'duration_minutes': 'DURACIÓN (MIN)',
                                      'meeting_link': 'ENLACE MEET',
                                      'meeting_type': 'TIPO DE REUNIÓN',
                                      'location': 'UBICACIÓN',
                                      'participants': 'PARTICIPANTES',
                                      'participantids': 'PARTICIPANTES',
                                      'amount': 'MONTO',
                                      'type': 'TIPO',
                                      'category': 'CATEGORÍA',
                                      'event_type': 'TIPO DE EVENTO',
                                      'is_online': 'ES VIRTUAL',
                                      'is_paid': 'CON COSTO',
                                      'cost': 'COSTO ACUMULADO',
                                      'cover_image_url': 'IMAGEN PORTADA',
                                      'sessions': 'PROGRAMA (SESIONES)',
                                      'to': 'PARA (DESTINATARIO)',
                                      'body': 'CONTENIDO DEL MENSAJE',
                                      'subject': 'ASUNTO DEL CORREO'
                                    };

                                    if (key.toLowerCase().includes('assign') || key.toLowerCase().includes('asign') || key.toLowerCase().includes('participan') || key.toLowerCase().includes('responsable')) {
                                      // 1. Intentar resolver por el valor actual si es un UUID
                                      if (typeof val === 'string' && /^[0-9a-f]{8}-/.test(val)) {
                                        const matchedUser = userContext?.team?.find((m: any) => m.id === val);
                                        if (matchedUser) {
                                          displayValue = matchedUser.full_name;
                                          avatarUrl = matchedUser.avatar_url;
                                        }
                                      } 
                                      // 2. Si no es UUID pero hay un ID de asignación general en este objeto de estado
                                      else if (uuidFromState) {
                                        const matchedUser = userContext?.team?.find((m: any) => m.id === uuidFromState);
                                        if (matchedUser) {
                                          avatarUrl = matchedUser.avatar_url;
                                          // Si el valor no es un ID y no tenemos nombre, usamos el del ID
                                          if (!displayValue || displayValue === 'undefined') {
                                            displayValue = matchedUser.full_name;
                                          }
                                        }
                                      }

                                      // 3. Manejo especial para participantes (múltiples IDs)
                                      if (key.toLowerCase().includes('participant')) {
                                         const ids = String(val || '').split(', ');
                                         displayValue = ids.map(id => {
                                            const m = userContext?.team?.find((u: any) => u.id === id.trim());
                                            return m?.full_name || id.trim();
                                         }).join(', ');
                                      }
                                    }

                                    return (
                                      <div key={key} className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#111] last:border-0 pb-2 mb-2 gap-2 animate-in fade-in duration-300">
                                        <div className="flex items-center gap-2">
                                          <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">{labelMap[key.toLowerCase().replace(/ /g, '_')] || key.replace(/_/g, ' ')}</span>
                                        </div>
                                        <div className="flex items-center gap-2 bg-[#111] px-2 py-1 border border-[#222] min-h-[32px] rounded-none w-full max-w-[200px] sm:max-w-none">
                                          {(key.toLowerCase().includes('assign') || key.toLowerCase().includes('asign') || key.toLowerCase().includes('participan')) && (
                                            <div className="w-6 h-6 rounded-full overflow-hidden border border-[#00ff88]/30 bg-black flex items-center justify-center shrink-0">
                                              {avatarUrl ? (
                                                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                                              ) : (
                                                <User size={12} className="text-[#00ff88]" />
                                              )}
                                            </div>
                                          )}
                                          {key.toLowerCase() === 'body' || key.toLowerCase() === 'content' || key.toLowerCase() === 'description' ? (
                                            <div className="w-full relative group">
                                              <button 
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  setShowBodyPreview(!showBodyPreview);
                                                }}
                                                className="absolute -top-7 right-0 text-[#00ff88] hover:text-white transition-all px-2 py-0.5 bg-[#0a0a0a] border border-[#00ff88]/30 flex items-center gap-1.5 z-10 font-bold"
                                                style={{ fontSize: '9px', letterSpacing: '0.1em' }}
                                              >
                                                {showBodyPreview ? (
                                                  <><ClipboardList size={10} /> FUENTE</>
                                                ) : (
                                                  <><Zap size={10} /> VISTA_PREVIA</>
                                                )}
                                              </button>
                                              
                                              {showBodyPreview ? (
                                                <div className="bg-[#050505] text-gray-300 text-[11px] font-sans leading-relaxed p-8 border border-[#00ff88]/20 w-full min-h-[350px] max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#333]">
                                                  <ReactMarkdown 
                                                    remarkPlugins={[remarkGfm]}
                                                    components={{
                                                      table: ({...props}) => <table className="border-collapse border border-[#333] w-full my-2 text-[10px]" {...props} />,
                                                      thead: ({...props}) => <thead className="bg-[#1a1a1a]" {...props} />,
                                                      th: ({...props}) => <th className="border border-[#333] p-1.5 text-[#00ff88] text-left uppercase" {...props} />,
                                                      td: ({...props}) => <td className="border border-[#333] p-1.5" {...props} />,
                                                      p: ({...props}) => <p className="mb-2 last:mb-0" {...props} />,
                                                      code: ({...props}) => <code className="bg-[#1a1a1a] px-1 rounded text-[#0088ff] font-mono" {...props} />,
                                                      strong: ({...props}) => <strong className="text-white font-bold" {...props} />
                                                    }}
                                                  >
                                                    {editedActionData?.[key] || displayValue}
                                                  </ReactMarkdown>
                                                </div>
                                              ) : (
                                                <textarea 
                                                  value={editedActionData?.[key] || displayValue}
                                                  onChange={(e) => setEditedActionData({ ...(editedActionData || {}), [key]: e.target.value })}
                                                  className="bg-transparent text-white text-[11px] font-sans font-medium text-right outline-none focus:text-[#0088ff] w-full min-h-[250px] resize-none py-1 scrollbar-none"
                                                  placeholder="Editar contenido..."
                                                />
                                              )}
                                            </div>
                                          ) : (
                                            <input 
                                              type="text"
                                              value={editedActionData?.[key] || displayValue}
                                              onChange={(e) => setEditedActionData({ ...(editedActionData || {}), [key]: e.target.value })}
                                              className="bg-transparent text-white text-[11px] font-sans font-medium text-right outline-none focus:text-[#0088ff] w-full"
                                              placeholder="Editar..."
                                            />
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            {/* VISTA PREVIA DE ENCUESTA */}
                            {pendingAction?.path === '/surveys/propose' && (
                              <div className="mb-6 animate-in slide-in-from-bottom-2 duration-700">
                                 <div className="text-[#0088ff] text-[9px] font-bold tracking-[0.3em] uppercase mb-3 flex items-center gap-2">
                                   <span className="w-2 h-2 bg-[#0088ff] animate-pulse"></span>
                                   VISTA_PREVIA_ENCUESTA_PROYECTADA
                                 </div>
                                 <div className="bg-[#111] border border-[#222] p-6 max-h-[350px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#333]">
                                  <div className="text-white font-black text-xl mb-2 text-center">
                                    {pendingAction?.state?.title || 'NUEVA ENCUESTA ESTRATÉGICA'}
                                  </div>
                                  <div className="text-gray-400 text-xs text-center mb-6">
                                    {pendingAction?.state?.description || 'Sin descripción.'}
                                  </div>
                                  
                                  <div className="space-y-6">
                                    {(pendingAction?.state?.questions || []).map((q: any, i: number) => (
                                      <div key={i} className="bg-[#1a1a1a] p-4 border-l-2 border-[#0088ff]">
                                        <div className="text-[#00ff88] text-[10px] font-mono mb-1">PREGUNTA {i + 1} | {q.type?.toUpperCase()}</div>
                                        <div className="text-white text-sm font-medium mb-3">{q.question}</div>
                                        
                                        {q.type === 'options' || q.type === 'multiple' ? (
                                          <div className="flex flex-col gap-2 pl-4">
                                            {(q.options || []).map((opt: string, optIdx: number) => (
                                              <div key={optIdx} className="flex items-center gap-2">
                                                <div className={`w-3 h-3 ${q.type === 'options' ? 'rounded-full' : 'rounded-sm'} border border-gray-600 flex-shrink-0`}></div>
                                                <span className="text-gray-400 text-xs">{opt}</span>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="border-b border-gray-700 pb-1 mt-2">
                                            <span className="text-gray-600 text-xs italic">Espacio para respuesta de texto...</span>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                   <div className="text-center text-gray-700 text-[8px] uppercase mt-10 tracking-[0.5em]">
                                     TOTAL: {(pendingAction?.state?.questions || []).length} PREGUNTAS
                                   </div>
                                 </div>
                              </div>
                            )}

                            {/* VISTA PREVIA ESPECÍFICA PARA DOCUMENTOS WORD */}
                            {(pendingAction?.type === 'GENERATE_DOCX' || pendingAction?.path === '/docs/word') && (
                              <div className="mb-6 animate-in slide-in-from-bottom-2 duration-700">
                                 <div className="text-[#00ff88] text-[9px] font-bold tracking-[0.3em] uppercase mb-3 flex items-center gap-2">
                                   <span className="w-2 h-2 bg-[#00ff88] animate-pulse"></span>
                                   VISTA_PREVIA_DOCUMENTO_PROYECTADA
                                 </div>
                                 <div className="bg-[#111] border border-[#222] p-6 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#333]">
                                  <div className="text-white font-serif text-lg border-b border-[#333] pb-4 mb-6 text-center">
                                    {pendingAction?.state?.title || pendingAction?.state?.data?.title || 'DOCUMENTO_ACS'}
                                  </div>
                                  {(pendingAction?.state?.sections || pendingAction?.state?.data?.sections || []).map((section: any, sIdx: number) => (
                                    <div key={sIdx} className="mb-6">
                                      {section?.heading && (
                                        <h3 className="text-[#0088ff] text-xs font-bold uppercase tracking-wider mb-2">{section.heading}</h3>
                                      )}
                                      {section?.text && (
                                        <p className="text-gray-300 text-[11px] leading-relaxed mb-3 whitespace-pre-wrap">{section.text}</p>
                                      )}
                                      {section?.type === 'table' && section?.rows && (
                                        <div className="overflow-x-auto my-4 border border-[#333]">
                                          <table className="w-full border-collapse text-[9px]">
                                            <tbody>
                                              {(section.rows || []).map((row: any[], rIdx: number) => (
                                                <tr key={rIdx} className={rIdx === 0 ? 'bg-[#1a1a1a]' : ''}>
                                                  {(row || []).map((cell: any, cIdx: number) => {
                                                    const cellText = typeof cell === 'object' ? cell?.text : cell;
                                                    const cellStyles = typeof cell === 'object' ? cell?.styles : {};
                                                    return (
                                                      <td 
                                                        key={cIdx} 
                                                        className="border border-[#333] p-2 text-gray-400"
                                                        style={{
                                                          backgroundColor: cellStyles?.fill ? `#${cellStyles.fill}` : undefined,
                                                          color: cellStyles?.color ? `#${cellStyles.color}` : (rIdx === 0 ? '#fff' : undefined),
                                                          fontWeight: cellStyles?.bold ? 'bold' : undefined
                                                        }}
                                                      >
                                                        {rIdx === 0 ? <strong className="uppercase">{cellText}</strong> : cellText}
                                                      </td>
                                                    );
                                                  })}
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                   <div className="text-center text-gray-700 text-[8px] uppercase mt-10 tracking-[0.5em]">
                                     FIN_DEL_REGISTRO_PREVIO
                                   </div>
                                 </div>
                              </div>
                            )}

                            <div className="flex gap-3">
                              <button 
                                onClick={() => executeAgenticAction(pendingAction)}
                                disabled={isExecuting}
                                className="flex-1 bg-[#0088ff] text-black font-black py-3 text-[10px] tracking-[0.2em] uppercase hover:bg-white transition-all disabled:opacity-50"
                              >
                                {isExecuting ? 'EJECUTANDO ACCIÓN...' : '>> CONFIRMAR Y EJECUTAR'}
                              </button>
                              <button 
                                onClick={() => setPendingAction(null)}
                                disabled={isExecuting}
                                className="px-6 border border-[#1a1a1a] text-gray-500 font-bold py-3 text-[10px] tracking-[0.2em] uppercase hover:text-white hover:border-white transition-all"
                              >
                                CANCELAR
                              </button>
                            </div>
                          </div>
                        )}
                    </div>
              ))}
              <div ref={messagesEndRef} className="h-4" />
            </div>
          )}
        </main>

        {messages.length > 0 && (
          <footer className={`fixed bottom-0 right-0 z-40 px-6 pb-8 pt-4 md:px-8 lg:px-24 xl:px-48 pointer-events-none transition-all duration-300 ${isSidebarOpen ? 'left-[280px]' : 'left-0'}`}>
            <div className="max-w-4xl mx-auto w-full pointer-events-auto">
              
              {/* Motor IA Flotante */}
              <div className="flex flex-wrap justify-end items-center mb-4 gap-4 animate-in slide-in-from-bottom-2 duration-500">
                <div className="flex items-center gap-3 relative">
                  <button
                    onClick={() => setShowModelDropdown(d => !d)}
                    className="chat-model-selector-btn border px-4 py-1.5 rounded-full backdrop-blur-md font-mono text-[9px] font-black tracking-widest transition-all cursor-pointer flex items-center gap-2 min-w-[160px] justify-between shadow-2xl bg-[#050505cc]"
                    style={{ 
                      borderColor: '#0088ff44',
                      color: '#0088ff'
                    }}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      {/* Logo dinámico del modelo activo */}
                      <div className="w-4 h-4 flex items-center justify-center shrink-0">
                        {(() => {
                          const allModels = [...GEMINI_MODELS, ...MERCURY_MODELS, ...GROQ_MODELS, ...DEEPSEEK_MODELS];
                          const m = allModels.find(mod => mod.id === selectedModel);
                          if (!m) return null;
                          return m.logo ? (
                            <img src={m.logo} alt="" className="chat-model-logo max-w-full max-h-full object-contain" />
                          ) : <span className="text-[12px]">{m.emoji}</span>;
                        })()}
                      </div>
                      <span className="mt-0.5 truncate uppercase">
                        {selectedModel.split('/').pop()?.replace(/-/g, '_') || 'MOTOR_IA'}
                      </span>
                    </div>
                    <span className="opacity-50 shrink-0">{showModelDropdown ? '▲' : '▼'}</span>
                  </button>

                  {showModelDropdown && (
                    <div className="absolute bottom-full mb-4 right-0 w-80 bg-[#0a0a0a] border border-[#1a1a1a] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden flex flex-col max-h-[50vh] rounded-2xl">
                      <div className="px-4 py-3 border-b border-[#1a1a1a] text-[9px] font-black tracking-widest text-gray-500 uppercase shrink-0 bg-[#050505]">Seleccionar Motor IA</div>
                      <div className="overflow-y-auto flex-1 custom-scrollbar pb-2 bg-[#0a0a0a]">
                        
                        {/* Motores AI Loop */}
                        {[...GEMINI_MODELS, ...MERCURY_MODELS, ...GROQ_MODELS, ...DEEPSEEK_MODELS].map((m: any) => (
                          <button key={m.id} onClick={() => { setSelectedModel(m.id); setShowModelDropdown(false); }}
                            className={`w-full flex items-start gap-3 px-4 py-2.5 transition-colors text-left hover:bg-[#111] ${selectedModel === m.id ? 'bg-[#111] border-l-2 border-[#0088ff]' : 'border-l-2 border-transparent'}`}>
                            <div className="w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                               {m.logo ? (
                                   <img src={m.logo} alt="" className="max-w-full max-h-full object-contain" />
                               ) : <span className="text-[14px]">{m.emoji}</span>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] font-bold text-white leading-none mb-1">
                                {m.name} 
                                <span className="text-[8px] bg-[#0088ff]/10 text-[#0088ff]/70 px-1 rounded uppercase ml-1">{m.badge}</span>
                              </div>
                              <div className="text-[9px] text-gray-500 font-mono truncate">{m.description}</div>
                            </div>
                            {selectedModel === m.id && <span className="text-[#0088ff] text-[10px]">✓</span>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Previsualización de adjuntos */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 px-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {attachments.map((file, idx) => (
                    <div key={idx} className="group flex items-center gap-2 bg-[#0088ff]/10 border border-[#0088ff]/30 px-3 py-1.5 rounded-full text-[9px] font-mono text-[#0088ff]">
                      <FileText size={12} />
                      <span className="max-w-[100px] truncate">{file.name}</span>
                      <button onClick={() => removeAttachment(idx)} className="hover:text-white transition-colors p-0.5">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Caja de Input Premium Estilo REXIS (Chat Activo) */}
              <div className="chat-input-container relative border border-[#1a1a1a] bg-[#0a0a0a]/90 backdrop-blur-xl rounded-2xl flex flex-col p-2 transition-all duration-300 focus-within:border-[#0088ff]/50 focus-within:shadow-[0_0_40px_rgba(0,136,255,0.1)] hover:border-[#222]">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={handleInputResize}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ingresar comando o consulta neuralSGR..."
                  className="chat-textarea w-full bg-transparent border-none outline-none text-white px-4 py-3 font-sans text-sm placeholder-gray-800 resize-none max-h-32 min-h-[1.5rem] leading-relaxed"
                  rows={1}
                />
                
                <div className="flex items-center justify-between px-4 pb-1 pt-1 border-t border-[#111]/50 mt-1">
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-1.5 text-gray-600 hover:text-white transition-colors rounded-lg hover:bg-[#1a1a1a]"
                    >
                      <Paperclip size={18} className="-rotate-45" />
                    </button>
                    <div className="h-3 w-[1px] bg-[#1a1a1a]"></div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_5px_#00ff00] animate-pulse"></div>
                      <span className="text-[8px] font-black text-gray-700 uppercase tracking-widest">NÚCLEO_EN_LÍNEA [ACTIVO]</span>
                    </div>
                  </div>

                  <button 
                    onClick={handleSend}
                    disabled={loading || (!input.trim() && attachments.length === 0)}
                    className={`chat-send-btn flex items-center justify-center w-8 h-8 rounded-full transition-all ${
                      loading || (!input.trim() && attachments.length === 0)
                        ? 'bg-gray-900 text-gray-700' 
                        : 'bg-[#0088ff] text-black shadow-[0_0_15px_rgba(0,136,255,0.4)] hover:scale-110 active:scale-95'
                    }`}
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <CornerDownRight size={16} />}
                  </button>
                </div>
              </div>

              {/* Footer de Estado Minimalista */}
              <div className="flex justify-between items-center mt-4 px-2 text-[8px] font-black tracking-[0.4em] text-gray-800 uppercase">
                <span>Sistema_Núcleo_HOYR // SGR-ACS v2.5 // NEURAL_LINK_ESTABLISHED</span>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#0088ff] rounded-full animate-pulse shadow-[0_0_8px_#0088ff]"></div>
                  <span className="text-[#0088ff]/60">SGR_OPERATIONAL_READY</span>
                </div>
              </div>
            </div>
          </footer>
        )}
      </div>

      {zoomImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="absolute top-4 right-4 flex gap-4">
            <a href={zoomImage} download={`Generado_HOYR_${Date.now()}.jpg`} className="p-3 bg-[#0088ff] text-black hover:bg-white transition-colors flex items-center gap-2" title="Descargar Imagen">
              <Download size={20} />
              <span className="text-xs font-bold uppercase tracking-wider hidden md:block">Descargar</span>
            </a>
            <button onClick={() => setZoomImage(null)} className="p-3 bg-[#1a1a1a] border border-[#333] text-white hover:border-red-500 hover:text-red-500 transition-colors">
              <X size={20} />
            </button>
          </div>
          <img src={zoomImage} className="max-w-[90vw] max-h-[90vh] object-contain shadow-[0_0_50px_rgba(0,136,255,0.2)] border border-[#333] animate-in zoom-in-95 duration-300" />
        </div>
      )}

      {/* Input de archivos oculto - acepta imágenes, PDFs y documentos */}
      <input
        type="file"
        multiple
        ref={fileInputRef}
        className="hidden"
        accept="image/*,application/pdf,text/plain,.docx,.xlsx,.csv"
        onChange={handleFileSelect}
      />

      {/* Modal de Carga de Recursos */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={() => setShowUploadModal(false)}>
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl rounded-none" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-[#1a1a1a] flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <div className="w-2 h-6 bg-[#0088ff]"></div>
                 <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Depósito_Recursos_Órbit_IA</h3>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="text-gray-500 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 scrollbar-thin scrollbar-thumb-[#1a1a1a]">
              <UploadResourcesForAI />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
