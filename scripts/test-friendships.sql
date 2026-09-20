-- ONLY run against an empty, disposable local PostgreSQL database.
-- This reuses the existing isolated schema setup and its regression tests.
\set ON_ERROR_STOP on
\ir test-combined-save.sql
\ir ../supabase/migrations/20260920000000_create_friendships.sql

create function pg_temp.check_true(value boolean, message text) returns void
language plpgsql as $$ begin
  if value is distinct from true then raise exception 'FAIL: %', message; end if;
end $$;
create function pg_temp.expect_error(statement text, expected text) returns void
language plpgsql as $$ begin
  begin
    execute statement;
  exception when others then
    if sqlerrm like expected then return; end if;
    raise;
  end;
  raise exception 'FAIL: expected error % from %', expected, statement;
end $$;

insert into auth.users(id) values
  ('00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000002'),
  ('00000000-0000-4000-8000-000000000003'),
  ('00000000-0000-4000-8000-000000000004');
insert into public.profiles(user_id, username, updated_at) values
  ('00000000-0000-4000-8000-000000000001', 'Alice', 1),
  ('00000000-0000-4000-8000-000000000002', 'Bob', 1),
  ('00000000-0000-4000-8000-000000000003', 'Cara', 1);
insert into public.circles(id,user_id,name,color,updated_at) values
  ('00000000-0000-4000-8000-000000000010','00000000-0000-4000-8000-000000000001','Private','#000000',1);
insert into public.hangouts(id,user_id,date,title,note,circle_id,updated_at) values
  ('00000000-0000-4000-8000-000000000020','00000000-0000-4000-8000-000000000001','2026-09-20','Private title','Private note','00000000-0000-4000-8000-000000000010',1);
insert into public.photos(id,user_id,hangout_id,storage_path,updated_at) values
  ('00000000-0000-4000-8000-000000000030','00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000020','00000000-0000-4000-8000-000000000001/photo.jpg',1);
insert into public.day_faces(user_id,date,photo_id,updated_at) values
  ('00000000-0000-4000-8000-000000000001','2026-09-20','00000000-0000-4000-8000-000000000030',1);

set role anon;
select pg_temp.expect_error('select * from public.friendships', '%permission denied%');
select pg_temp.expect_error($q$select public.find_friend_by_username('Bob')$q$, '%permission denied%');
select pg_temp.expect_error($q$select public.list_my_friendships('friends')$q$, '%permission denied%');
select pg_temp.expect_error($q$select public.send_friend_request('00000000-0000-4000-8000-000000000002')$q$, '%permission denied%');
select pg_temp.expect_error($q$select public.accept_friend_request(null)$q$, '%permission denied%');
select pg_temp.expect_error($q$select public.end_friendship(null, 'remove')$q$, '%permission denied%');
reset role;

set role authenticated;
set request.jwt.claim.sub = '';
select pg_temp.expect_error($q$select public.find_friend_by_username('Bob')$q$, 'Sign in%');
select pg_temp.expect_error($q$select public.send_friend_request('00000000-0000-4000-8000-000000000002')$q$, 'Sign in%');
select pg_temp.expect_error($q$select public.accept_friend_request(null)$q$, 'Sign in%');
select pg_temp.expect_error($q$select public.end_friendship(null, 'remove')$q$, 'Sign in%');
select pg_temp.expect_error($q$select public.list_my_friendships('friends')$q$, 'Sign in%');
select pg_temp.check_true((select count(*) = 0 from public.friendships), 'No unauthenticated relationship rows');

