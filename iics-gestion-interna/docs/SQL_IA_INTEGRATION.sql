-- EJECUTAR EN SUPABASE SQL EDITOR
-- Agrega soporte para tokens de acceso de IAs externas (ChatGPT, Gemini)

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS ai_token TEXT UNIQUE;

-- Comentario para el equipo
COMMENT ON COLUMN profiles.ai_token IS 'Token secreto para integraciones agénticas externas (BETA)';
