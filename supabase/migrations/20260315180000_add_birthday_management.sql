-- Migración para la Gestión de Cumpleaños
-- Fecha: 2026-03-15

-- 1. Añadir campos a los perfiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS birth_date DATE,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS role TEXT,
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Crear tabla para la planificación de celebraciones (compartires)
CREATE TABLE IF NOT EXISTS public.birthday_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    plan_type TEXT DEFAULT 'Compartir',
    details TEXT,
    scheduled_date DATE,
    scheduled_time TIME,
    status TEXT DEFAULT 'Planificado',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(profile_id, year)
);

-- 3. Habilitar RLS
ALTER TABLE public.birthday_plans ENABLE ROW LEVEL SECURITY;

-- 4. Políticas para birthday_plans
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view all birthday plans') THEN
        CREATE POLICY "Users can view all birthday plans" 
        ON public.birthday_plans FOR SELECT 
        TO authenticated 
        USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage birthday plans') THEN
        CREATE POLICY "Admins can manage birthday plans" 
        ON public.birthday_plans FOR ALL 
        TO authenticated 
        USING (
          EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
            AND (
              users.role ILIKE '%director%' OR 
              users.role ILIKE '%asesor%' OR 
              users.role ILIKE '%secretaria%' OR
              users.role ILIKE '%coordinador%'
            )
          )
        );
    END IF;
END $$;

-- 5. Trigger para updated_at en birthday_plans
CREATE OR REPLACE FUNCTION update_birthday_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_birthday_plans_timestamp ON public.birthday_plans;
CREATE TRIGGER update_birthday_plans_timestamp
    BEFORE UPDATE ON public.birthday_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_birthday_plans_updated_at();
