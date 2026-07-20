-- Fix RLS policies for the live events control table.
-- Supabase auth.role() returns values like 'authenticated', not the institutional role
-- (Director, Coordinador de Eventos, etc.). The policy must read public.profiles/users.

alter table public.eventos_en_vivo enable row level security;

drop policy if exists "Usuarios autenticados pueden ver eventos en vivo" on public.eventos_en_vivo;
drop policy if exists "Creadores y directores pueden gestionar eventos en vivo" on public.eventos_en_vivo;
drop policy if exists "Usuarios autenticados pueden suscribirse a eventos en vivo" on public.eventos_en_vivo;
drop policy if exists "Public can read live events" on public.eventos_en_vivo;
drop policy if exists "Internal staff can insert live events" on public.eventos_en_vivo;
drop policy if exists "Internal staff can update live events" on public.eventos_en_vivo;
drop policy if exists "Internal staff can delete live events" on public.eventos_en_vivo;

create policy "Public can read live events"
on public.eventos_en_vivo
for select
using (true);

create policy "Internal staff can insert live events"
on public.eventos_en_vivo
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role ilike '%director%'
        or p.role ilike '%subdirector%'
        or p.role ilike '%coordinador%'
        or p.role ilike '%coordinadora%'
        or p.role ilike '%secretaria%'
        or p.role ilike '%eventos%'
      )
  )
  or exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and (
        u.role ilike '%director%'
        or u.role ilike '%subdirector%'
        or u.role ilike '%coordinador%'
        or u.role ilike '%coordinadora%'
        or u.role ilike '%secretaria%'
        or u.role ilike '%eventos%'
      )
  )
  or exists (
    select 1
    from public.events e
    where e.id = public.eventos_en_vivo.evento_id
      and e.created_by = auth.uid()
  )
);

create policy "Internal staff can update live events"
on public.eventos_en_vivo
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role ilike '%director%'
        or p.role ilike '%subdirector%'
        or p.role ilike '%coordinador%'
        or p.role ilike '%coordinadora%'
        or p.role ilike '%secretaria%'
        or p.role ilike '%eventos%'
      )
  )
  or exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and (
        u.role ilike '%director%'
        or u.role ilike '%subdirector%'
        or u.role ilike '%coordinador%'
        or u.role ilike '%coordinadora%'
        or u.role ilike '%secretaria%'
        or u.role ilike '%eventos%'
      )
  )
  or exists (
    select 1
    from public.events e
    where e.id = public.eventos_en_vivo.evento_id
      and e.created_by = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role ilike '%director%'
        or p.role ilike '%subdirector%'
        or p.role ilike '%coordinador%'
        or p.role ilike '%coordinadora%'
        or p.role ilike '%secretaria%'
        or p.role ilike '%eventos%'
      )
  )
  or exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and (
        u.role ilike '%director%'
        or u.role ilike '%subdirector%'
        or u.role ilike '%coordinador%'
        or u.role ilike '%coordinadora%'
        or u.role ilike '%secretaria%'
        or u.role ilike '%eventos%'
      )
  )
  or exists (
    select 1
    from public.events e
    where e.id = public.eventos_en_vivo.evento_id
      and e.created_by = auth.uid()
  )
);

create policy "Internal staff can delete live events"
on public.eventos_en_vivo
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and (
        p.role ilike '%director%'
        or p.role ilike '%subdirector%'
        or p.role ilike '%coordinador%'
        or p.role ilike '%coordinadora%'
        or p.role ilike '%secretaria%'
        or p.role ilike '%eventos%'
      )
  )
  or exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and (
        u.role ilike '%director%'
        or u.role ilike '%subdirector%'
        or u.role ilike '%coordinador%'
        or u.role ilike '%coordinadora%'
        or u.role ilike '%secretaria%'
        or u.role ilike '%eventos%'
      )
  )
  or exists (
    select 1
    from public.events e
    where e.id = public.eventos_en_vivo.evento_id
      and e.created_by = auth.uid()
  )
);
