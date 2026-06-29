import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, FileText, ExternalLink, Download, BookOpen, Filter, Calendar, Users, Award, Database, Share2, ChevronDown, ChevronUp, X } from 'lucide-react';

interface Publication {
  id: string;
  title: string;
  authors: string;
  type: 'paper' | 'bulletin' | 'report';
  typeName: string;
  index: string; // Scopus, SciELO, Dialnet, etc.
  date: string;
  line: string;
  abstract: string;
  pdfUrl?: string;
  externalUrl?: string;
  doi?: string;
}

interface PublicationsSectionProps {
  isSubPage?: boolean;
  onViewAll?: () => void;
  onCloseSubPage?: () => void;
}

export default function PublicationsSection({
  isSubPage = false,
  onViewAll,
  onCloseSubPage
}: PublicationsSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'paper' | 'bulletin' | 'report'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const publications: Publication[] = [
    {
      id: 'pub-precision-hualgayoc',
      title: 'Sociología de Precisión y Alertas Tempranas en los Conflictos de Hualgayoc',
      authors: 'Dr. Jaime Abanto Padilla, Edwar Saenz Tello',
      type: 'paper',
      typeName: 'Artículo Científico',
      index: 'SciELO',
      date: 'Marzo 2026',
      line: 'Sociología Digital y Nuevas Tecnologías',
      abstract: 'Propuesta metodológica integral para el monitoreo y anticipación de tensiones socioambientales basándose en minería de textos estructurada e indicadores empíricos del Observatorio Sociológico de Cajamarca (OSC).',
      doi: '10.5281/zenodo.iics.2026.04',
      externalUrl: 'https://scielo.org'
    },
    {
      id: 'pub-industrializacion-extractiva',
      title: 'Efectos de la Industrialización Extractiva en la Agricultura Familiar de Cajamarca',
      authors: 'Dr. Humberto Caruajulca Medina, Hery Díaz Bueno',
      type: 'paper',
      typeName: 'Artículo Científico',
      index: 'Scopus',
      date: 'Enero 2026',
      line: 'Transformación Social y Desarrollo Regional',
      abstract: 'Evaluación empírica sistemática de los choques en el mercado laboral y las redes comunitarias provocados por la reactivación minera de gran envergadura (proyectos Yanacocha Sulfuros y Michiquillay).',
      doi: '10.1016/j.worlddev.2026.012',
      externalUrl: 'https://scopus.com'
    },
    {
      id: 'pub-movilidad-juvenil',
      title: 'Patrones de Movilidad Social Juvenil y Deserción en la Universidad Nacional de Cajamarca',
      authors: 'Dr. Jaime Abanto Padilla, Mirian Abanto',
      type: 'paper',
      typeName: 'Artículo de Investigación',
      index: 'Dialnet',
      date: 'Diciembre 2025',
      line: 'Educación y Juventudes',
      abstract: 'Análisis cuantitativo de las trayectorias socioeducativas y la inserción laboral de jóvenes rurales. Vinculado directamente con el Programa de Becas al Mérito de la AFI del IICS.',
      doi: '10.18272/educación.v15i2',
      externalUrl: 'https://dialnet.unirioja.es'
    },
    {
      id: 'pub-mapa-calor-social',
      title: 'Mapa de Calor Social de la Región Cajamarca: Reporte Anual de Tendencias',
      authors: 'Equipo Técnico del Observatorio Sociológico de Cajamarca (OSC)',
      type: 'report',
      typeName: 'Reporte Especial',
      index: 'Informe Técnico IICS',
      date: 'Mayo 2025',
      line: 'Sociología Territorial',
      abstract: 'Sistematización semestral de los niveles de conflictividad activa, indicadores de cohesión social y percepciones de gobernabilidad en las 13 provincias andinas de Cajamarca.',
      externalUrl: '#'
    },
    {
      id: 'pub-redes-nlp-michiquillay',
      title: 'Análisis de Redes de Opinión Pública mediante NLP: El Caso del Proyecto Michiquillay',
      authors: 'M. Cs. Julio Cesar Alcalde Giove, Steven',
      type: 'paper',
      typeName: 'Artículo Científico',
      index: 'Latindex Catalogado',
      date: 'Febrero 2026',
      line: 'Sociología Digital y Nuevas Tecnologías',
      abstract: 'Uso de procesamiento de lenguaje natural y modelado de tópicos en redes sociales locales para mapear sentimientos comunitarios antes de la formalización de mesas de diálogo gubernamentales.',
      doi: '10.22201/iics.nlp.2026.2.19',
      externalUrl: '#'
    },
    {
      id: 'pub-genero-rondas-chota',
      title: 'Género, Rondas Campesinas y Cambio Cultural en Comunidades de la Provincia de Chota',
      authors: 'M. Cs. Pedro Alcides Yáñez Alvarado, Patricia Sánchez',
      type: 'paper',
      typeName: 'Artículo Científico',
      index: 'Latindex',
      date: 'Noviembre 2025',
      line: 'Género y Cambio Cultural',
      abstract: 'Investigación clásica con etnografía digital sobre los cambios culturales en la división del trabajo doméstico y el empoderamiento progresivo de la mujer rural dentro de las rondas cajamarquinas.',
      doi: '10.5465/gender.studies.2025.109',
      externalUrl: '#'
    },
    {
      id: 'pub-boletin-conflictos-cajbamba',
      title: 'Boletín Mensual de Monitoreo Territorial: Análisis de Minería Informal en Cajabamba y Algamarca',
      authors: 'Observatorio Sociológico de Cajamarca (OSC)',
      type: 'bulletin',
      typeName: 'Boletín de Tendencia',
      index: 'Boletín OSC v1.4',
      date: 'Mayo 2026',
      line: 'Sociología Territorial',
      abstract: 'Boletín estratégico enfocado en el monitoreo diario de contaminación de microcuencas, tensión comunitaria y dinámicas de formalización minera en la provincia de Cajabamba.',
      externalUrl: '#'
    }
  ];

  // Filters logic
  const filteredPublications = publications.filter((pub) => {
    const matchesSearch = 
      pub.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pub.authors.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pub.line.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pub.abstract.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = activeFilter === 'all' || pub.type === activeFilter;
    
    return matchesSearch && matchesFilter;
  });

  const displayedPublications = isSubPage || showAll ? filteredPublications : filteredPublications.slice(0, 3);

  return (
    <section 
      id="publicaciones"
      className={`relative z-10 w-full min-h-screen bg-transparent px-4 sm:px-6 lg:px-8 border-t border-gray-900 overflow-hidden ${isSubPage ? 'pt-36 pb-24' : 'py-24'}`}
    >
      {isSubPage && (
        <button
          onClick={onCloseSubPage}
          className="absolute top-28 right-6 sm:top-32 sm:right-10 z-50 flex items-center gap-2 px-4 py-2 bg-[#121214] hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-700 text-gray-300 hover:text-white text-xs font-mono tracking-wider uppercase transition-all duration-300 cursor-pointer rounded-none"
        >
          <X className="h-4 w-4" />
          <span>Regresar al Inicio</span>
        </button>
      )}

      {/* Structural background highlights mimicking the app's DNA */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none"></div>

      <div className="mx-auto max-w-7xl">
        
        {/* Section Header */}
        <div className="text-left mb-16 relative">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-px w-8 bg-cyan-500"></span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-[#0099ff]">
              Repositorio Científico Indexado
            </span>
          </div>
          <h2 className="text-3xl font-black tracking-tight text-white uppercase sm:text-4xl font-sans lg:max-w-3xl leading-[1.1]">
            Publicaciones y Producción Científica Social
          </h2>
          <p className="mt-4 max-w-2xl text-sm sm:text-base leading-relaxed text-gray-200 font-sans font-medium">
            Explore el repositorio de artículos indexados en <span className="text-cyan-400 font-semibold font-mono">Scopus</span>, <span className="text-cyan-400 font-semibold font-mono">SciELO</span> y <span className="text-cyan-400 font-semibold font-mono">Dialnet</span> del IICS. Promovemos una sociología de precisión mediante datos transparentes de descarga abierta para investigadores locales.
          </p>
        </div>

        {/* Filters and Search Bar row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-gray-900 mb-10">
          
          {/* Tab buttons */}
          <div className="flex flex-wrap bg-gray-990 border border-gray-850 p-1 font-mono text-xs max-w-full">
            <button
              id="filter-pub-all"
              onClick={() => setActiveFilter('all')}
              className={`flex-1 sm:flex-initial px-4 py-2 text-center transition-all cursor-pointer tracking-wider text-[10px] uppercase ${
                activeFilter === 'all'
                  ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-500/20 font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Todas
            </button>
            <button
              id="filter-pub-paper"
              onClick={() => setActiveFilter('paper')}
              className={`flex-1 sm:flex-initial px-4 py-2 text-center transition-all cursor-pointer tracking-wider text-[10px] uppercase ${
                activeFilter === 'paper'
                  ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-500/20 font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Artículos Científicos
            </button>
            <button
              id="filter-pub-bulletin"
              onClick={() => setActiveFilter('bulletin')}
              className={`flex-1 sm:flex-initial px-4 py-2 text-center transition-all cursor-pointer tracking-wider text-[10px] uppercase ${
                activeFilter === 'bulletin'
                  ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-500/20 font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Boletines OSC
            </button>
            <button
              id="filter-pub-report"
              onClick={() => setActiveFilter('report')}
              className={`flex-1 sm:flex-initial px-4 py-2 text-center transition-all cursor-pointer tracking-wider text-[10px] uppercase ${
                activeFilter === 'report'
                  ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-500/20 font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Reportes de Campo
            </button>
          </div>

          {/* Search bar */}
          <div className="relative w-full lg:max-w-xs shrink-0 select-none">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-gray-500">
              <Search className="h-4 w-4" />
            </div>
            <input
              id="search-publications-input"
              type="text"
              placeholder="Buscar por título, autor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-990 border border-gray-850 py-2.5 pl-10 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/40 font-mono transition-colors"
            />
          </div>

        </div>

        {/* Publications Grid Area */}
        <motion.div 
          layout
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {displayedPublications.map((pub) => {
              const isExpanded = expandedId === pub.id;
              
              return (
                <motion.div
                  id={`pub-card-${pub.id}`}
                  key={pub.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.25 }}
                  className="group relative flex flex-col justify-between bg-[#050506] border border-gray-900 hover:border-gray-800 transition-colors p-6 rounded-none text-left"
                >
                  {/* Subtle top decoration */}
                  <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-500/0 group-hover:via-cyan-500/20 to-transparent transition-all duration-500" />
                  
                  {/* Header metadata */}
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-4 font-mono text-[10px] font-bold">
                      <span className={`inline-flex px-2 py-0.5 rounded-none uppercase border ${
                        pub.type === 'paper' 
                          ? 'bg-cyan-950/20 text-cyan-400 border-cyan-800/30' 
                          : pub.type === 'bulletin'
                            ? 'bg-purple-950/20 text-purple-400 border-purple-800/30'
                            : 'bg-amber-950/20 text-amber-400 border-amber-800/30'
                      }`}>
                        {pub.typeName}
                      </span>
                      <span className="text-gray-400">{pub.date}</span>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-extrabold tracking-normal text-white group-hover:text-cyan-400 transition-colors line-clamp-2 leading-relaxed uppercase">
                      {pub.title}
                    </h3>

                    {/* Authors and Badge row */}
                    <div className="flex items-center gap-2 mt-3 font-mono text-xs">
                      <Users className="h-4 w-4 text-gray-400 shrink-0" />
                      <span className="text-gray-300 truncate">{pub.authors}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 mt-4">
                      {/* Database validation index */}
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-zinc-950 text-gray-300 border border-zinc-900 font-mono text-[10px] rounded-none">
                        <Award className="h-3 w-3 text-[#0099ff]" />
                        <span>{pub.index}</span>
                      </span>

                      {/* Line of investigation tag */}
                      <span className="text-xs text-gray-400 italic max-w-[150px] truncate">
                        {pub.line}
                      </span>
                    </div>

                    {/* Synopsis abstract text */}
                    <p className={`text-xs sm:text-sm text-gray-300 leading-relaxed font-sans border-t border-gray-900/60 pt-3.5 mt-4 ${
                      isExpanded ? '' : 'line-clamp-3'
                    }`}>
                      {pub.abstract}
                    </p>

                    {/* Expanded specific technical metadata. (e.g. DOI) */}
                    {pub.doi && isExpanded && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="font-mono text-[10px] text-zinc-500 pt-3.5 space-y-1 select-all"
                      >
                        <div className="flex items-center gap-1.5 border-t border-gray-950/55 pt-2">
                          <span className="text-[9px] font-bold text-gray-650 uppercase">DOI:</span>
                          <span className="text-cyan-600/90">{pub.doi}</span>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Actions & expand buttons */}
                  <div className="flex items-center justify-between gap-4 mt-6 pt-4 border-t border-gray-900/60">
                    <button
                      id={`btn-pub-expand-${pub.id}`}
                      onClick={() => setExpandedId(isExpanded ? null : pub.id)}
                      className="text-[10.5px] font-mono hover:text-white transition-colors cursor-pointer text-gray-500 underline underline-offset-4 decoration-dotted"
                    >
                      {isExpanded ? 'Contraer Resumen' : 'Ver Completo'}
                    </button>

                    {/* Action trigger links */}
                    <div className="flex items-center gap-2.5">
                      <a
                        id={`btn-pub-view-ext-${pub.id}`}
                        href={pub.externalUrl || '#'}
                        target="_blank"
                        rel="noreferrer referrer"
                        className="inline-flex h-7 px-3.5 items-center gap-1.5 font-mono text-[10px] font-bold border border-cyan-500/20 bg-cyan-950/10 hover:bg-cyan-500 text-cyan-400 hover:text-black leading-none transition-all cursor-pointer uppercase rounded-none"
                      >
                        <span>Ver Ficha</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>

                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredPublications.length === 0 && (
            <div className="col-span-full py-16 text-center border border-dashed border-gray-900 bg-gray-990/10">
              <BookOpen className="mx-auto h-8 w-8 text-gray-600 mb-3" />
              <p className="text-sm text-gray-400 font-mono">No se encontraron publicaciones con esos términos.</p>
              <button 
                id="btn-pub-clear-search"
                onClick={() => { setSearchTerm(''); setActiveFilter('all'); }} 
                className="mt-3 text-xs text-cyan-400 font-mono uppercase underline hover:text-white"
              >
                Limpiar filtros
              </button>
            </div>
          )}
        </motion.div>

        {/* Toggle show all publications */}
        {!isSubPage && filteredPublications.length > 3 && (
          <div className="flex justify-center mt-12">
            <button
              id="btn-toggle-all-publications"
              onClick={onViewAll}
              className="inline-flex items-center gap-2 px-6 py-3 font-mono text-xs font-bold border border-cyan-500/20 bg-cyan-950/5 hover:bg-cyan-950/20 hover:border-cyan-500/40 text-cyan-400 hover:text-white uppercase transition-all duration-300 cursor-pointer rounded-none tracking-widest shadow-[0_0_15px_rgba(0,153,255,0.05)] hover:shadow-[0_0_25px_rgba(0,153,255,0.15)]"
            >
              <span>Ver Más en el Repositorio Completo</span>
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Bottom Banner reminding readers about the data platform integration */}
        <div className="mt-16 bg-[#050506]/40 border border-gray-900 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative select-none rounded-none text-left">
          <div className="absolute top-0 right-10 h-full w-24 bg-gradient-to-l from-cyan-500/5 to-transparent pointer-events-none" />
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-[#0099ff] uppercase tracking-wider">
              <Database className="h-3 w-3" />
              <span>Acceso de Investigador</span>
            </span>
            <h4 className="text-sm font-extrabold text-white uppercase tracking-wider font-sans mt-1">
              ¿Desea acceder a las bases de datos crudas (datasets)?
            </h4>
            <p className="text-xs text-gray-400 leading-relaxed font-sans max-w-2xl">
              Los datasets georreferenciados para QGIS, transcripciones de entrevistas del Atlas.ti y bases consolidadas de encuestas para SPSS se protegen en nuestro <b className="text-cyan-400 font-medium">Portal Central de Datos</b> tras iniciar sesión como analista científico.
            </p>
          </div>
          <a
            id="pub-banner-portal-link"
            href="#inicio"
            onClick={(e) => {
              e.preventDefault();
              // Scroll to top or click button-portal
              const btn = document.getElementById('btn-portal-datos') || document.getElementById('btn-portal-datos-mobile');
              if (btn) btn.click();
            }}
            className="shrink-0 inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 py-2 text-xs uppercase cursor-pointer rounded-none tracking-wide transition-all shadow-[0_0_12px_rgba(0,240,255,0.2)] hover:shadow-[0_0_20px_rgba(0,240,255,0.45)] whitespace-nowrap"
          >
            <span>Ingresar al Portal</span>
            <Share2 className="h-3.5 w-3.5" />
          </a>
        </div>

      </div>
    </section>
  );
}
