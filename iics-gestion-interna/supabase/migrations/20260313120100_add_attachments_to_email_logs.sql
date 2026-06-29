-- Migración para añadir soporte de adjuntos a los logs de correo
ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;

-- Comentario para documentar la estructura esperada:
-- [{ "name": "archivo.pdf", "url": "https://...", "size": 1234, "type": "application/pdf" }]
