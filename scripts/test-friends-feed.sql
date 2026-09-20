-- ONLY run in an empty disposable local PostgreSQL database.
\set ON_ERROR_STOP on
\ir test-friend-profiles.sql
\ir ../supabase/migrations/20260920000200_friends_today_feed.sql

-- Previous suites leave Alice, Bob, Cara and an account without a profile.
insert into public.profiles(user_id,username,updated_at) values ('00000000-0000-4000-8000-000000000004','Dan',1);
delete from public.day_faces where user_id = '00000000-0000-4000-8000-000000000001';
update public.hangouts set date = (now() at time zone 'UTC')::date, title = 'Today title', note = 'Must stay private'
  where id = '00000000-0000-4000-8000-000000000020';
insert into public.day_faces(user_id,date,photo_id,updated_at) values
  ('00000000-0000-4000-8000-000000000001',(now() at time zone 'UTC')::date,'00000000-0000-4000-8000-000000000030',10);
insert into public.hangouts(id,user_id,date,title,note,circle_id,updated_at) values
  ('00000000-0000-4000-8000-000000000040','00000000-0000-4000-8000-000000000001',(now() at time zone 'UTC')::date - 1,'Yesterday private title','Yesterday note','00000000-0000-4000-8000-000000000010',1);
insert into public.photos(id,user_id,hangout_id,storage_path,updated_at) values
  ('00000000-0000-4000-8000-000000000041','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000040','00000000-0000-4000-8000-000000000001/yesterday.jpg',1);
insert into public.day_faces(user_id,date,photo_id,updated_at) values
  ('00000000-0000-4000-8000-000000000001',(now() at time zone 'UTC')::date - 1,'00000000-0000-4000-8000-000000000041',999);

set role anon;
select pg_temp.expect_error($q$select public.get_friends_today('UTC')$q$, '%permission denied%');
reset role;
set role authenticated;
set request.jwt.claim.sub = '';
select pg_temp.expect_error($q$select public.get_friends_today('UTC')$q$, 'Sign in%');
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
select pg_temp.check_true((public.get_friends_today('UTC')->>'friend_count')::integer = 0, 'No friends gives an empty feed');
select public.send_friend_request('00000000-0000-4000-8000-000000000001') as alice_request \gset
select public.send_friend_request('00000000-0000-4000-8000-000000000003') as cara_request \gset
select public.send_friend_request('00000000-0000-4000-8000-000000000004');
select pg_temp.check_true((public.get_friends_today('UTC')->>'friend_count')::integer = 0, 'Pending requests are excluded');
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
select public.accept_friend_request(:'alice_request');
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000003';
select public.accept_friend_request(:'cara_request');
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
do $$ declare feed jsonb; cover jsonb; begin
  feed := public.get_friends_today('UTC');
  perform pg_temp.check_true(feed->>'date' = ((now() at time zone 'UTC')::date)::text, 'Server determines today');
  perform pg_temp.check_true((feed->>'friend_count')::integer = 2 and jsonb_array_length(feed->'friends') = 2, 'Only accepted friends returned');
  perform pg_temp.check_true(feed->'friends'->0->>'username' = 'Alice', 'Alphabetical order');
  cover := feed->'friends'->0->'cover';
  perform pg_temp.check_true(cover->>'title' = 'Today title' and cover->>'id' = '00000000-0000-4000-8000-000000000030', 'Exactly today selected cover');
  perform pg_temp.check_true((select array_agg(k order by k) = array['date','id','storage_path','thumb_storage_path','title','updated_at'] from jsonb_object_keys(cover) k), 'Only allowed cover fields');
  perform pg_temp.check_true(feed->'friends'->1->'cover' = 'null'::jsonb, 'Quiet friend included without a cover');
  perform pg_temp.check_true(feed::text not like '%Yesterday private title%' and feed::text not like '%Must stay private%', 'Historical titles and all notes excluded');
  perform pg_temp.check_true(jsonb_array_length(public.get_friends_today('UTC',1,0)->'friends') = 1, 'Page size enforced');
  perform pg_temp.check_true(public.get_friends_today('UTC',1,1)->'friends'->0->>'username' = 'Cara', 'Second page');
  perform pg_temp.check_true(jsonb_array_length(public.get_friends_today('UTC',1,2)->'friends') = 0, 'End of pagination');
  perform pg_temp.check_true(public.get_friends_today('Pacific/Kiritimati')->>'date' <> public.get_friends_today('Pacific/Honolulu')->>'date', 'Time zone date boundary');
end $$;
select pg_temp.expect_error($q$select public.get_friends_today('not/a-zone')$q$, 'Choose a valid time zone.');
select pg_temp.expect_error($q$select public.get_friends_today('UTC',101,0)$q$, 'Invalid feed page.');
select pg_temp.expect_error($q$select public.get_friends_today('UTC',50,-1)$q$, 'Invalid feed page.');
select pg_temp.check_true((select count(*) = 0 from public.hangouts), 'Feed does not open raw hangout access');

set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
update public.day_faces set photo_id = '00000000-0000-4000-8000-000000000031', updated_at = 11
  where date = (now() at time zone 'UTC')::date;
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
select pg_temp.check_true(public.get_friends_today('UTC')->'friends'->0->'cover'->>'id' = '00000000-0000-4000-8000-000000000031', 'Replacement updates the same daily post');
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
delete from public.day_faces where date = (now() at time zone 'UTC')::date;
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
select pg_temp.check_true(public.get_friends_today('UTC')->'friends'->0->'cover' = 'null'::jsonb, 'Removing cover moves friend into quiet group');
select public.end_friendship(:'alice_request','remove');
select pg_temp.check_true((public.get_friends_today('UTC')->>'friend_count')::integer = 1, 'Removed friend leaves feed');
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000004';
select pg_temp.check_true((public.get_friends_today('UTC')->>'friend_count')::integer = 0, 'Outsider cannot inspect others feed');
reset role;
\echo PASS: today feed, quiet friends, accepted-only visibility, private fields, pagination, time zones, replacements and removals.
