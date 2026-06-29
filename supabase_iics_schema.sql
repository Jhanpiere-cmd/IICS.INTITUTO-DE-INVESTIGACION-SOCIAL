-- ==========================================================
-- MASTER SCHEMA CONSOLIDADO - IICS SUPABASE INITIALIZATION
-- ==========================================================


-- Create users table if not exists (Legacy user table used in triggers and policies)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'Miembro',
  approved BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'Pendiente',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Basic policies for users
DROP POLICY IF EXISTS "Public users are viewable by everyone" ON public.users;
CREATE POLICY "Public users are viewable by everyone" ON public.users FOR SELECT USING (true);


-- ==========================================
-- MÓDULO: FIX_PROFILES.SQL
-- ==========================================

-- Create profiles table if not exists with correct columns matching the code
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  updated_at timestamp with time zone default now(),
  "fullName" text,
  role text default 'user',
  "avatarUrl" text,
  email text
);

-- Enable RLS
alter table public.profiles enable row level security;

---- Drop existing policies to avoid conflicts
drop policy if exists "Public profiles are viewable by everyone." on public.profiles;
drop policy if exists "Users can insert their own profile." on public.profiles;
drop policy if exists "Users can update own profile." on public.profiles;

-- Re-create policies
create policy "Public profiles are viewable by everyone."
  on public.profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on public.profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on public.profiles for update
  using ( auth.uid() = id );

-- Trigger function
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- 1. Insert into profiles table
  insert into public.profiles (id, "fullName", "avatarUrl", role, email)
  values (
    new.id, 
    coalesce(new.raw_user_meta_data->>'full_name', new.email), 
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_user_meta_data->>'role', 'user'),
    new.email
  )
  on conflict (id) do update
  set 
    "fullName" = excluded."fullName",
    email = excluded.email;

  -- 2. Insert into users table
  insert into public.users (id, email, full_name, role, approved, status, created_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'Miembro'),
    case when coalesce(new.raw_user_meta_data->>'role', 'Miembro') = 'Director' then true else false end,
    case when coalesce(new.raw_user_meta_data->>'role', 'Miembro') = 'Director' then 'Aprobado' else 'Pendiente' end,
    now()
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, users.full_name),
    role = coalesce(excluded.role, users.role);

  return new;
end;
$$ language plpgsql security definer;

-- Trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill existing users from auth.users
insert into public.profiles (id, "fullName", role, email)
select 
  id, 
  coalesce(raw_user_meta_data->>'full_name', email),
  coalesce(raw_user_meta_data->>'role', 'user'),
  email
from auth.users
on conflict (id) do update
set 
  "fullName" = excluded."fullName",
  email = excluded.email;



-- ==========================================
-- MÓDULO: TABLAS ADICIONALES (TASKS, MEETINGS, NEWS)
-- ==========================================

-- Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'Pendiente' CHECK (status IN ('Pendiente', 'En progreso', 'Completada', 'En espera')),
  priority TEXT DEFAULT 'Media' CHECK (priority IN ('Baja', 'Media', 'Alta', 'Urgente')),
  due_date DATE,
  due_time TIME DEFAULT NULL,
  publication_date DATE DEFAULT NULL,
  file_urls TEXT[] DEFAULT '{}',
  completion_link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Meetings Table
CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration INTEGER NOT NULL, -- in minutes
  location TEXT,
  meeting_link TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- Meeting Participants Table
CREATE TABLE IF NOT EXISTS public.meeting_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'Pendiente' CHECK (status IN ('Pendiente', 'Confirmado', 'Declinado')),
  attendance_status TEXT DEFAULT 'Sin registrar' CHECK (attendance_status IN ('Asistió', 'Ausente', 'Tardanza', 'Sin registrar')),
  attendance_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(meeting_id, user_id)
);

ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;

-- News Table
CREATE TABLE IF NOT EXISTS public.news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT,
  content TEXT NOT NULL,
  published_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'Borrador' CHECK (status IN ('Borrador', 'Publicado', 'Archivado')),
  image_url TEXT,
  category TEXT DEFAULT 'Otro' CHECK (category IN ('Anuncio', 'Actualización', 'Logro', 'Evento', 'Otro')),
  views INTEGER DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;


-- ==========================================
-- MÓDULO: CREATE_EVENTS_SCHEMA.SQL
-- ==========================================

-- ==========================================
-- SISTEMA DE GESTIÓN DE EVENTOS ACS
-- Crear tablas para eventos, participantes, responsabilidades y galería
-- ==========================================

-- 1. TABLA PRINCIPAL: EVENTS
CREATE TABLE IF NOT EXISTS events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT CHECK (event_type IN (
        'webinar', 'conversatorio', 'taller', 
        'feria', 'visita_aula', 'pollada', 
        'curso_extracurricular', 'transmision', 'otro'
    )) NOT NULL,
    scheduled_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    location TEXT,
    is_online BOOLEAN DEFAULT false,
    meeting_link TEXT,
    budget_estimated DECIMAL(10,2),
    budget_actual DECIMAL(10,2),
    status TEXT CHECK (status IN ('planificado', 'en_curso', 'completado', 'cancelado')) DEFAULT 'planificado',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLA: EVENT_RESPONSIBILITIES (Responsables por área)
CREATE TABLE IF NOT EXISTS event_responsibilities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    responsibility_type TEXT CHECK (responsibility_type IN (
        'envio_oficios', 'logistica', 'produccion_contenido', 
        'relaciones_institucionales', 'moderacion'
    )) NOT NULL,
    assigned_to UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABLA: EVENT_PARTICIPANTS (Participantes registrados)
CREATE TABLE IF NOT EXISTS event_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    institution TEXT,
    category TEXT CHECK (category IN (
        'organizador', 'co_organizador', 'ponente', 
        'comentarista', 'artista_invitado', 'participante_general'
    )) NOT NULL,
    attended BOOLEAN DEFAULT false,
    certificate_generated BOOLEAN DEFAULT false,
    certificate_url TEXT,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TABLA: EVENT_GALLERY (Galería de imágenes del evento)
CREATE TABLE IF NOT EXISTS event_gallery (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_type TEXT CHECK (file_type IN ('image', 'video')) NOT NULL,
    caption TEXT,
    uploaded_by UUID REFERENCES auth.users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- POLÍTICAS RLS (Row Level Security)
-- ==========================================

-- Habilitar RLS en todas las tablas
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_responsibilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_gallery ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS EVENTS
DROP POLICY IF EXISTS "Todos pueden ver eventos" ON events;
CREATE POLICY "Todos pueden ver eventos" ON events
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff puede crear eventos" ON events;
CREATE POLICY "Staff puede crear eventos" ON events
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('Director', 'Subdirector', 'Subdirectora', 'Coordinador de Eventos', 'Coordinadora de Eventos', 'Secretaria')
        )
    );

DROP POLICY IF EXISTS "Staff puede actualizar eventos" ON events;
CREATE POLICY "Staff puede actualizar eventos" ON events
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('Director', 'Subdirector', 'Subdirectora', 'Coordinador de Eventos', 'Coordinadora de Eventos', 'Secretaria')
        )
    );

DROP POLICY IF EXISTS "Staff puede eliminar eventos" ON events;
CREATE POLICY "Staff puede eliminar eventos" ON events
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('Director', 'Subdirector', 'Subdirectora', 'Secretaria')
        )
    );

-- POLÍTICAS EVENT_RESPONSIBILITIES
DROP POLICY IF EXISTS "Staff puede ver responsabilidades" ON event_responsibilities;
CREATE POLICY "Staff puede ver responsabilidades" ON event_responsibilities
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff puede gestionar responsabilidades" ON event_responsibilities;
CREATE POLICY "Staff puede gestionar responsabilidades" ON event_responsibilities
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('Director', 'Subdirector', 'Subdirectora', 'Coordinador de Eventos', 'Coordinadora de Eventos', 'Secretaria')
        )
    );

-- POLÍTICAS EVENT_PARTICIPANTS
DROP POLICY IF EXISTS "Todos pueden ver participantes" ON event_participants;
CREATE POLICY "Todos pueden ver participantes" ON event_participants
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff puede gestionar participantes" ON event_participants;
CREATE POLICY "Staff puede gestionar participantes" ON event_participants
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('Director', 'Subdirector', 'Subdirectora', 'Coordinador de Eventos', 'Coordinadora de Eventos', 'Gestor de Redes', 'Gestora de Redes', 'Secretaria')
        )
    );

-- POLÍTICAS EVENT_GALLERY
DROP POLICY IF EXISTS "Todos pueden ver galería" ON event_gallery;
CREATE POLICY "Todos pueden ver galería" ON event_gallery
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff puede subir a galería" ON event_gallery;
CREATE POLICY "Staff puede subir a galería" ON event_gallery
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Staff puede actualizar galería" ON event_gallery;
CREATE POLICY "Staff puede actualizar galería" ON event_gallery
    FOR UPDATE USING (uploaded_by = auth.uid());

