export type HeroButtonAction = 'publications' | 'observatory' | 'documentaries' | 'afi' | 'none';

export interface LandingHeroContent {
  eyebrow: string;
  headline_primary: string;
  headline_accent: string;
  subtitle: string;
  description: string;
  primary_button_label: string;
  primary_button_action: HeroButtonAction;
  secondary_button_label: string;
  secondary_button_action: HeroButtonAction;
  tertiary_button_label: string;
  tertiary_button_action: HeroButtonAction;
  quaternary_button_label: string;
  quaternary_button_action: HeroButtonAction;
  image_url: string;
  image_alt: string;
  support_statement: string;
  value_card_one_title: string;
  value_card_one_text: string;
  value_card_two_title: string;
  value_card_two_text: string;
  is_published: boolean;
}

export const HERO_ACTION_LABELS: Record<HeroButtonAction, string> = {
  publications: 'Abrir publicaciones',
  observatory: 'Abrir observatorio',
  documentaries: 'Abrir documentales',
  afi: 'Abrir Academia AFI',
  none: 'Sin accion',
};

export const DEFAULT_LANDING_HERO: LandingHeroContent = {
  eyebrow: 'Centro Privado de Investigacion Cientifica, Sociologia y Analisis Social',
  headline_primary: 'Comprendemos el presente.',
  headline_accent: 'Anticipamos el futuro.',
  subtitle: 'Centro Privado de Investigacion Cientifica, Sociologia y Analisis Social',
  description:
    'Generamos estudios, monitoreo territorial, analisis de opinion publica y evidencia cientifica para instituciones, empresas y tomadores de decision.',
  primary_button_label: 'Explorar publicaciones',
  primary_button_action: 'publications',
  secondary_button_label: 'Explorar Observatorio',
  secondary_button_action: 'observatory',
  tertiary_button_label: 'Documentales y Reportajes',
  tertiary_button_action: 'documentaries',
  quaternary_button_label: 'Academia AFI (Postulacion)',
  quaternary_button_action: 'afi',
  image_url: '/computador-iics.png',
  image_alt: 'Sistema IICS Observatorio',
  support_statement: 'Generamos conocimiento util para la sociedad y la gestion publica.',
  value_card_one_title: 'SOCIOLOGIA DE PRECISION',
  value_card_one_text: 'Aplicamos sociologia de precision para producir conocimiento regional de alto impacto.',
  value_card_two_title: 'INNOVACION METODOLOGICA',
  value_card_two_text: 'Integramos ciencia de datos y herramientas de IA aplicada desde Cajamarca, Peru.',
  is_published: true,
};

export const normalizeHeroContent = (value: Partial<LandingHeroContent> | null | undefined): LandingHeroContent => ({
  ...DEFAULT_LANDING_HERO,
  ...(value || {}),
});

export type AboutMemberCategory = 'promotor' | 'academico';

export interface LandingAboutMember {
  id: string;
  name: string;
  role: string;
  category: AboutMemberCategory;
  avatar: string;
  desc: string;
  tag: string;
  highlight: string;
  academicTitle: string;
  focus: string;
  is_visible: boolean;
}

export interface LandingAboutContent {
  eyebrow: string;
  title: string;
  intro: string;
  story_eyebrow: string;
  story_title: string;
  story_paragraph_one: string;
  story_paragraph_two: string;
  quote: string;
  story_paragraph_three: string;
  team_eyebrow: string;
  team_title: string;
  team_intro: string;
  network_title: string;
  network_intro: string;
  network_support: string;
  values_eyebrow: string;
  values_title: string;
  values_intro: string;
  cta_label: string;
  team_members: LandingAboutMember[];
  is_published: boolean;
}

