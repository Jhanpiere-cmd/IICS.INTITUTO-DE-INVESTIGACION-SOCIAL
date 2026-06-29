-- CRÍTICO: Agregar columna 'questions' faltante en tabla lessons
-- Esta columna es necesaria para guardar quizzes y lecciones generadas por IA

-- Agregar columna questions tipo JSONB para almacenar arrays de preguntas
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS questions JSONB DEFAULT '[]'::jsonb;

-- Comentario explicativo
COMMENT ON COLUMN lessons.questions IS 'Array de preguntas para lecciones tipo quiz. Formato: [{"question": "...", "options": [...], "correct_answer": 0}]';

-- Verificar que la columna se agregó correctly
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'lessons' AND column_name = 'questions';
