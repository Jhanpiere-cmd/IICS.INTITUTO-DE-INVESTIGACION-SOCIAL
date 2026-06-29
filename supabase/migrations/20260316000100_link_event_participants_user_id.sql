-- Migration to link existing event_participants with profiles using email
UPDATE public.event_participants ep
SET user_id = p.id
FROM public.profiles p
WHERE ep.email = p.email
  AND ep.user_id IS NULL;

-- Also add a trigger to handle future public registrations automatically
CREATE OR REPLACE FUNCTION public.link_event_participant_to_profile()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_id IS NULL AND NEW.email IS NOT NULL THEN
        SELECT id INTO NEW.user_id
        FROM public.profiles
        WHERE email = NEW.email
        LIMIT 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_link_event_participant_to_profile ON public.event_participants;
CREATE TRIGGER tr_link_event_participant_to_profile
BEFORE INSERT ON public.event_participants
FOR EACH ROW
EXECUTE FUNCTION public.link_event_participant_to_profile();
