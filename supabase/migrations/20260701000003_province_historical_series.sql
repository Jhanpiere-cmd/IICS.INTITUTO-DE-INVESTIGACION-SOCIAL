-- ============================================================
-- IICS: Series históricas por provincia
-- Tabla: province_historical_series
-- ============================================================

CREATE TABLE IF NOT EXISTS public.province_historical_series (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  province      text        NOT NULL,
  metric        text        NOT NULL,
  period_label  text        NOT NULL,
  period_start  timestamptz,
  period_end    timestamptz,
  value         numeric     NOT NULL,
  unit          text,
  source        text,
  status        text        NOT NULL DEFAULT 'published' CHECK (status IN ('published','draft')),
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE public.province_historical_series ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica province_historical_series" ON public.province_historical_series;
CREATE POLICY "Lectura publica province_historical_series"
ON public.province_historical_series FOR SELECT USING (true);

DROP POLICY IF EXISTS "CRUD autenticados province_historical_series" ON public.province_historical_series;
CREATE POLICY "CRUD autenticados province_historical_series"
ON public.province_historical_series FOR ALL
USING (auth.role() = 'authenticated');

DROP TRIGGER IF EXISTS trg_province_historical_series_updated_at ON public.province_historical_series;
CREATE TRIGGER trg_province_historical_series_updated_at
  BEFORE UPDATE ON public.province_historical_series
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.province_historical_series;

INSERT INTO public.province_historical_series (province, metric, period_label, period_start, period_end, value, unit, source, status)
VALUES
  ('Cajamarca','social_mentions','Ene 2026', now() - interval '4 months', now() - interval '3 months', 2800, 'count', 'IICS', 'published'),
  ('Cajamarca','social_mentions','Feb 2026', now() - interval '3 months', now() - interval '2 months', 3100, 'count', 'IICS', 'published'),
  ('Cajamarca','social_mentions','Mar 2026', now() - interval '2 months', now() - interval '1 month', 3450, 'count', 'IICS', 'published'),
  ('Cajamarca','social_mentions','Abr 2026', now() - interval '1 month', now(), 3900, 'count', 'IICS', 'published'),
  ('Cajamarca','tension_index','Ene 2026', now() - interval '4 months', now() - interval '3 months', 4.1, 'score', 'IICS', 'published'),
  ('Cajamarca','tension_index','Feb 2026', now() - interval '3 months', now() - interval '2 months', 4.6, 'score', 'IICS', 'published'),
  ('Cajamarca','tension_index','Mar 2026', now() - interval '2 months', now() - interval '1 month', 5.3, 'score', 'IICS', 'published'),
  ('Cajamarca','tension_index','Abr 2026', now() - interval '1 month', now(), 6.1, 'score', 'IICS', 'published')
ON CONFLICT DO NOTHING;
