-- Tabla para rastrear el progreso de los usuarios en lecciones y cursos
create table if not exists user_progress (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  lesson_id uuid references lessons(id) on delete cascade not null,
  course_id uuid references courses(id) on delete cascade not null,
  completed boolean default false,
  score integer, -- Para quizzes, de 0 a 100
  completed_at timestamp with time zone default now(),
  unique(user_id, lesson_id)
);

-- Habilitar seguridad a nivel de fila (RLS)
alter table user_progress enable row level security;

-- Política: Los usuarios pueden ver su propio progreso
create policy "Users can view their own progress"
  on user_progress for select
  using (auth.uid() = user_id);

-- Política: Los usuarios pueden insertar/actualizar su propio progreso
create policy "Users can insert/update their own progress"
  on user_progress for all
  using (auth.uid() = user_id);

-- Política: Los directores pueden ver el progreso de todos (Opcional, para reportes futuros)
create policy "Directors can view all progress"
  on user_progress for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role in ('director', 'admin')
    )
  );
