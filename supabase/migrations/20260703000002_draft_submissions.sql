-- ============================================================
-- IICS: TABLA draft_submissions
-- Migration: 20260703000002_draft_submissions.sql
-- Reemplaza el array hardcodeado submittedDrafts en PortalWorkspace
-- ============================================================

CREATE TABLE IF NOT EXISTS public.draft_submissions (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  title       TEXT        NOT NULL,
  line        TEXT,                        -- línea de investigación IICS
  filename    TEXT,                        -- nombre del archivo subido
  file_url    TEXT,                        -- URL en Supabase Storage (opcional)
  status      TEXT        DEFAULT 'En Cola de Revisión de Pares',
                                           -- 'En Cola de Revisión de Pares'
                                           -- 'En Proceso de Dictamen'
                                           -- 'Aprobado'
                                           -- 'Rechazado'
                                           -- 'Publicado'
  reviewer_id UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewer_notes TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_draft_user    ON public.draft_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_draft_status  ON public.draft_submissions(status);
CREATE INDEX IF NOT EXISTS idx_draft_created ON public.draft_submissions(created_at DESC);

-- RLS: usuarios ven sus propios borradores; admins ven todos
ALTER TABLE public.draft_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own drafts"
  ON public.draft_submissions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Auth users insert drafts"
  ON public.draft_submissions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Auth users update own drafts"
  ON public.draft_submissions FOR UPDATE
  USING (user_id = auth.uid());

-- Admins ven todo (requiere rol 'admin' en profiles.role)
CREATE POLICY "Admins read all drafts"
  ON public.draft_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'director', 'editor')
    )
  );

CREATE POLICY "Admins update all drafts"
  ON public.draft_submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'director', 'editor')
    )
  );

-- Trigger: actualiza updated_at en cada UPDATE
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_draft_updated_at ON public.draft_submissions;
CREATE TRIGGER set_draft_updated_at
  BEFORE UPDATE ON public.draft_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Vista para el admin: borradores con nombre del autor ──────────────────────
CREATE OR REPLACE VIEW public.v_draft_submissions AS
SELECT
  ds.*,
  p.full_name AS author_name,
  p.email     AS author_email
FROM public.draft_submissions ds
LEFT JOIN public.profiles p ON p.id = ds.user_id;

-- Seed de ejemplo (solo se inserta si no existe ya)
-- INSERT INTO public.draft_submissions (title, line, filename, status) VALUES
-- ('Remediación y cohesión social en las cuencas altas de Hualgayoc',
--  'Sociología Territorial',
--  'borrador_remediacion_hualgayoc_v2.pdf',
--  'En Proceso de Dictamen')
-- ON CONFLICT DO NOTHING;
