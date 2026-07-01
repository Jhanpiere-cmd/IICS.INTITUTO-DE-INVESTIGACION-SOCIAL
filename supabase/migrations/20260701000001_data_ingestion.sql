-- ============================================================
-- IICS: Módulo de Ingesta de Datos
-- Tablas: statistical_indicators, research_datasets
-- (perception_surveys usa la tabla 'surveys' ya existente)
-- ============================================================

-- 1. INDICADORES ESTADÍSTICOS
CREATE TABLE IF NOT EXISTS public.statistical_indicators (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  provincia    text        NOT NULL,
  fuente       text        NOT NULL,  -- INEI, MINEM, Defensoría, ANA-SENAMHI, IICS-Campo, Otro
  categoria    text        NOT NULL,  -- pobreza, mineria, agua, conflictos, redes, bienestar
  indicador    text        NOT NULL,
  valor        numeric     NOT NULL,
  unidad       text        NOT NULL,
  periodo      text        NOT NULL,  -- "2025-Q3", "2026-Anual"
  url_fuente   text,
  notas        text,
  status       text        NOT NULL DEFAULT 'published',
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE public.statistical_indicators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica statistical_indicators" ON public.statistical_indicators;
CREATE POLICY "Lectura publica statistical_indicators"
ON public.statistical_indicators FOR SELECT USING (true);

DROP POLICY IF EXISTS "CRUD autenticados statistical_indicators" ON public.statistical_indicators;
CREATE POLICY "CRUD autenticados statistical_indicators"
ON public.statistical_indicators FOR ALL
USING (auth.role() = 'authenticated');

DROP TRIGGER IF EXISTS trg_stat_indicators_updated_at ON public.statistical_indicators;
CREATE TRIGGER trg_stat_indicators_updated_at
  BEFORE UPDATE ON public.statistical_indicators
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.statistical_indicators;

-- 2. REPOSITORIO DE DATASETS
CREATE TABLE IF NOT EXISTS public.research_datasets (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo       text        NOT NULL,
  filename     text        NOT NULL,
  descripcion  text        NOT NULL,
  categoria    text        NOT NULL,  -- conflictos, gis, encuestas, indicadores, otro
  fuente       text        NOT NULL,
  anio         integer     NOT NULL,
  version      text        DEFAULT '1.0',
  size_mb      numeric,
  hash_sha256  text,
  download_url text,
  status       text        NOT NULL DEFAULT 'published',
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE public.research_datasets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica research_datasets" ON public.research_datasets;
CREATE POLICY "Lectura publica research_datasets"
ON public.research_datasets FOR SELECT USING (true);

DROP POLICY IF EXISTS "CRUD autenticados research_datasets" ON public.research_datasets;
CREATE POLICY "CRUD autenticados research_datasets"
ON public.research_datasets FOR ALL
USING (auth.role() = 'authenticated');

DROP TRIGGER IF EXISTS trg_research_datasets_updated_at ON public.research_datasets;
CREATE TRIGGER trg_research_datasets_updated_at
  BEFORE UPDATE ON public.research_datasets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.research_datasets;

-- 0. CREACIÓN DE TABLAS DE ENCUESTAS SI NO EXISTEN
CREATE TABLE IF NOT EXISTS public.surveys (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id     uuid        REFERENCES public.events(id) ON DELETE CASCADE,
  title        text        NOT NULL,
  description  text,
  slug         text        UNIQUE NOT NULL,
  type         text        DEFAULT 'general',
  category     text,
  is_active    boolean     DEFAULT true,
  ai_summary   jsonb       DEFAULT NULL,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica surveys" ON public.surveys;
CREATE POLICY "Lectura publica surveys" ON public.surveys
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "CRUD autenticados surveys" ON public.surveys;
CREATE POLICY "CRUD autenticados surveys" ON public.surveys
  FOR ALL USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.survey_questions (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id    uuid        REFERENCES public.surveys(id) ON DELETE CASCADE,
  question     text        NOT NULL,
  type         text        NOT NULL,
  options      text[],
  required     boolean     DEFAULT false,
  order_index  integer,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica survey_questions" ON public.survey_questions;
CREATE POLICY "Lectura publica survey_questions" ON public.survey_questions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "CRUD autenticados survey_questions" ON public.survey_questions;
CREATE POLICY "CRUD autenticados survey_questions" ON public.survey_questions
  FOR ALL USING (auth.role() = 'authenticated');

CREATE TABLE IF NOT EXISTS public.survey_responses (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id    uuid        REFERENCES public.surveys(id) ON DELETE CASCADE,
  answers      jsonb       NOT NULL,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica survey_responses" ON public.survey_responses;
CREATE POLICY "Lectura publica survey_responses" ON public.survey_responses
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insercion publica survey_responses" ON public.survey_responses;
CREATE POLICY "Insercion publica survey_responses" ON public.survey_responses
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "CRUD autenticados survey_responses" ON public.survey_responses;
CREATE POLICY "CRUD autenticados survey_responses" ON public.survey_responses
  FOR ALL USING (auth.role() = 'authenticated');

-- 3. COLUMNA periodo_tipo en surveys para distinguir encuestas de percepcion
-- (reutilizamos la tabla surveys existente, solo añadimos un campo opcional)
ALTER TABLE public.surveys
  ADD COLUMN IF NOT EXISTS survey_type_ext text DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS provincia text,
  ADD COLUMN IF NOT EXISTS n_encuestados integer,
  ADD COLUMN IF NOT EXISTS metodologia text,
  ADD COLUMN IF NOT EXISTS periodo text;

-- Seeds de ejemplo para statistical_indicators
INSERT INTO public.statistical_indicators
  (provincia, fuente, categoria, indicador, valor, unidad, periodo, url_fuente)
VALUES
  ('Cajamarca','INEI','pobreza','Indice de Pobreza Monetaria',33.5,'%','2024-Anual','https://inei.gob.pe'),
  ('Cajamarca','INEI','pobreza','Pobreza Extrema',6.8,'%','2024-Anual','https://inei.gob.pe'),
  ('Chota','INEI','pobreza','Indice de Pobreza Monetaria',45.2,'%','2024-Anual','https://inei.gob.pe'),
  ('Hualgayoc','MINEM','mineria','Unidades Mineras Activas',3,'unidades','2025-Q1','https://minem.gob.pe'),
  ('Cajamarca','MINEM','mineria','Pasivos Ambientales Registrados',12,'sitios','2024-Anual','https://minem.gob.pe'),
  ('Cajamarca','Defensoria','conflictos','Conflictos Activos Registrados',8,'casos','2025-Q2','https://defensoria.gob.pe'),
  ('Cajamarca','ANA-SENAMHI','agua','Disponibilidad Hidrica Cuenca Cajamarquina',72.4,'m3/s','2025-Q1','https://ana.gob.pe'),
  ('Jaen','ANA-SENAMHI','agua','Alerta de Sequia',2,'nivel','2025-Q2','https://senamhi.gob.pe')
ON CONFLICT DO NOTHING;

-- Seeds de ejemplo para research_datasets
INSERT INTO public.research_datasets
  (titulo, filename, descripcion, categoria, fuente, anio, size_mb, hash_sha256, download_url)
VALUES
  (
    'Indicadores de Conflictos Socioambientales Q1 2026',
    'IICS_social_conflict_indicators_2026_Q1.xlsx',
    'Indicadores agregados mensuales de tensiones socioambientales, mesas de negociacion y acuerdos ronderos.',
    'conflictos', 'IICS-Campo', 2026, 4.2,
    '8f9e2b1c4a037b5e82496cdfd8aa77bf',
    ''
  ),
  (
    'GIS: Vulnerabilidad Hidrica y Minera - Cajamarca',
    'Cajamarca_GIS_Hydrologic_Mining_Vulnerability_v2.zip',
    'Capas vectoriales georreferenciadas (Shapefiles/QGIS) con pasivos ambientales, zonas de moliendas y cuencas.',
    'gis', 'IICS-Campo', 2026, 18.5,
    'd5a49e2fc8e331b0aef773641bcaa605',
    ''
  ),
  (
    'Dataset Cohesion Social Cajamarca (SPSS)',
    'Cohesion_Social_Cajamarca_SPSS_data.sav',
    'Resultado totalizador de encuestas sobre cohesion agraria y confianza institucional aplicada a 1,100 familias.',
    'encuestas', 'IICS-Campo', 2026, 1.1,
    '1a9c0d4bb8e2bc7715f3e9ca29037df8',
    ''
  )
ON CONFLICT DO NOTHING;