DROP POLICY IF EXISTS "Staff puede eliminar de galería" ON event_gallery;
CREATE POLICY "Staff puede eliminar de galería" ON event_gallery
    FOR DELETE USING (
        uploaded_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() 
            AND role IN ('Director', 'Subdirector', 'Subdirectora', 'Coordinador de Eventos', 'Coordinadora de Eventos', 'Secretaria')
        )
    );

-- ==========================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_events_scheduled_date ON events(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_gallery_event_id ON event_gallery(event_id);
CREATE INDEX IF NOT EXISTS idx_event_responsibilities_event_id ON event_responsibilities(event_id);



-- ==========================================
-- MÓDULO: SETUP_MULTISESSION_SCHEMA.SQL
-- ==========================================


-- SCHEMA PARA TALLERES MULTI-SESIÓN
-- Ejecuta este script para habilitar eventos con múltiples fechas (ej. Curso de 3 días)

-- 1. Agregar flag a la tabla events
ALTER TABLE events ADD COLUMN IF NOT EXISTS is_multisession BOOLEAN DEFAULT FALSE;

-- 2. Crear tabla event_sessions (Fechas individuales del evento)
CREATE TABLE IF NOT EXISTS event_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    title TEXT, -- Opcional: "Sesión 1", "Clase Magistral", etc.
    location TEXT, -- Opcional: Si difiere del principal
    created_at TIMESTAMPTZ DEFAULT NOW(),
    order_index INTEGER DEFAULT 0 -- Para ordenar las sesiones (1, 2, 3...)
);

-- 3. Crear tabla event_attendance_records (Asistencia pormenorizada)
-- Relaciona un participante con una sesión específica
CREATE TABLE IF NOT EXISTS event_attendance_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE, -- Redundancia útil para queries rápidas
    session_id UUID NOT NULL REFERENCES event_sessions(id) ON DELETE CASCADE,
    participant_id UUID NOT NULL REFERENCES event_participants(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'present', -- 'present', 'absent', 'late', 'excused'
    marked_at TIMESTAMPTZ DEFAULT NOW(),
    marked_by UUID REFERENCES auth.users(id),
    UNIQUE(session_id, participant_id) -- Un participante solo tiene un registro por sesión
);

-- 4. Habilitar RLS
ALTER TABLE event_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_attendance_records ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS (Simples: Todos los autenticados pueden ver y editar por ahora, igual que events)
CREATE POLICY "Allow all authenticated to read sessions" ON event_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all authenticated to write sessions" ON event_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all authenticated to read attendance" ON event_attendance_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow all authenticated to write attendance" ON event_attendance_records FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. MIGRACIÓN DE DATOS EXISTENTES
-- Para que el sistema funcione con eventos viejos, creamos una "Sesión Default" para cada evento existente
-- que no tenga sesiones aún.
INSERT INTO event_sessions (event_id, session_date, start_time, end_time, title, order_index)
SELECT 
    id, 
    scheduled_date, 
    start_time, 
    end_time, 
    'Sesión Única',
    1
FROM events
WHERE id NOT IN (SELECT DISTINCT event_id FROM event_sessions);

-- 7. (Opcional) Migrar asistencia existente
-- Si un participante ya tenía attended=true, marcamos asistencia en la sesión única creada.
INSERT INTO event_attendance_records (event_id, session_id, participant_id, status, marked_at)
SELECT 
    ep.event_id,
    es.id,
    ep.id,
    'present',
    NOW()
FROM event_participants ep
JOIN event_sessions es ON es.event_id = ep.event_id
WHERE ep.attended = true
AND NOT EXISTS (
    SELECT 1 FROM event_attendance_records ear 
    WHERE ear.participant_id = ep.id AND ear.session_id = es.id
);

-- Confirmación visual
SELECT COUNT(*) as migraciones_sesiones FROM event_sessions;



-- ==========================================
-- MÓDULO: CREATE_FINANCE_TABLES.SQL
-- ==========================================

-- Create financial_activities table
CREATE TABLE IF NOT EXISTS financial_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    start_date DATE,
    end_date DATE,
    status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Closed', 'Archived')),
    initial_budget NUMERIC(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create financial_transactions table
CREATE TABLE IF NOT EXISTS financial_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    activity_id UUID REFERENCES financial_activities(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    category TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    description TEXT NOT NULL,
    evidence_urls TEXT[], -- Array of URLs for receipts/images
    transaction_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE financial_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for financial_activities
-- Allow all authenticated users to read
CREATE POLICY "Allow read access for all authenticated users" ON financial_activities
    FOR SELECT TO authenticated USING (true);

-- Allow all authenticated users to insert (as requested for transparency/collaboration)
CREATE POLICY "Allow insert access for all authenticated users" ON financial_activities
    FOR INSERT TO authenticated WITH CHECK (true);

-- Allow creators and Directors to update/delete
CREATE POLICY "Allow update for creators and Directors" ON financial_activities
    FOR UPDATE TO authenticated USING (
        auth.uid() = created_by OR 
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Director')
    );

CREATE POLICY "Allow delete for creators and Directors" ON financial_activities
    FOR DELETE TO authenticated USING (
        auth.uid() = created_by OR 
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Director')
    );

-- Policies for financial_transactions
-- Allow all authenticated users to read
CREATE POLICY "Allow read access for all authenticated users" ON financial_transactions
    FOR SELECT TO authenticated USING (true);

-- Allow all authenticated users to insert
CREATE POLICY "Allow insert access for all authenticated users" ON financial_transactions
    FOR INSERT TO authenticated WITH CHECK (true);

-- Allow creators and Directors to update/delete
CREATE POLICY "Allow update for creators and Directors" ON financial_transactions
    FOR UPDATE TO authenticated USING (
        auth.uid() = created_by OR 
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Director')
    );

CREATE POLICY "Allow delete for creators and Directors" ON financial_transactions
    FOR DELETE TO authenticated USING (
        auth.uid() = created_by OR 
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Director')
    );

-- Create storage bucket for finance evidence if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('finance-evidence', 'finance-evidence', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Give public access to finance evidence" ON storage.objects
    FOR SELECT TO public USING (bucket_id = 'finance-evidence');

CREATE POLICY "Allow authenticated uploads to finance evidence" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'finance-evidence');

CREATE POLICY "Allow owners and Directors to delete finance evidence" ON storage.objects
    FOR DELETE TO authenticated USING (
        bucket_id = 'finance-evidence' AND (
            auth.uid() = owner OR 
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Director')
        )
    );

-- Create storage bucket for user avatars if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Give public access to avatars" ON storage.objects
    FOR SELECT TO public USING (bucket_id = 'avatars');

CREATE POLICY "Allow authenticated uploads to avatars" ON storage.objects
    FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Allow authenticated updates to avatars" ON storage.objects
    FOR UPDATE TO authenticated USING (bucket_id = 'avatars') WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Allow owners and Directors to delete avatars" ON storage.objects
    FOR DELETE TO authenticated USING (
        bucket_id = 'avatars' AND (
            auth.uid() = owner OR 
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Director')
        )
    );



-- ==========================================
-- MÓDULO: CREATE_TRAINING_SCHEMA.SQL
-- ==========================================

-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- 1. Courses Table
create table if not exists public.courses (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  cover_url text,
  created_by uuid references auth.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Modules Table
create table if not exists public.modules (
  id uuid default uuid_generate_v4() primary key,
  course_id uuid references public.courses(id) on delete cascade not null,
  title text not null,
  description text,
  order_index integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Lessons Table
create table if not exists public.lessons (
  id uuid default uuid_generate_v4() primary key,
  module_id uuid references public.modules(id) on delete cascade not null,
  title text not null,
  type text check (type in ('video', 'text', 'quiz')) not null,
  content_url text, -- For video URL or image URL
  content_text text, -- For text content or quiz JSON
  order_index integer default 0,
  duration_minutes integer,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. User Progress Table
create table if not exists public.user_progress (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  lesson_id uuid references public.lessons(id) on delete cascade not null,
  completed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, lesson_id)
);

-- 5. Quiz Results Table (Optional for now, but good to have)
create table if not exists public.quiz_results (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  lesson_id uuid references public.lessons(id) on delete cascade not null,
  score integer not null,
  passed boolean default false,
  attempted_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.user_progress enable row level security;
alter table public.quiz_results enable row level security;

-- RLS Policies

-- Courses: Everyone can view, only Directors can manage
create policy "Courses are viewable by everyone"
  on public.courses for select
  using (true);

create policy "Courses are manageable by Directors"
  on public.courses for all
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'Director'
    )
  );

-- Modules: Everyone can view, only Directors can manage
create policy "Modules are viewable by everyone"
  on public.modules for select
  using (true);

create policy "Modules are manageable by Directors"
  on public.modules for all
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'Director'
    )
  );

-- Lessons: Everyone can view, only Directors can manage
create policy "Lessons are viewable by everyone"
  on public.lessons for select
  using (true);

create policy "Lessons are manageable by Directors"
  on public.lessons for all
  using (
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'Director'
    )
  );

