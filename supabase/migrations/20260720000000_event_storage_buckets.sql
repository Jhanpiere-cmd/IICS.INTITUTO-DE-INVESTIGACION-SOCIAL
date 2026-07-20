-- Storage buckets required by the events module.
-- Run this in Supabase SQL editor if migrations are not being applied automatically.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'event-covers',
    'event-covers',
    true,
    10485760,
    array['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']::text[]
  ),
  (
    'event-gallery',
    'event-gallery',
    true,
    52428800,
    array['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']::text[]
  ),
  (
    'event-receipts',
    'event-receipts',
    true,
    10485760,
    array['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf']::text[]
  ),
  (
    'event-certificates',
    'event-certificates',
    true,
    20971520,
    array['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp']::text[]
  )
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public can read event storage files'
  ) then
    create policy "Public can read event storage files"
    on storage.objects for select
    using (bucket_id in ('event-covers', 'event-gallery', 'event-receipts', 'event-certificates'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated users can upload event storage files'
  ) then
    create policy "Authenticated users can upload event storage files"
    on storage.objects for insert
    to authenticated
    with check (bucket_id in ('event-covers', 'event-gallery', 'event-receipts', 'event-certificates'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated users can update event storage files'
  ) then
    create policy "Authenticated users can update event storage files"
    on storage.objects for update
    to authenticated
    using (bucket_id in ('event-covers', 'event-gallery', 'event-receipts', 'event-certificates'))
    with check (bucket_id in ('event-covers', 'event-gallery', 'event-receipts', 'event-certificates'));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Authenticated users can delete event storage files'
  ) then
    create policy "Authenticated users can delete event storage files"
    on storage.objects for delete
    to authenticated
    using (bucket_id in ('event-covers', 'event-gallery', 'event-receipts', 'event-certificates'));
  end if;
end $$;
