-- ============================================================
-- IICS: Módulo Escucha Social / Social Listening
-- Tabla: social_listening
-- ============================================================

CREATE TABLE IF NOT EXISTS public.social_listening (
  id            uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  author        text         NOT NULL,
  content       text         NOT NULL,
  topic         text         NOT NULL,
  sentiment     text         NOT NULL CHECK (sentiment IN ('positive','neutral','negative')),
  source        text         NOT NULL,
  province      text         NOT NULL,
  published_at  timestamptz  NOT NULL DEFAULT now(),
  status        text         NOT NULL DEFAULT 'published' CHECK (status IN ('published','draft')),
  created_at    timestamptz  DEFAULT now(),
  updated_at    timestamptz  DEFAULT now()
);

-- RLS
ALTER TABLE public.social_listening ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica social_listening" ON public.social_listening;
CREATE POLICY "Lectura publica social_listening"
ON public.social_listening FOR SELECT USING (true);

DROP POLICY IF EXISTS "CRUD autenticados social_listening" ON public.social_listening;
CREATE POLICY "CRUD autenticados social_listening"
ON public.social_listening FOR ALL
USING (auth.role() = 'authenticated');

-- updated_at trigger (usa la funcion que ya existe o la crea)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_social_listening_updated_at ON public.social_listening;
CREATE TRIGGER trg_social_listening_updated_at
  BEFORE UPDATE ON public.social_listening
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_listening;

-- Seeds de ejemplo
INSERT INTO public.social_listening (author, content, topic, sentiment, source, province, published_at, status)
VALUES 
  ('@RondasChota',
   'Asamblea general de las rondas de Chota discutiendo el plan regulador de aguas distrital. Hay desacuerdos pero la coordinacion se mantiene pacifica.',
   'gobernabilidad','neutral','twitter','Chota', now() - interval '10 minutes','published'),

  ('Radio Lajas',
   'Comunidades agrarias denuncian contaminacion en el riachuelo Lajas. Exigen presencia inmediata de la mesa tecnica del IICS.',
   'mineria','negative','radio','Chota', now() - interval '45 minutes','published'),

  ('@VozCelendin',
   'Exitosa capacitacion de la AFI en Celendin. Jovenes muestran enorme interes en aprender sobre sociologia territorial.',
   'cohesion','positive','facebook','Celendín', now() - interval '2 hours','published'),

  ('El Informador Hualgayoc',
   'Tension en Hualgayoc por trabajos nocturnos en el pasivo minero cercano a la captacion de agua. Vecinos se declaran en alerta.',
   'mineria','negative','facebook','Hualgayoc', now() - interval '3 hours','published'),

  ('@CajamarcaNoticias',
   'Municipalidad Provincial de Cajamarca anuncia alianza tecnica con el IICS para el catastro de cuencas de este semestre.',
   'gobernabilidad','positive','twitter','Cajamarca', now() - interval '5 hours','published'),

  ('@FrenteDefensaJaen',
   'Falta de servicios de agua potable genera fuerte malestar en el sector norte de Jaen. Coordinan movilizacion preventiva.',
   'gobernabilidad','negative','twitter','Jaén', now() - interval '6 hours','published')
ON CONFLICT DO NOTHING;
