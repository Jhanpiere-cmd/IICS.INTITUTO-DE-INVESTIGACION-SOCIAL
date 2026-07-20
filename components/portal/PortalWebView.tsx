import React, { useEffect, useMemo, useState } from 'react';
import { Globe2, Image as ImageIcon, Loader2, Save, Upload, Eye, Newspaper, CalendarDays, Users, MonitorCog } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../ui/ToastContext';
import {
  DEFAULT_ABOUT_MEMBERS,
  DEFAULT_LANDING_ABOUT,
  DEFAULT_LANDING_HERO,
  HERO_ACTION_LABELS,
  LandingAboutContent,
  LandingAboutMember,
  HeroButtonAction,
  LandingHeroContent,
  normalizeAboutContent,
  normalizeHeroContent,
} from '../../lib/siteContent';

const actionOptions = Object.entries(HERO_ACTION_LABELS) as Array<[HeroButtonAction, string]>;

const inputClass =
  'w-full bg-black border border-exec-border px-3 py-2.5 text-xs text-white outline-none focus:border-exec-blue transition-all rounded-none';
const labelClass = 'text-[9px] font-black text-gray-500 uppercase tracking-[0.22em]';

export const PortalWebView: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [hero, setHero] = useState<LandingHeroContent>(DEFAULT_LANDING_HERO);
  const [about, setAbout] = useState<LandingAboutContent>(DEFAULT_LANDING_ABOUT);
  const [loading, setLoading] = useState(true);
  const [loadingAbout, setLoadingAbout] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingAbout, setSavingAbout] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingMemberId, setUploadingMemberId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'hero' | 'nosotros' | 'eventos' | 'noticias'>('hero');

  useEffect(() => {
    loadHero();
    loadAbout();
  }, []);

  const loadHero = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('site_landing_hero')
        .select('*')
        .eq('id', 'main')
        .maybeSingle();

      if (error) throw error;
      setHero(normalizeHeroContent(data as Partial<LandingHeroContent> | null));
    } catch (error: any) {
      console.error('Error loading landing hero:', error);
      showToast({
        type: 'warning',
        title: 'MIGRACION PENDIENTE',
        message: 'No se pudo cargar la tabla site_landing_hero. La landing seguira usando su contenido por defecto.',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateHero = <K extends keyof LandingHeroContent>(key: K, value: LandingHeroContent[K]) => {
    setHero((prev) => ({ ...prev, [key]: value }));
  };

  const loadAbout = async () => {
    setLoadingAbout(true);
    try {
      const { data, error } = await supabase
        .from('site_about_content')
        .select('*')
        .eq('id', 'main')
        .maybeSingle();

      if (error) throw error;
      setAbout(normalizeAboutContent(data as Partial<LandingAboutContent> | null));
    } catch (error: any) {
      console.error('Error loading about content:', error);
      showToast({
        type: 'warning',
        title: 'MIGRACION PENDIENTE',
        message: 'No se pudo cargar site_about_content. La landing usara el contenido por defecto.',
      });
    } finally {
      setLoadingAbout(false);
    }
  };

  const updateAbout = <K extends keyof LandingAboutContent>(key: K, value: LandingAboutContent[K]) => {
    setAbout((prev) => ({ ...prev, [key]: value }));
  };

  const updateMember = <K extends keyof LandingAboutMember>(id: string, key: K, value: LandingAboutMember[K]) => {
    setAbout((prev) => ({
      ...prev,
      team_members: prev.team_members.map((member) => member.id === id ? { ...member, [key]: value } : member),
    }));
  };

  const addMember = () => {
    const id = `miembro-${Date.now()}`;
    setAbout((prev) => ({
      ...prev,
      team_members: [
        ...prev.team_members,
        {
          ...DEFAULT_ABOUT_MEMBERS[0],
          id,
          name: 'Nuevo integrante',
          role: 'Cargo institucional',
          category: 'promotor',
          avatar: '/logo-iics-siglas.png',
          desc: 'Describe la trayectoria, rol y aporte de este integrante al IICS.',
          tag: 'Linea de trabajo',
          highlight: 'Aporte principal',
          academicTitle: 'Rol editorial',
          focus: 'Foco de impacto del integrante.',
          is_visible: true,
        },
      ],
    }));
  };

  const removeMember = (id: string) => {
    setAbout((prev) => ({
      ...prev,
      team_members: prev.team_members.filter((member) => member.id !== id),
    }));
  };

  const saveHero = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('site_landing_hero')
        .upsert({
          id: 'main',
          ...hero,
          updated_by: user?.id || null,
        });

      if (error) throw error;
      showToast({ type: 'success', title: 'PORTAL ACTUALIZADO', message: 'El Hero principal ya esta sincronizado con la landing.' });
    } catch (error: any) {
      console.error('Error saving landing hero:', error);
      showToast({ type: 'error', title: 'ERROR AL GUARDAR', message: error.message || 'No se pudo guardar el Hero.' });
    } finally {
      setSaving(false);
    }
  };

  const saveAbout = async () => {
    setSavingAbout(true);
    try {
      const { error } = await supabase
        .from('site_about_content')
        .upsert({
          id: 'main',
          ...about,
          updated_by: user?.id || null,
        });

      if (error) throw error;
      showToast({ type: 'success', title: 'NOSOTROS ACTUALIZADO', message: 'La seccion Nosotros ya esta sincronizada con la landing.' });
    } catch (error: any) {
      console.error('Error saving about content:', error);
      showToast({ type: 'error', title: 'ERROR AL GUARDAR', message: error.message || 'No se pudo guardar Nosotros.' });
    } finally {
      setSavingAbout(false);
    }
  };

  const uploadHeroImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const filePath = `site/hero-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('resources').upload(filePath, file, {
        upsert: true,
      });

      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('resources').getPublicUrl(filePath);
      updateHero('image_url', data.publicUrl);
      updateHero('image_alt', hero.image_alt || file.name);
      showToast({ type: 'success', title: 'IMAGEN CARGADA', message: 'La imagen quedo lista para el Hero.' });
    } catch (error: any) {
      console.error('Error uploading hero image:', error);
      showToast({ type: 'error', title: 'ERROR DE CARGA', message: error.message || 'No se pudo subir la imagen.' });
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const uploadMemberImage = async (memberId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingMemberId(memberId);
    try {
      const ext = file.name.split('.').pop() || 'png';
      const filePath = `site/team-${memberId}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from('resources').upload(filePath, file, {
        upsert: true,
        contentType: file.type || undefined,
      });

      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('resources').getPublicUrl(filePath);
      updateMember(memberId, 'avatar', data.publicUrl);
      showToast({ type: 'success', title: 'FOTO CARGADA', message: 'La imagen del integrante quedo lista.' });
    } catch (error: any) {
      console.error('Error uploading member image:', error);
      showToast({ type: 'error', title: 'ERROR DE CARGA', message: error.message || 'No se pudo subir la foto.' });
    } finally {
      setUploadingMemberId(null);
      event.target.value = '';
    }
  };

  const buttonRows = useMemo(
    () => [
      ['primary_button_label', 'primary_button_action', 'Boton principal'] as const,
      ['secondary_button_label', 'secondary_button_action', 'Boton secundario'] as const,
      ['tertiary_button_label', 'tertiary_button_action', 'Boton terciario'] as const,
      ['quaternary_button_label', 'quaternary_button_action', 'Boton cuaternario'] as const,
    ],
    []
  );

  const renderTextInput = (label: string, key: keyof LandingHeroContent, placeholder?: string) => (
    <label className="space-y-1.5 block">
      <span className={labelClass}>{label}</span>
      <input
        value={String(hero[key] || '')}
        onChange={(e) => updateHero(key, e.target.value as any)}
        placeholder={placeholder}
        className={inputClass}
      />
    </label>
  );

  const renderRoadmapPanel = (
    icon: React.ReactNode,
    title: string,
    body: string,
    bullets: string[]
  ) => (
    <div className="bg-[#050506] border border-exec-border p-6 text-left">
      <div className="flex items-center gap-3 border-b border-exec-border pb-4 mb-4">
        <div className="p-2 bg-exec-blue/10 border border-exec-blue/20 text-exec-blue">{icon}</div>
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-white">{title}</h3>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">{body}</p>
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        {bullets.map((item) => (
          <div key={item} className="border border-exec-border bg-black px-3 py-2 text-[10px] uppercase tracking-wider text-gray-400">
            {item}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="w-full min-h-screen bg-black text-white px-4 md:px-6 py-4 space-y-5 text-left">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 border-b border-exec-border pb-5">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter leading-none flex items-center gap-3">
            <div className="p-1.5 bg-exec-blue/10 border border-exec-blue/20">
              <Globe2 className="h-6 w-6 text-exec-blue" />
            </div>
            Portal <span className="text-exec-blue">Web</span>
          </h1>
          <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mt-2">
            Centro de control editorial para sincronizar el sistema interno con la landing publica del IICS.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 bg-[#111] border border-exec-border text-gray-300 hover:text-white rounded-none text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
          >
            <Eye className="h-4 w-4 text-exec-blue" />
            Ver landing
          </a>
          <button
            onClick={activeTab === 'nosotros' ? saveAbout : saveHero}
            disabled={saving || savingAbout || loading || (activeTab === 'nosotros' && loadingAbout)}
            className="px-4 py-2 bg-exec-blue hover:bg-blue-500 disabled:opacity-60 text-white rounded-none text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
          >
            {saving || savingAbout ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar cambios
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-exec-border pb-3">
        {[
          ['hero', MonitorCog, 'Hero principal'],
          ['nosotros', Users, 'Nosotros'],
          ['eventos', CalendarDays, 'Eventos'],
          ['noticias', Newspaper, 'Noticias'],
        ].map(([id, Icon, label]) => (
          <button
            key={id as string}
            onClick={() => setActiveTab(id as any)}
            className={`px-4 py-2 border rounded-none text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === id
                ? 'bg-exec-blue text-white border-exec-blue shadow-[0_0_16px_rgba(59,130,246,0.2)]'
                : 'bg-[#050506] text-gray-500 border-exec-border hover:text-white'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'hero' && (
        loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-exec-blue" />
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            <div className="xl:col-span-7 space-y-5">
              <section className="bg-[#050506] border border-exec-border p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-exec-border pb-3">
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-widest">Narrativa principal</h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Frase, subtitulo y cuerpo institucional.</p>
                  </div>
                  <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <input
                      type="checkbox"
                      checked={hero.is_published}
                      onChange={(e) => updateHero('is_published', e.target.checked)}
                      className="accent-blue-500"
                    />
                    Publicado
                  </label>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {renderTextInput('Etiqueta superior', 'eyebrow')}
                  {renderTextInput('Subtitulo tecnico', 'subtitle')}
                  {renderTextInput('Linea 1 del titular', 'headline_primary')}
                  {renderTextInput('Linea destacada', 'headline_accent')}
                </div>

                <label className="space-y-1.5 block">
                  <span className={labelClass}>Descripcion</span>
                  <textarea
                    value={hero.description}
                    onChange={(e) => updateHero('description', e.target.value)}
                    rows={4}
                    className={`${inputClass} resize-none leading-relaxed`}
                  />
                </label>

                {renderTextInput('Frase de apoyo con icono', 'support_statement')}
              </section>

              <section className="bg-[#050506] border border-exec-border p-5 space-y-4">
                <div className="border-b border-exec-border pb-3">
                  <h2 className="text-sm font-black uppercase tracking-widest">Botones del Hero</h2>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Cada boton conserva acciones seguras del portal actual.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {buttonRows.map(([labelKey, actionKey, title]) => (
                    <div key={labelKey} className="border border-exec-border bg-black p-4 space-y-3">
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-exec-blue">{title}</h3>
                      <input
                        value={String(hero[labelKey] || '')}
                        onChange={(e) => updateHero(labelKey, e.target.value as any)}
                        className={inputClass}
                      />
                      <select
                        value={String(hero[actionKey] || 'none')}
                        onChange={(e) => updateHero(actionKey, e.target.value as HeroButtonAction as any)}
                        className={inputClass}
                      >
                        {actionOptions.map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-[#050506] border border-exec-border p-5 space-y-4">
                <div className="border-b border-exec-border pb-3">
                  <h2 className="text-sm font-black uppercase tracking-widest">Tarjetas institucionales</h2>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Bloques cortos bajo el recurso visual principal.</p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {renderTextInput('Tarjeta 1 - titulo', 'value_card_one_title')}
                  {renderTextInput('Tarjeta 2 - titulo', 'value_card_two_title')}
                  {renderTextInput('Tarjeta 1 - texto', 'value_card_one_text')}
                  {renderTextInput('Tarjeta 2 - texto', 'value_card_two_text')}
                </div>
              </section>
            </div>

            <div className="xl:col-span-5 space-y-5">
              <section className="bg-[#050506] border border-exec-border p-5 space-y-4 sticky top-4">
                <div className="flex items-center justify-between border-b border-exec-border pb-3">
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-widest">Recurso visual</h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Imagen principal o URL de recurso.</p>
                  </div>
                  <ImageIcon className="h-5 w-5 text-exec-blue" />
                </div>

                <div className="aspect-[16/10] bg-black border border-exec-border flex items-center justify-center overflow-hidden">
                  {hero.image_url ? (
                    <img src={hero.image_url} alt={hero.image_alt} className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-gray-700 flex flex-col items-center gap-2">
                      <ImageIcon className="h-8 w-8" />
                      <span className="text-[9px] uppercase tracking-widest">Sin imagen</span>
                    </div>
                  )}
                </div>

                {renderTextInput('URL de imagen / video poster', 'image_url')}
                {renderTextInput('Texto alternativo', 'image_alt')}

                <label className="flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-exec-border hover:border-exec-blue text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white cursor-pointer transition-all">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 text-exec-blue" />}
                  Subir imagen
                  <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml" onChange={uploadHeroImage} className="hidden" disabled={uploading} />
                </label>

                <div className="border border-exec-border bg-black p-4 space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-[0.22em] text-exec-blue">Vista editorial</span>
                  <h3 className="text-2xl font-black uppercase leading-none">
                    {hero.headline_primary}
                    <span className="block text-exec-blue mt-1">{hero.headline_accent}</span>
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed">{hero.description}</p>
                </div>
              </section>
            </div>
          </div>
        )
      )}

      {activeTab === 'nosotros' && (
        loadingAbout ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-exec-blue" />
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            <div className="xl:col-span-7 space-y-5">
              <section className="bg-[#050506] border border-exec-border p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-exec-border pb-3">
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-widest">Cabecera Nosotros</h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Texto principal que aparece al abrir Nosotros desde la landing.</p>
                  </div>
                  <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                    <input
                      type="checkbox"
                      checked={about.is_published}
                      onChange={(e) => updateAbout('is_published', e.target.checked)}
                      className="accent-blue-500"
                    />
                    Publicado
                  </label>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <label className="space-y-1.5 block">
                    <span className={labelClass}>Etiqueta superior</span>
                    <input value={about.eyebrow} onChange={(e) => updateAbout('eyebrow', e.target.value)} className={inputClass} />
                  </label>
                  <label className="space-y-1.5 block">
                    <span className={labelClass}>Titulo</span>
                    <input value={about.title} onChange={(e) => updateAbout('title', e.target.value)} className={inputClass} />
                  </label>
                </div>
                <label className="space-y-1.5 block">
                  <span className={labelClass}>Introduccion</span>
                  <textarea value={about.intro} onChange={(e) => updateAbout('intro', e.target.value)} rows={3} className={`${inputClass} resize-none leading-relaxed`} />
                </label>
              </section>

              <section className="bg-[#050506] border border-exec-border p-5 space-y-4">
                <div className="border-b border-exec-border pb-3">
                  <h2 className="text-sm font-black uppercase tracking-widest">Historia institucional</h2>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Bloque narrativo de identidad, ruptura y valor cientifico.</p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <label className="space-y-1.5 block">
                    <span className={labelClass}>Etiqueta historia</span>
                    <input value={about.story_eyebrow} onChange={(e) => updateAbout('story_eyebrow', e.target.value)} className={inputClass} />
                  </label>
                  <label className="space-y-1.5 block">
                    <span className={labelClass}>Titulo historia</span>
                    <input value={about.story_title} onChange={(e) => updateAbout('story_title', e.target.value)} className={inputClass} />
                  </label>
                </div>
                <label className="space-y-1.5 block">
                  <span className={labelClass}>Parrafo 1</span>
                  <textarea value={about.story_paragraph_one} onChange={(e) => updateAbout('story_paragraph_one', e.target.value)} rows={4} className={`${inputClass} resize-none leading-relaxed`} />
                </label>
                <label className="space-y-1.5 block">
                  <span className={labelClass}>Parrafo 2</span>
                  <textarea value={about.story_paragraph_two} onChange={(e) => updateAbout('story_paragraph_two', e.target.value)} rows={4} className={`${inputClass} resize-none leading-relaxed`} />
                </label>
                <label className="space-y-1.5 block">
                  <span className={labelClass}>Cita destacada</span>
                  <textarea value={about.quote} onChange={(e) => updateAbout('quote', e.target.value)} rows={3} className={`${inputClass} resize-none leading-relaxed`} />
                </label>
                <label className="space-y-1.5 block">
                  <span className={labelClass}>Parrafo 3</span>
                  <textarea value={about.story_paragraph_three} onChange={(e) => updateAbout('story_paragraph_three', e.target.value)} rows={4} className={`${inputClass} resize-none leading-relaxed`} />
                </label>
              </section>

              <section className="bg-[#050506] border border-exec-border p-5 space-y-4">
                <div className="border-b border-exec-border pb-3">
                  <h2 className="text-sm font-black uppercase tracking-widest">Bloques de apoyo</h2>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Red interna, valores y llamada a accion.</p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <label className="space-y-1.5 block">
                    <span className={labelClass}>Titulo red interna</span>
                    <input value={about.network_title} onChange={(e) => updateAbout('network_title', e.target.value)} className={inputClass} />
                  </label>
                  <label className="space-y-1.5 block">
                    <span className={labelClass}>Etiqueta valores</span>
                    <input value={about.values_eyebrow} onChange={(e) => updateAbout('values_eyebrow', e.target.value)} className={inputClass} />
                  </label>
                  <label className="space-y-1.5 block">
                    <span className={labelClass}>Titulo valores</span>
                    <input value={about.values_title} onChange={(e) => updateAbout('values_title', e.target.value)} className={inputClass} />
                  </label>
                  <label className="space-y-1.5 block">
                    <span className={labelClass}>Texto boton</span>
                    <input value={about.cta_label} onChange={(e) => updateAbout('cta_label', e.target.value)} className={inputClass} />
                  </label>
                </div>
                <label className="space-y-1.5 block">
                  <span className={labelClass}>Descripcion red interna</span>
                  <textarea value={about.network_intro} onChange={(e) => updateAbout('network_intro', e.target.value)} rows={3} className={`${inputClass} resize-none leading-relaxed`} />
                </label>
                <label className="space-y-1.5 block">
                  <span className={labelClass}>Soporte operativo</span>
                  <textarea value={about.network_support} onChange={(e) => updateAbout('network_support', e.target.value)} rows={3} className={`${inputClass} resize-none leading-relaxed`} />
                </label>
                <label className="space-y-1.5 block">
                  <span className={labelClass}>Introduccion valores</span>
                  <textarea value={about.values_intro} onChange={(e) => updateAbout('values_intro', e.target.value)} rows={3} className={`${inputClass} resize-none leading-relaxed`} />
                </label>
              </section>
            </div>

            <div className="xl:col-span-5 space-y-5">
              <section className="bg-[#050506] border border-exec-border p-5 space-y-4 sticky top-4">
                <div className="flex items-center justify-between border-b border-exec-border pb-3">
                  <div>
                    <h2 className="text-sm font-black uppercase tracking-widest">Equipo visible</h2>
                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Agrega, oculta o actualiza integrantes de la landing.</p>
                  </div>
                  <button
                    onClick={addMember}
                    className="px-3 py-2 bg-exec-blue hover:bg-blue-500 text-white text-[9px] font-black uppercase tracking-widest flex items-center gap-2"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    Agregar
                  </button>
                </div>

                <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
                  {about.team_members.map((member) => (
                    <div key={member.id} className="border border-exec-border bg-black p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-20 h-24 border border-exec-border bg-[#050506] flex items-center justify-center overflow-hidden shrink-0">
                          {member.avatar ? (
                            <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                          ) : (
                            <Users className="h-6 w-6 text-gray-700" />
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <input value={member.name} onChange={(e) => updateMember(member.id, 'name', e.target.value)} className={inputClass} />
                          <input value={member.role} onChange={(e) => updateMember(member.id, 'role', e.target.value)} className={inputClass} />
                          <div className="grid grid-cols-2 gap-2">
                            <select value={member.category} onChange={(e) => updateMember(member.id, 'category', e.target.value as any)} className={inputClass}>
                              <option value="promotor">Fundador / Directivo</option>
                              <option value="academico">Cuerpo academico</option>
                            </select>
                            <label className="flex items-center justify-center gap-2 border border-exec-border text-[9px] font-black uppercase tracking-widest text-gray-400">
                              <input type="checkbox" checked={member.is_visible} onChange={(e) => updateMember(member.id, 'is_visible', e.target.checked)} className="accent-blue-500" />
                              Visible
                            </label>
                          </div>
                        </div>
                      </div>

                      <input value={member.avatar} onChange={(e) => updateMember(member.id, 'avatar', e.target.value)} placeholder="URL de foto" className={inputClass} />
                      <label className="flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-exec-border hover:border-exec-blue text-[9px] font-black uppercase tracking-widest text-gray-400 hover:text-white cursor-pointer transition-all">
                        {uploadingMemberId === member.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 text-exec-blue" />}
                        Cargar foto local PNG/JPG/WebP
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml"
                          onChange={(event) => uploadMemberImage(member.id, event)}
                          className="hidden"
                          disabled={uploadingMemberId === member.id}
                        />
                      </label>

                      <textarea value={member.desc} onChange={(e) => updateMember(member.id, 'desc', e.target.value)} rows={3} className={`${inputClass} resize-none leading-relaxed`} />
                      <div className="grid md:grid-cols-2 gap-2">
                        <input value={member.academicTitle} onChange={(e) => updateMember(member.id, 'academicTitle', e.target.value)} placeholder="Rol editorial" className={inputClass} />
                        <input value={member.tag} onChange={(e) => updateMember(member.id, 'tag', e.target.value)} placeholder="Especialidad" className={inputClass} />
                        <input value={member.highlight} onChange={(e) => updateMember(member.id, 'highlight', e.target.value)} placeholder="Aporte principal" className={inputClass} />
                        <input value={member.focus} onChange={(e) => updateMember(member.id, 'focus', e.target.value)} placeholder="Foco de impacto" className={inputClass} />
                      </div>

                      <button
                        onClick={() => removeMember(member.id)}
                        className="w-full px-3 py-2 border border-red-500/20 text-red-400 hover:bg-red-500/10 text-[9px] font-black uppercase tracking-widest"
                      >
                        Eliminar integrante
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )
      )}

      {activeTab === 'eventos' && renderRoadmapPanel(
        <CalendarDays className="h-5 w-5" />,
        'Eventos hacia landing',
        'Conexion natural con el modulo Eventos',
        ['Proximos eventos publicados', 'Evento destacado', 'Boton de inscripcion', 'Estado en vivo']
      )}

      {activeTab === 'noticias' && renderRoadmapPanel(
        <Newspaper className="h-5 w-5" />,
        'Noticias hacia landing',
        'Conexion natural con Prensa y Difusion Publica',
        ['Noticias destacadas', 'Ultimas publicaciones', 'Imagen portada', 'Control editorial publico']
      )}
    </div>
  );
};

export default PortalWebView;
