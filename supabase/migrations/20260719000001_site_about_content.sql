create table if not exists public.site_about_content (
  id text primary key default 'main',
  eyebrow text not null default 'IICS - BIOGRAFIA, EQUIPO & VISION NO REFORMISTA',
  title text not null default 'Quienes Somos e Identidad Autonoma',
  intro text not null default 'Conozca de forma integrada la historia que forjo el Instituto de Investigacion Cientifica Social.',
  story_eyebrow text not null default 'Nuestra Historia',
  story_title text not null default 'La Ruptura Cientifica con la Burocracia',
  story_paragraph_one text not null default '',
  story_paragraph_two text not null default '',
  quote text not null default '',
  story_paragraph_three text not null default '',
  team_eyebrow text not null default 'Repositorio de Integrantes',
  team_title text not null default 'Biografias y Galeria del Equipo',
  team_intro text not null default '',
  network_title text not null default 'Estructura Interna de Trabajo',
  network_intro text not null default '',
  network_support text not null default '',
  values_eyebrow text not null default 'Valores y Proposito',
  values_title text not null default 'Nuestros Pilares Operativos',
  values_intro text not null default '',
  cta_label text not null default 'Ingresar a la Consola de Datos Central',
  team_members jsonb not null default '[]'::jsonb,
  is_published boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint site_about_content_singleton check (id = 'main')
);

alter table public.site_about_content enable row level security;

drop policy if exists "Public can read published about content" on public.site_about_content;
create policy "Public can read published about content"
  on public.site_about_content
  for select
  using (is_published = true);

drop policy if exists "Authenticated users can manage about content" on public.site_about_content;
create policy "Authenticated users can manage about content"
  on public.site_about_content
  for all
  to authenticated
  using (true)
  with check (true);

create or replace function public.set_site_about_content_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_site_about_content_updated_at on public.site_about_content;
create trigger set_site_about_content_updated_at
  before update on public.site_about_content
  for each row
  execute function public.set_site_about_content_updated_at();

insert into public.site_about_content (id)
values ('main')
on conflict (id) do nothing;
