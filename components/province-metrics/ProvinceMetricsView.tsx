import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ui/ToastContext';
import { Save, Loader2, TrendingUp, MapPin, AlertTriangle, Activity } from 'lucide-react';

/* ─── Province IDs que coinciden exactamente con data.ts ─── */
const PROVINCES = [
  { id: 'san-ignacio',  name: 'San Ignacio'  },
  { id: 'jaen',         name: 'Jaén'         },
  { id: 'cutervo',      name: 'Cutervo'      },
  { id: 'chota',        name: 'Chota'        },
  { id: 'santa-cruz',   name: 'Santa Cruz'   },
  { id: 'hualgayoc',    name: 'Hualgayoc'    },
  { id: 'celendin',     name: 'Celendín'     },
  { id: 'san-miguel',   name: 'San Miguel'   },
  { id: 'san-pablo',    name: 'San Pablo'    },
  { id: 'cajamarca',    name: 'Cajamarca'    },
  { id: 'contumaza',    name: 'Contumazá'    },
  { id: 'san-marcos',   name: 'San Marcos'   },
  { id: 'cajabamba',    name: 'Cajabamba'    },
];

const riskColor = (score: number) =>
  score >= 7 ? { text: 'text-red-400', bar: 'bg-red-500',    badge: 'text-red-400 bg-red-950/30 border-red-900/30',     label: 'Alto'     } :
  score >= 4 ? { text: 'text-yellow-400', bar: 'bg-yellow-400', badge: 'text-yellow-400 bg-yellow-950/30 border-yellow-900/30', label: 'Moderado' } :
               { text: 'text-cyan-400',  bar: 'bg-cyan-400',   badge: 'text-cyan-400 bg-cyan-950/20 border-cyan-900/20',   label: 'Bajo'     };

const emptyForm = {
  risk_score: 5.0,
  menciones_redes: 1000,
  waterSatisfaction: 50,
  conflMineria: 30,
  conflLocal: 20,
  conflServicios: 20,
  conflGobernabilidad: 20,
  conflOtros: 10,
  active_alert: '',
  key_issues: '',
  alert_count: 0,
  photo_url: '',
  data_sources: '',
};

