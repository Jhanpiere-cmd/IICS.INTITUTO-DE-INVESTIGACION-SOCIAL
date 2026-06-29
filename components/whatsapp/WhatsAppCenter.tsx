import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { whatsappService } from '../../lib/whatsapp';
import { 
  Send, 
  User, 
  MessageSquare, 
  Phone, 
  Search, 
  MoreVertical, 
  CheckCircle2, 
  Clock, 
  X, 
  AlertCircle,
  Plus,
  History,
  Users,
  Settings,
  ShieldCheck,
  Save,
  Tag,
  MessageCircle,
  ChevronRight,
  Filter,
  Trash2
} from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  phone: string;
  category?: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
  is_system?: boolean;
}

interface Message {
  id: string;
  to_phone: string;
  content: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  direction: 'outbound' | 'inbound';
  created_at: string;
}

interface Template {
  id: string;
  name: string;
  content: string;
  category: string;
}

export const WhatsAppCenter: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'contacts' | 'history' | 'templates'>('contacts');
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [manualNumber, setManualNumber] = useState('');
  const [manualName, setManualName] = useState('');
  const [showAddManual, setShowAddManual] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [history, setHistory] = useState<Message[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadContacts(),
      loadHistory(),
      loadTemplates()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    setFilteredContacts(
      contacts.filter(c => 
        c.name.toLowerCase().includes(term) || 
        (c.email?.toLowerCase().includes(term)) ||
        (c.category?.toLowerCase().includes(term)) ||
        c.phone.includes(term)
      )
    );
  }, [searchTerm, contacts]);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error && data) setHistory(data);
    } catch (e) {
      console.log('History table not ready yet');
    }
  };

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*');
      
      if (!error && data) setTemplates(data);
    } catch (e) {
      console.log('Templates table not ready yet');
    }
  };

  const loadContacts = async () => {
    try {
      // 1. Load System Profiles
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, "fullName", email, role, "avatarUrl", phone')
        .order('"fullName"');
      
      const systemContacts: Contact[] = (profilesData || []).map(p => ({
        id: p.id,
        name: p.fullName || 'Sin nombre',
        email: p.email,
        role: p.role,
        phone: p.phone || '',
        avatarUrl: p.avatarUrl,
        is_system: true,
        category: 'Equipo'
      }));

      // 2. Load WhatsApp Contacts from new table
      let savedContacts: Contact[] = [];
      try {
        const { data: whatsappData, error: waError } = await supabase
          .from('whatsapp_contacts')
          .select('*')
          .order('name');
        
        if (!waError && whatsappData) {
          savedContacts = whatsappData.map(d => ({
            ...d,
            is_system: false
          }));
        }
      } catch (e) {
        console.log('WhatsApp Contacts table not ready yet');
      }

      const all = [...systemContacts, ...savedContacts];
      setContacts(all);
      setFilteredContacts(all);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const handleSendMessage = async () => {
    const to = selectedContact?.phone || manualNumber;
    
    if (!to) {
      setToast({ type: 'error', msg: 'Selecciona un contacto o ingresa un número' });
      return;
    }

    if (!message.trim()) {
      setToast({ type: 'error', msg: 'Escribe un mensaje' });
      return;
    }

    try {
      setLoading(true);
      const result = await whatsappService.sendTextMessage(to, message);
      
      if (result.error) throw new Error(result.error.message);

      // Save to history table
      try {
        await supabase.from('whatsapp_messages').insert({
          to_phone: to,
          content: message,
          status: 'sent',
          direction: 'outbound',
          meta_message_id: result.messages?.[0]?.id,
          created_by: user?.id,
          contact_id: !selectedContact?.is_system ? selectedContact?.id : null
        });
      } catch (e) {
        console.log('Could not persist message to DB');
      }

      setToast({ type: 'success', msg: 'Mensaje enviado' });
      loadHistory();
      setMessage('');
      if (showAddManual) {
        setShowAddManual(false);
        setManualNumber('');
        setManualName('');
      }
    } catch (error: any) {
      setToast({ type: 'error', msg: `Error: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveContact = async () => {
    if (!manualName || !manualNumber) {
      setToast({ type: 'error', msg: 'Nombre y número requeridos' });
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.from('whatsapp_contacts').insert({
        name: manualName,
        phone: manualNumber,
        category: 'Externo',
        created_by: user?.id
      }).select().single();

      if (error) throw error;

      setToast({ type: 'success', msg: 'Contacto guardado' });
      loadContacts();
      setSelectedContact({ ...data, is_system: false });
      setShowAddManual(false);
    } catch (error: any) {
      setToast({ type: 'error', msg: 'No se pudo guardar el contacto (¿Ya existe?)' });
    } finally {
      setLoading(false);
    }
  };

  const useTemplate = (content: string) => {
    setMessage(content);
    setActiveTab('contacts');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] bg-black text-white relative overflow-hidden font-sans">
      {/* Toast */}
      {toast && (
        <div className="fixed top-8 right-8 z-[150] animate-in slide-in-from-right-full duration-300">
          <div className={`px-6 py-4 rounded-sm shadow-2xl border flex items-center gap-3 bg-black ${
            toast.type === 'success' ? 'border-emerald-500/50 text-emerald-400' : 'border-red-500/50 text-red-400'
          }`}>
            <AlertCircle size={18} />
            <span className="text-[10px] font-bold uppercase tracking-widest">{toast.msg}</span>
            <button onClick={() => setToast(null)} className="ml-4 opacity-50 hover:opacity-100 text-white">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Modern Top Header / Navigation */}
      <div className="flex items-center justify-between px-6 h-16 border-b border-exec-border bg-[#050505] z-10">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-sm bg-exec-blue/10 border border-exec-blue/30 flex items-center justify-center">
              <MessageCircle size={18} className="text-exec-blue" />
            </div>
            <h1 className="text-sm font-bold tracking-[0.2em] uppercase text-white">WhatsApp <span className="text-exec-blue">Executive</span></h1>
          </div>

          <div className="h-6 w-px bg-exec-border mx-2" />

          <nav className="flex items-center gap-4">
            {[
              { id: 'contacts', icon: Users, label: 'Contactos' },
              { id: 'history', icon: History, label: 'Historial' },
              { id: 'templates', icon: Tag, label: 'Plantillas' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-sm transition-all ${
                  activeTab === tab.id 
                  ? 'bg-exec-blue/10 text-exec-blue border border-exec-blue/20' 
                  : 'text-exec-slate hover:text-white border border-transparent'
                }`}
              >
                <tab.icon size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-exec-blue/5 border border-exec-blue/20 rounded-full px-4 py-1 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-exec-blue animate-pulse" />
            <span className="text-[9px] font-bold text-exec-blue uppercase tracking-widest">v22.0 Meta Official</span>
          </div>
          <button className="p-2 text-exec-slate hover:text-white transition-colors border border-exec-border rounded-sm bg-black">
            <Settings size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden p-4 gap-4">
        
        {/* Left Sidebar - Dynamic Context */}
        <div className="w-80 flex flex-col bg-[#050505] border border-exec-border rounded-sm">
          
          {activeTab === 'contacts' && (
            <>
              <div className="p-4 border-b border-exec-border space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-[10px] font-bold uppercase tracking-widest text-exec-slate flex items-center gap-2">
                    <Filter size={14} />
                    Filtrar Agenda
                  </h2>
                  <button 
                    onClick={() => setShowAddManual(true)}
                    className="flex items-center gap-1.5 px-2 py-1 bg-exec-blue rounded-sm text-white hover:bg-blue-600 transition-all text-[9px] font-bold uppercase shadow-glow-sm"
                  >
                    <Plus size={12} />
                    Añadir
                  </button>
                </div>
                <div className="relative group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-exec-slate group-focus-within:text-exec-blue transition-colors" size={14} />
                  <input 
                    type="text"
                    placeholder="Buscar por nombre o cargo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-black border border-exec-border rounded-sm py-2 pl-9 pr-4 text-xs outline-none focus:border-exec-blue/50 transition-all font-sans"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                {filteredContacts.map(c => (
                  <div 
                    key={c.id}
                    onClick={() => { setSelectedContact(c); setShowAddManual(false); }}
                    className={`p-3 rounded-sm border transition-all cursor-pointer group flex items-center gap-3 ${
                      selectedContact?.id === c.id 
                        ? 'bg-[#111] border-exec-blue/40 shadow-glow-sm' 
                        : 'bg-transparent border-transparent hover:bg-[#0A0A0A] hover:border-exec-border'
                    }`}
                  >
                    <div className="relative">
                      <div className="w-10 h-10 rounded-sm bg-black border border-exec-border flex items-center justify-center overflow-hidden transition-all group-hover:border-exec-blue/30">
                        {c.avatarUrl ? (
                          <img src={c.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className={`w-full h-full flex items-center justify-center text-[10px] font-bold ${c.is_system ? 'text-exec-blue bg-exec-blue/5' : 'text-exec-green bg-exec-green/5'}`}>
                            {c.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      {c.phone && <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-exec-blue border-2 border-black rounded-full shadow-glow-sm" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-[11px] font-bold text-white truncate">{c.name}</h3>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded-full border ${
                           c.is_system ? 'border-exec-blue/20 text-exec-blue bg-exec-blue/5' : 'border-exec-green/20 text-exec-green bg-exec-green/5'
                        }`}>
                          {c.is_system ? 'Sistema' : 'WA'}
                        </span>
                      </div>
                      <p className="text-[9px] text-exec-slate/60 font-medium truncate mt-0.5 uppercase tracking-widest">{c.role || c.category}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {activeTab === 'history' && (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-exec-border">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-exec-slate">Recientes</h2>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                {history.length === 0 ? (
                  <div className="p-8 text-center opacity-30 flex flex-col items-center gap-3">
                    <History size={32} />
                    <span className="text-[10px] font-bold uppercase">Sin historial</span>
                  </div>
                ) : history.map(h => (
                  <div 
                    key={h.id}
                    className="p-3 bg-black border border-exec-border rounded-sm hover:border-exec-blue/30 transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[9px] font-bold text-exec-blue">{h.to_phone}</span>
                      <span className="text-[8px] text-exec-slate">{new Date(h.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 line-clamp-2 italic">"{h.content}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-exec-border">
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-exec-slate">Plantillas de Respuesta</h2>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                {templates.map(t => (
                  <div 
                    key={t.id}
                    onClick={() => useTemplate(t.content)}
                    className="p-3 bg-black border border-exec-border rounded-sm hover:bg-exec-blue/5 hover:border-exec-blue/40 cursor-pointer group transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-bold text-white uppercase tracking-widest">{t.name}</span>
                      <ChevronRight size={12} className="text-exec-blue opacity-0 group-hover:opacity-100 transition-all" />
                    </div>
                    <p className="text-[10px] text-exec-slate/80 leading-relaxed truncate">{t.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Main Workspace */}
        <div className="flex-1 flex flex-col bg-black border border-exec-border rounded-sm relative overflow-hidden group">
          
          {/* Header */}
          <div className="h-16 border-b border-exec-border bg-[#050505] px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {showAddManual ? (
                <>
                  <div className="w-10 h-10 rounded-sm bg-exec-blue flex items-center justify-center">
                    <Plus size={20} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-white uppercase tracking-widest">Nuevo Contacto WhatsApp</h2>
                    <p className="text-[10px] text-exec-blue font-bold tracking-tight">Registro Manual</p>
                  </div>
                </>
              ) : selectedContact ? (
                <>
                  <div className="w-10 h-10 rounded-sm bg-black border border-exec-border flex items-center justify-center overflow-hidden">
                    {selectedContact.avatarUrl ? (
                      <img src={selectedContact.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center text-xs font-bold ${selectedContact.is_system ? 'text-exec-blue bg-exec-blue/5' : 'text-emerald-400 bg-emerald-400/5'}`}>
                        {selectedContact.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-white uppercase tracking-widest">{selectedContact.name}</h2>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-exec-blue font-bold tracking-widest">+{selectedContact.phone}</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-exec-green animate-pulse" />
                        <span className="text-[8px] text-exec-slate font-bold uppercase">Online para Business API</span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3 opacity-30">
                  <ShieldCheck size={20} className="text-exec-slate" />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-exec-slate">Seguridad Cifrada v22.0</span>
                </div>
              )}
            </div>

            {selectedContact && (
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-2 px-3 py-1.5 border border-exec-border rounded-sm text-exec-slate hover:text-white transition-all">
                  <User size={14} />
                  <span className="text-[9px] font-bold uppercase">Ver Perfil</span>
                </button>
                <button className="p-2 text-exec-slate hover:text-red-500 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Messages / View Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] bg-fixed">
            <div className="h-full flex flex-col">
              
              {!selectedContact && !showAddManual ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-6">
                  <div className="w-24 h-24 rounded-sm bg-[#050505] border border-exec-border flex items-center justify-center relative shadow-2xl">
                    <div className="absolute inset-0 bg-exec-blue/5 animate-pulse" />
                    <MessageSquare size={48} className="text-exec-blue/40" />
                  </div>
                  <div className="space-y-2 max-w-sm">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white">Canal Business Oficial</h3>
                    <p className="text-[10px] text-exec-slate leading-relaxed font-sans">
                      Selecciona un autor de la agenda o miembros del equipo para iniciar gestiones vía WhatsApp API v22.0.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 w-full max-w-md mt-8">
                    <div className="p-4 border border-exec-border bg-[#050505] rounded-sm text-center space-y-2">
                       <ShieldCheck size={20} className="text-exec-blue mx-auto" />
                       <span className="block text-[9px] font-bold uppercase tracking-widest text-white">Seguridad</span>
                       <p className="text-[8px] text-exec-slate">Cifrado de extremo a extremo.</p>
                    </div>
                    <div className="p-4 border border-exec-border bg-[#050505] rounded-sm text-center space-y-2">
                       <Clock size={20} className="text-exec-blue mx-auto" />
                       <span className="block text-[9px] font-bold uppercase tracking-widest text-white">API Cloud</span>
                       <p className="text-[8px] text-exec-slate">Respuesta garantizada 24h.</p>
                    </div>
                  </div>
                </div>
              ) : showAddManual ? (
                <div className="flex-1 flex items-center justify-center p-12">
                   <div className="w-full max-w-md bg-[#050505] border border-exec-border p-8 rounded-sm space-y-8 animate-in fade-in zoom-in-95 duration-500">
                      <div className="space-y-2">
                        <h3 className="text-sm font-bold text-white uppercase tracking-[0.1em]">Configuración de Registro</h3>
                        <p className="text-[10px] text-exec-slate">Este número se guardará en tu agenda ejecutiva para uso futuro.</p>
                      </div>

                      <div className="space-y-6">
                        <div className="space-y-2">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-exec-blue flex items-center gap-2">
                            <User size={12} />
                            Nombre del Contacto
                          </label>
                          <input 
                            type="text"
                            placeholder="Ej: Steven (Editor Jefe)"
                            value={manualName}
                            onChange={(e) => setManualName(e.target.value)}
                            className="w-full bg-black border border-exec-border rounded-sm p-4 text-xs font-sans focus:border-exec-blue outline-none transition-all"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[9px] font-bold uppercase tracking-widest text-exec-blue flex items-center gap-2">
                            <Phone size={12} />
                            Número Móvil
                          </label>
                          <input 
                            type="text"
                            placeholder="Ej: 51987654321"
                            value={manualNumber}
                            onChange={(e) => setManualNumber(e.target.value)}
                            className="w-full bg-black border border-exec-border rounded-sm p-4 text-xs font-sans focus:border-exec-blue outline-none transition-all placeholder:text-gray-900"
                          />
                        </div>

                        <div className="pt-4 flex gap-3">
                          <button 
                            onClick={handleSaveContact}
                            disabled={loading}
                            className="flex-1 bg-exec-blue hover:bg-blue-600 text-white py-3 rounded-sm text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-glow"
                          >
                            <Save size={14} />
                            Guardar y Charlar
                          </button>
                          <button 
                            onClick={() => setShowAddManual(false)}
                            className="px-6 border border-exec-border hover:bg-white/5 rounded-sm text-[10px] font-bold uppercase tracking-widest"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                   </div>
                </div>
              ) : (
                <div className="p-8 flex-1 flex flex-col">
                  {/* Chat Bubbles */}
                  <div className="flex-1 space-y-6">
                    {history
                      .filter(h => h.to_phone === selectedContact?.phone)
                      .map(msg => (
                        <div key={msg.id} className="flex flex-col items-end">
                          <div className="max-w-[70%] bg-[#080808] border border-exec-blue/10 p-4 rounded-sm shadow-glow-sm">
                            <p className="text-xs text-white/90 leading-relaxed font-sans">{msg.content}</p>
                            <div className="flex items-center justify-end gap-2 mt-4 opacity-50">
                              <span className="text-[8px] font-bold text-exec-slate">{new Date(msg.created_at).toLocaleTimeString()}</span>
                              <CheckCircle2 size={10} className="text-exec-blue" />
                            </div>
                          </div>
                        </div>
                      ))
                    }
                    
                    <div className="flex justify-center">
                       <div className="bg-exec-blue/5 border border-exec-blue/10 px-8 py-2 rounded-full flex items-center gap-3">
                          <ShieldCheck size={14} className="text-exec-blue" />
                          <span className="text-[9px] font-bold text-exec-blue uppercase tracking-widest italic">Sesión Segura Activada</span>
                       </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Area / Input */}
          {(selectedContact || showAddManual) && (
            <div className="p-6 border-t border-exec-border bg-[#050505] z-10 transition-all">
              <div className="max-w-4xl mx-auto space-y-4">
                <div className="relative group">
                  <textarea 
                    placeholder={showAddManual ? "Guarda el contacto arriba para mensajear..." : "Redactar comunicación..."}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={showAddManual}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="w-full bg-black border border-exec-border rounded-sm p-4 pr-16 text-xs font-sans min-h-[100px] focus:border-exec-blue focus:shadow-glow-sm outline-none transition-all resize-none placeholder:text-gray-800 disabled:opacity-20"
                  />
                  <div className="absolute right-3 bottom-3 flex items-center gap-2">
                    <button 
                      onClick={handleSendMessage}
                      disabled={loading || showAddManual || !message.trim()}
                      className="p-3 bg-exec-blue hover:bg-blue-600 text-white rounded-sm transition-all disabled:opacity-20 shadow-glow"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Send size={18} />
                      )}
                    </button>
                  </div>
                </div>

                {!showAddManual && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 opacity-40">
                      <div className="flex items-center gap-2">
                        <Tag size={12} />
                        <span className="text-[8px] font-bold uppercase tracking-widest">Atajos: Alt+T (Templates)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MessageSquare size={12} />
                        <span className="text-[8px] font-bold uppercase tracking-widest">Enter para enviar</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full border border-white/5">
                      <div className="w-1.5 h-1.5 rounded-full bg-exec-green animate-pulse" />
                      <span className="text-[9px] font-bold text-exec-slate uppercase tracking-widest">Sincronización Cloud OK</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Decorative Overlays */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-exec-blue/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-exec-blue/5 blur-[100px] rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />
    </div>
  );
};
