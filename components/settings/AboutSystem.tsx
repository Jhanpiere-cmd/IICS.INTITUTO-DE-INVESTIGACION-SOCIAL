import React, { useState, useEffect } from 'react';
import { Logo } from '../common/Logo';
import {
  Book, Users, Target, Shield, Lightbulb, ChevronRight,
  FileText, Edit2, Save, X, Info, Layout, Cpu
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Markdown from 'react-markdown';

interface DocSection {
  id: string;
  section_id: string;
  title: string;
  content: string;
}

export const AboutSystem: React.FC = () => {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<string>('intro');
  const [docs, setDocs] = useState<Record<string, DocSection>>({});
  const [loading, setLoading] = useState(true);
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  const sections = [
    { id: 'intro', label: 'Introducción', icon: Book },
    { id: 'team', label: 'Equipo IICS', icon: Users },
    { id: 'objectives', label: 'Objetivos', icon: Target },
    { id: 'functions', label: 'Funciones', icon: Lightbulb },
    { id: 'legal', label: 'Base Legal', icon: Shield },
    { id: 'lineamientos', label: 'Lineamientos', icon: FileText },
  ];

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    try {
      const { data, error } = await supabase
        .from('system_documentation')
        .select('*');

      if (error) throw error;

      const docsMap: Record<string, DocSection> = {};
      data?.forEach((doc) => {
        docsMap[doc.section_id] = doc;
      });
      setDocs(docsMap);
    } catch (error) {
      console.error('Error fetching docs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (sectionId: string) => {
    setEditingSection(sectionId);
    setEditContent(docs[sectionId]?.content || '');
  };

  const handleSave = async () => {
    if (!editingSection) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('system_documentation')
        .update({ content: editContent, updated_at: new Date().toISOString() })
        .eq('section_id', editingSection);

      if (error) throw error;

      setDocs(prev => ({
        ...prev,
        [editingSection]: { ...prev[editingSection], content: editContent }
      }));
      setEditingSection(null);
    } catch (error) {
      console.error('Error saving doc:', error);
      alert('Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const renderContent = () => {
    if (loading) return (
      <div className="p-20 text-center space-y-4">
        <div className="w-10 h-10 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Sincronizando Archivo Maestro...</p>
      </div>
    );

    const currentDoc = docs[activeSection];
    const isEditing = editingSection === activeSection;

    return (
      <div className="bg-[#0D0D0D] border border-[#262626] rounded-sm p-10 relative shadow-2xl overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 blur-[50px] -z-10 group-hover:bg-blue-600/10 transition-all"></div>

        {/* Edit Button */}
        {(user?.role === 'Director' || user?.role === 'Asesor') && !isEditing && (
          <button
            onClick={() => handleEdit(activeSection)}
            className="absolute top-8 right-8 p-3 text-gray-600 hover:text-blue-500 hover:bg-blue-500/10 border border-transparent hover:border-blue-500/20 rounded-sm transition-all shadow-xl"
            title="Editar sección"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}

        {isEditing ? (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em]">Modo Edición: <span className="text-blue-500">{currentDoc?.title}</span></h3>
              <div className="flex gap-4">
                <button
                  onClick={() => setEditingSection(null)}
                  className="px-6 py-2 bg-[#151515] border border-[#262626] text-[10px] font-bold text-gray-400 hover:text-white rounded-sm transition-all uppercase tracking-widest flex items-center gap-2"
                >
                  <X className="w-3 h-3" /> Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-[10px] font-bold text-white hover:bg-blue-500 rounded-sm transition-all uppercase tracking-widest flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-3 h-3" /> {saving ? 'Sincronizando...' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full h-[500px] p-8 bg-[#151515] border border-[#262626] rounded-sm focus:border-blue-500/50 outline-none text-gray-300 font-mono text-sm leading-relaxed resize-none scrollbar-thin scrollbar-thumb-[#262626] scrollbar-track-transparent"
              placeholder="Escribe en formato Markdown..."
            />
            <div className="flex items-center gap-2 text-[9px] font-bold text-gray-600 uppercase tracking-widest">
              <Info className="w-3 h-3 text-blue-500" /> Motor de renderizado Markdown activo
            </div>
          </div>
        ) : (
          <div className="prose prose-invert max-w-none prose-blue">
            <div className="mb-10 border-b border-[#262626] pb-6">
              <h4 className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.4em] mb-2">Sección Activa</h4>
              <h2 className="text-3xl font-black text-white uppercase tracking-tighter">
                {currentDoc?.title || sections.find(s => s.id === activeSection)?.label}
              </h2>
            </div>

            <div className="text-gray-400 text-sm leading-[1.8] font-medium tracking-wide">
              {currentDoc ? (
                <Markdown>{currentDoc.content}</Markdown>
              ) : (
                <p className="italic text-gray-600 py-10 text-center border border-dashed border-[#262626] rounded-sm">
                  Esta dimensión de datos aún no ha sido poblada.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12">
      {/* Header Ejecutivo */}
      <div className="bg-[#0D0D0D] border border-[#262626] p-10 md:p-16 rounded-sm relative overflow-hidden group shadow-2xl">
        <div className="absolute top-0 left-0 w-64 h-64 bg-blue-600/5 blur-[100px] -z-10 group-hover:bg-blue-600/10 transition-all duration-1000"></div>
        <div className="flex flex-col lg:flex-row items-center gap-12">
          <div className="p-8 bg-white/5 border border-white/10 rounded-sm shadow-inner group-hover:border-blue-500/30 transition-all duration-500">
            <Logo useImage={true} size={120} />
          </div>
          <div className="text-center lg:text-left flex-1 space-y-6">
            <div>
              <h4 className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.6em] mb-3">Dimensión Operativa</h4>
              <h1 className="text-5xl md:text-6xl font-black text-white uppercase tracking-tighter leading-none">
                SDI <span className="text-blue-600">IICS</span>
              </h1>
            </div>
            <div className="max-w-2xl space-y-4">
              <p className="text-sm font-bold text-gray-300 uppercase tracking-widest border-l-2 border-blue-600 pl-4">
                Sistema de Desarrollo e Investigación
              </p>
              <p className="text-[10px] font-medium text-gray-500 uppercase tracking-[0.2em] leading-relaxed">
                Instituto de Investigación Científica Social / IICS Independiente <br />
                Protocolo de Comunicación y Desarrollo Científico
              </p>
            </div>
            <div className="flex flex-wrap justify-center lg:justify-start gap-4">
              <div className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 text-[9px] font-black text-blue-400 uppercase tracking-widest rounded-sm">
                Versión Enterprise
              </div>
              <div className="px-3 py-1.5 bg-green-500/10 border border-green-500/20 text-[9px] font-black text-green-400 uppercase tracking-widest rounded-sm flex items-center gap-2">
                <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div>
                Sincronizado
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
        {/* Navigation Modules */}
        <div className="lg:col-span-1 space-y-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-1.5 h-6 bg-blue-600"></div>
            <h3 className="text-xs font-bold text-white uppercase tracking-[0.3em]">Archivo Maestro</h3>
          </div>
          <nav className="space-y-3">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => {
                    setActiveSection(section.id);
                    setEditingSection(null);
                  }}
                  className={`w-full flex items-center gap-4 px-6 py-5 rounded-sm transition-all border ${isActive
                      ? 'bg-[#151515] border-blue-500/50 text-white shadow-[0_0_20px_rgba(59,130,246,0.1)]'
                      : 'bg-[#0D0D0D] border-[#262626] text-gray-500 hover:border-blue-500/30 hover:text-gray-300'
                    }`}
                >
                  <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-blue-500' : 'text-gray-700'}`} />
                  <span className={`flex-1 text-left text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${isActive ? 'translate-x-1' : ''}`}>
                    {section.label}
                  </span>
                  {isActive && <ChevronRight className="w-3 h-3 text-blue-500 animate-pulse" />}
                </button>
              );
            })}
          </nav>

          <div className="p-8 bg-[#0D0D0D] border border-[#262626] rounded-sm space-y-4">
            <div className="flex items-center gap-3">
              <Cpu className="w-4 h-4 text-blue-500/50" />
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Estado del Núcleo</span>
            </div>
            <div className="h-1 bg-[#151515] rounded-full overflow-hidden">
              <div className="w-full h-full bg-blue-600/50 animate-pulse transition-all duration-1000"></div>
            </div>
            <p className="text-[8px] font-medium text-gray-600 uppercase tracking-widest text-center">Datos Protegidos con SHA-256</p>
          </div>
        </div>

        {/* Informational Core */}
        <div className="lg:col-span-3">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};
