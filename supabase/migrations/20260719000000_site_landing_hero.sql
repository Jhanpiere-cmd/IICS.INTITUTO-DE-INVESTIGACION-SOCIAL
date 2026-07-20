create table if not exists public.site_landing_hero (
  id text primary key default 'main',
  eyebrow text not null default 'Centro Privado de Investigacion Cientifica, Sociologia y Analisis Social',
  headline_primary text not null default 'Comprendemos el presente.',
  headline_accent text not null default 'Anticipamos el futuro.',
  subtitle text not null default 'Centro Privado de Investigacion Cientifica, Sociologia y Analisis Social',
  description text not null default 'Generamos estudios, monitoreo territorial, analisis de opinion publica y evidencia cientifica para instituciones, empresas y tomadores de decision.',
  primary_button_label text not null default 'Explorar publicaciones',
  primary_button_action text not null default 'publications',
  secondary_button_label text not null default 'Explorar Observatorio',
  secondary_button_action text not null default 'observatory',
  tertiary_button_label text not null default 'Documentales y Reportajes',
  tertiary_button_action text not null default 'documentaries',
  quaternary_button_label text not null default 'Academia AFI (Postulacion)',
  quaternary_button_action text not null default 'afi',
  image_url text not null default '/computador-iics.png',
  image_alt text not null default 'Sistema IICS Observatorio',
  support_statement text not null default 'Generamos conocimiento util para la sociedad y la gestion publica.',
  value_card_one_title text not null default 'SOCIOLOGIA DE PRECISION',
  value_card_one_text text not null default 'Aplicamos sociologia de precision para producir conocimiento regional de alto impacto.',
  value_card_two_title text not null default 'INNOVACION METODOLOGICA',
  value_card_two_text text not null default 'Integramos ciencia de datos y herramientas de IA aplicada desde Cajamarca, Peru.',
  is_published boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint site_landing_hero_singleton check (id = 'main'),
  constraint site_landing_hero_primary_action check (primary_button_action in ('publications', 'observatory', 'documentaries', 'afi', 'none')),
  constraint site_landing_hero_secondary_action check (secondary_button_action in ('publications', 'observatory', 'documentaries', 'afi', 'none')),
  constraint site_landing_hero_tertiary_action check (tertiary_button_action in ('publications', 'observatory', 'documentaries', 'afi', 'none')),
  constraint site_landing_hero_quaternary_action check (quaternary_button_action in ('publications', 'observatory', 'documentaries', 'afi', 'none'))
);

alter table public.site_landing_hero enable row level security;

drop policy if exists "Public can read published landing hero" on public.site_landing_hero;
create policy "Public can read published landing hero"
  on public.site_landing_hero
  for select
  using (is_published = true);

drop policy if exists "Authenticated users can manage landing hero" on public.site_landing_hero;
create policy "Authenticated users can manage landing hero"
  on public.site_landing_hero
  for all
  to authenticated
  using (true)
  with check (true);

create or replace function public.set_site_landing_hero_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_site_landing_hero_updated_at on public.site_landing_hero;
create trigger set_site_landing_hero_updated_at
  before update on public.site_landing_hero
  for each row
  execute function public.set_site_landing_hero_updated_at();

insert into public.site_landing_hero (id)
values ('main')
on conflict (id) do nothing;
