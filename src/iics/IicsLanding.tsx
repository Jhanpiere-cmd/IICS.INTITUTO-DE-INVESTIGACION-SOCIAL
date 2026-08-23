/**
 * IICS / Archivo negro: landing institucional editorial. Negro profundo, tipografía dominante, reglas finas,
 * fotografía territorial real y cero elementos decorativos sin función.
 */
import { useEffect, useRef, useState } from "react";
import { EditorialLink } from "./components/EditorialLink";
import { IicsFooter } from "./components/IicsFooter";
import { IicsHeader } from "./components/IicsHeader";
import { SectionLabel } from "./components/SectionLabel";

const IICS_STYLESHEET_ID = "iics-landing-stylesheet";

function useIicsLandingStyles() {
  useEffect(() => {
    if (document.getElementById(IICS_STYLESHEET_ID)) return;

    const stylesheet = document.createElement("link");
    stylesheet.id = IICS_STYLESHEET_ID;
    stylesheet.rel = "stylesheet";
    stylesheet.href = "/iics-assets/iics-landing.css";
    document.head.appendChild(stylesheet);

    return () => stylesheet.remove();
  }, []);
}

const ecosystem = [
  { number: "01", title: "Observatorio", text: "Seguimiento de cambios sociales, opinión pública y territorio para comprender lo que está ocurriendo.", href: "#observatorio" },
  { number: "02", title: "Laboratorio", text: "Análisis de información pública y digital para identificar patrones, tendencias y cambios sociales.", href: "#laboratorio" },
  { number: "03", title: "Investigación", text: "Preguntas rigurosas sobre las transformaciones que atraviesan Cajamarca y el norte del Perú.", href: "#investigacion" },
  { number: "04", title: "Publicaciones", text: "Resultados de investigación organizados como un archivo abierto, legible y verificable.", href: "#publicaciones" },
  { number: "05", title: "Formación", text: "Práctica, mentoría y metodología para quienes comienzan a investigar.", href: "#formacion" },
  { number: "06", title: "Consultorías", text: "Investigación aplicada para empresas, instituciones y organizaciones que necesitan comprender mejor su contexto.", href: "#consultorias" },
  { number: "07", title: "Ecosistema tecnológico", text: "Plataforma integrada, modelos e infraestructura desarrollados por Zolexy Solutions.", href: "#ecosistema-tecnologico" },
];

const researchLines = [
  { number: "01", title: "Transformación Social", text: "Cambios en las formas de vivir, trabajar, participar y construir comunidad." },
  { number: "02", title: "Sociología Territorial", text: "Relaciones entre territorio, economía, instituciones y vida cotidiana." },
  { number: "03", title: "Sociología Digital", text: "Nuevos espacios de conversación, información y opinión pública." },
  { number: "04", title: "Educación y Juventudes", text: "Experiencias, expectativas y oportunidades de las nuevas generaciones." },
  { number: "05", title: "Género y Cambio Cultural", text: "Transformaciones culturales y relaciones de género en el territorio." },
];

const audiences = [
  ["Investigadores", "Evidencia, métodos y publicaciones para ampliar preguntas."],
  ["Estudiantes", "Formación práctica para aprender a observar, preguntar y analizar."],
  ["Empresas", "Lecturas de contexto para tomar decisiones con mayor comprensión."],
  ["Instituciones", "Información territorial para diseñar respuestas más pertinentes."],
  ["Sociedad civil", "Conocimiento accesible sobre las transformaciones que vivimos."],
];

const consultingServices = [
  ["Diagnóstico territorial", "Lecturas de contexto para comprender comunidades, mercados y procesos de cambio."],
  ["Estudios cualitativos", "Entrevistas, grupos de conversación y etnografía para escuchar lo que los datos no dicen solos."],
  ["Estudios cuantitativos", "Encuestas, medición de opinión e indicadores para tomar decisiones con evidencia."],
  ["Evaluación y estrategia", "Análisis de proyectos, programas y escenarios para orientar mejores respuestas."],
];

const rexisPlans = [
  { name: "Estudiante", price: "S/ 20", note: "Acceso inicial para ordenar y comenzar una investigación.", features: ["Gestor de biblioteca personal", "Motor de búsqueda", "Asistente IA de apoyo"] },
  { name: "Profesional", price: "S/ 29", note: "Un entorno de trabajo para investigar con continuidad.", features: ["Biblioteca y búsqueda académica", "Notas de campo, entrevistas y encuestas", "Análisis cualitativo"] },
  { name: "Investigador Élite", price: "S/ 49", note: "Más capacidad para analizar evidencia y resultados.", features: ["Asistente IA avanzado", "Análisis cualitativo y cuantitativo", "Gráficas de investigación"] },
];