-- User Progress: Users can view/manage their own progress
create policy "Users can view their own progress"
  on public.user_progress for select
  using (auth.uid() = user_id);

create policy "Users can update their own progress"
  on public.user_progress for insert
  with check (auth.uid() = user_id);
  
create policy "Users can delete their own progress"
  on public.user_progress for delete
  using (auth.uid() = user_id);

-- Quiz Results: Users can view/manage their own results
create policy "Users can view their own quiz results"
  on public.quiz_results for select
  using (auth.uid() = user_id);

create policy "Users can insert their own quiz results"
  on public.quiz_results for insert
  with check (auth.uid() = user_id);

-- Create Storage Bucket for Training Content
insert into storage.buckets (id, name, public)
values ('training-content', 'training-content', true)
on conflict (id) do nothing;

-- Storage Policies
create policy "Training content is publicly accessible"
  on storage.objects for select
  using ( bucket_id = 'training-content' );

create policy "Directors can upload training content"
  on storage.objects for insert
  with check (
    bucket_id = 'training-content' and
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'Director'
    )
  );

create policy "Directors can update training content"
  on storage.objects for update
  using (
    bucket_id = 'training-content' and
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'Director'
    )
  );

create policy "Directors can delete training content"
  on storage.objects for delete
  using (
    bucket_id = 'training-content' and
    exists (
      select 1 from public.users
      where users.id = auth.uid() and users.role = 'Director'
    )
  );



-- ==========================================
-- MÓDULO: SETUP_PHASE2_DB.SQL
-- ==========================================

-- =================================================================
-- SCRIPT DE FASE 2 (CORREGIDO): ASISTENCIA, MATRÍCULAS Y CALENDARIO
-- Ejecutar TODO en el Editor SQL de Supabase
-- =================================================================

-- 0. CORRECCIÓN DE EMERGENCIA: Crear tabla PROFILES si no existe
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role TEXT CHECK (role IN ('Director', 'Docente', 'Estudiante')) DEFAULT 'Estudiante',
  full_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS en profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas básicas de profiles (si no existen)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Public profiles are viewable by everyone') THEN
        CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert their own profile') THEN
        CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile') THEN
        CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
    END IF;
END $$;

-- Courses: Tipo, Fecha Límite y Matricula Abierta
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'type') THEN
        ALTER TABLE courses ADD COLUMN type TEXT CHECK (type IN ('online', 'presencial')) DEFAULT 'online';
    END IF;

    -- Fecha límite general para finalizar el curso (Asincrónico)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'default_deadline') THEN
        ALTER TABLE courses ADD COLUMN default_deadline DATE;
    END IF;
    
    -- Si permite que cualquiera se matricule con un click
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'is_open_enrollment') THEN
        ALTER TABLE courses ADD COLUMN is_open_enrollment BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Lessons: Evaluación y AGENDA (Calendario)
DO $$ 
BEGIN 
    -- Para identificar el examen sustitutorio en cursos online
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'is_recovery_exam') THEN
        ALTER TABLE lessons ADD COLUMN is_recovery_exam BOOLEAN DEFAULT false;
    END IF;
    
    -- Para identificar tareas presenciales que requieren nota manual
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'requires_manual_grade') THEN
        ALTER TABLE lessons ADD COLUMN requires_manual_grade BOOLEAN DEFAULT false;
    END IF;

    -- CAMPOS NUEVOS: Calendario Docente (Presencial)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'scheduled_date') THEN
        ALTER TABLE lessons ADD COLUMN scheduled_date DATE; -- Día de la clase
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'start_time') THEN
        ALTER TABLE lessons ADD COLUMN start_time TIME; -- Hora inicio
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'end_time') THEN
        ALTER TABLE lessons ADD COLUMN end_time TIME; -- Hora fin
    END IF;
END $$;


-- ==========================================
-- 2. NUEVA TABLA: ENROLLMENTS (Matrículas)
-- ==========================================
CREATE TABLE IF NOT EXISTS enrollments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- Ahora referencia a profiles seguro
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    
    -- active: cursando
    -- completed: aprobó y terminó
    -- failed_attendance: reprobado por >40% faltas (Presencial)
    -- failed_grades: reprobado por nota <11 incluso tras sustitutorio (Online)
    -- recovering: reprobó parciales, está habilitado para sustitutorio (Online)
    status TEXT CHECK (status IN ('active', 'completed', 'failed_attendance', 'failed_grades', 'recovering')) DEFAULT 'active',
    
    final_grade DECIMAL(4,2) DEFAULT 0, -- Nota promedio 0-20
    attendance_percentage DECIMAL(5,2) DEFAULT 100, -- % Asistencia
    
    deadline_override DATE, -- PRÓRROGA: Fecha especial para este alumno
    
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, course_id)
);

ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;

-- Políticas Matriculas
DROP POLICY IF EXISTS "Ver propias matriculas" ON enrollments;
CREATE POLICY "Ver propias matriculas" ON enrollments
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Staff ve todas las matriculas" ON enrollments;
CREATE POLICY "Staff ve todas las matriculas" ON enrollments
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Director', 'Docente'))
    );
    
-- Permitir auto-matriculación
DROP POLICY IF EXISTS "Usuarios insertan propia matricula" ON enrollments;
CREATE POLICY "Usuarios insertan propia matricula" ON enrollments
    FOR INSERT WITH CHECK (auth.uid() = user_id);
    
DROP POLICY IF EXISTS "Usuarios actualizan propia matricula" ON enrollments;
CREATE POLICY "Usuarios actualizan propia matricula" ON enrollments
    FOR UPDATE USING (auth.uid() = user_id);


-- ==========================================
-- 3. NUEVA TABLA: ATTENDANCE (Asistencia)
-- ==========================================
CREATE TABLE IF NOT EXISTS attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    enrollment_id UUID REFERENCES enrollments(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    
    status TEXT CHECK (status IN ('present', 'absent', 'late', 'excused')) DEFAULT 'present',
    
    date DATE DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(enrollment_id, lesson_id)
);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff gestiona asistencia" ON attendance;
CREATE POLICY "Staff gestiona asistencia" ON attendance
    FOR ALL USING (
         EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Director', 'Docente'))
    );

DROP POLICY IF EXISTS "Alumno ve su asistencia" ON attendance;
CREATE POLICY "Alumno ve su asistencia" ON attendance
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM enrollments WHERE id = attendance.enrollment_id AND user_id = auth.uid())
    );


-- ==========================================
-- 4. NUEVA TABLA: MANUAL_GRADES (Notas Físicas)
-- ==========================================
CREATE TABLE IF NOT EXISTS manual_grades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    enrollment_id UUID REFERENCES enrollments(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    
    score DECIMAL(4,2) CHECK (score >= 0 AND score <= 20),
    feedback TEXT,
    
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(enrollment_id, lesson_id)
);

ALTER TABLE manual_grades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff gestiona notas manuales" ON manual_grades;
CREATE POLICY "Staff gestiona notas manuales" ON manual_grades
    FOR ALL USING (
         EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('Director', 'Docente'))
    );

DROP POLICY IF EXISTS "Alumno ve sus notas manuales" ON manual_grades;
CREATE POLICY "Alumno ve sus notas manuales" ON manual_grades
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM enrollments WHERE id = manual_grades.enrollment_id AND user_id = auth.uid())
    );



-- ==========================================
-- MÓDULO: SETUP_DRIVE_SYSTEM.SQL
-- ==========================================

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Folders Table
CREATE TABLE IF NOT EXISTS storage_folders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    parent_id UUID REFERENCES storage_folders(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    path_tokens TEXT[] GENERATED ALWAYS AS (
        -- This would require a recursive function to be perfect, 
        -- for simplicity we'll manage path logic in application or simple parent lookups
        NULL 
    ) STORED
);

-- 2. Create Files Table (Metadata for Storage Objects)
CREATE TABLE IF NOT EXISTS storage_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    folder_id UUID REFERENCES storage_folders(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL, -- The actual path in Supabase Storage bucket
    bucket_id TEXT NOT NULL DEFAULT 'resources',
    size BIGINT DEFAULT 0,
    mime_type TEXT,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_starred BOOLEAN DEFAULT FALSE,
    is_trashed BOOLEAN DEFAULT FALSE
);

-- 3. RLS Policies
ALTER TABLE storage_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_files ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow read folders" ON storage_folders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read files" ON storage_files FOR SELECT TO authenticated USING (true);

-- Allow write/manage to authenticated users (for now, easy collab)
CREATE POLICY "Allow all folders" ON storage_folders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all files" ON storage_files FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Initial "Root" Folders based on User Request
-- We will create a root folder entry for "Recursos" to map the existing bucket structure if needed,
-- but typically root is just parent_id = NULL.

-- 5. Helper Function to Sync Storage to DB (Simple version)
-- This function can be called to "index" a file uploaded via standard storage API if needed,
-- but ideally the frontend will create the DB entry after upload.

