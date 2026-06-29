import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, FileText, ExternalLink, Download, BookOpen, Filter, Calendar, Users, Award, Database, Share2, ChevronDown, ChevronUp, X, Loader2 } from 'lucide-react';

interface PublicationsSectionProps {
  isSubPage?: boolean;
  onViewAll?: () => void;
  onCloseSubPage?: () => void;
}

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

const mapCrossrefToPublication = (item: any): Publication => {
  const titleText = item.title && item.title.length > 0 ? item.title[0] : 'Investigación Académica';

  const authorsList = item.author && item.author.length > 0
    ? item.author
        .map((a: any) => `${a.given || ''} ${a.family || ''}`.trim())
        .slice(0, 3)
        .join(', ') + (item.author.length > 3 ? ' et al.' : '')
    : 'Autor Desconocido';

  let pubYear = '2026';
  if (item['published-print'] && item['published-print']['date-parts'] && item['published-print']['date-parts'][0]) {
    pubYear = String(item['published-print']['date-parts'][0][0]);
  } else if (item['published-online'] && item['published-online']['date-parts'] && item['published-online']['date-parts'][0]) {
    pubYear = String(item['published-online']['date-parts'][0][0]);
  } else if (item.created && item.created['date-parts'] && item.created['date-parts'][0]) {
    pubYear = String(item.created['date-parts'][0][0]);
  }

  const journalName = item['container-title'] && item['container-title'].length > 0
    ? item['container-title'][0]
    : item.publisher || 'Crossref Index';

  let abstractText = 'Sin resumen disponible.';
  if (item.abstract) {
    abstractText = String(item.abstract)
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const subject = item.subject && item.subject.length > 0 ? item.subject[0] : 'Ciencias Generales';

  return {
    id: item.DOI || String(Math.random()),
    title: titleText,
    authors: authorsList,
    type: 'paper',
    typeName: 'Registro Global',
    index: journalName.length > 22 ? journalName.substring(0, 20) + '...' : journalName,
    date: pubYear,
    line: typeof subject === 'string' ? subject : 'Ciencias Generales',
    abstract: abstractText || 'Sin resumen disponible.',
    doi: item.DOI,
    externalUrl: item.URL || `https://doi.org/${item.DOI}`
  };
};

export default function PublicationsSection({
  isSubPage = false,
  onViewAll,
  onCloseSubPage
}: PublicationsSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'paper' | 'bulletin' | 'report' | 'global'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [globalResults, setGlobalResults] = useState<Publication[]>([]);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);
  const [errorGlobal, setErrorGlobal] = useState<string | null>(null);

  const handleGlobalSearch = async (query: string) => {
    if (!query.trim()) return;
    setIsLoadingGlobal(true);
    setErrorGlobal(null);
    try {
      const response = await fetch(`https://api.crossref.org/works?query=${encodeURIComponent(query)}&rows=9&mailto=comite@iics.pe`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.message && data.message.items) {
          const mapped = data.message.items.map((item: any) => {
            try {
              return mapCrossrefToPublication(item);
            } catch (err) {
              console.error("Mapping error for Crossref work:", item, err);
              return null;
            }
          }).filter((p: any) => p !== null);
          
          if (mapped.length === 0 && data.message.items.length > 0) {
            setErrorGlobal("Los resultados se recibieron pero no se pudieron mapear correctamente.");
          }
          setGlobalResults(mapped);
        } else {
          setGlobalResults([]);
        }
      } else {
        setErrorGlobal(`Error del servidor Crossref (Código de estado: ${response.status})`);
      }
    } catch (e: any) {
      console.error("Crossref Fetch Error", e);
      setErrorGlobal(`Error de conexión: ${e.message || "Por favor verifica tu conexión a internet o CORS."}`);
    } finally {
      setIsLoadingGlobal(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (activeFilter === 'global') {
        handleGlobalSearch(searchTerm);
      }
    }
  };

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

  const displayedPublications = activeFilter === 'global'
    ? globalResults
    : (isSubPage || showAll ? filteredPublications : filteredPublications.slice(0, 3));

  return (
    <section 
      id="publicaciones"
      className={`relative z-10 w-full bg-transparent px-4 sm:px-6 lg:px-8 border-t border-zinc-950 overflow-hidden ${isSubPage ? 'pt-12 pb-24' : 'py-24'}`}
    >


      {/* Structural background highlights mimicking the app's DNA */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none"></div>

      <div className="mx-auto max-w-7xl">
        
        {/* Section Header */}
        <div className="text-left mb-12 relative">
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

        {/* Recent Publications Carousel */}
        <div className="mb-14 border-b border-zinc-900/60 pb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="h-1.5 w-1.5 rounded-full bg-[#0099ff]"></span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400">
              Materiales Recién Publicados (IICS II-2026)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center p-6 border border-cyan-500/20 bg-cyan-950/[0.01] hover:border-cyan-500/30 transition-all duration-500 rounded-none relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-500/[0.01] via-transparent to-transparent pointer-events-none" />
            
            {/* Slide Left: Cover Graphic */}
            <div className="md:col-span-3 flex justify-center">
              <div className="w-[140px] h-[190px] bg-gradient-to-br from-[#0c1424] to-[#040405] border border-cyan-500/30 relative flex flex-col justify-between p-3.5 shadow-[0_10px_30px_rgba(0,153,255,0.15)] transition-all duration-300">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,153,255,0.05))] from-cyan-500/5 via-transparent to-transparent pointer-events-none" />
                <div className="flex justify-between items-center font-mono text-[7px] text-cyan-400 border-b border-cyan-955/30 pb-1.5">
                  <span>VOL. 04 / N. 01</span>
                  <span>{publications.slice(0, 3)[carouselIndex].index}</span>
                </div>
                <div className="flex-1 flex flex-col justify-center py-2 text-left">
                  <span className="text-[8px] font-mono text-zinc-550 font-bold uppercase tracking-wider mb-0.5">ARTÍCULO</span>
                  <h4 className="text-[10px] font-extrabold uppercase text-white line-clamp-4 leading-snug tracking-wide">
                    {publications.slice(0, 3)[carouselIndex].title}
                  </h4>
                </div>
                <div className="border-t border-cyan-955/30 pt-1.5 flex items-center justify-between font-mono text-[6px] text-zinc-500">
                  <span>IICS PRESS</span>
                  <span>2026</span>
                </div>
              </div>
            </div>

            {/* Slide Right: Technical metadata & description */}
            <div className="md:col-span-9 text-left space-y-3">
              <div className="space-y-1">
                <span className="text-[9px] font-mono font-bold text-purple-400 uppercase tracking-widest block">
                  {publications.slice(0, 3)[carouselIndex].line}
                </span>
                <h3 className="text-lg font-bold tracking-tight text-white uppercase leading-snug">
                  {publications.slice(0, 3)[carouselIndex].title}
                </h3>
                <p className="text-xs font-mono text-zinc-400">
                  Por: <span className="text-zinc-200">{publications.slice(0, 3)[carouselIndex].authors}</span>
                </p>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed font-sans line-clamp-3">
                {publications.slice(0, 3)[carouselIndex].abstract}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  onClick={() => setExpandedId(expandedId === publications.slice(0, 3)[carouselIndex].id ? null : publications.slice(0, 3)[carouselIndex].id)}
                  className="inline-flex h-7 px-3.5 items-center gap-1.5 font-mono text-[9px] font-bold border border-cyan-500/20 bg-cyan-950/10 hover:bg-cyan-500 text-cyan-400 hover:text-black leading-none transition-all cursor-pointer uppercase rounded-none"
                >
                  <span>{expandedId === publications.slice(0, 3)[carouselIndex].id ? 'Contraer Resumen' : 'Ver Ficha Completa'}</span>
                </button>

                {publications.slice(0, 3)[carouselIndex].externalUrl && publications.slice(0, 3)[carouselIndex].externalUrl !== '#' && (
                  <a
                    href={publications.slice(0, 3)[carouselIndex].externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-7 px-3.5 items-center gap-1.5 font-mono text-[9px] font-bold border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white leading-none transition-all cursor-pointer uppercase rounded-none"
                  >
                    <span>Ir a la Web Oficial</span>
                    <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>

              {expandedId === publications.slice(0, 3)[carouselIndex].id && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 bg-zinc-950/40 border border-zinc-900 text-xs text-zinc-300 leading-relaxed font-sans space-y-2 mt-2"
                >
                  <p>{publications.slice(0, 3)[carouselIndex].abstract}</p>
                  {publications.slice(0, 3)[carouselIndex].doi && (
                    <div className="font-mono text-[9px] text-zinc-500 pt-2 border-t border-zinc-900">
                      <span className="font-bold uppercase">DOI: </span>
                      <span className="text-cyan-600/90">{publications.slice(0, 3)[carouselIndex].doi}</span>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Navigation dots */}
              <div className="flex items-center gap-1.5 pt-2">
                {publications.slice(0, 3).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setCarouselIndex(i); setExpandedId(null); }}
                    className={`h-1.5 transition-all duration-350 cursor-pointer ${
                      carouselIndex === i ? 'w-5 bg-cyan-400' : 'w-1.5 bg-zinc-805 hover:bg-zinc-700'
                    }`}
                    aria-label={`Ir al slide ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Call for Papers submission banner */}
        <div className="mb-10 bg-transparent border border-[#0099ff]/20 p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative select-none rounded-none text-left">
          <div className="absolute top-0 right-10 h-full w-24 bg-[radial-gradient(circle_at_right,_rgba(0,153,255,0.03),transparent)] pointer-events-none" />
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 text-[9px] font-mono font-bold text-cyan-400 uppercase tracking-widest">
              <FileText className="h-3 w-3" />
              <span>Convocatoria de Artículos Permanente (Convocatoria Abierta)</span>
            </span>
            <h4 className="text-base font-extrabold text-white uppercase tracking-wider font-sans mt-1">
              ¿Ha realizado un estudio social de precisión en el Norte Andino?
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans max-w-2xl font-medium">
              El IICS recibe de forma permanente propuestas de artículos científicos, reportes de campo y boletines de monitoreo. Su envío será evaluado por nuestro comité de Doctores RENACYT para su posible publicación e indexación en el repositorio.
            </p>
          </div>
          <button
            onClick={() => setIsSubmissionModalOpen(true)}
            className="shrink-0 inline-flex items-center gap-2 bg-[#0099ff] hover:bg-[#0077cc] text-slate-950 font-bold px-5 py-2.5 text-xs uppercase cursor-pointer rounded-none tracking-widest transition-all shadow-[0_0_12px_rgba(0,153,255,0.2)] hover:shadow-[0_0_20px_rgba(0,153,255,0.45)] whitespace-nowrap"
          >
            <span>Enviar Propuesta</span>
            <Share2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Filters and Search Bar row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-zinc-950 mb-10">
          
          {/* Tab buttons */}
          <div className="flex flex-wrap bg-white/[0.01] backdrop-blur-sm border border-white/[0.06] p-1 font-mono text-xs max-w-full">
            <button
              id="filter-pub-all"
              onClick={() => { setActiveFilter('all'); setSearchTerm(''); }}
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
              onClick={() => { setActiveFilter('paper'); setSearchTerm(''); }}
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
              onClick={() => { setActiveFilter('bulletin'); setSearchTerm(''); }}
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
              onClick={() => { setActiveFilter('report'); setSearchTerm(''); }}
              className={`flex-1 sm:flex-initial px-4 py-2 text-center transition-all cursor-pointer tracking-wider text-[10px] uppercase ${
                activeFilter === 'report'
                  ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-500/20 font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Reportes de Campo
            </button>
            <button
              id="filter-pub-global"
              onClick={() => {
                setActiveFilter('global');
                setSearchTerm('');
                setGlobalResults([]);
              }}
              className={`flex-1 sm:flex-initial px-4 py-2 text-center transition-all cursor-pointer tracking-wider text-[10px] uppercase ${
                activeFilter === 'global'
                  ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-500/20 font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Buscador Global (OpenAlex)
            </button>
          </div>

          {/* Search bar */}
          <div className="relative w-full lg:max-w-xs shrink-0 select-none">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-zinc-500">
              {isLoadingGlobal ? (
                <Loader2 className="h-4 w-4 animate-spin text-cyan-455" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </div>
            <input
              id="search-publications-input"
              type="text"
              placeholder={activeFilter === 'global' ? "Buscar en registro global... (Enter)" : "Buscar por título, autor..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-white/[0.01] border border-white/[0.06] py-2.5 pl-10 pr-16 text-xs text-white placeholder-zinc-550 focus:outline-none focus:border-cyan-500/40 font-mono transition-colors"
            />
            {activeFilter === 'global' && (
              <button
                onClick={() => handleGlobalSearch(searchTerm)}
                className="absolute right-2 top-1.5 z-30 px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-black font-mono text-[9px] font-bold uppercase transition-all cursor-pointer rounded-none"
              >
                Buscar
              </button>
            )}
          </div>

        </div>

        {errorGlobal && (
          <div className="mb-8 p-4 border border-red-500/20 bg-red-950/10 text-red-400 font-mono text-xs text-left rounded-none animate-fade-in">
            <span className="font-bold uppercase block mb-1">Error de Búsqueda Académica Global:</span>
            {errorGlobal}
          </div>
        )}

        {/* Publications Grid Area */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {!isLoadingGlobal && !errorGlobal && displayedPublications.map((pub) => {
              const isExpanded = expandedId === pub.id;
              
              return (
                <motion.div
                  id={`pub-card-${pub.id}`}
                  key={pub.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  whileHover={{ y: -6 }}
                  transition={{ duration: 0.25 }}
                  className="group relative flex flex-col justify-between bg-transparent border border-[#0099ff]/20 hover:border-[#0099ff] hover:shadow-[0_0_30px_rgba(0,153,255,0.15)] transition-all duration-300 p-6 rounded-none text-left"
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
                      <span className="text-zinc-300 truncate">{pub.authors}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5 mt-4">
                      {/* Database validation index */}
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-zinc-950 text-gray-300 border border-zinc-900 font-mono text-[10px] rounded-none">
                        <Award className="h-3 w-3 text-[#0099ff]" />
                        <span className="truncate max-w-[90px]">{pub.index}</span>
                      </span>

                      {/* Line of investigation tag */}
                      <span className="text-xs text-zinc-400 italic max-w-[130px] truncate">
                        {pub.line}
                      </span>
                    </div>

                    {/* Synopsis abstract text */}
                    <p className={`text-xs text-zinc-200 leading-relaxed font-sans border-t border-zinc-900/60 pt-3.5 mt-4 ${
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
                        <div className="flex items-center gap-1.5 border-t border-zinc-900 pt-2">
                          <span className="text-[9px] font-bold text-gray-600 uppercase">DOI:</span>
                          <span className="text-cyan-600/90">{pub.doi}</span>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Actions & expand buttons */}
                  <div className="flex items-center justify-between gap-4 mt-6 pt-4 border-t border-zinc-900/60">
                    <button
                      id={`btn-pub-expand-${pub.id}`}
                      onClick={() => setExpandedId(isExpanded ? null : pub.id)}
                      className="text-[10.5px] font-mono hover:text-white transition-colors cursor-pointer text-zinc-500 underline underline-offset-4 decoration-dotted"
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

          {/* Global Loading State spinner */}
          {isLoadingGlobal && (
            <div className="col-span-full py-24 text-center">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-cyan-400 mb-4" />
              <p className="text-sm text-zinc-350 font-mono animate-pulse uppercase tracking-wider">Conectando con el registro científico global de Crossref...</p>
            </div>
          )}

          {/* Global Search Tutorial Placeholder */}
          {activeFilter === 'global' && globalResults.length === 0 && !isLoadingGlobal && !errorGlobal && (
            <div className="col-span-full py-16 text-center border border-dashed border-zinc-800 bg-zinc-950/20">
              <Search className="mx-auto h-8 w-8 text-zinc-650 mb-3" />
              <p className="text-sm text-zinc-400 font-mono">Buscador Académico Global Directo (Crossref API)</p>
              <p className="text-xs text-zinc-500 font-sans mt-1 max-w-md mx-auto leading-relaxed">
                Busca en más de 120 millones de trabajos científicos y metadatos de Scopus, SciELO y Dialnet en todo el mundo. Ingresa un tema (ej. "sociology Cajamarca", "rural education Peru") y presiona el botón Buscar.
              </p>
            </div>
          )}

          {activeFilter !== 'global' && filteredPublications.length === 0 && (
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
        <div className="mt-16 bg-transparent border border-cyan-500/20 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative select-none rounded-none text-left">
          <div className="absolute top-0 right-10 h-full w-24 bg-gradient-to-l from-cyan-500/5 to-transparent pointer-events-none" />
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-[#0099ff] uppercase tracking-wider">
              <Database className="h-3 w-3" />
              <span>Acceso de Investigador</span>
            </span>
            <h4 className="text-sm font-extrabold text-white uppercase tracking-wider font-sans mt-1">
              ¿Desea acceder a las bases de datos crudas (datasets)?
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans max-w-2xl font-medium">
              Los datasets georreferenciados para QGIS, transcripciones de entrevistas del Atlas.ti y bases consolidadas de encuestas para SPSS se protegen en nuestro <b className="text-cyan-400 font-semibold font-mono">Portal Central de Datos</b> tras iniciar sesión como analista científico.
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
            className="shrink-0 inline-flex items-center gap-2 bg-[#0099ff] hover:bg-[#0077cc] text-slate-950 font-bold px-4 py-2 text-xs uppercase cursor-pointer rounded-none tracking-wide transition-all shadow-[0_0_12px_rgba(0,153,255,0.2)] hover:shadow-[0_0_20px_rgba(0,153,255,0.45)] whitespace-nowrap"
          >
            <span>Ingresar al Portal</span>
            <Share2 className="h-3.5 w-3.5" />
          </a>
        </div>

      </div>

      {/* Submission Modal overlay */}
      <AnimatePresence>
        {isSubmissionModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.65 }}
              exit={{ opacity: 0 }}
              onClick={() => { setIsSubmissionModalOpen(false); setIsSubmitted(false); }}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />
            
            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-[#09090b] border border-zinc-800 p-6 sm:p-8 rounded-none shadow-[0_0_50px_rgba(0,153,255,0.1)] text-left z-10"
            >
              <button
                onClick={() => { setIsSubmissionModalOpen(false); setIsSubmitted(false); }}
                className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Cerrar modal"
              >
                <X className="h-4 w-4" />
              </button>
              
              {!isSubmitted ? (
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    setIsSubmitted(true);
                  }}
                  className="space-y-5"
                >
                  <div className="space-y-1">
                    <span className="text-[9px] font-mono font-bold text-cyan-400 uppercase tracking-widest">
                      Formulario de Envío de Artículos
                    </span>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">
                      Enviar Propuesta Científica
                    </h3>
                    <p className="text-[11px] text-zinc-400 leading-relaxed font-sans font-medium">
                      Por favor complete la información solicitada. Las propuestas son revisadas de forma anónima (doble ciego) por nuestro comité editorial.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-mono uppercase text-zinc-400 tracking-wider">Nombre Completo</label>
                        <input
                          required
                          type="text"
                          placeholder="Dr. / Lic. / Bach. ..."
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500/40 py-2 px-3 text-xs text-white placeholder-zinc-650 focus:outline-none font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-mono uppercase text-zinc-400 tracking-wider">Correo Electrónico</label>
                        <input
                          required
                          type="email"
                          placeholder="autor@universidad.edu.pe"
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500/40 py-2 px-3 text-xs text-white placeholder-zinc-650 focus:outline-none font-mono"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-mono uppercase text-zinc-400 tracking-wider">Afiliación Institucional</label>
                        <input
                          required
                          type="text"
                          placeholder="Universidad Nacional de Cajamarca"
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500/40 py-2 px-3 text-xs text-white placeholder-zinc-650 focus:outline-none font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-mono uppercase text-zinc-400 tracking-wider">Línea de Investigación</label>
                        <select
                          required
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500/40 py-2 px-3 text-xs text-white focus:outline-none font-mono"
                        >
                          <option value="digital">Sociología Digital y Nuevas Tecnologías</option>
                          <option value="territorial">Sociología Territorial</option>
                          <option value="education">Educación y Juventudes</option>
                          <option value="development">Transformación Social y Desarrollo Regional</option>
                          <option value="gender">Género y Cambio Cultural</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-mono uppercase text-zinc-400 tracking-wider">Título del Artículo</label>
                      <input
                        required
                        type="text"
                        placeholder="Ej. Análisis espacial del riesgo hídrico en..."
                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500/40 py-2 px-3 text-xs text-white placeholder-zinc-650 focus:outline-none font-mono"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-mono uppercase text-zinc-400 tracking-wider">Resumen / Abstract</label>
                      <textarea
                        required
                        rows={3}
                        placeholder="Breve resumen del problema, metodología y conclusiones del artículo..."
                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500/40 py-2 px-3 text-xs text-white placeholder-zinc-650 focus:outline-none font-sans leading-relaxed resize-none"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-mono uppercase text-zinc-400 tracking-wider">Borrador (Enlace a Drive / PDF)</label>
                      <input
                        required
                        type="url"
                        placeholder="https://drive.google.com/file/d/..."
                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500/40 py-2 px-3 text-xs text-white placeholder-zinc-650 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                  
                  <div className="pt-2 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsSubmissionModalOpen(false)}
                      className="px-4 py-2 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 text-xs font-mono tracking-wider uppercase transition-all duration-300 cursor-pointer rounded-none"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer rounded-none"
                    >
                      Enviar Trabajo
                    </button>
                  </div>
                </form>
              ) : (
                <div className="py-8 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-cyan-950/40 border border-cyan-500/30 flex items-center justify-center mx-auto">
                    <Award className="h-6 w-6 text-cyan-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-base font-extrabold text-white uppercase tracking-wider font-mono">
                      Propuesta Recibida con Éxito
                    </h3>
                    <p className="text-xs text-zinc-300 leading-relaxed font-sans max-w-sm mx-auto">
                      Su propuesta ha sido registrada en los servidores de arbitraje del IICS. Un revisor RENACYT evaluará el borrador y se pondrá en contacto en un plazo máximo de 10 días útiles.
                    </p>
                  </div>
                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={() => { setIsSubmissionModalOpen(false); setIsSubmitted(false); }}
                      className="px-6 py-2 bg-zinc-900 border border-zinc-850 hover:border-zinc-700 text-white hover:text-cyan-400 text-xs font-mono tracking-wider uppercase transition-all duration-300 cursor-pointer rounded-none"
                    >
                      Entendido
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
