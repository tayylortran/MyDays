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
\ir ../supabase/migrations/20260915000000_create_profiles.sql
\ir ../supabase/migrations/20260915000100_add_profile_avatars.sql

insert into auth.users values ('00000000-0000-4000-8000-000000000001'), ('00000000-0000-4000-8000-000000000002');
insert into public.circles(id,user_id,name,color,updated_at) values
 ('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000001','A','#000',1),
 ('00000000-0000-4000-8000-000000000020','00000000-0000-4000-8000-000000000002','B','#fff',1);
insert into storage.objects select 'photos', '00000000-0000-4000-8000-000000000001/' || op || '/' || photo || '/' || file
from (values
 ('00000000-0000-4000-8000-000000000100','00000000-0000-4000-8000-000000001000'),
 ('00000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000001001')
) t(op,photo) cross join (values ('image.jpg'),('thumb.jpg')) f(file);
insert into storage.objects values
 ('photos','00000000-0000-4000-8000-000000000001/avatars/00000000-0000-4000-8000-000000000501.jpg'),
 ('photos','00000000-0000-4000-8000-000000000001/avatars/00000000-0000-4000-8000-000000000502.jpg');

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
  insert into public.day_faces(date, photo_id, updated_at) values ('2026-09-12','00000000-0000-4000-8000-000000001000',1);
  insert into public.day_faces(date, photo_id, updated_at) values ('2026-09-12','00000000-0000-4000-8000-000000001001',2)
    on conflict (user_id,date) do update set photo_id = excluded.photo_id, updated_at = excluded.updated_at;
  if (select count(*) from public.day_faces) <> 1 then raise exception 'Daily selection duplicated'; end if;
  begin
    insert into public.day_faces(date, photo_id, updated_at) values ('2026-09-13','00000000-0000-4000-8000-000000001000',1);
    raise exception 'Expected wrong-date error';
  exception when raise_exception then if sqlerrm <> 'Choose one of your photos from this date.' then raise; end if; end;
  -- Selecting a photo that an edit removes must remove the selection too.
  update public.day_faces set photo_id = '00000000-0000-4000-8000-000000001000';

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
  if exists(select 1 from public.day_faces) then raise exception 'Deleted photo still selected'; end if;
  insert into public.day_faces(date, photo_id, updated_at) values ('2026-09-12','00000000-0000-4000-8000-000000001001',3);
  insert into public.profiles(username, avatar_storage_path, updated_at) values
    ('Sam','00000000-0000-4000-8000-000000000001/avatars/00000000-0000-4000-8000-000000000501.jpg',1);
end;
$$;

set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
do $$
begin
  if exists(select 1 from public.hangouts) or exists(select 1 from public.photos)
    or exists(select 1 from public.photo_file_cleanup) then raise exception 'Cross-account read'; end if;
  if exists(select 1 from public.profiles) or exists(select 1 from public.day_faces) then raise exception 'Cross-account profile read'; end if;
  begin
    insert into public.profiles(username, updated_at) values ('sAM',1);
    raise exception 'Expected duplicate username';
  exception when unique_violation then null; end;
  insert into public.profiles(username, updated_at) values ('Other_User.1',1);
  begin
    update public.profiles set avatar_storage_path = '00000000-0000-4000-8000-000000000001/avatars/00000000-0000-4000-8000-000000000501.jpg';
    raise exception 'Expected avatar ownership check';
  exception when check_violation then null; end;
  begin
    update public.profiles set username = 'SAM';
    raise exception 'Expected duplicate rename';
  exception when unique_violation then null; end;
  begin
    update public.profiles set username = 'has spaces';
    raise exception 'Expected username format error';
  exception when check_violation then null; end;
  update public.profiles set username = 'Stolen' where user_id = '00000000-0000-4000-8000-000000000001';
  if found then raise exception 'Cross-account username update'; end if;
  begin
    insert into public.day_faces(date,photo_id,updated_at) values ('2026-09-12','00000000-0000-4000-8000-000000001001',1);
    raise exception 'Expected photo ownership error';
  exception when raise_exception then if sqlerrm <> 'Choose one of your photos from this date.' then raise; end if; end;
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
  if exists(select 1 from public.day_faces) then raise exception 'Hangout deletion left profile selection'; end if;
  if (select username from public.profiles) <> 'Sam' then raise exception 'Owner username changed'; end if;
  begin
    update public.profiles set avatar_storage_path = '00000000-0000-4000-8000-000000000001/avatars/00000000-0000-4000-8000-000000000599.jpg';
    raise exception 'Expected missing avatar error';
  exception when raise_exception then if sqlerrm not like 'Avatar upload is missing%' then raise; end if; end;
  begin
    update public.profiles set username = 'Other_User.1', avatar_storage_path = '00000000-0000-4000-8000-000000000001/avatars/00000000-0000-4000-8000-000000000502.jpg';
    raise exception 'Expected duplicate username rollback';
  exception when unique_violation then null; end;
  if exists(select 1 from public.photo_file_cleanup where path like '%/avatars/%') then raise exception 'Rejected profile save queued a live avatar'; end if;
  if (select avatar_storage_path from public.profiles) not like '%501.jpg' then raise exception 'Rejected save changed avatar'; end if;
  update public.profiles set username = 'SAM';
  if exists(select 1 from public.photo_file_cleanup where path like '%/avatars/%') then raise exception 'Username edit queued the avatar'; end if;
  update public.profiles set avatar_storage_path = '00000000-0000-4000-8000-000000000001/avatars/00000000-0000-4000-8000-000000000502.jpg';
  if (select count(*) from public.photo_file_cleanup where path like '%/avatars/%') <> 1 then raise exception 'Replacement did not queue old avatar'; end if;
  begin
    update public.profiles set avatar_storage_path = '00000000-0000-4000-8000-000000000001/avatars/00000000-0000-4000-8000-000000000501.jpg';
    raise exception 'Expected queued avatar rejection';
  exception when raise_exception then if sqlerrm not like 'Avatar upload is missing%' then raise; end if; end;
  update public.profiles set avatar_storage_path = null;
  if (select count(*) from public.photo_file_cleanup where path like '%/avatars/%') <> 2 then raise exception 'Avatar removal cleanup failed'; end if;
end $$;
reset role;
do $$ begin
  if to_regclass('public.hangout_saves') is not null then raise exception 'History table still exists'; end if;
end $$;
delete from auth.users;
\echo PASS: atomic saves, daily selections, usernames, avatar ownership/existence/replacement/removal, cleanup rollback, owner isolation.
