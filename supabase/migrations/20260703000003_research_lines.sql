-- ============================================================
-- IICS: TABLA research_lines
-- Migration: 20260703000003_research_lines.sql
-- Reemplaza el array STATIC_RESEARCH_LINES hardcodeado en PortalWorkspace
-- ============================================================

CREATE TABLE IF NOT EXISTS public.research_lines (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT        NOT NULL UNIQUE,
  slug        TEXT        GENERATED ALWAYS AS (lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'))) STORED,
  description TEXT,
  coordinator TEXT,
  active      BOOLEAN     DEFAULT true,
  order_index INTEGER     DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_lines_active ON public.research_lines(active);
CREATE INDEX IF NOT EXISTS idx_research_lines_order  ON public.research_lines(order_index);

ALTER TABLE public.research_lines ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede leer las líneas activas (select del formulario público)
CREATE POLICY "Public read research_lines"
  ON public.research_lines FOR SELECT
  USING (active = true);

-- Solo admins/directores pueden crear/modificar
CREATE POLICY "Admins manage research_lines"
  ON public.research_lines FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'director')
    )
  );

-- Trigger updated_at (reutiliza función creada en draft_submissions migration)
DROP TRIGGER IF EXISTS set_research_line_updated_at ON public.research_lines;
CREATE TRIGGER set_research_line_updated_at
  BEFORE UPDATE ON public.research_lines
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Seeds: 6 líneas de investigación del IICS ────────────────────────────────
INSERT INTO public.research_lines (name, description, coordinator, order_index) VALUES
('Sociología Territorial',
 'Análisis de conflictos socioambientales, identidades territoriales y dinámicas comunitarias en zonas rurales y mineras del norte peruano.',
 'Dr. Alcides Ramírez Torres', 1),
('Sociología Digital y Nuevas Tecnologías',
 'Estudio del impacto de las redes sociales, big data y plataformas digitales en las relaciones sociales y la opinión pública regional.',
 'Mg. Sandra Villalobos Cruz', 2),
('Desarrollo Urbano y Rural',
 'Investigación sobre procesos de urbanización informal, acceso a servicios básicos y transformaciones del espacio rural en Cajamarca.',
 'Dr. Juan Salcedo Peralta', 3),
('Conflictos Socioambientales',
 'Mapeo, análisis y seguimiento de conflictos entre comunidades, Estado y empresas extractivas. Propuesta de marcos de mediación.',
 'Mg. María Huamán Quispe', 4),
('Género y Sociedad',
 'Investigación sobre brechas de género, violencia estructural y participación política de las mujeres en el contexto andino.',
 'Dra. Rosa Mendoza Ibáñez', 5),
('Economía Social y Solidaria',
 'Estudio de cooperativas, economía campesina, cadenas de valor del café y cacao, y modelos alternativos de desarrollo local.',
 'Mg. Carlos Sánchez Vega', 6)
ON CONFLICT (name) DO UPDATE
  SET description  = EXCLUDED.description,
      coordinator  = EXCLUDED.coordinator,
      order_index  = EXCLUDED.order_index,
      updated_at   = NOW();