set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
select pg_temp.check_true((select username = 'Bob' and relationship = 'none' from public.find_friend_by_username(' bOB ')), 'Exact case-insensitive search');
select pg_temp.check_true((select count(*) = 0 from public.find_friend_by_username('Alice')), 'Self excluded');
select pg_temp.check_true((select count(*) = 0 from public.find_friend_by_username('B_b')), 'Underscore is literal');
select pg_temp.expect_error($q$select public.find_friend_by_username('B%')$q$, 'Enter a username%');
select pg_temp.expect_error($q$select public.send_friend_request('00000000-0000-4000-8000-000000000001')$q$, 'Choose another user.');
select pg_temp.expect_error($q$select public.send_friend_request('00000000-0000-4000-8000-000000000004')$q$, 'This user is unavailable.');
select public.send_friend_request('00000000-0000-4000-8000-000000000002') as request_id \gset
select pg_temp.check_true(public.send_friend_request('00000000-0000-4000-8000-000000000002') = :'request_id'::uuid, 'Send retry reuses request');
select pg_temp.check_true((select count(*) = 1 from public.list_my_friendships('outgoing')), 'Sender sees outgoing');
select pg_temp.check_true((select count(*) = 0 from public.list_my_friendships('friends')), 'Pending is not a friend');
select pg_temp.expect_error('select public.accept_friend_request(' || quote_literal(:'request_id') || ')', 'This incoming request is unavailable.');
select pg_temp.expect_error('select public.end_friendship(' || quote_literal(:'request_id') || ', ''decline'')', 'This relationship changed.%');
select pg_temp.expect_error('select public.end_friendship(' || quote_literal(:'request_id') || ', ''remove'')', 'This relationship changed.%');
select pg_temp.expect_error($q$insert into public.friendships(requester_id,recipient_id,status,accepted_at) values ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003','accepted',now())$q$, '%permission denied%');
select pg_temp.expect_error($q$update public.friendships set recipient_id = '00000000-0000-4000-8000-000000000003'$q$, '%permission denied%');
select pg_temp.expect_error('delete from public.friendships', '%permission denied%');

set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000003';
select pg_temp.check_true((select count(*) = 0 from public.friendships), 'Outsider cannot read relationship');
select pg_temp.check_true((select count(*) = 0 from public.list_my_friendships('incoming')), 'Outsider has no incoming requests');
select pg_temp.check_true((select relationship = 'none' from public.find_friend_by_username('Bob')), 'Search cannot reveal someone else relationship');
select pg_temp.expect_error('select public.accept_friend_request(' || quote_literal(:'request_id') || ')', 'This incoming request is unavailable.');
select pg_temp.expect_error('select public.end_friendship(' || quote_literal(:'request_id') || ', ''remove'')', 'This relationship changed.%');

set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
select pg_temp.check_true(public.send_friend_request('00000000-0000-4000-8000-000000000001') = :'request_id'::uuid, 'Reverse request reuses original');
select pg_temp.check_true((select status = 'pending' from public.friendships), 'Reverse request does not auto-accept');
select pg_temp.check_true((select relationship = 'incoming' from public.find_friend_by_username('Alice')), 'Recipient search state');
select pg_temp.check_true((select count(*) = 1 from public.list_my_friendships('incoming')), 'Recipient sees incoming request');
select pg_temp.expect_error('select public.end_friendship(' || quote_literal(:'request_id') || ', ''cancel'')', 'This relationship changed.%');
select public.accept_friend_request(:'request_id');
select public.accept_friend_request(:'request_id');
select pg_temp.check_true((select count(*) = 0 from public.list_my_friendships('incoming')), 'Accepted request leaves inbox');
select pg_temp.check_true((select username = 'Alice' and accepted_at is not null from public.list_my_friendships('friends')), 'Recipient sees accepted friend');
select pg_temp.check_true((select count(*) = 1 from public.profiles), 'Raw profiles remain owner-only');
select pg_temp.check_true((select count(*) = 0 from public.hangouts), 'Friendship does not expose hangout titles or notes');
select pg_temp.check_true((select count(*) = 0 from public.photos), 'Friendship does not expose unselected photos');
select pg_temp.check_true((select count(*) = 0 from public.day_faces), 'Shared covers are not enabled yet');
select pg_temp.expect_error('select public.end_friendship(' || quote_literal(:'request_id') || ', ''decline'')', 'This relationship changed.%');

set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
select pg_temp.check_true((select username = 'Bob' from public.list_my_friendships('friends')), 'Sender also sees accepted friend');
select pg_temp.check_true((select relationship = 'friends' from public.find_friend_by_username('Bob')), 'Accepted search state');
select pg_temp.expect_error('select public.end_friendship(' || quote_literal(:'request_id') || ', ''cancel'')', 'This relationship changed.%');
select public.end_friendship(:'request_id', 'remove');
select pg_temp.check_true((select count(*) = 0 from public.friendships), 'Sender can remove friendship');
select public.send_friend_request('00000000-0000-4000-8000-000000000002') as request_id \gset
select public.end_friendship(:'request_id', 'cancel');
select pg_temp.check_true((select count(*) = 0 from public.friendships), 'Sender can cancel pending request');
select public.send_friend_request('00000000-0000-4000-8000-000000000002') as request_id \gset

set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
select public.end_friendship(:'request_id', 'decline');
select pg_temp.check_true((select count(*) = 0 from public.friendships), 'Recipient can decline');
select public.send_friend_request('00000000-0000-4000-8000-000000000001') as request_id \gset
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
select public.accept_friend_request(:'request_id');
select public.end_friendship(:'request_id', 'remove');
select pg_temp.check_true((select count(*) = 0 from public.friendships), 'Recipient can remove accepted friendship');
select pg_temp.expect_error($q$select public.list_my_friendships('all')$q$, 'Choose friends%');
select pg_temp.expect_error($q$select public.list_my_friendships('friends', 101, 0)$q$, 'Invalid friends page.');
select pg_temp.expect_error($q$select public.list_my_friendships('friends', 50, -1)$q$, 'Invalid friends page.');
select public.send_friend_request('00000000-0000-4000-8000-000000000002');

set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000004';
select pg_temp.expect_error($q$select public.send_friend_request('00000000-0000-4000-8000-000000000002')$q$, 'Set your username%');
reset role;
delete from auth.users where id = '00000000-0000-4000-8000-000000000002';
select pg_temp.check_true((select count(*) = 0 from public.friendships), 'Account deletion removes relationships');
\echo PASS: friendship lifecycle, retries, reverse requests, actor permissions, discovery, validation, privacy, and account deletion.
