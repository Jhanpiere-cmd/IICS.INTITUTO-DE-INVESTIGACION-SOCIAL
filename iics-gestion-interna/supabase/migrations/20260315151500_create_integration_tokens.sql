-- Tabla para almacenar tokens de integración de terceros (YouTube, etc)
CREATE TABLE IF NOT EXISTS public.integration_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL UNIQUE,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.integration_tokens ENABLE ROW LEVEL SECURITY;

-- Política para que usuarios autenticados puedan leer los tokens
CREATE POLICY "Enable read access for authenticated users" 
ON public.integration_tokens FOR SELECT 
TO authenticated 
USING (true);

-- Política para que usuarios autenticados puedan insertar/actualizar
CREATE POLICY "Enable insert/update for authenticated users" 
ON public.integration_tokens FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);