export const ProvinceMetricsView: React.FC = () => {
  const { showToast } = useToast();
  const [metricsMap, setMetricsMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string>('cajamarca');
  const [form, setForm] = useState(emptyForm);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { fetchMetrics(); }, []);

  /* When selected province changes, populate the form */
  useEffect(() => {
    const d = metricsMap[selectedId];
    if (!d) { setForm(emptyForm); return; }
    const areas = d.conflict_areas || {};
    setForm({
      risk_score:        Number(d.risk_score || 5),
      menciones_redes:   Number(d.menciones_redes || 0),
      waterSatisfaction: Number(
        d.indicators?.find((i: any) => i.label.includes('Hídric'))
          ?.value?.toString().replace('%','') || 50
      ),
      conflMineria:       Number(areas['Minería y medio ambiente'] || 30),
      conflLocal:         Number(areas['Desarrollo local'] || 20),
      conflServicios:     Number(areas['Servicios básicos'] || 20),
      conflGobernabilidad:Number(areas['Gobernabilidad'] || 20),
      conflOtros:         Number(areas['Otros temas'] || 10),
      active_alert:       d.active_alert || '',
      key_issues:         Array.isArray(d.key_issues) ? d.key_issues.join(', ') : (d.key_issues || ''),
      alert_count:        Number(d.alert_count || 0),
      photo_url:          d.photo_url || '',
      data_sources:      Array.isArray(d.data_sources) ? d.data_sources.join(', ') : (d.data_sources || ''),
    });
  }, [selectedId, metricsMap]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('province_metrics')
        .select('*');
      if (error) throw error;
      const map: Record<string, any> = {};
      (data || []).forEach((row: any) => { map[row.id] = row; });
      setMetricsMap(map);
    } catch (e) {
      console.error('Error loading province_metrics:', e);
      showToast({ message: 'Error al cargar métricas provinciales.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const provName = PROVINCES.find(p => p.id === selectedId)?.name || selectedId;

    let riskDesc: 'Bajo' | 'Moderado' | 'Alto' = 'Bajo';
    if (form.risk_score >= 7) riskDesc = 'Alto';
    else if (form.risk_score >= 4) riskDesc = 'Moderado';

    const indicators = [
      { label: 'Conflictos Activos',         value: form.alert_count },
      { label: 'Tasa de Satisfacción Hídrica',value: `${form.waterSatisfaction}%` },
      { label: 'Monitoreo de Redes',          value: form.menciones_redes > 5000 ? 'Crítico diario' : form.menciones_redes > 2000 ? 'Intenso' : 'Estable' },
    ];

    const conflict_areas = {
      'Minería y medio ambiente': form.conflMineria,
      'Desarrollo local':         form.conflLocal,
      'Servicios básicos':        form.conflServicios,
      'Gobernabilidad':           form.conflGobernabilidad,
      'Otros temas':              form.conflOtros,
    };

    const key_issues = form.key_issues
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);

    const payload = {
      id:               selectedId,
      name:             provName,
      risk_score:       form.risk_score,
      risk_description: riskDesc,
      menciones_redes:  form.menciones_redes,
      alert_count:      form.alert_count,
      active_alert:     form.active_alert || null,
      key_issues,
      indicators,
      conflict_areas,
      photo_url:        form.photo_url || null,
      data_sources:     form.data_sources
                          .split(',')
                          .map((item: string) => item.trim())
                          .filter(Boolean),
    };

    try {
      /* upsert: inserta si no existe, actualiza si sí */
      const { error } = await supabase
        .from('province_metrics')
        .upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      showToast({ message: `✓ Métricas de ${provName} actualizadas. El Observatorio reflejará los cambios en la próxima carga.`, type: 'success' });
      fetchMetrics();
    } catch (e: any) {
      showToast({ message: e.message || 'Error al guardar métricas.', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  /* ── Computed summary metrics ── */
  const allScores = PROVINCES.map(p => metricsMap[p.id]?.risk_score || 0).filter(Boolean);
  const avgRisk   = allScores.length ? (allScores.reduce((a,b) => a+b, 0) / allScores.length).toFixed(1) : '–';
  const mostCritical = PROVINCES.reduce((prev, curr) =>
    (metricsMap[curr.id]?.risk_score || 0) > (metricsMap[prev.id]?.risk_score || 0) ? curr : prev,
    PROVINCES[0]
  );
  const totalAlerts = Object.values(metricsMap).reduce((acc: number, m: any) => acc + Number(m.alert_count || 0), 0);

  const selectedProv = PROVINCES.find(p => p.id === selectedId)!;
  const cfg = riskColor(form.risk_score);

  return (
    <div className="w-full bg-black min-h-screen px-4 pb-4 pt-0 md:pt-4 md:px-6 space-y-6">

      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-exec-border">
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none flex items-center gap-3">
            <div className="p-1.5 bg-exec-blue/10 rounded-none border border-exec-blue/20">
              <span className="material-symbols-outlined notranslate text-exec-blue text-2xl leading-none" translate="no">analytics</span>
            </div>
            <span>Métricas <span className="text-exec-blue">Provinciales</span> IICS</span>
          </h1>
          <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mt-1">
            Actualiza índices de riesgo, menciones en redes, áreas de conflicto e indicadores de bienestar por provincia.
          </p>
        </div>
      </div>

      {/* ═══ METRIC CARDS ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="exec-card p-5 flex flex-col justify-between h-28 bg-[#0A0A0A]">
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Promedio Regional</h3>
            <span className="material-symbols-outlined notranslate text-exec-blue text-xl" translate="no">speed</span>
          </div>
          <div>
            <p className="text-3xl font-light text-white">{avgRisk}</p>
            <div className="flex items-center gap-1 text-[10px] text-exec-blue/70 mt-1 uppercase font-bold tracking-wide">
              <span className="material-symbols-outlined notranslate text-[13px]" translate="no">avg_pace</span>
              índice IICS / 10
            </div>
          </div>
        </div>

        <div className="exec-card p-5 flex flex-col justify-between h-28 bg-[#0A0A0A] hover:border-red-900/60 transition-colors">
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Más Crítica</h3>
            <span className="material-symbols-outlined notranslate text-red-400 text-xl animate-pulse" translate="no">location_on</span>
          </div>
          <div>
            <p className="text-sm font-black text-white uppercase tracking-tight">{mostCritical.name}</p>
            <div className="flex items-center gap-1 text-[10px] text-red-400/70 mt-1 uppercase font-bold">
              <span className="material-symbols-outlined notranslate text-[13px]" translate="no">crisis_alert</span>
              riesgo {metricsMap[mostCritical.id]?.risk_score?.toFixed(1) || '–'} / 10
            </div>
          </div>
        </div>

        <div className="exec-card p-5 flex flex-col justify-between h-28 bg-[#0A0A0A] hover:border-yellow-400/30 transition-colors">
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Alertas Totales</h3>
            <span className="material-symbols-outlined notranslate text-yellow-400 text-xl" translate="no">warning</span>
          </div>
          <div>
            <p className="text-3xl font-light text-white">{totalAlerts}</p>
            <div className="flex items-center gap-1 text-[10px] text-yellow-400/70 mt-1 uppercase font-bold">
              <span className="material-symbols-outlined notranslate text-[13px]" translate="no">notifications_active</span>
              en todas las provincias
            </div>
          </div>
        </div>

        <div className="exec-card p-5 flex flex-col justify-between h-28 bg-[#0A0A0A] hover:border-exec-green/30 transition-colors">
          <div className="flex justify-between items-start">
            <h3 className="text-xs font-semibold uppercase text-gray-400 tracking-wider">Provincias</h3>
            <span className="material-symbols-outlined notranslate text-exec-green text-xl" translate="no">map</span>
          </div>
          <div>
            <p className="text-3xl font-light text-white">{Object.keys(metricsMap).length}<span className="text-gray-600 text-xl">/{PROVINCES.length}</span></p>
            <div className="flex items-center gap-1 text-[10px] text-exec-green/70 mt-1 uppercase font-bold">
              <span className="material-symbols-outlined notranslate text-[13px]" translate="no">check_circle</span>
              registradas en BD
            </div>
          </div>
        </div>
      </div>

      {/* ═══ MAIN EDITOR — 2 columns ═══ */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-exec-border border-t-exec-blue"></div>
            <span className="text-xs text-gray-500 uppercase tracking-wider">Cargando métricas provinciales...</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

          {/* ── Province List ── */}
          <div className="lg:col-span-4 space-y-1">
            <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 pb-2 border-b border-exec-border">
              Selecciona una provincia para editar
            </p>
            <div className="space-y-1 max-h-[520px] overflow-y-auto pr-1">
              {PROVINCES.map(prov => {
                const metric = metricsMap[prov.id];
                const score = Number(metric?.risk_score || 0);
                const col = riskColor(score);
                const isSelected = prov.id === selectedId;
                return (
                  <button
                    key={prov.id}
                    onClick={() => setSelectedId(prov.id)}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-exec-blue/10 border-exec-blue/40 text-white'
                        : 'bg-[#0A0A0A] border-exec-border hover:border-gray-600 text-gray-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-2 w-2 rounded-full flex-shrink-0 ${col.bar} ${score >= 7 ? 'animate-pulse' : ''}`}></div>
                      <span className="text-xs font-bold uppercase tracking-wide truncate">{prov.name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] font-mono font-bold ${col.text}`}>
                        {score > 0 ? score.toFixed(1) : '–'}
                      </span>
                      {metric ? (
                        <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 border rounded-none ${col.badge}`}>{col.label}</span>
                      ) : (
                        <span className="text-[8px] font-mono text-gray-700 uppercase">sin datos</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Edit Form ── */}
          <div className="lg:col-span-8">
            <form onSubmit={handleSave} className="space-y-5">
              {/* Form header */}
              <div className="flex items-center justify-between pb-3 border-b border-exec-border">
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full flex-shrink-0 ${cfg.bar} ${form.risk_score >= 7 ? 'animate-pulse' : ''}`}></div>
                  <h2 className="text-sm font-black text-white uppercase tracking-tighter">{selectedProv.name}</h2>
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 border rounded-none ${cfg.badge}`}>{cfg.label}</span>
                </div>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-exec-blue hover:bg-blue-500 disabled:opacity-50 text-white text-[11px] font-bold uppercase tracking-widest px-5 py-2 rounded-none transition-colors shadow-lg shadow-exec-blue/20"
                >
                  {isSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                  {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>

              {/* Section: KPI Principal */}
              <div className="bg-[#0A0A0A] border border-exec-border p-4 space-y-4">
                <p className="text-[9px] font-bold uppercase tracking-widest text-exec-blue border-b border-exec-border pb-2">
                  KPI Principal
                </p>

                {/* Risk Score */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Índice de Riesgo IICS</label>
                    <span className={`text-lg font-black font-mono ${cfg.text}`}>{form.risk_score.toFixed(1)}/10</span>
                  </div>
                  <input
                    type="range" min="0" max="10" step="0.1"
                    value={form.risk_score}
                    onChange={e => setForm(p => ({ ...p, risk_score: parseFloat(e.target.value) }))}
                    className="w-full h-1.5 bg-exec-border rounded-none appearance-none cursor-pointer accent-blue-500"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-gray-600">
                    <span>0 — Bajo</span><span>4 — Moderado</span><span>7 — Alto</span><span>10</span>
                  </div>
                </div>

                {/* Menciones Redes + Alert Count */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Menciones en Redes</label>
                    <input
                      type="number" min="0"
                      value={form.menciones_redes}
                      onChange={e => setForm(p => ({ ...p, menciones_redes: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-black border border-exec-border text-white text-xs px-3 py-2 rounded-none focus:outline-none focus:border-exec-blue"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Alertas Activas</label>
                    <input
                      type="number" min="0"
                      value={form.alert_count}
                      onChange={e => setForm(p => ({ ...p, alert_count: parseInt(e.target.value) || 0 }))}
                      className="w-full bg-black border border-exec-border text-white text-xs px-3 py-2 rounded-none focus:outline-none focus:border-exec-blue"
                    />
                  </div>
                </div>

                {/* Water Satisfaction */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Satisfacción Hídrica</label>
                    <span className="text-sm font-black font-mono text-cyan-400">{form.waterSatisfaction}%</span>
                  </div>
                  <input
                    type="range" min="0" max="100" step="1"
                    value={form.waterSatisfaction}
                    onChange={e => setForm(p => ({ ...p, waterSatisfaction: parseInt(e.target.value) }))}
                    className="w-full h-1.5 bg-exec-border rounded-none appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>
              </div>

              {/* Section: Áreas de Conflicto */}
              <div className="bg-[#0A0A0A] border border-exec-border p-4 space-y-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-yellow-400 border-b border-exec-border pb-2">
                  Áreas de Conflicto (distribución %)
                </p>
                {[
                  { key: 'conflMineria',        label: 'Minería y Medio Ambiente', color: 'accent-red-500' },
                  { key: 'conflLocal',           label: 'Desarrollo Local',         color: 'accent-orange-400' },
                  { key: 'conflServicios',       label: 'Servicios Básicos',        color: 'accent-yellow-400' },
                  { key: 'conflGobernabilidad',  label: 'Gobernabilidad',           color: 'accent-blue-500' },
                  { key: 'conflOtros',           label: 'Otros Temas',              color: 'accent-gray-400' },
                ].map(({ key, label, color }) => (
                  <div key={key} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-gray-400 font-mono uppercase">{label}</label>
                      <span className="text-[10px] font-mono text-white font-bold">{(form as any)[key]}%</span>
                    </div>
                    <input
                      type="range" min="0" max="100" step="1"
                      value={(form as any)[key]}
                      onChange={e => setForm(p => ({ ...p, [key]: parseInt(e.target.value) }))}
                      className={`w-full h-1 bg-exec-border rounded-none appearance-none cursor-pointer ${color}`}
                    />
                  </div>
                ))}
              </div>

              {/* Section: Texto libre */}
              <div className="bg-[#0A0A0A] border border-exec-border p-4 space-y-4">
                <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 border-b border-exec-border pb-2">
                  Información Cualitativa
                </p>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Mesa Temática / Alerta Activa</label>
                  <textarea
                    value={form.active_alert}
                    onChange={e => setForm(p => ({ ...p, active_alert: e.target.value }))}
                    placeholder="Ej: Mesa multisectorial por plan regulador de agua distrital..."
                    rows={2}
                    className="w-full bg-black border border-exec-border text-white text-xs px-3 py-2 rounded-none placeholder:text-gray-700 focus:outline-none focus:border-exec-blue resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
                    Problemas Clave <span className="text-gray-500 normal-case font-normal">(separados por coma)</span>
                  </label>
                  <textarea
                    value={form.key_issues}
                    onChange={e => setForm(p => ({ ...p, key_issues: e.target.value }))}
                    placeholder="Minería Yanacocha, Expansión urbana, Servicio de agua potable..."
                    rows={2}
                    className="w-full bg-black border border-exec-border text-white text-xs px-3 py-2 rounded-none placeholder:text-gray-700 focus:outline-none focus:border-exec-blue resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
                    URL de Foto Provincial
                  </label>
                  <input
                    type="text"
                    value={form.photo_url}
                    onChange={e => setForm(p => ({ ...p, photo_url: e.target.value }))}
                    placeholder="https://.../provincia.jpg"
                    className="w-full bg-black border border-exec-border text-white text-xs px-3 py-2 rounded-none placeholder:text-gray-700 focus:outline-none focus:border-exec-blue"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
                    Fuentes de Datos <span className="text-gray-500 normal-case font-normal">(separadas por coma)</span>
                  </label>
                  <input
                    type="text"
                    value={form.data_sources}
                    onChange={e => setForm(p => ({ ...p, data_sources: e.target.value }))}
                    placeholder="INEI, MINAM, IICS-Campo"
                    className="w-full bg-black border border-exec-border text-white text-xs px-3 py-2 rounded-none placeholder:text-gray-700 focus:outline-none focus:border-exec-blue"
                  />
                </div>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
};