-- Create a specialized index for faster lookups
CREATE INDEX IF NOT EXISTS idx_files_folder ON storage_files(folder_id);
CREATE INDEX IF NOT EXISTS idx_folders_parent ON storage_folders(parent_id);



-- ==========================================
-- MÓDULO: CREATE_ALLIANCES.SQL
-- ==========================================

-- Create alliances table
CREATE TABLE IF NOT EXISTS alliances (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  institution TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  contract_url TEXT, -- PDF URL
  status TEXT DEFAULT 'Activo' CHECK (status IN ('Activo', 'Finalizado', 'En Negociación')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE alliances ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Everyone can view alliances" ON alliances
  FOR SELECT USING (true);

CREATE POLICY "Directors can manage alliances" ON alliances
  FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Director'));

-- Storage Buckets (if not exist, though we can't easily check existence in pure SQL without extensions, we'll assume creation or ignore error)
-- Note: In Supabase SQL editor, we usually insert into storage.buckets.
INSERT INTO storage.buckets (id, name, public)
VALUES ('alliance-covers', 'alliance-covers', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('alliance-contracts', 'alliance-contracts', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies (simplified for script, usually done via UI or complex SQL)
-- We'll try to set them up if possible, otherwise user might need to check.
-- Allow public read for covers
CREATE POLICY "Public Access Covers" ON storage.objects FOR SELECT
USING ( bucket_id = 'alliance-covers' );

-- Allow public read for contracts (as requested "todos puedan verlo")
CREATE POLICY "Public Access Contracts" ON storage.objects FOR SELECT
USING ( bucket_id = 'alliance-contracts' );

-- Allow Directors to upload/update/delete
CREATE POLICY "Directors Manage Covers" ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'alliance-covers' AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Director') );

CREATE POLICY "Directors Manage Contracts" ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'alliance-contracts' AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Director') );



-- ==========================================
-- MÓDULO: CREATE_BENEFITS_TABLE.SQL
-- ==========================================

-- Create benefits table
CREATE TABLE IF NOT EXISTS benefits (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('Capacitación', 'Beca', 'Intercambio', 'Certificación', 'Bienestar', 'Otro')),
  partner_name TEXT,
  status TEXT NOT NULL DEFAULT 'Borrador' CHECK (status IN ('Borrador', 'Publicado', 'Archivado')),
  availability TEXT NOT NULL DEFAULT 'Disponible' CHECK (availability IN ('Disponible', 'En Negociación', 'Próximamente', 'Cerrado')),
  requirements TEXT[], -- Array of strings
  image_url TEXT,
  valid_until DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE benefits ENABLE ROW LEVEL SECURITY;

-- Policies

-- Everyone can read published benefits
CREATE POLICY "Everyone can view published benefits" ON benefits
  FOR SELECT
  USING (status = 'Publicado' OR auth.uid() IN (
    SELECT id FROM users WHERE role = 'Director'
  ));

-- Only Director can insert, update, delete
CREATE POLICY "Directors can manage benefits" ON benefits
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'Director'
    )
  );

-- Create storage bucket for benefit images if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('benefit-images', 'benefit-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for benefit-images
CREATE POLICY "Benefit images are public" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'benefit-images');

CREATE POLICY "Directors can upload benefit images" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'benefit-images' AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'Director'
    )
  );

CREATE POLICY "Directors can update benefit images" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'benefit-images' AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'Director'
    )
  );

CREATE POLICY "Directors can delete benefit images" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'benefit-images' AND
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'Director'
    )
  );



-- ==========================================
-- MÓDULO: SETUP_BENEFITS_SYSTEM.SQL
-- ==========================================


-- Setup script for Benefit Application System

-- 1. Create table for applications
CREATE TABLE IF NOT EXISTS benefit_applications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    benefit_id UUID NOT NULL REFERENCES benefits(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE, -- Link to auth.users
    applicant_name TEXT, -- Optional, for easy display if join is complex
    applicant_email TEXT, -- Optional
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    notes TEXT, -- User notes or internal notes
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(benefit_id, user_id) -- Prevent duplicate applications for same benefit
);

-- 2. Add 'instruction_content' to benefits table (hidden info revealed upon approval)
ALTER TABLE benefits ADD COLUMN IF NOT EXISTS instruction_content TEXT;
ALTER TABLE benefits ADD COLUMN IF NOT EXISTS benefit_type TEXT DEFAULT 'generic'; -- e.g. 'scholarship', 'workshop'

-- 3. RLS Policies
ALTER TABLE benefit_applications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own applications
CREATE POLICY "Users can view own applications" ON benefit_applications
    FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can create their own applications
CREATE POLICY "Users can create own applications" ON benefit_applications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Staff (Director, Asesor, etc.) can view all applications
-- Using a simplified check based on email or specific ID if roles logic is complex in SQL
-- Ideally, we join with profiles and check role.
-- For now, enabling for all authenticated users to View (maybe filtered in frontend), 
-- OR strictly: 
-- (Assuming we have a public users/profiles table we can check roles against)

CREATE POLICY "Staff can view all applications" ON benefit_applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (role ILIKE '%director%' OR role ILIKE '%asesor%' OR role ILIKE '%secretaria%')
        )
    );

-- Policy: Staff can update applications (Approve/Reject)
CREATE POLICY "Staff can update applications" ON benefit_applications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (role ILIKE '%director%' OR role ILIKE '%asesor%' OR role ILIKE '%secretaria%')
        )
    );

-- 4. Enable RLS on benefits table if not already (to fix the Edit issue)
ALTER TABLE benefits ENABLE ROW LEVEL SECURITY;

-- Allow read for everyone (authenticated)
CREATE POLICY "Benefits are viewable by everyone" ON benefits
    FOR SELECT TO authenticated USING (true);

-- Allow insert/update/delete ONLY for Director/Admins
CREATE POLICY "Only Staff can manage benefits" ON benefits
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND (role ILIKE '%director%' OR role ILIKE '%asesor%' OR role ILIKE '%secretaria%')
        )
    );

-- Grant permissions if necessary (standard supabase roles usually have it)
GRANT ALL ON benefit_applications TO authenticated;
GRANT ALL ON benefits TO authenticated;



-- ==========================================
-- MÓDULO: CREATE_SYSTEM_DOCS.SQL
-- ==========================================

-- Create system_documentation table
CREATE TABLE IF NOT EXISTS system_documentation (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  section_id TEXT NOT NULL UNIQUE, -- e.g., 'intro', 'team', 'objectives'
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- Markdown/HTML content
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE system_documentation ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Everyone can read documentation" ON system_documentation
  FOR SELECT USING (true);

CREATE POLICY "Directors can update documentation" ON system_documentation
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Director'));

CREATE POLICY "Directors can insert documentation" ON system_documentation
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'Director'));