const featuredManifesto = {
  title: "Manifiesto IICS 2026",
  summary: "Una declaración de principios y hoja de ruta para investigar desde Cajamarca con autonomía, territorio, datos y evidencia social.",
  pages: "30 páginas",
  cover: "/iics-assets/manifiesto-iics-2026-cover.png",
  href: "/iics-assets/manifiesto-iics-2026.pdf",
};

const heroSlides = [
  {
    id: "territorio",
    label: "01 / TERRITORIO",
    title: "Cajamarca / territorio de estudio",
    description: "Una mirada situada para leer las transformaciones sociales desde el lugar donde ocurren.",
    image: "/iics-assets/iics-cajamarca-hero-cutout.png",
    alt: "Recorte editorial de Cajamarca con sus tejados, catedral y cordillera andina",
    signal: "Cajamarca / territorio",
    fit: "cutout",
    href: "#nosotros",
    cta: "Conocer el enfoque",
  },
  {
    id: "observatorio",
    label: "02 / OBSERVATORIO",
    title: "Señales del territorio",
    description: "Indicadores, mapas y lectura de contexto para comprender lo que está ocurriendo en Cajamarca.",
    image: "/iics-assets/observatorio-social-cajamarca-dashboard.png",
    alt: "Panel visual del Observatorio Social Cajamarca con indicadores y mapa territorial",
    signal: "Observatorio",
    fit: "contain",
    href: "#observatorio",
    cta: "Explorar el Observatorio",
  },
  {
    id: "manifiesto",
    label: "03 / ARCHIVO",
    title: "Manifiesto IICS 2026",
    description: "Principios y hoja de ruta para investigar desde Cajamarca con autonomía, territorio, datos y evidencia social.",
    image: "/iics-assets/manifiesto-iics-2026-cover.png",
    alt: "Portada del Manifiesto IICS 2026",
    signal: "Manifiesto IICS 2026",
    fit: "compact",
    href: "#publicaciones",
    cta: "Leer la publicación",
  },
  {
    id: "documental",
    label: "04 / DOCUMENTAL",
    title: "Voces de la Ruralidad",
    description: "La investigación también se cuenta: territorio, memoria y voces que construyen conocimiento.",
    image: "/iics-assets/iics-documental-rural.jpg",
    alt: "Mujer de una comunidad rural de Cajamarca frente a la cordillera andina",
    signal: "Documental",
    fit: "cover",
    href: "#documentales",
    cta: "Ver documentales",
  },
  {
    id: "publicacion",
    label: "05 / PUBLICACIONES",
    title: "Un archivo para hacer circular el conocimiento",
    description: "Publicaciones legibles y verificables para que las preguntas y sus hallazgos permanezcan abiertos.",
    image: "/iics-assets/cajamarca-arquitectura-real.jpg",
    alt: "Detalle de arquitectura histórica de Cajamarca",
    signal: "Publicaciones",
    fit: "cover",
    href: "#publicaciones",
    cta: "Visitar Publicaciones",
  },
] as const;

function useReveal() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { threshold: 0.12 });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, visible };
}

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { ref, visible } = useReveal();
  return <div ref={ref} className={`reveal ${visible ? "reveal--visible" : ""} ${className}`}>{children}</div>;
}

