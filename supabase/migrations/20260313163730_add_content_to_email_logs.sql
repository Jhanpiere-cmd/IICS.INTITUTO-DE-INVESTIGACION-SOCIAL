ALTER TABLE public.email_logs ADD COLUMN IF NOT EXISTS message_body text;
