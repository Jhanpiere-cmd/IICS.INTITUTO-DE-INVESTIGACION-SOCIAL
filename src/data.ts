import { ProvinceData, Alert, ResearchLine, EmergentTheme } from './types';

export const provincesData: ProvinceData[] = [
  {
    id: 'san-ignacio',
    name: 'San Ignacio',
    riskScore: 2.8,
    riskDescription: 'Bajo',
    mencionesRedes: 1450,
    alertCount: 1,
    keyIssues: ['Caficultura', 'Límites fronterizos', 'Migración estacional'],
    activeAlert: 'Coordinación multisectorial por paso de frontera',
    coordinates: { x: 190, y: 80 },
    indicators: [
      { label: 'Conflictos Activos', value: 0 },
      { label: 'Nivel de Cohesión', value: '78%' },
      { label: 'Monitoreo Hídrico', value: 'Óptimo' }
    ]
  },
  {
    id: 'jaen',
    name: 'Jaén',
    riskScore: 3.5,
    riskDescription: 'Bajo',
    mencionesRedes: 4210,
    alertCount: 2,
    keyIssues: ['Transporte urbano', 'Comercio informal', 'Seguridad ciudadana'],
    activeAlert: 'Mesa de diálogo de transportistas de carga local',
    coordinates: { x: 280, y: 120 },
    indicators: [
      { label: 'Conflictos Activos', value: 1 },
      { label: 'Nivel de Cohesión', value: '65%' },
      { label: 'Monitoreo de Medios', value: 'Intenso' }
    ]
  },
  {
    id: 'cutervo',
    name: 'Cutervo',
    riskScore: 2.1,
    riskDescription: 'Bajo',
    mencionesRedes: 890,
    alertCount: 0,
    keyIssues: ['Medio ambiente', 'Parque Nacional Cutervo', 'Preservación de bosques'],
    activeAlert: null,
    coordinates: { x: 170, y: 190 },
    indicators: [
      { label: 'Conflictos Activos', value: 0 },
      { label: 'Nivel de Cohesión', value: '82%' },
      { label: 'Monitoreo Ecológico', value: 'Estable' }
    ]
  },
  {
    id: 'chota',
    name: 'Chota',
    riskScore: 5.4,
    riskDescription: 'Moderado',
    mencionesRedes: 3120,
    alertCount: 3,
    keyIssues: ['Rondas campesinas', 'Justicia comunitaria', 'Proyectos de saneamiento'],
    activeAlert: 'Asamblea de la Central Única del Frente de Defensa',
    coordinates: { x: 220, y: 280 },
    indicators: [
      { label: 'Conflictos Activos', value: 1 },
      { label: 'Nivel de Cohesión', value: '74%' },
      { label: 'Mesas de Diálogo', value: '2 abiertas' }
    ]
  },
  {
    id: 'santa-cruz',
    name: 'Santa Cruz',
    riskScore: 3.2,
    riskDescription: 'Bajo',
    mencionesRedes: 780,
    alertCount: 1,
    keyIssues: ['Agua de riego', 'Infraestructura vial', 'Límites comunales'],
    activeAlert: 'Solicitud de informe técnico sobre el canal Huambos',
    coordinates: { x: 110, y: 310 },
    indicators: [
      { label: 'Conflictos Activos', value: 0 },
      { label: 'Nivel de Cohesión', value: '71%' },
      { label: 'Presión Social', value: 'Moderado-Bajo' }
    ]
  },
  {
    id: 'hualgayoc',
    name: 'Hualgayoc',
    riskScore: 7.8,
    riskDescription: 'Alto',
    mencionesRedes: 5890,
    alertCount: 5,
    keyIssues: ['Pasivos ambientales colosales', 'Calidad de agua de cuencas', 'Minería a gran escala'],
    activeAlert: 'Aumento de tensiones sociales en Hualgayoc por cabecera de cuenca',
    coordinates: { x: 230, y: 360 },
    indicators: [
      { label: 'Conflictos Activos', value: 3 },
      { label: 'Puntos Críticos', value: 'Ríos Tingo y Maygasbamba' },
      { label: 'Alerta Temprana', value: 'Activa Nivel 2' }
    ]
  },
  {
    id: 'celendin',
    name: 'Celendín',
    riskScore: 6.9,
    riskDescription: 'Moderado',
    mencionesRedes: 4720,
    alertCount: 4,
    keyIssues: ['Proyectos mineros en suspenso', 'Defensa de lagunas', 'Soberanía hídrica'],
    activeAlert: 'Movilización anunciada en Celendín por asambleas comunales',
    coordinates: { x: 330, y: 350 },
    indicators: [
      { label: 'Conflictos Activos', value: 2 },
      { label: 'Canales de Diálogo', value: 'Bajo monitoreo' },
      { label: 'Indice de Protesta', value: 'Alto riesgo' }
    ]
  },
  {
    id: 'san-miguel',
    name: 'San Miguel',
    riskScore: 4.1,
    riskDescription: 'Moderado',
    mencionesRedes: 1100,
    alertCount: 2,
    keyIssues: ['Límites distritales', 'Acceso a agua para agricultura', 'Infraestructura educativa'],
    activeAlert: 'Reunión de gobernadores comunales por desvío de cauce',
    coordinates: { x: 100, y: 430 },
    indicators: [
      { label: 'Conflictos Activos', value: 1 },
      { label: 'Nivel de Cohesión', value: '68%' },
      { label: 'Monitoreo Social', value: 'Preventivo' }
    ]
  },
  {
    id: 'san-pablo',
    name: 'San Pablo',
    riskScore: 4.6,
    riskDescription: 'Moderado',
    mencionesRedes: 1340,
    alertCount: 2,
    keyIssues: ['Minería de oro', 'Impacto en canales', 'Arqueología pre-inca'],
    activeAlert: 'Inspección técnica requerida en zonas de captación hídrica',
    coordinates: { x: 180, y: 450 },
    indicators: [
      { label: 'Conflictos Activos', value: 1 },
      { label: 'Puntos Críticos', value: 'Jequetepeque cuenca alta' },
      { label: 'Estado del Diálogo', value: 'Activo' }
    ]
  },
  {
    id: 'cajamarca',
    name: 'Cajamarca',
    riskScore: 8.2,
    riskDescription: 'Alto',
    mencionesRedes: 12560,
    alertCount: 6,
    keyIssues: ['Expansión urbana desordenada', 'Seguridad nocturna', 'Servicio de agua potable', 'Minería Yanacocha'],
    activeAlert: 'Mesa multisectorial por plan regulador de agua distrital',
    coordinates: { x: 270, y: 490 },
    indicators: [
      { label: 'Conflictos Activos', value: 4 },
      { label: 'Tasa de Satisfacción Hídrica', value: '44%' },
      { label: 'Monitoreo de Redes', value: 'Crítico diario' }
    ]
  },
  {
    id: 'contumaza',
    name: 'Contumazá',
    riskScore: 1.8,
    riskDescription: 'Bajo',
    mencionesRedes: 550,
    alertCount: 0,
    keyIssues: ['Zonas agrícolas', 'Erosión de suelo', 'Conectividad al litoral'],
    activeAlert: null,
    coordinates: { x: 90, y: 550 },
    indicators: [
      { label: 'Conflictos Activos', value: 0 },
      { label: 'Nivel de Cohesión', value: '88%' },
      { label: 'Nivel Vandalismo', value: 'Menos del 2%' }
    ]
  },
  {
    id: 'san-marcos',
    name: 'San Marcos',
    riskScore: 5.8,
    riskDescription: 'Moderado',
    mencionesRedes: 1980,
    alertCount: 2,
    keyIssues: ['Valle Condebamba', 'Contaminación por minería informal de carbón', 'Uso de fertilizantes'],
    activeAlert: 'Paro preventivo en San Marcos en defensa de la cuenca Condebamba',
    coordinates: { x: 340, y: 540 },
    indicators: [
      { label: 'Conflictos Activos', value: 1 },
      { label: 'Alerta Ambiental', value: 'Media-Alta' },
      { label: 'Canales del Estado', value: 'Instalándose' }
    ]
  },
  {
    id: 'cajabamba',
    name: 'Cajabamba',
    riskScore: 6.2,
    riskDescription: 'Moderado',
    mencionesRedes: 2150,
    alertCount: 3,
    keyIssues: ['Minería artesanal e informal', 'Contaminación de suelos', 'Seguridad en lagunas'],
    activeAlert: 'Operativo fiscalizador ambiental de cuencas en Algamarca',
    coordinates: { x: 370, y: 620 },
    indicators: [
      { label: 'Conflictos Activos', value: 2 },
      { label: 'Tensión Comunitaria', value: 'Alta en Algamarca' },
      { label: 'Nivel de Diálogo', value: 'Bajo' }
    ]
  }
];