function HeroCarousel() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncMotionPreference = () => setReducedMotion(mediaQuery.matches);
    syncMotionPreference();
    mediaQuery.addEventListener("change", syncMotionPreference);
    return () => mediaQuery.removeEventListener("change", syncMotionPreference);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % heroSlides.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [reducedMotion]);

  const goToSlide = (index: number) => setActiveSlide((index + heroSlides.length) % heroSlides.length);
  const getSlidePosition = (index: number) => {
    const offset = (index - activeSlide + heroSlides.length) % heroSlides.length;
    if (offset === 0) return "center";
    if (offset === 1) return "right";
    if (offset === heroSlides.length - 1) return "left";
    return "hidden";
  };

  return (
    <figure className="hero-carousel">
      <div className="hero-carousel__viewport" aria-live={reducedMotion ? "polite" : "off"}>
        {heroSlides.map((slide, index) => (
          <article
            className={`hero-carousel__slide hero-carousel__slide--${getSlidePosition(index)}`}
            key={slide.id}
            aria-hidden={index !== activeSlide}
            aria-roledescription="lámina"
            aria-label={`${index + 1} de ${heroSlides.length}: ${slide.title}`}
          >
            <div className="hero-carousel__card">
              <div className="hero-carousel__visual">
                <a
                  className="hero-carousel__image-link"
                  href={slide.href}
                  aria-label={`${slide.cta}: ${slide.title}`}
                  tabIndex={index === activeSlide ? 0 : -1}
                >
                  <img className={`hero-carousel__image hero-carousel__image--${slide.fit}`} src={slide.image} alt={index === activeSlide ? slide.alt : ""} />
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>
      <p className="hero-carousel__signal" aria-live="polite">
        <span>{String(activeSlide + 1).padStart(2, "0")}</span> · {heroSlides[activeSlide].signal}
      </p>
      <div className="hero-carousel__controls" aria-label="Controles del carrusel editorial">
        <button type="button" className="hero-carousel__arrow" onClick={() => goToSlide(activeSlide - 1)} aria-label="Lámina anterior">←</button>
        <div className="hero-carousel__dots">
          {heroSlides.map((slide, index) => (
            <button
              type="button"
              className={`hero-carousel__dot ${index === activeSlide ? "hero-carousel__dot--active" : ""}`}
              key={slide.id}
              onClick={() => goToSlide(index)}
              aria-label={`Ir a la lámina ${index + 1}: ${slide.title}`}
              aria-current={index === activeSlide ? "true" : undefined}
            />
          ))}
        </div>
        <button type="button" className="hero-carousel__arrow" onClick={() => goToSlide(activeSlide + 1)} aria-label="Lámina siguiente">→</button>
      </div>
      <figcaption className="sr-only">Carrusel editorial del IICS: territorio, observatorio, archivo, documental y publicaciones.</figcaption>
    </figure>
  );
}

export default function Home() {
  useIicsLandingStyles();

  return (
    <div className="iics-site">
      <IicsHeader current="inicio" />
      <main>
        <section id="inicio" className="hero section-shell">
          <div className="hero-copy">
            <h1>Comprendemos el presente.<br /><span>Anticipamos</span> el futuro.</h1>
            <p className="hero-description">Investigación social, datos y tecnología para comprender las transformaciones de Cajamarca y el norte del Perú.</p>
            <div className="hero-actions">
              <EditorialLink href="#publicaciones" variant="solid">Conoce nuestras investigaciones</EditorialLink>
              <EditorialLink href="#observatorio">Explorar el Observatorio</EditorialLink>
            </div>
          </div>
          <HeroCarousel />
        </section>

        <Reveal>
          <section id="nosotros" className="section-shell intro-section">
            <SectionLabel index="01">Qué hacemos</SectionLabel>
            <div className="intro-grid">
              <h2>Investigamos la realidad para entenderla mejor.</h2>
              <div className="intro-text">
                <p>El IICS es un instituto privado e independiente de investigación social. Combinamos sociología, trabajo de campo, datos, tecnología y conocimiento del territorio para producir evidencia útil.</p>
                <p>Trabajamos desde Cajamarca para comprender cambios que afectan la vida cotidiana, las instituciones y las comunidades. La investigación no termina en un informe: busca hacer visible lo que importa y abrir mejores decisiones.</p>
              </div>
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section className="section-shell precision-section">
            <SectionLabel index="02">Método</SectionLabel>
            <div className="precision-header">
              <h2>Sociología de Precisión</h2>
              <p>Combinamos investigación social, datos, tecnología y conocimiento del territorio para convertir fenómenos complejos en evidencia que pueda comprenderse y utilizarse.</p>
            </div>
            <div className="method-line" aria-label="Proceso de investigación: campo, datos, análisis, evidencia, decisión">
              {["Campo", "Datos", "Análisis", "Evidencia", "Decisión"].map((item, index, items) => (
                <div className="method-step" key={item}><span>{item}</span>{index < items.length - 1 && <span className="method-arrow" aria-hidden="true">→</span>}</div>
              ))}
            </div>
            <div className="pillars-line" aria-label="Pilares del IICS">
              {["Autonomía", "Rigor", "Territorio", "Datos"].map((pillar) => (
                <div className="pillar" key={pillar}><strong>{pillar}</strong><span>{pillar === "Autonomía" ? "Preguntas propias." : pillar === "Rigor" ? "Métodos claros." : pillar === "Territorio" ? "Conocimiento situado." : "Evidencia para actuar."}</span></div>
              ))}
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section className="section-shell ecosystem-section">
            <SectionLabel index="03">Ecosistema IICS</SectionLabel>
            <div className="section-heading-row"><h2>Una investigación conectada con el territorio.</h2><p>El IICS articula observación, análisis, investigación, publicaciones y formación. Cada parte existe para que el conocimiento circule.</p></div>
            <div className="editorial-list ecosystem-list">
              {ecosystem.map((item) => <a href={item.href} className="editorial-row" key={item.number}><span className="row-number">{item.number}</span><span className="row-title">{item.title}</span><span className="row-description">{item.text}</span><span className="row-arrow" aria-hidden="true">↗</span></a>)}
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section id="observatorio" className="section-shell observatory-section">
            <SectionLabel index="04">Observatorio Sociológico</SectionLabel>
            <div className="feature-grid">
              <div className="feature-copy">
                <h2>Ver las señales antes de que se vuelvan ruido.</h2>
                <p>El Observatorio monitorea cambios sociales, opinión pública, conflictividad y demandas ciudadanas en las 13 provincias de Cajamarca. Su propósito es ayudar a comprender lo que está ocurriendo en el territorio.</p>
                <div className="plain-list"><span>Indicadores territoriales</span><span>Monitoreo de opinión</span><span>Alertas tempranas</span><span>Análisis geográfico</span><span>Tendencias</span></div>
                <EditorialLink href="/portal">Explorar el Observatorio</EditorialLink>
              </div>
              <figure className="preview-frame preview-frame--uncropped"><img src="/iics-assets/observatorio-social-cajamarca-dashboard.png" alt="Referencia visual del panel del Observatorio Social Cajamarca con indicadores, mapa y evolución de variables" /><figcaption>Referencia visual / interfaz proyectada del Observatorio Social Cajamarca / indicadores sujetos a validación</figcaption></figure>
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section id="laboratorio" className="section-shell laboratory-section">
            <SectionLabel index="05">Laboratorio de Sociología Digital</SectionLabel>
            <div className="laboratory-grid"><h2>Leer lo que cambia en la conversación pública.</h2><div><p>Analizamos grandes cantidades de información pública y digital para identificar patrones, tendencias y cambios en la opinión social.</p><p>El procesamiento de lenguaje natural, el análisis de sentimiento, la ciencia de datos y la inteligencia artificial son herramientas para investigar mejor, no protagonistas de la investigación.</p><div className="lab-note"><span>BERT-IICS-V2</span><span>modelo contextual para análisis social</span></div><EditorialLink href="#contacto">Conocer el Laboratorio</EditorialLink></div></div>
          </section>
        </Reveal>

        <Reveal>
          <section id="investigacion" className="section-shell research-section">
            <SectionLabel index="06">Investigación</SectionLabel>
            <div className="section-heading-row research-heading"><h2>Líneas de investigación</h2><p>Preguntas abiertas para leer el presente con rigor, contexto y una mirada atenta a las transformaciones culturales.</p></div>
            <div className="editorial-list research-list">{researchLines.map((line) => <div className="editorial-row research-row" key={line.number}><span className="row-number">{line.number}</span><span className="row-title">{line.title}</span><span className="row-description">{line.text}</span><span className="row-arrow" aria-hidden="true">→</span></div>)}</div>
          </section>
        </Reveal>

        <Reveal>
          <section id="formacion" className="section-shell academy-section">
            <SectionLabel index="07">Formación / AFI</SectionLabel>
            <div className="academy-grid"><h2>Formamos a la próxima generación de investigadores.</h2><div className="academy-copy"><p>La Academia de Formación en Investigación acompaña a estudiantes e investigadores jóvenes en el aprendizaje práctico de la investigación social.</p><div className="academy-details"><span>Aprender haciendo</span><span>Mentoría cercana</span><span>Metodología aplicada</span></div><EditorialLink href="#contacto">Conocer AFI</EditorialLink></div></div>
          </section>
        </Reveal>

        <Reveal>
          <section id="documentales" className="section-shell documentary-section">
            <SectionLabel index="08">Documentales y Reportajes</SectionLabel>
            <div className="documentary-grid"><figure className="documentary-visual"><img src="/iics-assets/iics-documental-rural.jpg" alt="Mujer de una comunidad rural de Cajamarca trabajando frente a la cordillera andina" /><figcaption>Territorio / voces que construyen conocimiento</figcaption></figure><div className="documentary-copy"><p className="feature-kicker">La investigación también se cuenta.</p><h2>Voces de la Ruralidad</h2><p>El documental, la etnografía audiovisual y la producción transmedia acercan la investigación y las voces del territorio a públicos más amplios.</p><EditorialLink href="#contacto">Ver documentales</EditorialLink></div></div>
          </section>
        </Reveal>

        <Reveal>
          <section id="publicaciones" className="section-shell publications-section">
            <SectionLabel index="09">Publicaciones</SectionLabel>
            <div className="section-heading-row"><h2>Un archivo para volver a las preguntas.</h2><p>El archivo editorial reúne resultados de investigación con títulos, autores, años y categorías verificadas. La primera pieza disponible es el documento institucional que explica qué es el IICS y hacia dónde investiga.</p></div>
            <article className="manifesto-home-feature">
              <div className="manifesto-home-feature__media"><img src={featuredManifesto.cover} alt="Portada del Manifiesto IICS 2026" /><span>Documento institucional / {featuredManifesto.pages}</span></div>
              <div className="manifesto-home-feature__copy">
                <div className="publication-card__meta"><span>Manifiesto</span><span>PDF · 2026</span></div>
                <span className="row-number">IICS / DOCUMENTO DESTACADO</span>
                <h3>{featuredManifesto.title}</h3>
                <p>{featuredManifesto.summary}</p>
                <div className="manifesto-home-feature__actions">
                  <EditorialLink href="#publicaciones">Leer la ficha y el resumen</EditorialLink>
                  <a className="editorial-link" href={featuredManifesto.href} download="Manifiesto_IICS_2026.pdf">Descargar PDF <span className="editorial-link__arrow" aria-hidden="true">↓</span></a>
                </div>
              </div>
            </article>
          </section>
        </Reveal>

        <Reveal>
          <section className="section-shell audiences-section">
            <SectionLabel index="10">Para quién trabajamos</SectionLabel>
            <div className="section-heading-row"><h2>El conocimiento sirve cuando puede ser usado.</h2><p>La investigación social no está dirigida a una sola comunidad. Queremos que la evidencia sea comprensible y relevante para distintas formas de participar en el territorio.</p></div>
            <div className="audience-list">{audiences.map(([title, text], index) => <div className="audience-row" key={title}><span className="row-number">0{index + 1}</span><strong>{title}</strong><span>{text}</span></div>)}</div>
          </section>
        </Reveal>

        <Reveal>
          <section id="consultorias" className="section-shell consulting-section">
            <SectionLabel index="11">Consultorías / Investigación aplicada</SectionLabel>
            <div className="consulting-grid">
              <div>
                <h2>Investigación para decidir mejor.</h2>
                <p className="consulting-lead">Ofrecemos consultorías y servicios de investigación social para empresas, instituciones, organizaciones de la sociedad civil y personas que necesitan comprender mejor un territorio, una comunidad o un proceso de cambio.</p>
                <EditorialLink href="#contacto">Conversar sobre un proyecto</EditorialLink>
              </div>
              <div className="consulting-services">
                {consultingServices.map(([title, text], index) => <div className="consulting-service" key={title}><span className="row-number">0{index + 1}</span><div><strong>{title}</strong><p>{text}</p></div></div>)}
              </div>
            </div>
            <div className="consulting-audience"><span>Empresas</span><span>Instituciones</span><span>Organizaciones</span><span>Profesionales</span><span>Personas</span></div>
          </section>
        </Reveal>

        <Reveal>
          <section id="ecosistema-tecnologico" className="section-shell technology-section">
            <SectionLabel index="12">Ecosistema Tecnológico</SectionLabel>
            <div className="technology-grid">
              <div className="technology-copy">
                <p className="feature-kicker">Plataforma integrada, modelos e infraestructura por Zolexy Solutions.</p>
                <h2>La investigación también necesita una buena infraestructura.</h2>
                <p>Zolexy Solutions es la startup de ingeniería de software encargada del diseño, desarrollo y despliegue del ecosistema digital completo del IICS. Esto incluye el portal web oficial, modelos avanzados de Inteligencia Artificial para análisis de sentimiento, APIs de monitoreo territorial interactivo y el sistema integrado de gestión ERP centralizado.</p>
                <p>La tecnología se desarrolla para que el instituto pueda organizar datos, administrar operaciones y convertir investigación en herramientas más accesibles.</p>
                <div className="technology-lockup"><img src="/iics-assets/zolexy-solutions-logo.webp" alt="Logo de Zolexy Solutions" /><span>INGENIERÍA <i>·</i> DISEÑO COGNITIVO <i>·</i> IA ADAPTATIVA</span><span>SEDE CENTRAL / CAJAMARCA, PERÚ</span></div>
              </div>
              <figure className="technology-visual"><img src="/iics-assets/iics-ecosystem-technology.jpg" alt="Visual abstracto del ecosistema tecnológico del IICS, con líneas de datos y capas de infraestructura" /><figcaption>Ecosistema tecnológico / desarrollo por Zolexy Solutions</figcaption></figure>
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section id="rexis" className="section-shell rexis-section">
            <SectionLabel index="13">Producto asociado / REXIS</SectionLabel>
            <div className="rexis-product-block">
              <div className="rexis-grid">
                <div>
                  <div className="rexis-brand-lockup"><img className="rexis-symbol" src="/iics-assets/rexis-symbol-mark.svg" alt="Símbolo REXIS" /><div><strong>REXIS</strong><span>Research intelligence system</span></div></div>
                  <p className="feature-kicker">Producto asociado de Zolexy Solutions / software en desarrollo</p>
                  <h2>Investigar sin que la herramienta se vuelva un obstáculo.</h2>
                </div>
                <div className="rexis-copy">
                  <p>REXIS es un producto SaaS de investigación avanzada desarrollado y operado por Zolexy Solutions. Es un producto asociado al ecosistema del IICS, pero no es un servicio institucional del instituto. Su lanzamiento se prepara próximamente en versión beta.</p>
                  <div className="rexis-status-line"><span>PRODUCTO ASOCIADO</span><span>ZOLEXY SOLUTIONS</span><span>EN DESARROLLO</span><span>PRÓXIMO LANZAMIENTO BETA</span></div>
                  <div className="rexis-features"><span>Gestor de biblioteca</span><span>Motor de búsqueda</span><span>Asistente IA</span><span>Notas de campo</span><span>Entrevistas y encuestas</span><span>Análisis cualitativo y cuantitativo</span><span>Gráficas de investigación</span></div>
                  <EditorialLink href="#contacto">Solicitar información sobre REXIS</EditorialLink>
                </div>
              </div>
              <div className="rexis-brief">
                <div>
                  <span className="feature-kicker">Qué es / para qué sirve</span>
                  <p>REXIS reúne biblioteca, búsqueda, asistencia de IA, notas de campo, entrevistas, encuestas y análisis de datos en un mismo entorno de investigación.</p>
                </div>
                <div>
                  <span className="feature-kicker">Alcance de la beta</span>
                  <p>La primera versión prioriza organizar, encontrar y analizar evidencia. No incluirá editor de documentos, Word ni formato APA 7.</p>
                </div>
              </div>
              <div className="rexis-plan-summary">
                <div className="rexis-plan-summary__heading"><span className="feature-kicker">Planes referenciales de REXIS</span><p>Precios propios del producto, todavía sujetos a validación antes del lanzamiento.</p></div>
                <div className="rexis-plan-summary__rows">
                  {rexisPlans.map((plan, index) => <div className="rexis-plan-summary__row" key={plan.name}><span className="row-number">0{index + 1}</span><strong>{plan.name}</strong><span>{plan.price}<small>/mensual</small></span><p>{plan.note}</p></div>)}
                </div>
              </div>
              <div className="rexis-platform-note"><span className="feature-kicker">Próximo paso</span><p>El detalle de módulos, acceso beta, soluciones institucionales y condiciones de uso se conocerá cuando REXIS sea presentado en su propia plataforma web.</p><EditorialLink href="#contacto">Conocer el lanzamiento</EditorialLink></div>
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section id="contacto" className="final-cta section-shell"><p className="eyebrow">IICS / Instituto de Investigación Científica Social</p><h2>Investigar también es anticipar.</h2><p>Comprender el presente con autonomía, rigor y territorio es una forma de construir mejores preguntas para el futuro.</p><div className="final-actions"><EditorialLink href="#inicio" variant="solid">Conocer el IICS</EditorialLink><EditorialLink href="#footer">Contactar</EditorialLink></div></section>
        </Reveal>
      </main>

      <IicsFooter />
    </div>
  );
}
