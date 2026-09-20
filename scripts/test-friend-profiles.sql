-- ONLY run in an empty disposable local PostgreSQL database, never a live project.
\set ON_ERROR_STOP on
\ir test-friendships.sql

-- Extend the existing local Storage stand-in with the actual owner policies.
create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create function storage.foldername(name text) returns text[] language sql as $$
  select string_to_array(regexp_replace(name, '/[^/]*$', ''), '/');
$$;
alter table storage.objects enable row level security;
grant usage on schema storage to authenticated;
grant select, insert, update, delete on storage.objects to authenticated;
\ir ../supabase/migrations/20260912000300_create_photo_bucket.sql
\ir ../supabase/migrations/20260920000100_share_friend_profiles.sql

insert into auth.users(id) values ('00000000-0000-4000-8000-000000000002');
insert into public.profiles(user_id,username,updated_at) values ('00000000-0000-4000-8000-000000000002','Bob',1);
update public.photos set thumb_storage_path = '00000000-0000-4000-8000-000000000001/thumb.jpg'
  where id = '00000000-0000-4000-8000-000000000030';
insert into public.photos(id,user_id,hangout_id,storage_path,updated_at) values
  ('00000000-0000-4000-8000-000000000031','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000020','00000000-0000-4000-8000-000000000001/unselected.jpg',1);
insert into storage.objects(bucket_id,name) values
  ('photos','00000000-0000-4000-8000-000000000001/photo.jpg'),
  ('photos','00000000-0000-4000-8000-000000000001/thumb.jpg'),
  ('photos','00000000-0000-4000-8000-000000000001/unselected.jpg'),
  ('photos','00000000-0000-4000-8000-000000000001/orphan.jpg'),
  ('photos','00000000-0000-4000-8000-000000000001/avatars/00000000-0000-4000-8000-000000000601.jpg'),
  ('another-bucket','00000000-0000-4000-8000-000000000001/photo.jpg');
update public.profiles set avatar_storage_path = '00000000-0000-4000-8000-000000000001/avatars/00000000-0000-4000-8000-000000000601.jpg'
  where user_id = '00000000-0000-4000-8000-000000000001';

set role anon;
select pg_temp.expect_error($q$select public.get_friend_profile('00000000-0000-4000-8000-000000000001','2026-09')$q$, '%permission denied%');
select pg_temp.expect_error($q$select public.can_read_friend_profile_file('anything')$q$, '%permission denied%');
reset role;
set role authenticated;
set request.jwt.claim.sub = '';
select pg_temp.expect_error($q$select public.get_friend_profile('00000000-0000-4000-8000-000000000001','2026-09')$q$, '%accepted friends%');
select pg_temp.check_true(not public.can_read_friend_profile_file('00000000-0000-4000-8000-000000000001/photo.jpg'), 'No session cannot read a shared file');

set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
select public.send_friend_request('00000000-0000-4000-8000-000000000002') as request_id \gset
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
select pg_temp.expect_error($q$select public.get_friend_profile('00000000-0000-4000-8000-000000000001','2026-09')$q$, '%accepted friends%');
select pg_temp.check_true((select count(*) = 0 from storage.objects), 'Pending requests cannot read files');
select public.accept_friend_request(:'request_id');
select pg_temp.check_true((select count(*) = 3 from storage.objects), 'Friend can read exactly the selected cover, thumbnail and current avatar');
select pg_temp.check_true(not public.can_read_friend_profile_file('00000000-0000-4000-8000-000000000001/unselected.jpg'), 'Unselected photo stays private');
select pg_temp.check_true(not public.can_read_friend_profile_file('00000000-0000-4000-8000-000000000001/orphan.jpg'), 'Unreferenced upload stays private');
select pg_temp.check_true((select count(*) = 0 from public.hangouts), 'Titles and notes remain private');
select pg_temp.check_true((select count(*) = 0 from public.photos), 'Raw photo records stay private');
select pg_temp.check_true((select count(*) = 0 from public.day_faces), 'Raw day selections stay private');
select pg_temp.check_true((select count(*) = 1 from public.profiles), 'Raw profiles stay owner-only');
do $$ declare result jsonb; begin
  result := public.get_friend_profile('00000000-0000-4000-8000-000000000001','2026-09');
  perform pg_temp.check_true(result->>'username' = 'Alice' and (result->>'total_photos')::integer = 1, 'Profile identity and total');
  perform pg_temp.check_true(jsonb_array_length(result->'covers') = 1 and result->'covers'->0->>'date' = '2026-09-20', 'Only selected day returned');
  perform pg_temp.check_true((select array_agg(k order by k) = array['avatar_storage_path','covers','total_photos','user_id','username'] from jsonb_object_keys(result) k), 'Only allowed profile fields');
  perform pg_temp.check_true((select array_agg(k order by k) = array['date','id','storage_path','thumb_storage_path'] from jsonb_object_keys(result->'covers'->0) k), 'No hangout metadata in cover response');
  result := public.get_friend_profile('00000000-0000-4000-8000-000000000001','2026-10');
  perform pg_temp.check_true(jsonb_array_length(result->'covers') = 0 and (result->>'total_photos')::integer = 1, 'Month filtering preserves all-time count');
end $$;
select pg_temp.expect_error($q$select public.get_friend_profile('00000000-0000-4000-8000-000000000001','2026-13')$q$, '%YYYY-MM%');
select pg_temp.expect_error($q$select public.get_friend_profile('00000000-0000-4000-8000-000000000001',null)$q$, '%YYYY-MM%');
select pg_temp.expect_error($q$insert into storage.objects values ('photos','00000000-0000-4000-8000-000000000001/forged.jpg')$q$, '%row-level security%');
do $$ begin
  delete from storage.objects where name = '00000000-0000-4000-8000-000000000001/photo.jpg';
  if found then raise exception 'Friend can delete shared file'; end if;
  update storage.objects set name = 'forged' where name = '00000000-0000-4000-8000-000000000001/photo.jpg';
  if found then raise exception 'Friend can update shared file'; end if;
end $$;

set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000003';
select pg_temp.expect_error($q$select public.get_friend_profile('00000000-0000-4000-8000-000000000001','2026-09')$q$, '%accepted friends%');
select pg_temp.check_true((select count(*) = 0 from storage.objects), 'Outsider cannot read shared files');

set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
update public.day_faces set photo_id = '00000000-0000-4000-8000-000000000031' where date = '2026-09-20';
update public.profiles set avatar_storage_path = null;
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
select pg_temp.check_true((select count(*) = 1 from storage.objects), 'Changing cover/removing avatar withdraws old files');
select pg_temp.check_true(not public.can_read_friend_profile_file('00000000-0000-4000-8000-000000000001/photo.jpg'), 'Old cover no longer readable');
select pg_temp.check_true(public.can_read_friend_profile_file('00000000-0000-4000-8000-000000000001/unselected.jpg'), 'New selected cover is readable');
select public.end_friendship(:'request_id', 'remove');
select pg_temp.check_true((select count(*) = 0 from storage.objects), 'Removal revokes new file access');
select pg_temp.expect_error($q$select public.get_friend_profile('00000000-0000-4000-8000-000000000001','2026-09')$q$, '%accepted friends%');
reset role;
\echo PASS: shared-profile fields, selected files only, pending/outsider denial, owner-only writes, replacement and friendship removal.