export const alertsData: Alert[] = [
  {
    id: '1',
    title: 'Aumento de tensiones en Hualgayoc',
    province: 'Hualgayoc',
    time: 'Hace 2 horas',
    type: 'Alto',
    description: 'Comunidades locales exigen la remediación inmediata de pasivos ambientales mineros ante reportes de alteración de la calidad del agua de los ríos Tingo y Maygasbamba.'
  },
  {
    id: '2',
    title: 'Movilización anunciada en Celendín',
    province: 'Celendín',
    time: 'Hace 5 horas',
    type: 'Medio',
    description: 'Frentes de defensa convocan a asamblea provincial extraordinaria para debatir la viabilidad de nuevos proyectos hídricos y mineros en las cabeceras de cuenca.'
  },
  {
    id: '3',
    title: 'Paro preventivo en San Marcos',
    province: 'San Marcos',
    time: 'Hace 1 día',
    type: 'Alto',
    description: 'Gremios agrarios inician suspensión temporal de actividades agrícolas para exigir fiscalización del Organismo de Evaluación y Fiscalización Ambiental (OEFA) en el valle de Condebamba.'
  },
  {
    id: '4',
    title: 'Mesa de diálogo abierta en Chota',
    province: 'Chota',
    time: 'Hace 2 días',
    type: 'Medio',
    description: 'Central Única de Rondas Campesinas acuerda reunirse con representantes de los sectores regionales para optimizar canales de coordinación y justicia comunitaria.'
  },
  {
    id: '5',
    title: 'Coordinación multisectorial en Jaén',
    province: 'Jaén',
    time: 'Hace 3 días',
    type: 'Bajo',
    description: 'Gremio local de transporte multimodal entabla primera mesa técnica por el reordenamiento urbano y tarifas de licencias locales.'
  }
];