-- Seed Initial Data (Migrating from hardcoded React component)
INSERT INTO system_documentation (section_id, title, content) VALUES
('intro', 'Introducción al Sistema', 'El **Sistema de Gestión de Revista (SGR)** es una plataforma integral diseñada para el **Equipo de Comunicación y Marketing** de la Revista ACS de la Facultad de Ciencias Sociales de la Universidad Nacional de Cajamarca.

### 🦂 El Escorpión: Nuestro Símbolo
El logo del sistema incorpora un escorpión estilizado que representa:
*   **Fuerza y Precisión:** Efectividad en cada acción
*   **Rigor Académico:** Precisión como el aguijón
*   **Trabajo en Equipo:** Las pinzas simbolizan colaboración
*   **Adaptabilidad:** Capacidad de enfrentar retos

### ¿Qué hace el Sistema?
*   **Gestión Centralizada:** Tareas, reuniones, noticias, propuestas y recursos en un solo lugar.
*   **Colaboración:** Miembros trabajando coordinadamente en tiempo real.
*   **IA Personalizada:** Asistente inteligente que aprende de cada miembro.
*   **Documentación:** Acceso rápido a recursos, lineamientos y materiales.'),

('team', 'Equipo de Comunicación y Marketing - ACS', 'Somos un equipo comprometido con la difusión de la Revista ACS.

### Estructura del Equipo
*   **Director y Capacitador:** Edwar Jhanpiere Saenz Tello (4° ciclo - Sociología) - Supervisión estratégica y capacitaciones.
*   **Subdirectora:** Mayra Eneli García Leiva (6° ciclo - Sociología) - Apoyo en supervisión y monitoreo de metas.
*   **Secretaria:** Silvana Hernández (3° ciclo - Sociología) - Gestión de documentación y actas.
*   **Jefa de Imagen:** Gresia Julissa Victorio Tirado (4° ciclo - Sociología) - Dirección de imagen y producción audiovisual.
*   **Auxiliares Técnicos:**
    *   Alisson Lucero Vásquez Ramírez (6° ciclo)
    *   Kevin Castrejón López (4° ciclo)
    *   *Función:* Creación de contenido visual y apoyo en eventos.
*   **Gestor de Redes:** Steven Zamora Huamanta (8° ciclo - Sociología) - Administración de redes sociales y multimedia.
*   **Coordinadora de Eventos:** Eliana Alexandra Chuquimango Cabanillas - Planificación y logística de eventos.
*   **Asesor Institucional:** Prof. José Vidal - Orientación académica y supervisión estratégica.'),

('objectives', 'Objetivos del Equipo', '### Objetivo General
Fortalecer la difusión de la Revista ACS y consolidar su posición como un **referente académico y social de alto impacto**, utilizando estrategias innovadoras de comunicación, diseño y marketing.

### Objetivos Específicos
1.  **Apoyo a la Revista Estudiantil:** Gestión y promoción de la revista estudiantil, liderada por la Dra. Doris Castañeda Abanto.
2.  **Organización de Eventos:** Colaboración en la organización, promoción y publicidad de eventos de la Facultad de Ciencias Sociales.'),

('functions', 'Funciones del Sistema', '### 📋 Gestión de Tareas
*   Crear y asignar tareas
*   Seguimiento de progreso
*   Prioridades y vencimientos

### 📅 Calendario y Reuniones
*   Programación de reuniones
*   Gestión de asistencias
*   Recordatorios

### 📰 Noticias y Comunicados
*   Publicación de noticias
*   Difusión instantánea

### 📁 Gestión de Recursos
*   Almacenamiento de archivos
*   Organización por carpetas

### ✨ Propuestas
*   Creación de propuestas (Campaña, Evento, Proyecto)
*   Workflow de aprobación

### 🤖 Asistente IA
*   Personalizado por usuario
*   Aprende del historial
*   Generación de contenido

### 📊 Reportes
*   Estadísticas del equipo
*   Progreso de tareas

### 👥 Gestión de Usuarios
*   Roles personalizados
*   Seguridad avanzada'),

('legal', 'Base Legal', 'El Equipo de Comunicación y Marketing de la Revista ACS sustenta sus actividades en:

*   **Constitución Política del Perú:** Marco constitucional que ampara la educación universitaria y la investigación académica.
*   **Ley N° 28740:** Ley del Sistema Nacional de Evaluación, Acreditación y Certificación de la Calidad Educativa y su reglamento.
*   **Estatuto de la Universidad Nacional de Cajamarca:** Normas internas que rigen el funcionamiento de la universidad y sus facultades.'),

('lineamientos', 'Lineamientos Operativos', '### Valores del Equipo
*   **🎯 Rigor Académico:** Como el escorpión: preciso y efectivo.
*   **💪 Fuerza Colectiva:** Trabajo en equipo coordinado.
*   **💡 Innovación:** Estrategias creativas de comunicación.
*   **🤝 Compromiso Social:** Servicio a la comunidad universitaria.
*   **⭐ Profesionalismo:** Estándares de calidad en todo.

### Contacto
**Equipo de Comunicación y Marketing - Revista ACS**
Facultad de Ciencias Sociales
Universidad Nacional de Cajamarca')
ON CONFLICT (section_id) DO NOTHING;



-- ==========================================
-- MÓDULO: CREATE_DOCUMENT_TABLES.SQL
-- ==========================================

-- ============================================
-- Script: Tablas para Editor Documental
-- Descripción: Crea tablas para plantillas y documentos
-- ============================================

-- 1. Tabla de plantillas de documentos
CREATE TABLE IF NOT EXISTS document_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT NOT NULL,
    variables JSONB DEFAULT '[]', -- Array de variables: ["nombre", "fecha", "cargo"]
    category VARCHAR(50) DEFAULT 'general', -- 'oficio', 'memorandum', 'acta', 'circular', 'general'
    is_public BOOLEAN DEFAULT false,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de documentos (extendida)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL DEFAULT 'Documento sin título',
    content TEXT,
    folder_id UUID, -- Referencia a carpeta de gestión documental
    template_id UUID REFERENCES document_templates(id) ON DELETE SET NULL,
    last_saved_at TIMESTAMPTZ DEFAULT NOW(),
    auto_save_enabled BOOLEAN DEFAULT true,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_document_templates_category ON document_templates(category);
CREATE INDEX IF NOT EXISTS idx_document_templates_created_by ON document_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_folder_id ON documents(folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents(created_by);

-- 4. RLS Policies para document_templates
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

-- Leer: Todos pueden ver plantillas públicas, solo creador puede ver privadas
CREATE POLICY "Templates: SELECT public or own" ON document_templates
    FOR SELECT USING (
        is_public = true 
        OR created_by = auth.uid()
    );

-- Crear: Usuarios autenticados pueden crear plantillas
CREATE POLICY "Templates: INSERT authenticated" ON document_templates
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Actualizar: Solo el creador puede actualizar
CREATE POLICY "Templates: UPDATE own" ON document_templates
    FOR UPDATE USING (created_by = auth.uid());

-- Eliminar: Solo el creador puede eliminar
CREATE POLICY "Templates: DELETE own" ON document_templates
    FOR DELETE USING (created_by = auth.uid());

-- 5. RLS Policies para documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Usuarios pueden ver solo sus documentos
CREATE POLICY "Documents: SELECT own" ON documents
    FOR SELECT USING (created_by = auth.uid());

-- Usuarios pueden crear documentos
CREATE POLICY "Documents: INSERT own" ON documents
    FOR INSERT WITH CHECK (created_by = auth.uid());

-- Usuarios pueden actualizar solo sus documentos
CREATE POLICY "Documents: UPDATE own" ON documents
    FOR UPDATE USING (created_by = auth.uid());

-- Usuarios pueden eliminar solo sus documentos
CREATE POLICY "Documents: DELETE own" ON documents
    FOR DELETE USING (created_by = auth.uid());

-- 6. Insertar plantillas predeterminadas
INSERT INTO document_templates (name, description, content, category, is_public, variables) VALUES
('Oficio Estándar', 'Plantilla para oficios administrativos', 
'<p><strong>OFICIO N° {{numero}}</strong></p><p><br></p><p>{{lugar}}, {{fecha}}</p><p><br></p><p>Señor(a):<br>{{destinatario}}<br>{{cargo_destinatario}}<br>Presente.-</p><p><br></p><p>Asunto: {{asunto}}</p><p><br></p><p>De mi consideración:</p><p><br></p><p>{{cuerpo}}</p><p><br></p><p>Sin otro particular, quedo de usted.</p><p><br></p><p>Atentamente,</p><p><br></p><p><br></p><p>_________________________<br>{{firmante}}<br>{{cargo_firmante}}</p>',
'oficio', true, 
'["numero", "lugar", "fecha", "destinatario", "cargo_destinatario", "asunto", "cuerpo", "firmante", "cargo_firmante"]'::jsonb),

('Memorándum Interno', 'Plantilla para memorándums entre áreas',
'<p><strong>MEMORÁNDUM N° {{numero}}</strong></p><p><br></p><p>PARA: {{destinatario}}<br>DE: {{remitente}}<br>ASUNTO: {{asunto}}<br>FECHA: {{fecha}}</p><p><br></p><p>{{cuerpo}}</p><p><br></p><p>Atentamente,</p><p><br></p><p>_________________________<br>{{firmante}}</p>',
'memorandum', true,
'["numero", "destinatario", "remitente", "asunto", "fecha", "cuerpo", "firmante"]'::jsonb),

('Acta de Reunión', 'Plantilla para actas de reuniones',
'<p style="text-align: center;"><strong>ACTA DE REUNIÓN N° {{numero}}</strong></p><p style="text-align: center;">{{titulo}}</p><p><br></p><p><strong>Fecha:</strong> {{fecha}}<br><strong>Hora:</strong> {{hora}}<br><strong>Lugar:</strong> {{lugar}}</p><p><br></p><p><strong>Participantes:</strong></p><p>{{participantes}}</p><p><br></p><p><strong>Agenda:</strong></p><p>{{agenda}}</p><p><br></p><p><strong>Desarrollo:</strong></p><p>{{desarrollo}}</p><p><br></p><p><strong>Acuerdos:</strong></p><p>{{acuerdos}}</p><p><br></p><p>Sin más que tratar, se cierra la reunión siendo las {{hora_cierre}}.</p><p><br></p><p>Firmas:</p>',
'acta', true,
'["numero", "titulo", "fecha", "hora", "lugar", "participantes", "agenda", "desarrollo", "acuerdos", "hora_cierre"]'::jsonb);

-- 7. Verificar creación
SELECT 
    'document_templates' as tabla,
    COUNT(*) as registros
FROM document_templates
UNION ALL
SELECT 
    'documents' as tabla,
    COUNT(*) as registros
FROM documents;



-- ==========================================
-- MÓDULO: SETUP-AI-STORAGE.SQL
-- ==========================================

-- ============================================
-- CONFIGURACIÓN DE ALMACENAMIENTO PARA IA
-- ============================================
-- Ejecuta este script en Supabase SQL Editor
-- para configurar el almacenamiento de documentos para Gemini

-- 1. VERIFICAR/CREAR BUCKET DE STORAGE
-- (Esto se hace manualmente en Supabase Dashboard > Storage)
-- Nombre: resources
-- Público: true
-- File size limit: 50MB

-- 2. CREAR/VERIFICAR TABLA RESOURCES
CREATE TABLE IF NOT EXISTS public.resources (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  category text,
  folder text,
  file_urls text[],
  uploaded_by uuid REFERENCES auth.users(id),
  visibility text DEFAULT 'interno' CHECK (visibility IN ('interno', 'publico', 'privado')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Agregar índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_resources_uploaded_by ON public.resources(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_resources_category ON public.resources(category);
CREATE INDEX IF NOT EXISTS idx_resources_folder ON public.resources(folder);
CREATE INDEX IF NOT EXISTS idx_resources_created_at ON public.resources(created_at DESC);

-- 3. HABILITAR ROW LEVEL SECURITY
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

-- 4. ELIMINAR POLÍTICAS EXISTENTES (si hay)
DROP POLICY IF EXISTS "Todos pueden ver recursos" ON public.resources;
DROP POLICY IF EXISTS "Solo autenticados pueden crear recursos" ON public.resources;
DROP POLICY IF EXISTS "Solo el creador puede actualizar" ON public.resources;
DROP POLICY IF EXISTS "Solo el creador puede eliminar" ON public.resources;

-- 5. CREAR POLÍTICAS DE SEGURIDAD

-- Política: Todos los usuarios autenticados pueden ver recursos
CREATE POLICY "Todos pueden ver recursos" 
ON public.resources
FOR SELECT 
TO authenticated
USING (true);

-- Política: Solo usuarios autenticados pueden crear recursos
CREATE POLICY "Solo autenticados pueden crear recursos" 
ON public.resources
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = uploaded_by);

-- Política: Solo el creador o Director puede actualizar
CREATE POLICY "Solo el creador puede actualizar" 
ON public.resources
FOR UPDATE 
TO authenticated
USING (
  auth.uid() = uploaded_by 
  OR 
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'Director'
  )
)
WITH CHECK (
  auth.uid() = uploaded_by 
  OR 
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'Director'
  )
);

-- Política: Solo el creador o Director puede eliminar
CREATE POLICY "Solo el creador puede eliminar" 
ON public.resources
FOR DELETE 
TO authenticated
USING (
  auth.uid() = uploaded_by 
  OR 
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'Director'
  )
);

-- 6. CREAR FUNCIÓN PARA ACTUALIZAR updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. CREAR TRIGGER PARA ACTUALIZAR updated_at
DROP TRIGGER IF EXISTS update_resources_updated_at ON public.resources;
CREATE TRIGGER update_resources_updated_at
    BEFORE UPDATE ON public.resources
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 8. CONFIGURAR POLÍTICAS DE STORAGE
-- (Esto también requiere configuración manual en Supabase Dashboard)
-- Ve a Storage > resources > Policies

-- Política de SELECT (Descargar): Todos los autenticados
/*
INSERT INTO storage.objects (bucket_id, name, owner, metadata)
SELECT 'resources', 'AI-Knowledge/.keep', auth.uid(), '{}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM storage.objects 
  WHERE bucket_id = 'resources' AND name = 'AI-Knowledge/.keep'
);
*/

-- 9. INSERTAR DATOS DE EJEMPLO (Opcional)
-- Descomentar si quieres probar con datos de ejemplo
/*
INSERT INTO public.resources (title, description, category, folder, file_urls, visibility)
VALUES 
  ('Lineamientos del Equipo', 'Lineamientos operativos actualizados', 'Documentos', 'AI-Knowledge', 
   ARRAY['AI-Knowledge/lineamientos.txt'], 'interno'),
  ('Guía de Uso de IA', 'Cómo usar el asistente de IA', 'Guías', 'AI-Knowledge', 
   ARRAY['AI-Knowledge/guia-ia.txt'], 'interno')
ON CONFLICT DO NOTHING;
*/

-- 10. VERIFICACIÓN
-- Ejecuta estas consultas para verificar que todo está correcto

-- Ver estructura de la tabla
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'resources'
ORDER BY ordinal_position;

-- Ver políticas de RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'resources';

-- Ver índices
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'resources';

-- Contar recursos existentes
SELECT COUNT(*) as total_recursos FROM public.resources;

-- ============================================
-- INSTRUCCIONES POST-INSTALACIÓN
-- ============================================
/*
1. STORAGE BUCKET (Manual en Dashboard):
   - Ve a Storage en Supabase Dashboard
   - Si no existe 'resources', créalo:
     * Click "Create bucket"
     * Name: resources
     * Public: true (marcar checkbox)
     * File size limit: 52428800 (50MB)
     * Allowed MIME types: dejar vacío o especificar: text/plain, text/markdown, application/json

2. STORAGE POLICIES (Manual en Dashboard):
   - Ve a Storage > resources > Policies
   - Asegúrate de tener estas políticas:
     a) SELECT: authenticated users can download
     b) INSERT: authenticated users can upload
     c) UPDATE: only uploader can update
     d) DELETE: only uploader can delete

3. VERIFICAR PERMISOS DE USUARIOS:
   - Verifica que la tabla 'users' tenga la columna 'role'
   - Verifica que exista al menos un usuario con role='Director'

4. CREAR CARPETA AI-Knowledge:
   - Ve a Storage > resources
   - Click "Upload file"
   - Crea una carpeta llamada "AI-Knowledge"
   - O deja que el sistema la cree automáticamente al subir el primer archivo

5. PROBAR:
   - Inicia sesión como Director
   - Ve al chat/IA
   - Intenta subir un archivo .txt
   - Verifica que aparezca en Storage > resources > AI-Knowledge
*/

-- ============================================
-- TROUBLESHOOTING
-- ============================================
/*
ERROR: "new row violates check constraint"
SOLUCIÓN: Verifica que visibility sea 'interno', 'publico' o 'privado'

ERROR: "permission denied for table resources"
SOLUCIÓN: Revisa las políticas RLS arriba

ERROR: "storage/object-not-found"
SOLUCIÓN: Verifica que el bucket 'resources' exista y sea público

ERROR: "Invalid key: AI-Knowledge/..."
SOLUCIÓN: Ya está arreglado con la sanitización de nombres en el código
*/



-- ==========================================
-- MÓDULO: SETUP_CERTIFICATES_TABLE_AND_STORAGE.SQL
-- ==========================================

-- CONFIGURACIÓN COMPLETA DE CERTIFICADOS (TABLA + STORAGE)

-- 1. TABLA DE CERTIFICADOS
CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    certificate_code TEXT NOT NULL,
    pdf_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, course_id)
);

-- Habilitar RLS
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- Políticas de la tabla (Simplificadas para evitar errores de permisos)
DROP POLICY IF EXISTS "Ver certificados propios o públicos" ON certificates;
CREATE POLICY "Ver certificados propios o públicos" 
ON certificates FOR SELECT 
USING (true); -- Permitir ver todos para facilitar verificación por docentes/admin

DROP POLICY IF EXISTS "Insertar certificados propios" ON certificates;
CREATE POLICY "Insertar certificados propios" 
ON certificates FOR INSERT 
WITH CHECK (auth.uid() = user_id OR auth.uid() IN (SELECT id FROM profiles WHERE role IN ('Director', 'Docente', 'Secretaria')));

-- 2. STORAGE (BUCKET)
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', true)
ON CONFLICT (id) DO NOTHING;

-- Policies de Storage
DROP POLICY IF EXISTS "Certificados Públicos" ON storage.objects;
CREATE POLICY "Certificados Públicos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'certificates' );

DROP POLICY IF EXISTS "Usuarios pueden subir certificados" ON storage.objects;
CREATE POLICY "Usuarios pueden subir certificados"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'certificates' );

DROP POLICY IF EXISTS "Usuarios pueden actualizar certificados" ON storage.objects;
CREATE POLICY "Usuarios pueden actualizar certificados"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'certificates' );



-- ==========================================
-- MÓDULO: SETUP_CONTENT_PLANNER.SQL
-- ==========================================

-- SQL Script: Configuración del Planificador de Contenidos SGR-ACS
-- Ejecutar en el SQL Editor de tu proyecto Supabase

-- 1. Tabla de Publicaciones de la Revista
CREATE TABLE IF NOT EXISTS public.journal_publications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    authors TEXT,
    volume TEXT,
    number TEXT,
    url TEXT,
    published_date DATE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para journal_publications
ALTER TABLE public.journal_publications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todo el mundo puede ver las publicaciones" 
ON public.journal_publications FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Personal de Imagen y Directores pueden insertar/editar" 
ON public.journal_publications FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND (profiles.role = 'Director' OR profiles.role = 'Asesor' OR profiles.role = 'Imagen')
    )
);

