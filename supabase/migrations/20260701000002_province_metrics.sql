-- ============================================================
-- IICS: Tabla de métricas provinciales del Observatorio
-- ============================================================

CREATE TABLE IF NOT EXISTS public.province_metrics (
  id              text        PRIMARY KEY,
  name            text        NOT NULL,
  risk_score      numeric     DEFAULT 0,
  risk_description text       DEFAULT 'Bajo',
  menciones_redes integer     DEFAULT 0,
  alert_count     integer     DEFAULT 0,
  active_alert    text,
  key_issues      text[]      DEFAULT '{}',
  indicators      jsonb       DEFAULT '[]',
  conflict_areas  jsonb       DEFAULT '{}',
  photo_url       text,
  data_sources    text[]      DEFAULT '{}',
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

ALTER TABLE public.province_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica province_metrics" ON public.province_metrics;
CREATE POLICY "Lectura publica province_metrics"
  ON public.province_metrics FOR SELECT USING (true);

DROP POLICY IF EXISTS "CRUD autenticados province_metrics" ON public.province_metrics;
CREATE POLICY "CRUD autenticados province_metrics"
  ON public.province_metrics FOR ALL USING (auth.role() = 'authenticated');

DROP TRIGGER IF EXISTS trg_province_metrics_updated_at ON public.province_metrics;
CREATE TRIGGER trg_province_metrics_updated_at
  BEFORE UPDATE ON public.province_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.province_metrics;

-- Seed some base metadata for provinces if missing
INSERT INTO public.province_metrics (id, name, risk_score, risk_description, menciones_redes, alert_count, active_alert, key_issues, indicators, conflict_areas, photo_url, data_sources)
VALUES
  ('cajamarca','Cajamarca',8.2,'Alto',12560,6,'Mesa multisectorial por plan regulador de agua distrital', ARRAY['Expansión urbana desordenada','Seguridad nocturna','Servicio de agua potable','Minería Yanacocha'],
    '[{"label":"Conflictos Activos","value":4},{"label":"Tasa de Satisfacción Hídrica","value":"44%"},{"label":"Monitoreo de Redes","value":"Crítico diario"}]',
    '{"Minería y medio ambiente":28,"Desarrollo local":22,"Servicios básicos":18,"Gobernabilidad":20,"Otros temas":12}',
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80', ARRAY['INEI','MINAM','IICS-Campo','ANA-SENAMHI']),
  ('hualgayoc','Hualgayoc',7.8,'Alto',5890,5,'Aumento de tensiones sociales en Hualgayoc por cabecera de cuenca', ARRAY['Pasivos ambientales colosales','Calidad de agua de cuencas','Minería a gran escala'],
    '[{"label":"Conflictos Activos","value":3},{"label":"Puntos Críticos","value":"Ríos Tingo y Maygasbamba"},{"label":"Alerta Temprana","value":"Activa Nivel 2"}]',
    '{"Minería y medio ambiente":40,"Desarrollo local":18,"Servicios básicos":12,"Gobernabilidad":18,"Otros temas":12}',
    'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80', ARRAY['MINEM','IICS-Campo','OEFA']),
  ('jaen','Jaén',3.5,'Bajo',4210,2,'Mesa de diálogo de transportistas de carga local', ARRAY['Transporte urbano','Comercio informal','Seguridad ciudadana'],
    '[{"label":"Conflictos Activos","value":1},{"label":"Nivel de Cohesión","value":"65%"},{"label":"Monitoreo de Medios","value":"Intenso"}]',
    '{"Minería y medio ambiente":10,"Desarrollo local":30,"Servicios básicos":30,"Gobernabilidad":20,"Otros temas":10}',
    'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1200&q=80', ARRAY['INEI','IICS-Campo']),
  ('chota','Chota',5.4,'Moderado',3120,3,'Asamblea de la Central Única del Frente de Defensa', ARRAY['Rondas campesinas','Justicia comunitaria','Proyectos de saneamiento'],
    '[{"label":"Conflictos Activos","value":1},{"label":"Nivel de Cohesión","value":"74%"},{"label":"Mesas de Diálogo","value":"2 abiertas"}]',
    '{"Minería y medio ambiente":20,"Desarrollo local":25,"Servicios básicos":30,"Gobernabilidad":15,"Otros temas":10}',
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80', ARRAY['IICS-Campo','Defensoría','Gobierno Regional']);
