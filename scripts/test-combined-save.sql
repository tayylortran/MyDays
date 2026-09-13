-- Run ONLY in an empty, disposable local PostgreSQL database (not Supabase).
\set ON_ERROR_STOP on
do $$ begin
  if not exists(select 1 from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists(select 1 from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
end $$;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
grant usage on schema auth to authenticated;
create schema storage;
create table storage.objects(bucket_id text, name text);
\ir ../supabase/migrations/20260912000000_create_circles.sql
\ir ../supabase/migrations/20260912000100_create_hangouts.sql
\ir ../supabase/migrations/20260912000200_create_photos.sql
\ir ../supabase/migrations/20260912000400_save_hangouts_with_photos.sql
\ir ../supabase/migrations/20260912000500_simplify_hangout_save.sql

insert into auth.users values ('00000000-0000-4000-8000-000000000001'), ('00000000-0000-4000-8000-000000000002');
insert into public.circles(id,user_id,name,color,updated_at) values
 ('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000001','A','#000',1),
 ('00000000-0000-4000-8000-000000000020','00000000-0000-4000-8000-000000000002','B','#fff',1);
insert into storage.objects select 'photos', '00000000-0000-4000-8000-000000000001/' || op || '/' || photo || '/' || file
from (values
 ('00000000-0000-4000-8000-000000000100','00000000-0000-4000-8000-000000001000'),
 ('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000001001')
) t(op,photo) cross join (values ('image.jpg'),('thumb.jpg')) f(file);

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
do $$
declare
  draft jsonb := '{"mode":"create","hangout":{"id":"00000000-0000-4000-8000-000000000030","date":"2026-09-12","title":" Original ","note":" Diary ","circleId":"00000000-0000-4000-8000-000000000010","updatedAt":1},"photos":[{"kind":"new","id":"00000000-0000-4000-8000-000000001000"}]}';
  saved jsonb;
  edited jsonb;
  bad jsonb;
begin
  saved := public.save_hangout_with_photos('00000000-0000-4000-8000-000000000100',draft);
  if saved->'hangout'->>'title' <> 'Original' or jsonb_array_length(saved->'photos') <> 1 then raise exception 'Create failed'; end if;
  if exists(select 1 from public.photo_file_cleanup) then raise exception 'Committed files queued incorrectly'; end if;
  draft := jsonb_build_object('mode','edit','hangout',saved->'hangout','photos',
    '[{"kind":"existing","id":"00000000-0000-4000-8000-000000001000"},{"kind":"new","id":"00000000-0000-4000-8000-000000001001"}]'::jsonb);
  edited := public.save_hangout_with_photos('00000000-0000-4000-8000-000000000101',draft);
  if jsonb_array_length(edited->'photos') <> 2
    or edited->'photos'->0->>'storage_path' <> saved->'photos'->0->>'storage_path' then raise exception 'Retain/append failed'; end if;

  -- An outdated draft must not overwrite a newer edit.
  begin
    perform public.save_hangout_with_photos('00000000-0000-4000-8000-000000000102',draft);
    raise exception 'Expected stale error';
  exception when raise_exception then if sqlerrm not like '%changed%' then raise; end if; end;

  -- Failure after the title update/deletions must roll the entire transaction back.
  bad := jsonb_build_object('mode','edit','hangout',jsonb_set(edited->'hangout','{title}','"Should roll back"'),
    'photos','[{"kind":"new","id":"00000000-0000-4000-8000-000000001002"}]'::jsonb);
  begin
    perform public.save_hangout_with_photos('00000000-0000-4000-8000-000000000103',bad);
    raise exception 'Expected incomplete upload error';
  exception when raise_exception then if sqlerrm not like '%incomplete%' then raise; end if; end;
  if (select count(*) from public.photos) <> 2 or (select title from public.hangouts) <> 'Original' then raise exception 'Rollback failed'; end if;

  bad := jsonb_set(draft,'{hangout}',jsonb_set(edited->'hangout','{date}','"2026-09-13"'));
  begin
    perform public.save_hangout_with_photos('00000000-0000-4000-8000-000000000104',bad);
    raise exception 'Expected fixed date error';
  exception when raise_exception then if sqlerrm not like '%date cannot%' then raise; end if; end;

  draft := jsonb_build_object('mode','edit','hangout',edited->'hangout','photos',
    '[{"kind":"existing","id":"00000000-0000-4000-8000-000000001001"}]'::jsonb);
  edited := public.save_hangout_with_photos('00000000-0000-4000-8000-000000000105',draft);
  if jsonb_array_length(edited->'photos') <> 1 or edited->'photos'->0->>'sort' <> '0'
    or (select count(*) from public.photo_file_cleanup where path like '%000000000100/%') <> 2 then raise exception 'Removal queue failed'; end if;
end;
$$;

set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
do $$
begin
  if exists(select 1 from public.hangouts) or exists(select 1 from public.photos)
    or exists(select 1 from public.photo_file_cleanup) then raise exception 'Cross-account read'; end if;
  begin
    perform public.save_hangout_with_photos('00000000-0000-4000-8000-000000000201',
      '{"mode":"edit","hangout":{"id":"00000000-0000-4000-8000-000000000030","date":"2026-09-12","title":"B","circleId":"00000000-0000-4000-8000-000000000020","updatedAt":1},"photos":[]}');
    raise exception 'Expected ownership error';
  exception when raise_exception then if sqlerrm <> 'This hangout is unavailable.' then raise; end if; end;
  begin
    perform public.save_hangout_with_photos('00000000-0000-4000-8000-000000000200','{"mode":"create","hangout":{"id":"00000000-0000-4000-8000-000000000040","date":"2026-09-12","title":"B","circleId":"00000000-0000-4000-8000-000000000010"},"photos":[]}');
    raise exception 'Expected circle ownership error';
  exception when foreign_key_violation then null; end;
end;
$$;
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
delete from public.hangouts where id = '00000000-0000-4000-8000-000000000030';
do $$ begin
  if exists(select 1 from public.photos) or (select count(*) from public.photo_file_cleanup where path like '%000000000101/%') <> 2 then raise exception 'Delete cascade queue failed'; end if;
end $$;
reset role;
do $$ begin
  if to_regclass('public.hangout_saves') is not null then raise exception 'History table still exists'; end if;
end $$;
delete from auth.users;
\echo PASS: atomic create/edit, retained order, rollback, stale drafts, fixed date, owner isolation, cleanup cascade.