-- 2. Tabla de Festivos Personalizados
CREATE TABLE IF NOT EXISTS public.calendar_holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    date_day INTEGER NOT NULL, -- Día (1-31)
    date_month INTEGER NOT NULL, -- Mes (1-12)
    scope TEXT NOT NULL CHECK (scope IN ('global', 'national', 'regional')),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para calendar_holidays
ALTER TABLE public.calendar_holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todo el mundo puede ver los festivos" 
ON public.calendar_holidays FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Solo Directores y Asesores pueden modificar festivos" 
ON public.calendar_holidays FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
        AND (profiles.role = 'Director' OR profiles.role = 'Asesor')
    )
);

-- 3. Precargar Días Festivos Nacionales de Perú e Hitos de Cajamarca
INSERT INTO public.calendar_holidays (name, date_day, date_month, scope, description) VALUES
-- Nacionales Perú
('Año Nuevo', 1, 1, 'national', 'Celebración mundial del Año Nuevo'),
('Semana Santa (Jueves Santo)', 9, 4, 'national', 'Feriado religioso variable (Jueves)'),
('Semana Santa (Viernes Santo)', 10, 4, 'national', 'Feriado religioso variable (Viernes)'),
('Día del Trabajo', 1, 5, 'national', 'Homenaje a los trabajadores'),
('Batalla de Arica y Día de la Bandera', 7, 6, 'national', 'Conmemoración patriótica'),
('San Pedro y San Pablo', 29, 6, 'national', 'Festividad católica nacional'),
('Día del Fuerza Aérea del Perú', 23, 7, 'national', 'Día heroico de José Abelardo Quiñones'),
('Fiestas Patrias (Independencia)', 28, 7, 'national', 'Declaración de la Independencia del Perú'),
('Fiestas Patrias (Glorias)', 29, 7, 'national', 'Gran Parada y Desfile Cívico Militar'),
('Batalla de Junín', 6, 8, 'national', 'Hito de la gesta libertadora'),
('Santa Rosa de Lima', 30, 8, 'national', 'Patrona de las Américas y la Policía Nacional'),
('Combate de Angamos', 8, 10, 'national', 'Homenaje a Miguel Grau y la Marina de Guerra'),
('Todos los Santos', 1, 11, 'national', 'Festividad en honor a los santos y difuntos'),
('Inmaculada Concepción', 8, 12, 'national', 'Día de la Virgen María'),
('Batalla de Ayacucho', 9, 12, 'national', 'Consolidación de la independencia americana'),
('Navidad', 25, 12, 'national', 'Nacimiento del Niño Jesús'),

