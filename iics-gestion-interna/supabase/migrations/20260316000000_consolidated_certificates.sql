-- Migration to enhance certificates and event participants for a unified system

-- 1. Enhance event_participants to link with internal users
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'event_participants' AND COLUMN_NAME = 'user_id') THEN
        ALTER TABLE public.event_participants ADD COLUMN user_id UUID REFERENCES public.profiles(id);
    END IF;
END $$;

-- 2. Enhance certificates table to support events and team recognitions
ALTER TABLE public.certificates 
    ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id),
    ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'curso',
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 3. Ensure role-based security for recognitions
-- Assuming 'Director' is a valid role in the profiles table.
-- We can add a policy to restrict insertion of 'reconocimiento' type certificates.

-- Remove existing policy if any to avoid conflicts
DROP POLICY IF EXISTS "Only Director can issue recognitions" ON public.certificates;

CREATE POLICY "Only Director can issue recognitions" ON public.certificates
    FOR INSERT 
    TO authenticated
    WITH CHECK (
        (type <> 'reconocimiento') OR 
        (EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'Director'
        ))
    );

-- 4. Update existing certificates to have 'curso' type if null
UPDATE public.certificates SET type = 'curso' WHERE type IS NULL;