export const DEFAULT_ABOUT_MEMBERS: LandingAboutMember[] = [
  {
    id: 'edwar',
    name: 'Edwar Jhanpiere Saenz Tello',
    role: 'CEO, Fundador e Ideas',
    category: 'promotor',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=400&h=400',
    desc: 'Estudiante del 5 ciclo de Sociologia (UNC), tecnologo de desarrollo frontend/backend graduado en IDAT y CEO de Zolexy Solutions. Une la ciencia social pura del norte andino con arquitecturas de procesamiento y software del siglo XXI.',
    tag: 'Ciencia de Datos & Desarrollo',
    highlight: 'Soporte DevOps & Logica Semantica',
    academicTitle: 'Ideador Central de la Consola',
    focus: 'Democratizacion de la informacion territorial y el software de alta escala para Cajamarca.',
    is_visible: true,
  },
  {
    id: 'henry',
    name: 'Henry Diaz Bueno',
    role: 'Director Co-Fundador',
    category: 'promotor',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=400&h=400',
    desc: 'Destacado estudiante del 9 ciclo de Sociologia en la Universidad Nacional de Cajamarca. Experto en planeamiento de muestreo rural, recoleccion analitica, resolucion de conflictos y compromiso con reducir asimetrias de informacion.',
    tag: 'Metodologia Rural & Diagnostico',
    highlight: 'Liderazgo de Muestreo de Campo',
    academicTitle: 'Supervisor de Consistencia Territorial',
    focus: 'Establecimiento de metodologias de campo y de confianza mutua con organizaciones vecinales.',
    is_visible: true,
  },
  {
    id: 'mendoza',
    name: 'M. Cs. Juan Romelio Mendoza',
    role: 'Docente UNC - Investigador RENACYT',
    category: 'academico',
    avatar: 'https://images.unsplash.com/photo-1500048993953-d23a436266cf?auto=format&fit=crop&q=80&w=400&h=400',
    desc: 'Lider academico de gran notoriedad cientifica en Cajamarca. Asume el rol de consejero metodologico central del IICS, garantizando filtro por pares e institucionalidad sociologica clasica.',
    tag: 'Asesoria Principal RENACYT',
    highlight: 'Validacion Epistemica Clasica',
    academicTitle: 'Presidente del Comite Consejero',
    focus: 'Validacion robusta de modelos socioeconomicos y auditoria metodologica de los estudios.',
    is_visible: true,
  },
  {
    id: 'tejada',
    name: 'Luis Tejada',
    role: 'Docente e Investigador UNC',
    category: 'academico',
    avatar: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&q=80&w=400&h=400',
    desc: 'Docente de la Facultad de Ciencias Sociales de la UNC. Facilita programas de capacitacion continua y vincula semilleros juveniles con esquemas teoricos validados.',
    tag: 'Estructuracion y Enlace UNC',
    highlight: 'Coordinador de Semilleros Cientificos',
    academicTitle: 'Consejero de Enlace Academico',
    focus: 'Analisis critico de coyuntura regional y asimetrias sociales.',
    is_visible: true,
  },
  {
    id: 'becerra',
    name: 'Luis Becerra',
    role: 'Especialista en Sociologia Rural',
    category: 'academico',
    avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=400&h=400',
    desc: 'Especialista con amplio recorrido en dinamica rural, cuencas andinas y asimetria de asentamientos en el norte del pais. Brinda asesoria en el diseno de alertas sociales de impacto.',
    tag: 'Diagnostico Rural & Cuencas',
    highlight: 'Modelado Social del Espacio',
    academicTitle: 'Asesor del Laboratorio de Conflictos',
    focus: 'Diagnostico situacional de cuencas de Cajamarca y preservacion de saberes campesinos.',
    is_visible: true,
  },
];

export const DEFAULT_LANDING_ABOUT: LandingAboutContent = {
  eyebrow: 'IICS - BIOGRAFIA, EQUIPO & VISION NO REFORMISTA',
  title: 'Quienes Somos e Identidad Autonoma',
  intro:
    'Conozca de forma integrada la historia que forjo el Instituto de Investigacion Cientifica Social. Al romper las trabas burocraticas, establecemos un enfoque basado puramente en aportar valor antes de pensar en la recompensa monetaria.',
  story_eyebrow: 'Nuestra Historia',
  story_title: 'La Ruptura Cientifica con la Burocracia',
  story_paragraph_one:
    'La semilla del IICS fue sembrada por Edwar Jhanpiere Saenz Tello. Tras participar activamente en circulos de investigacion tradicionales, experimento trabas burocraticas, estancamiento metodologico y poco interes por agilizar datos de impacto.',
  story_paragraph_two:
    'Presentar esta propuesta a filtros politizados implicaba esperar meses o anos. Por ello, se tomo la decision de forjar una corporacion autonoma, independiente y libre como vehiculo de impacto social directo.',
  quote:
    'El enfoque es simple: la economia se rige por valor, y el valor precede a la recompensa financiera. Al dotar de conocimiento util, preciso y cientifico al norte andino antes de pensar en redito comercial, democratizamos la sociologia de precision de manera sostenible.',
  story_paragraph_three:
    'A esta iniciativa autonoma se unio Henry Diaz Bueno, quien coincidio en la necesidad de levantar metodologias de ciencia de datos del siglo XXI con compromiso incorruptible con la verdad territorial de Cajamarca.',
  team_eyebrow: 'Repositorio de Integrantes',
  team_title: 'Biografias y Galeria del Equipo',
  team_intro:
    'Explora el trasfondo y la fotografia de cada promotor cientifico del IICS Autonomo en esta galeria analitica vertical.',
  network_title: 'Estructura Interna de Trabajo',
  network_intro:
    'El IICS no funciona de forma lineal. Configuramos un sistema en red de aportaciones donde estudiantes, directores y cientificos RENACYT establecen loops de validacion mutua.',
  network_support:
    'Soporte Operativo UNC: El engranaje material cuenta ademas con el apoyo de bachilleres y alumnos voluntarios encargados de recopilar informacion de campo, digitalizar mapas andinos y validar el flujo de la Consola.',
  values_eyebrow: 'Valores y Proposito',
  values_title: 'Nuestros Pilares Operativos',
  values_intro:
    'El IICS se rige bajo una filosofia de asertividad cientifica, neutralidad epistemica y accion oportuna para garantizar que los datos beneficien a la sociedad civil.',
  cta_label: 'Ingresar a la Consola de Datos Central',
  team_members: DEFAULT_ABOUT_MEMBERS,
  is_published: true,
};

export const normalizeAboutContent = (value: Partial<LandingAboutContent> | null | undefined): LandingAboutContent => ({
  ...DEFAULT_LANDING_ABOUT,
  ...(value || {}),
  team_members: Array.isArray(value?.team_members) && value?.team_members.length
    ? value.team_members.map((member) => ({ ...DEFAULT_ABOUT_MEMBERS[0], ...member }))
    : DEFAULT_ABOUT_MEMBERS,
});
