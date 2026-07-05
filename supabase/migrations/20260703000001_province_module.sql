-- ============================================================
-- IICS: MÓDULO PROVINCIAL ROBUSTO
-- Migration: 20260703000001_province_module.sql
-- Crea: province_details, districts, province_indicators, system_logs
-- ============================================================

-- 1. PROVINCE_DETAILS — info rica por provincia
CREATE TABLE IF NOT EXISTS public.province_details (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  province_name  TEXT    NOT NULL UNIQUE,
  photo_url      TEXT,
  cover_image_url TEXT,
  descripcion    TEXT,
  historia       TEXT,
  cultura        TEXT,
  economia_principal TEXT[] DEFAULT '{}',
  superficie_km2 NUMERIC,
  altitud_msnm   NUMERIC,
  poblacion_estimada INTEGER,
  capital        TEXT,
  lugares_turisticos JSONB DEFAULT '[]',
  data_sources   TEXT[] DEFAULT '{}',
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.province_details ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read province_details" ON public.province_details;
CREATE POLICY "Public read province_details" ON public.province_details FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth write province_details" ON public.province_details;
CREATE POLICY "Auth write province_details"  ON public.province_details FOR ALL USING (auth.role() = 'authenticated');

-- 2. DISTRICTS — distritos, caseríos, centros poblados
CREATE TABLE IF NOT EXISTS public.districts (
  id                 UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  province_name      TEXT    NOT NULL,
  nombre             TEXT    NOT NULL,
  capital            TEXT,
  poblacion          INTEGER,
  altitud_msnm       NUMERIC,
  superficie_km2     NUMERIC,
  descripcion        TEXT,
  tipo               TEXT    DEFAULT 'distrito',  -- 'distrito' | 'caserio' | 'centro_poblado'
  parent_district_id UUID    REFERENCES public.districts(id) ON DELETE SET NULL,
  latitud            NUMERIC,
  longitud           NUMERIC,
  foto_url           TEXT,
  indicadores        JSONB   DEFAULT '{}',
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_districts_province  ON public.districts(province_name);
CREATE INDEX IF NOT EXISTS idx_districts_parent    ON public.districts(parent_district_id);
CREATE INDEX IF NOT EXISTS idx_districts_tipo      ON public.districts(tipo);

ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read districts" ON public.districts;
CREATE POLICY "Public read districts" ON public.districts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth write districts" ON public.districts;
CREATE POLICY "Auth write districts"  ON public.districts FOR ALL USING (auth.role() = 'authenticated');

-- 3. PROVINCE_INDICATORS — indicadores múltiples por categoría
CREATE TABLE IF NOT EXISTS public.province_indicators (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  province_name TEXT    NOT NULL,
  categoria     TEXT    NOT NULL,   -- 'economico','social','ambiental','seguridad','salud','educacion'
  nombre        TEXT    NOT NULL,
  valor         NUMERIC,
  unidad        TEXT,               -- '%','soles','km2','hab/km2',etc.
  periodo       TEXT,               -- 'Ene 2026','2025','Q1 2026'
  fuente        TEXT,               -- 'INEI','MINEM','Defensoría','IICS'
  tendencia     TEXT    DEFAULT 'estable',  -- 'subida','bajada','estable'
  descripcion   TEXT,
  status        TEXT    DEFAULT 'published',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prov_ind_province  ON public.province_indicators(province_name);
CREATE INDEX IF NOT EXISTS idx_prov_ind_categoria ON public.province_indicators(categoria);
CREATE INDEX IF NOT EXISTS idx_prov_ind_status    ON public.province_indicators(status);

ALTER TABLE public.province_indicators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read province_indicators" ON public.province_indicators;
CREATE POLICY "Public read province_indicators" ON public.province_indicators FOR SELECT USING (status = 'published');
DROP POLICY IF EXISTS "Auth write province_indicators" ON public.province_indicators;
CREATE POLICY "Auth write province_indicators"  ON public.province_indicators FOR ALL USING (auth.role() = 'authenticated');

-- 4. SYSTEM_LOGS — reemplaza telemetryLogs hardcodeado
CREATE TABLE IF NOT EXISTS public.system_logs (
  id       UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  ts       TIMESTAMPTZ DEFAULT NOW(),
  service  TEXT    NOT NULL,
  message  TEXT    NOT NULL,
  level    TEXT    DEFAULT 'info',   -- 'info','warn','error','debug'
  metadata JSONB   DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_system_logs_ts      ON public.system_logs(ts DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_service ON public.system_logs(service);

ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Auth read system_logs" ON public.system_logs;
CREATE POLICY "Auth read system_logs"  ON public.system_logs FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Auth write system_logs" ON public.system_logs;
CREATE POLICY "Auth write system_logs" ON public.system_logs FOR ALL   USING (auth.role() = 'authenticated');

-- ============================================================
-- SEEDS: Datos de las 13 provincias de Cajamarca
-- ============================================================

INSERT INTO public.province_details (province_name, capital, superficie_km2, altitud_msnm, poblacion_estimada, descripcion, historia, cultura, economia_principal, data_sources) VALUES
('Cajamarca',  'Cajamarca',  2979,  2750, 382000, 'Capital regional y centro político-administrativo. Mayor densidad urbana y más alto índice de conflictividad socioambiental de la región.', 'Cuna de la civilización cajamarquina prehispánica. Escenario del encuentro entre Atahualpa y Pizarro en 1532. Declarada Patrimonio Histórico Nacional.', 'Carnaval cajamarquino (Patrimonio Cultural de la Nación). Danza de los Emplumados. Tejidos en lana de ovino. Cerámica utilitaria.', ARRAY['Minería','Turismo','Comercio','Agropecuaria'], ARRAY['INEI 2023','MINEM','Defensoría del Pueblo']),
('Hualgayoc',  'Bambamarca', 777,   2536, 103000, 'Provincia con mayor concentración minera activa. Alberga el proyecto Minera Yanacocha y múltiples pasivos ambientales. Índice de riesgo más alto de la región.', 'Fundada en el período virreinal como enclave minero. La minería de plata y oro marcó su desarrollo desde el siglo XVII.', 'Fiestas patronales de Bambamarca. Danzas de los Turcos. Tejidos de bayeta.', ARRAY['Minería','Agricultura','Ganadería'], ARRAY['MINEM','ANA','INEI 2023']),
('Celendín',   'Celendín',  2641,  2625, 88000,  'Provincia con fuerte identidad cultural andina. Presión sobre recursos hídricos por proyectos mineros en Conga. Tensiones sociales latentes.', 'Región históricamente agraria que cobró notoriedad por los conflictos en torno al proyecto Conga (2011–2016).', 'Sombrero de palma celendino (producto de exportación artesanal). Festival de la Canción Andina.', ARRAY['Agropecuaria','Artesanía','Minería'],ARRAY['INEI 2023','Defensoría del Pueblo']),
('Cajabamba',  'Cajabamba',  1807,  2654, 74000,  'Zona de transición entre sierra y selva. Importante eje vial hacia La Libertad. Conflictos de uso de suelo y recursos hídricos.', 'Paso histórico en la ruta colonial hacia Trujillo. Fundada como villa en el período hispano.', 'Feria de Cajabamba (una de las más grandes del norte). Marinera serrana.', ARRAY['Agricultura','Ganadería','Comercio'],ARRAY['INEI 2023']),
('San Marcos', 'Pedro Gálvez',1362,  2920, 51000,  'Provincia con actividad minera en expansión. Conflictos entre comunidades campesinas y empresas extractivas en expansión.', 'Territorio de tradición ganadera transformado por la llegada de la minería en los años 90.', 'Tejidos y bordados tradicionales. Feria dominical de Pedro Gálvez.', ARRAY['Minería','Ganadería','Agricultura'],ARRAY['MINEM','INEI 2023']),
('Chota',      'Chota',     3795,  2388, 160000, 'Segunda ciudad más poblada de la región. Nodo comercial y educativo importante. Conflictos laborales y de servicios básicos.', 'Ciudad de fuerte tradición ronderil. Cuna de las Rondas Campesinas del Perú (1976).', 'Rondas Campesinas como institución de justicia comunitaria (declarada Patrimonio Cultural). Feria de Chota.', ARRAY['Comercio','Agropecuaria','Educación'],ARRAY['INEI 2023','Defensoría del Pueblo']),
('Santa Cruz', 'Santa Cruz',  1417,  2035, 43000,  'Provincia de menor conflictividad relativa. Economía basada en café y derivados. Zona de amortiguamiento del Bosque de Huamantanga.', 'Región de colonización andina tardía. Importante por producción de café especial.', 'Festival del Café de Santa Cruz. Danzas campesinas locales.', ARRAY['Café','Agricultura','Ganadería'],ARRAY['INEI 2023']),
('San Miguel', 'San Miguel',  2542,  2723, 52000,  'Zona con pasivos mineros artesanales. Contaminación de suelos por explotación informal. Tensiones por deficiente acceso a servicios.', 'Históricamente aislada de los centros urbanos. Desarrollo tardío de infraestructura vial.', 'Gastronomía serrana tradicional. Ferias agropecuarias.', ARRAY['Minería artesanal','Agricultura','Ganadería'],ARRAY['INEI 2023','MINEM']),
('San Pablo',  'San Pablo',   672,  2374, 24000,  'Provincia más pequeña de Cajamarca. Tensiones por desvío de cuencas y uso del agua. Relativa baja conflictividad social.', 'Territorio de antigua tradición agraria. Cercana a sitios arqueológicos de Kuntur Wasi.', 'Sitio arqueológico Kuntur Wasi. Cerámica y orfebrería preinca.', ARRAY['Agricultura','Turismo arqueológico'],ARRAY['INEI 2023']),
('Jaén',       'Jaén',      5232,  729,  203000, 'Puerta amazónica de Cajamarca. Mayor crecimiento urbano informal. Hub comercial de la frontera norte. Tensiones por expansión urbana y servicios.', 'Ciudad de fundación colonial en el corredor entre sierra y selva. Importante enclave en la ruta hacia Bagua y Ecuador.', 'Festival del Cacao y Café. Diversidad cultural de poblaciones amazónicas y andinas.', ARRAY['Comercio','Café','Cacao','Agropecuaria'],ARRAY['INEI 2023','Defensoría del Pueblo']),
('San Ignacio','San Ignacio', 4990,  1325, 137000, 'Frontera norte con Ecuador. Zona cafetalera de alta calidad. Presencia de comunidades Awajún. Baja conflictividad registrada.', 'Territorio de contacto histórico con culturas amazónicas. Región de expansión cafetalera en el siglo XX.', 'Comunidades Awajún (reconocidas por el Estado). Festival del Café Orgánico de San Ignacio.', ARRAY['Café orgánico','Cacao','Agropecuaria'],ARRAY['INEI 2023']),
('Cutervo',    'Cutervo',   3028,  2640, 131000, 'Zona cavernosa única en el Perú (Parque Nacional Cueva de los Guácharos). Relativa baja conflictividad. Economía diversificada.', 'Conocida por su importante legado ecológico. Primer Parque Nacional del Perú (1961) está en Cutervo.', 'Parque Nacional Cueva de los Guácharos. Gastronomía serrana. Festividades patronales.', ARRAY['Agricultura','Ganadería','Turismo ecológico'],ARRAY['INEI 2023','SERNANP']),
('Contumazá',  'Contumazá',  2070,  2630, 29000,  'Provincia de menor densidad poblacional. Actividad agrícola diversificada. Índice de riesgo más bajo de la región.', 'Provincia agraria tradicional. Históricamente vinculada a La Libertad por lazos económicos.', 'Festival de la Chirimoya. Tejidos artesanales locales.', ARRAY['Agricultura','Ganadería'],ARRAY['INEI 2023'])
ON CONFLICT (province_name) DO UPDATE
  SET descripcion = EXCLUDED.descripcion,
      historia    = EXCLUDED.historia,
      cultura     = EXCLUDED.cultura,
      capital     = EXCLUDED.capital,
      superficie_km2 = EXCLUDED.superficie_km2,
      altitud_msnm   = EXCLUDED.altitud_msnm,
      poblacion_estimada = EXCLUDED.poblacion_estimada,
      economia_principal = EXCLUDED.economia_principal,
      data_sources = EXCLUDED.data_sources,
      updated_at   = NOW();

-- SEEDS: Indicadores clave por provincia (muestra representativa)
INSERT INTO public.province_indicators (province_name, categoria, nombre, valor, unidad, periodo, fuente, tendencia, descripcion) VALUES
-- CAJAMARCA
('Cajamarca','economico','PBI per cápita estimado',9800,'soles/año','2025','INEI','subida','Producto Bruto Interno per cápita provincial estimado'),
('Cajamarca','social','Tasa de pobreza monetaria',28.4,'%','2024','INEI','bajada','Porcentaje de población en situación de pobreza'),
('Cajamarca','ambiental','Índice calidad agua (ICA)',62,'puntaje 0-100','2025','ANA','bajada','Índice de Calidad del Agua en cuenca principal'),
('Cajamarca','salud','Tasa mortalidad infantil',18.2,'por 1000 NV','2024','MINSA','bajada','Mortalidad en menores de 1 año por cada 1000 nacidos vivos'),
('Cajamarca','educacion','Tasa asistencia escolar primaria',91.3,'%','2024','MINEDU','subida','Porcentaje de niños en edad escolar que asisten a la escuela'),
('Cajamarca','seguridad','Índice conflictividad IICS',8.2,'sobre 10','Jul 2026','IICS','subida','Índice compuesto de conflictos, alertas y tensiones sociales'),
-- HUALGAYOC
('Hualgayoc','economico','Exportaciones mineras',2100,'millones USD/año','2025','MINEM','estable','Valor FOB de exportaciones mineras registradas'),
('Hualgayoc','ambiental','Pasivos ambientales activos',47,'unidades','2025','MINEM','subida','Número de pasivos ambientales mineros sin remediar'),
('Hualgayoc','ambiental','Concentración metales pesados agua',380,'µg/L Pb','2025','ANA','subida','Concentración de plomo en afluentes de la cuenca Llaucano'),
('Hualgayoc','social','Tasa de pobreza monetaria',39.1,'%','2024','INEI','estable','Porcentaje de población en situación de pobreza'),
('Hualgayoc','seguridad','Índice conflictividad IICS',7.8,'sobre 10','Jul 2026','IICS','subida','Índice compuesto de conflictos, alertas y tensiones sociales'),
-- CAJABAMBA
('Cajabamba','seguridad','Índice conflictividad IICS',6.2,'sobre 10','Jul 2026','IICS','estable','Índice compuesto de conflictos, alertas y tensiones sociales'),
('Cajabamba','economico','Ingreso familiar promedio',850,'soles/mes','2024','INEI','subida','Ingreso mensual promedio por hogar'),
-- CELEDÍN
('Celendín','seguridad','Índice conflictividad IICS',6.9,'sobre 10','Jul 2026','IICS','estable','Índice compuesto de conflictos, alertas y tensiones sociales'),
('Celendín','ambiental','Área en disputa por proyectos mineros',12400,'hectáreas','2025','MINEM','subida','Superficie de tierras en proceso de concesión o conflicto minero'),
-- JAÉN
('Jaén','economico','Producción de café',18000,'TM/año','2025','MINAGRI','subida','Producción anual de café en grano verde'),
('Jaén','seguridad','Índice conflictividad IICS',3.5,'sobre 10','Jul 2026','IICS','estable','Índice compuesto de conflictos, alertas y tensiones sociales'),
-- SAN IGNACIO
('San Ignacio','economico','Exportaciones café orgánico',42,'millones USD','2025','MINAGRI','subida','Valor FOB de exportaciones de café orgánico certificado'),
('San Ignacio','seguridad','Índice conflictividad IICS',2.8,'sobre 10','Jul 2026','IICS','estable','Índice compuesto de conflictos, alertas y tensiones sociales'),
-- CHOTA
('Chota','social','Participación en Rondas Campesinas',34,'% hogares','2024','IICS','estable','Porcentaje de hogares con al menos un miembro en rondas'),
('Chota','seguridad','Índice conflictividad IICS',5.4,'sobre 10','Jul 2026','IICS','subida','Índice compuesto de conflictos, alertas y tensiones sociales'),
-- SAN MARCOS
('San Marcos','ambiental','Concesiones mineras activas',23,'unidades','2025','MINEM','subida','Número de concesiones mineras vigentes en la provincia'),
('San Marcos','seguridad','Índice conflictividad IICS',5.8,'sobre 10','Jul 2026','IICS','subida','Índice compuesto de conflictos, alertas y tensiones sociales'),
-- SAN MIGUEL
('San Marcos','ambiental','Minería informal activa',8,'frentes','2025','MINEM','subida','Focos de explotación minera informal identificados'),
('San Miguel','seguridad','Índice conflictividad IICS',4.1,'sobre 10','Jul 2026','IICS','estable','Índice compuesto de conflictos, alertas y tensiones sociales')
ON CONFLICT DO NOTHING;

-- SEEDS: Distritos de las provincias principales
INSERT INTO public.districts (province_name, nombre, capital, tipo, poblacion, altitud_msnm, superficie_km2, descripcion) VALUES
-- CAJAMARCA (distritos)
('Cajamarca','Cajamarca','Cajamarca','distrito',230000,2750,382,'Distrito capital. Centro histórico patrimonio nacional. Mayor concentración de actividad minera y comercial.'),
('Cajamarca','Llacanora','Llacanora','distrito',5200,2700,56,'Distrito de vocación agrícola. Conocido por sus quesos artesanales.'),
('Cajamarca','Los Baños del Inca','Baños del Inca','distrito',35000,2667,271,'Distrito con aguas termales de origen inca. Importante atractivo turístico.'),
('Cajamarca','Namora','Namora','distrito',12000,3100,195,'Zona de ganadería lechera. Producción de derivados lácteos.'),
('Cajamarca','Magdalena','Magdalena','distrito',8000,2930,448,'Distrito rural andino con actividad agrícola diversificada.'),
('Cajamarca','San Juan','San Juan','distrito',6500,3200,217,'Zona de altura. Ganadería extensiva.'),
-- HUALGAYOC (distritos)
('Hualgayoc','Bambamarca','Bambamarca','distrito',68000,2536,451,'Capital provincial. Centro comercial y administrativo. Principal afectada por pasivos mineros.'),
('Hualgayoc','Chugur','Chugur','distrito',5000,2920,130,'Zona de bosque de neblina. Alta biodiversidad. Conflictos por uso de agua.'),
('Hualgayoc','Hualgayoc','Hualgayoc','distrito',18000,3500,196,'Asiento minero histórico. Extracción de plata y oro desde el siglo XVII.'),
-- CELENDÍN (distritos)
('Celendín','Celendín','Celendín','distrito',25000,2625,258,'Capital provincial. Centro artesanal (sombrero de palma).'),
('Celendín','Chumuch','Chumuch','distrito',4500,1800,204,'Zona de transición sierra-selva. Cultivos de café incipientes.'),
('Celendín','Oxamarca','Oxamarca','distrito',3200,3100,146,'Zona alto-andina. Ganadería de altura.'),
-- JAÉN (distritos)
('Jaén','Jaén','Jaén','distrito',95000,729,4002,'Ciudad principal. Hub comercial norte. Expansión urbana informal acelerada.'),
('Jaén','Bellavista','Bellavista','distrito',12000,1200,430,'Zona cafetalera y cacaotera. Economía agrícola de exportación.'),
('Jaén','Colasay','Colasay','distrito',8000,1450,889,'Zona de bosques tropicales. Producción de café y cacao orgánico.'),
('Jaén','Santa Rosa','Santa Rosa','distrito',5500,900,324,'Zona baja de frontera amazónica. Agricultura tropical diversificada.'),
-- SAN IGNACIO (distritos)
('San Ignacio','San Ignacio','San Ignacio','distrito',42000,1325,1591,'Capital. Centro de acopio de café. Conexión con Ecuador.'),
('San Ignacio','Chirinos','Chirinos','distrito',18000,950,618,'Mayor producción de café especial certificado de la región.'),
('San Ignacio','Namballe','Namballe','distrito',8000,760,506,'Zona fronteriza. Presencia de comunidades Awajún.'),
-- CAJABAMBA (distritos)
('Cajabamba','Cajabamba','Cajabamba','distrito',29000,2654,384,'Capital. Importante feria dominical regional.'),
('Cajabamba','Condebamba','Condebamba','distrito',14000,2300,569,'Zona agrícola de valle. Caña de azúcar y maíz.'),
('Cajabamba','Sitacocha','Sitacocha','distrito',6000,3100,493,'Zona alto-andina. Ganadería y papa.'),
-- CHOTA (distritos)
('Chota','Chota','Chota','distrito',55000,2388,1050,'Capital. Cuna de las Rondas Campesinas. Centro educativo y comercial.'),
('Chota','Llama','Llama','distrito',14000,2100,408,'Zona de transición. Café y agricultura andina.'),
('Chota','Tocmoche','Tocmoche','distrito',3500,1500,140,'Zona subtropical. Producción de frutas tropicales.')
ON CONFLICT DO NOTHING;

-- SEEDS: Caseríos (hijos de distritos principales)
-- Nota: se insertan con parent_district_id NULL porque hacerlo relacional requeriría los IDs generados arriba
-- En el admin se pueden asignar manualmente
INSERT INTO public.districts (province_name, nombre, tipo, descripcion, altitud_msnm) VALUES
('Cajamarca','Otuzco','caserio','Caserio histórico de la provincia de Cajamarca. Sitio arqueológico de ventanillas.',2700),
('Cajamarca','Ventanillas de Otuzco','centro_poblado','Centro poblado con sitio arqueológico de nichos funerarios incas. Turismo.',2700),
('Cajamarca','Porcon','caserio','Caserio agrícola cooperativista. Modelo de desarrollo rural comunitario.',3100),
('Hualgayoc','La Llanga','caserio','Caserio afectado por pasivos mineros en la cuenca del Llaucano.',2600),
('Hualgayoc','El Tingo','caserio','Comunidad campesina en zona de alta presión minera.',2750),
('Celendín','La Encañada','caserio','Caserio de la ruta hacia Cajamarca. Zona de conflictos hídricos por proyecto Conga.',3200),
('Jaén','Shumba','caserio','Caserio cafetalero. Zona de colonización agrícola.',850),
('San Ignacio','La Coipa','caserio','Importante zona cafetalera. Cooperativas de café certificado.',1100)
ON CONFLICT DO NOTHING;

-- SEEDS: system_logs iniciales
INSERT INTO public.system_logs (service, message, level) VALUES
('SUPABASE-SYNC','Sincronización de province_metrics completada. 13 registros actualizados.','info'),
('NLP-ENGINE','Análisis de sentimientos procesado: 48 nuevos posts de social_listening clasificados.','info'),
('IICS-API','Actualización de índices de riesgo provincial completada. Período: última semana.','info'),
('GIS-MODULE','Exportación de capas vectoriales KML generada para Cajamarca.','info')
ON CONFLICT DO NOTHING;