export const emergentThemesData: EmergentTheme[] = [
  { name: 'Minería y medio ambiente', percentage: 32, trend: 'up' },
  { name: 'Desarrollo local', percentage: 24, trend: 'stable' },
  { name: 'Servicios básicos', percentage: 18, trend: 'up' },
  { name: 'Gobernabilidad', percentage: 14, trend: 'down' },
  { name: 'Otros temas', percentage: 12, trend: 'stable' }
];

export const researchLinesData: ResearchLine[] = [
  {
    id: 'transformaciones-sociales',
    title: 'Transformación Social',
    description: 'Modernización, industrialización extractiva y dinámicas de cambio regional.',
    details: 'Dirigida por el Dr. Humberto Caruajulca Medina, aborda los procesos de modernización en Cajamarca, analizando cómo la actividad extractiva minera (proyectos como Michiquillay y Yanacocha), la urbanización acelerada y las políticas de desarrollo impactan las estructuras comunitarias, las economías locales y las estrategias de supervivencia familiar.',
    icon: 'Users'
  },
  {
    id: 'sociologia-territorial',
    title: 'Sociología Territorial',
    description: 'Planificación territorial, agricultura familiar, urbanización y gobernanza del agua.',
    details: 'Investiga las dinámicas territoriales, la agricultura familiar frente a la minería, los patrones migratorios del campo a la ciudad, y la gobernanza hídrica en una región donde el agua constituye un recurso estratégico crítico. Se apoya en Sistemas de Información Geográfica (SIG) y QGIS para el mapeo territorial.',
    icon: 'Home'
  },
  {
    id: 'sociologia-digital',
    title: 'Sociología Digital',
    description: 'Minería de datos, escucha activa de redes sociales y sentimientos.',
    details: 'Liderada por el M. Cs. Julio Cesar Alcalde Giove, esta línea explora el impacto de la brecha digital y la viralidad comunicativa. Desarrolla metodologías mediante técnicas avanzadas de Big Data, análisis estructural de redes, Procesamiento de Lenguaje Natural (NLP) y análisis de sentimientos de la sociedad red.',
    icon: 'Radio'
  },
  {
    id: 'educacion-juventudes',
    title: 'Educación y Juventudes',
    description: 'Deserción académica, expectativas de empleo y movilidad social juvenil.',
    details: 'Estudia las trayectorias socioeducativas de los jóvenes cajamarquinos, la inserción laboral y las brechas que limitan el acceso formativo de calidad. Vinculado directamente con el Programa de Becas al Mérito de la AFI (Academia de Formación Investigadora del IICS) para formar talentos y capacidades locales.',
    icon: 'GraduationCap'
  },
  {
    id: 'genero-familia',
    title: 'Género y Cambio Cultural',
    description: 'Roles de género, empoderamiento femenino y transformaciones familiares.',
    details: 'Dirigida por el M. Cs. Pedro Alcides Yáñez Alvarado, investiga los cambios culturales, la división del trabajo doméstico en familias rurales y urbanas bajo el impacto de la modernidad, el empoderamiento femenino en la participación local, y mantiene alianzas con la sociedad civil para el diseño de políticas inclusivas.',
    icon: 'Heart'
  }
];

export const networkConnections = [
  { from: 'san-ignacio', to: 'jaen' },
  { from: 'jaen', to: 'cutervo' },
  { from: 'cutervo', to: 'chota' },
  { from: 'chota', to: 'santa-cruz' },
  { from: 'chota', to: 'hualgayoc' },
  { from: 'hualgayoc', to: 'celendin' },
  { from: 'santa-cruz', to: 'san-miguel' },
  { from: 'san-miguel', to: 'san-pablo' },
  { from: 'san-pablo', to: 'cajamarca' },
  { from: 'hualgayoc', to: 'cajamarca' },
  { from: 'celendin', to: 'cajamarca' },
  { from: 'cajamarca', to: 'san-marcos' },
  { from: 'cajamarca', to: 'contumaza' },
  { from: 'san-marcos', to: 'cajabamba' }
];