-- Regionales Cajamarca
('Fundación de Cajamarca', 3, 1, 'regional', 'Aniversario de la creación del Departamento de Cajamarca'),
('Carnaval de Cajamarca', 14, 2, 'regional', 'La fiesta más alegre del Perú (Feriado variable en Febrero/Marzo)'),
('Batalla de San Pablo', 13, 7, 'regional', 'Gesta heroica cajamarquina en la Guerra del Pacífico'),
('Fiesta de San Juan Bautista (Chota)', 24, 6, 'regional', 'Festividad tradicional y patronal en Chota, Cajamarca'),
('Aniversario de la Revista ACS', 15, 10, 'regional', 'Hito de fundación del Centro de Investigaciones ACS');



-- ==========================================
-- MÓDULO: SETUP_LIVE_EVENTS.SQL
-- ==========================================

-- Script para crear la tabla de eventos en vivo y políticas RLS
-- Sistema de Programa en Vivo SGR-ACS

-- Tabla principal para eventos en vivo
CREATE TABLE IF NOT EXISTS public.eventos_en_vivo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evento_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    actividad_actual_id TEXT,
    tiempo_restante_segundos INTEGER DEFAULT 0,
    estado_transmision TEXT DEFAULT 'inactivo' CHECK (estado_transmision IN ('inactivo', 'en_vivo', 'pausado', 'finalizado')),
    programa JSONB DEFAULT '[]'::jsonb,
    enlace_publico TEXT UNIQUE,
    ultima_actualizacion TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_eventos_en_vivo_evento_id ON public.eventos_en_vivo(evento_id);
CREATE INDEX IF NOT EXISTS idx_eventos_en_vivo_estado ON public.eventos_en_vivo(estado_transmision);
CREATE INDEX IF NOT EXISTS idx_eventos_en_vivo_actualizacion ON public.eventos_en_vivo(ultima_actualizacion);

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_eventos_en_vivo_updated_at
    BEFORE UPDATE ON public.eventos_en_vivo
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Políticas RLS para eventos_en_vivo
ALTER TABLE public.eventos_en_vivo ENABLE ROW LEVEL SECURITY;

-- Solo usuarios autenticados pueden ver eventos en vivo
CREATE POLICY "Usuarios autenticados pueden ver eventos en vivo"
    ON public.eventos_en_vivo FOR SELECT
    USING (auth.role() IS NOT NULL);

-- Solo creadores del evento o directores pueden gestionar eventos en vivo
CREATE POLICY "Creadores y directores pueden gestionar eventos en vivo"
    ON public.eventos_en_vivo FOR ALL
    USING (
        auth.role() IN ('Director', 'Subdirector', 'Coordinador de Eventos') OR
        EXISTS (
            SELECT 1 FROM public.events e
            WHERE e.id = public.eventos_en_vivo.evento_id
            AND e.created_by = auth.uid()
        )
    );

-- Políticas para broadcast de Supabase Realtime
-- Permitir que todos los usuarios autenticados se suscriban a los canales de eventos
CREATE POLICY "Usuarios autenticados pueden suscribirse a eventos en vivo"
    ON public.eventos_en_vivo FOR SELECT
    USING (auth.role() IS NOT NULL);

-- Comentarios sobre la estructura:
-- evento_id: Referencia al evento principal
-- actividad_actual_id: ID de la actividad actualmente en ejecución
-- tiempo_restante_segundos: Tiempo restante de la actividad actual
-- estado_transmision: Estado general de la transmisión
-- programa: Array JSON con todas las actividades programadas
-- enlace_publico: URL única para compartir con asistentes

-- Estructura esperada del campo programa:
-- [
--   {
--     "id": "bienvenida_001",
--     "tipo": "bienvenida",
--     "titulo": "Palabras de Bienvenida - Decano",
--     "responsable": "Dr. Juan Pérez",
--     "duracion_minutos": 5,
--     "orden": 1,
--     "estado": "completado"
--   },
--   {
--     "id": "ponencia_001", 
--     "tipo": "ponencia",
--     "titulo": "Inteligencia Artificial en Educación",
--     "responsable": "Dra. María García",
--     "duracion_minutos": 20,
--     "orden": 2,
--     "estado": "en_vivo"
--   }
-- ]

-- Tipos de actividad soportados:
-- - bienvenida: Palabras de apertura, bienvenida institucional
-- - himno: Himno nacional o institucional
-- - ponencia: Presentación principal de un ponente
-- - preguntas: Sesión de preguntas del público
-- - cierre: Palabras de cierre, agradecimiento
-- - break: Pausa o receso

-- Estados de transmisión:
-- - inactivo: Evento no ha comenzado
-- - en_vivo: Transmisión activa y en curso
-- - pausado: Transmisión temporalmente pausada
-- - finalizado: Evento concluido

-- Estados de actividad:
-- - pendiente: Actividad por comenzar
-- - en_vivo: Actividad actualmente en ejecución
-- - completado: Actividad finalizada

-- Para usar con Supabase Realtime:
-- 1. Suscribirse al canal: `evento_${evento_id}`
-- 2. Escuchar eventos: 'estado_actualizado', 'tiempo_actualizado', 'alerta_activada'
-- 3. Broadcast con: channel.send({ type: 'broadcast', event: 'nombre_evento', payload: datos })

-- Ejemplo de uso desde frontend:
-- const channel = supabase.channel(`evento_${eventId}`)
--   .on('broadcast', { event: 'estado_actualizado' }, handleEstadoActualizado)
--   .on('broadcast', { event: 'tiempo_actualizado' }, handleTiempoActualizado)
--   .on('broadcast', { event: 'alerta_activada' }, handleAlerta)
--   .subscribe();



-- ==========================================
-- MÓDULO: SETUP_META_AUDIOVISUAL.SQL
-- ==========================================

-- Tablas para la integración con Meta y Gestión Audiovisual

-- 1. Configuración de Meta (Tokens de acceso, IDs de páginas, etc.)
CREATE TABLE IF NOT EXISTS public.meta_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id TEXT NOT NULL,
    app_secret TEXT, -- Debería ser encriptado o manejado via vault si es posible
    system_user_access_token TEXT,
    page_id TEXT,
    instagram_business_id TEXT,
    whatsapp_business_id TEXT,
    phone_number_id TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para meta_config
ALTER TABLE public.meta_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Solo Directores pueden gestionar meta_config" 
ON public.meta_config 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND (users.role = 'Director' OR users.role = 'Asesor')
    )
);

-- 2. Planificación Audiovisual (Módulo de Grecia)
CREATE TABLE IF NOT EXISTS public.audiovisual_planning (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    content_type TEXT CHECK (content_type IN ('flyer', 'video', 'post', 'otro')),
    status TEXT DEFAULT 'Planificado' CHECK (status IN ('Planificado', 'En proceso', 'Revisión', 'Listo', 'Publicado')),
    target_date DATE NOT NULL,
    event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    media_url TEXT, -- Link al archivo en storage
    social_copy TEXT, -- Texto para el post
    facebook_post_id TEXT,
    instagram_media_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS para audiovisual_planning
ALTER TABLE public.audiovisual_planning ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Todo el equipo puede ver la planificación" 
ON public.audiovisual_planning FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Personal de Imagen y Directores pueden editar" 
ON public.audiovisual_planning 
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND (
            users.role = 'Director' OR 
            users.role = 'Asesor' OR 
            users.role ILIKE '%Imagen%'
        )
    )
);

-- Insertar configuración inicial con el App ID proporcionado
INSERT INTO public.meta_config (app_id) 
VALUES ('1394165385728273')
ON CONFLICT DO NOTHING;



-- ==========================================
-- MÓDULO: SETUP_NOTIFICATIONS_V2.SQL
-- ==========================================


-- SISTEMA DE NOTIFICACIONES ROBUSTO (VERSION 3 - FINAL) --
-- Copia y ejecuta este script en Supabase SQL Editor

-- 1. Tabla de Notificaciones (Idempotente)
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'task_assigned', 'meeting_scheduled', 'file_uploaded'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilitar RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de Seguridad (RLS)
DROP POLICY IF EXISTS "Users can see their own notifications" ON notifications;
CREATE POLICY "Users can see their own notifications"
ON notifications FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications"
ON notifications FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 4. Trigger para TAREAS (Tasks)
CREATE OR REPLACE FUNCTION handle_new_task_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assigned_to != NEW.created_by THEN
    INSERT INTO notifications (user_id, type, title, message, data)
    VALUES (
      NEW.assigned_to,
      'task_assigned',
      'Nueva tarea asignada',
      'Se te ha asignado la tarea: ' || NEW.title,
      jsonb_build_object('task_id', NEW.id, 'link', '/tasks')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_task_created ON tasks;
CREATE TRIGGER on_task_created
AFTER INSERT ON tasks
FOR EACH ROW
EXECUTE FUNCTION handle_new_task_notification();

-- 5. Trigger para REUNIONES (Meetings)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'meetings') THEN
    
    CREATE OR REPLACE FUNCTION handle_meeting_notification()
    RETURNS TRIGGER AS $func$
    DECLARE
        participant UUID;
    BEGIN
        IF NEW.participants IS NOT NULL THEN
            FOREACH participant IN ARRAY NEW.participants
            LOOP
                IF participant != NEW.created_by THEN
                    INSERT INTO notifications (user_id, type, title, message, data)
                    VALUES (
                        participant,
                        'meeting_invited',
                        'Nueva reunión programada',
                        'Te han invitado a: ' || NEW.title,
                        jsonb_build_object('meeting_id', NEW.id, 'link', '/meetings')
                    );
                END IF;
            END LOOP;
        END IF;
        RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER;

    DROP TRIGGER IF EXISTS on_meeting_created ON meetings;
    CREATE TRIGGER on_meeting_created
    AFTER INSERT ON meetings
    FOR EACH ROW
    EXECUTE FUNCTION handle_meeting_notification();
    
    RAISE NOTICE 'Trigger para meetings configurado.';
  ELSE
    RAISE NOTICE 'Tabla meetings no encontrada, saltando trigger.';
  END IF;
END
$$;

-- 6. Trigger para EVENTOS (Events)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'events') THEN
    
    CREATE OR REPLACE FUNCTION handle_event_notification()
    RETURNS TRIGGER AS $func$
    BEGIN
        -- Notificar a todos los usuarios (o un grupo específico) sobre un nuevo evento
        -- Por simplicidad, aquí insertamos una notificación global o a un rol específico si la lógica lo permite.
        -- Como PG no puede iterar fácilmente sobre todos los usuarios en un trigger simple sin cursor,
        -- lo dejaremos preparado para que el frontend o una función edge lo maneje, 
        -- o notificaremos al creador como confirmación.
        
        -- Opción A: Notificar solo al creador (Confirmación)
        INSERT INTO notifications (user_id, type, title, message, data)
        VALUES (
            NEW.created_by,
            'event_created',
            'Evento creado exitosamente',
            'Has creado el evento: ' || NEW.title,
            jsonb_build_object('event_id', NEW.id, 'link', '/events')
        );
        
        RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql SECURITY DEFINER;

    DROP TRIGGER IF EXISTS on_event_created ON events;
    CREATE TRIGGER on_event_created
    AFTER INSERT ON events
    FOR EACH ROW
    EXECUTE FUNCTION handle_event_notification();
    
    RAISE NOTICE 'Trigger para events configurado.';
  ELSE
    RAISE NOTICE 'Tabla events no encontrada, saltando trigger.';
  END IF;
END
$$;



-- ==========================================
-- MÓDULO: WHATSAPP_HISTORY.SQL
-- ==========================================

-- Create tables for WhatsApp persistence

-- 1. Table for custom WhatsApp contacts (those not in the system users)
CREATE TABLE IF NOT EXISTS public.whatsapp_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    category TEXT DEFAULT 'Otro', -- 'Autor', 'Miembro', 'Externo'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 2. Table for WhatsApp message history
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    to_phone TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'sent', -- 'sent', 'delivered', 'read', 'failed'
    direction TEXT DEFAULT 'outbound', -- 'outbound', 'inbound'
    meta_message_id TEXT, -- The ID returned by Meta API
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    contact_id UUID REFERENCES public.whatsapp_contacts(id) ON DELETE SET NULL
);

-- 3. Table for Quick Templates (Editorial)
CREATE TABLE IF NOT EXISTS public.whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified for admin/director access)
CREATE POLICY "Allow all for authenticated" ON public.whatsapp_contacts FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON public.whatsapp_messages FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow all for authenticated" ON public.whatsapp_templates FOR ALL TO authenticated USING (true);

-- Insert some default templates
INSERT INTO public.whatsapp_templates (name, content, category) VALUES
('Recordatorio Editorial', 'Hola, te escribo de la Revista ACS para recordarte que el plazo de entrega de tu artículo vence pronto. ¡Quedamos atentos!', 'Editorial'),
('Certificado Listo', '¡Buenas noticias! Tu certificado del evento ya está disponible en el sistema. Puedes descargarlo ingresando a tu panel.', 'Notificaciones'),
('Bienvenida Autor', 'Bienvenido a la Revista ACS. Estamos muy contentos de contar con tu participación en esta edición.', 'Bienvenida');

-- Note: Ensure uuid-ossp extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";



-- ==========================================
-- MÓDULO: CREATE_PDF_CACHE_TABLE.SQL
-- ==========================================

-- Tabla para almacenar contenido extraído de PDFs
-- Esto optimiza el rendimiento evitando re-procesar los mismos archivos

CREATE TABLE IF NOT EXISTS pdf_content_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_path TEXT UNIQUE NOT NULL,
  extracted_text TEXT,
  page_count INTEGER,
  file_size BIGINT,
  extraction_status TEXT DEFAULT 'success' CHECK (extraction_status IN ('success', 'failed', 'processing')),
  error_message TEXT,
  extracted_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsquedas rápidas por ruta de archivo
CREATE INDEX IF NOT EXISTS idx_pdf_cache_file_path ON pdf_content_cache(file_path);

-- Índice para búsquedas de texto completo (opcional, para búsquedas futuras)
CREATE INDEX IF NOT EXISTS idx_pdf_cache_text_search ON pdf_content_cache USING gin(to_tsvector('spanish', extracted_text));

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_pdf_cache_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER pdf_cache_update_timestamp
BEFORE UPDATE ON pdf_content_cache
FOR EACH ROW
EXECUTE FUNCTION update_pdf_cache_timestamp();

-- Comentarios para documentación
COMMENT ON TABLE pdf_content_cache IS 'Almacena el contenido extraído de archivos PDF del storage para optimizar rendimiento del Asistente IA';
COMMENT ON COLUMN pdf_content_cache.file_path IS 'Ruta completa del archivo en Supabase Storage (ej: AI-Knowledge/documento.pdf)';
COMMENT ON COLUMN pdf_content_cache.extracted_text IS 'Texto extraído del PDF usando pdf-parse';
COMMENT ON COLUMN pdf_content_cache.page_count IS 'Número de páginas del PDF';
COMMENT ON COLUMN pdf_content_cache.file_size IS 'Tamaño del archivo en bytes';
COMMENT ON COLUMN pdf_content_cache.extraction_status IS 'Estado de la extracción: success, failed, processing';



-- ==========================================
-- MÓDULO: MIGRATION: 20260315151500_CREATE_INTEGRATION_TOKENS.SQL
-- ==========================================

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



-- ==========================================
-- MÓDULO: MIGRATION: 20260315180000_ADD_BIRTHDAY_MANAGEMENT.SQL
-- ==========================================

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


