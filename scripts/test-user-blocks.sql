-- ONLY run in an empty disposable local PostgreSQL database, never a live project.
\set ON_ERROR_STOP on
\ir test-friends-feed.sql
\ir ../supabase/migrations/20260929000100_block_users.sql

-- Existing suites leave Alice (1), Bob (2), Cara (3), Dana (4).
-- Bob/Cara are friends and Bob/Dana have a pending request.
set role anon;
select pg_temp.expect_error($q$select public.block_user('00000000-0000-4000-8000-000000000001')$q$, '%permission denied%');
select pg_temp.expect_error($q$select public.unblock_user('00000000-0000-4000-8000-000000000001')$q$, '%permission denied%');
select pg_temp.expect_error('select public.list_blocked_users()', '%permission denied%');
reset role;
set role authenticated;
set request.jwt.claim.sub = '';
select pg_temp.expect_error($q$select public.block_user('00000000-0000-4000-8000-000000000001')$q$, 'Sign in%');
select pg_temp.expect_error($q$select public.unblock_user('00000000-0000-4000-8000-000000000001')$q$, 'Sign in%');
select pg_temp.expect_error('select public.list_blocked_users()', 'Sign in%');

set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
select public.send_friend_request('00000000-0000-4000-8000-000000000002') as ab_request \gset
-- Restore an actual shared cover to verify storage access is revoked by blocking.
insert into public.day_faces(date, photo_id, updated_at)
  select h.date, p.id, 1 from public.photos p join public.hangouts h on h.id = p.hangout_id
  where p.id = '00000000-0000-4000-8000-000000000030';
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
select public.accept_friend_request(:'ab_request');
select pg_temp.check_true(public.can_read_friend_profile_file('00000000-0000-4000-8000-000000000001/photo.jpg'), 'Accepted friend can read cover before block');
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
select public.block_user('00000000-0000-4000-8000-000000000002');
select public.block_user('00000000-0000-4000-8000-000000000002');
select pg_temp.check_true((select relationship = 'blocked' and friendship_id is null from public.find_friend_by_username(' bOB ')), 'Blocker sees Blocked in exact search');
select pg_temp.check_true((select count(*) = 1 from public.list_blocked_users()), 'Block retry is idempotent');
select pg_temp.check_true((select count(*) = 0 from public.list_my_friendships('friends')), 'Block removes friendship for blocker');
select pg_temp.check_true((public.get_friends_today('UTC')->>'friend_count')::integer = 0, 'Block removes friend from blocker feed');
select pg_temp.expect_error($q$select public.send_friend_request('00000000-0000-4000-8000-000000000002')$q$, 'This user is unavailable.');
select pg_temp.expect_error('select * from public.user_blocks', '%permission denied%');
select pg_temp.expect_error('delete from public.user_blocks', '%permission denied%');
select pg_temp.expect_error($q$select public.friend_pair_blocked('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002')$q$, '%permission denied%');
select pg_temp.expect_error($q$select public.block_user('00000000-0000-4000-8000-000000000001')$q$, 'Choose another user.');
select pg_temp.expect_error('select public.block_user(null)', 'Choose another user.');
select pg_temp.expect_error($q$select public.block_user('00000000-0000-4000-8000-000000000099')$q$, 'This user is unavailable.');
select pg_temp.expect_error('select public.list_blocked_users(101,0)', 'Invalid blocked users page.');
select pg_temp.expect_error('select public.list_blocked_users(50,-1)', 'Invalid blocked users page.');

set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
select pg_temp.check_true((select count(*) = 0 from public.find_friend_by_username('Alice')), 'Blocked person cannot discover blocker');
select pg_temp.check_true((select count(*) = 0 from public.list_blocked_users()), 'Blocked person cannot inspect blocker list');
select pg_temp.check_true((select count(*) = 1 from public.list_my_friendships('friends')), 'Unrelated Cara friendship remains');
select pg_temp.check_true((public.get_friends_today('UTC')->>'friend_count')::integer = 1, 'Blocked profile leaves target feed');
select pg_temp.check_true(not public.can_read_friend_profile_file('00000000-0000-4000-8000-000000000001/photo.jpg'), 'Block revokes new cover file access');
select pg_temp.check_true((select count(*) = 0 from storage.objects where name = '00000000-0000-4000-8000-000000000001/photo.jpg'), 'Storage RLS hides blocked cover');
select pg_temp.expect_error($q$select public.get_friend_profile('00000000-0000-4000-8000-000000000001','2026-09')$q$, '%accepted friends%');
select pg_temp.expect_error($q$select public.send_friend_request('00000000-0000-4000-8000-000000000001')$q$, 'This user is unavailable.');
select pg_temp.expect_error('select public.accept_friend_request(' || quote_literal(:'ab_request') || ')', 'This incoming request is unavailable.');
select public.unblock_user('00000000-0000-4000-8000-000000000001');
select pg_temp.check_true((select count(*) = 0 from public.find_friend_by_username('Alice')), 'Target cannot remove someone else block');

-- Mutual blocks remain independently manageable, including search.
select public.block_user('00000000-0000-4000-8000-000000000001');
select pg_temp.check_true((select relationship = 'blocked' from public.find_friend_by_username('Alice')), 'Mutual blocker can find own blocked entry');
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
select pg_temp.check_true((select relationship = 'blocked' from public.find_friend_by_username('Bob')), 'Both blockers can manage own entry');
select public.unblock_user('00000000-0000-4000-8000-000000000002');
select public.unblock_user('00000000-0000-4000-8000-000000000002');
select pg_temp.check_true((select count(*) = 0 from public.find_friend_by_username('Bob')), 'Other person block survives unblock');
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
select public.unblock_user('00000000-0000-4000-8000-000000000001');
select pg_temp.check_true((select relationship = 'none' from public.find_friend_by_username('Alice')), 'Search restored without restoring friendship');
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
select pg_temp.check_true((select relationship = 'none' from public.find_friend_by_username('Bob')), 'Search restored both ways');
select public.send_friend_request('00000000-0000-4000-8000-000000000002') as new_request \gset
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
select public.accept_friend_request(:'new_request');
select pg_temp.check_true(public.can_read_friend_profile_file('00000000-0000-4000-8000-000000000001/photo.jpg'), 'New accepted request restores ordinary access');

-- Incoming and outgoing requests are also removed, with stale accepts rejected.
select public.block_user('00000000-0000-4000-8000-000000000004');
select pg_temp.check_true((select count(*) = 0 from public.list_my_friendships('outgoing')), 'Block removes outgoing request');
select public.unblock_user('00000000-0000-4000-8000-000000000004');
select public.send_friend_request('00000000-0000-4000-8000-000000000004') as bd_request \gset
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000004';
select public.block_user('00000000-0000-4000-8000-000000000002');
select pg_temp.check_true((select count(*) = 0 from public.list_my_friendships('incoming')), 'Block removes incoming request');
select pg_temp.expect_error('select public.accept_friend_request(' || quote_literal(:'bd_request') || ')', 'This incoming request is unavailable.');

-- List contains only the caller's blocks, ordered/paginated by username.
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
select public.block_user('00000000-0000-4000-8000-000000000003');
select public.block_user('00000000-0000-4000-8000-000000000002');
select pg_temp.check_true((select username = 'Bob' from public.list_blocked_users(1,0)), 'Blocked list first page');
select pg_temp.check_true((select username = 'Cara' from public.list_blocked_users(1,1)), 'Blocked list second page');
select pg_temp.check_true((select count(*) = 0 from public.list_blocked_users(1,2)), 'Blocked list end');
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000003';
select pg_temp.check_true((select count(*) = 0 from public.list_blocked_users()), 'Third party cannot see others blocks');
reset role;
delete from auth.users where id = '00000000-0000-4000-8000-000000000003';
select pg_temp.check_true(not exists(select 1 from public.user_blocks where blocked_id = '00000000-0000-4000-8000-000000000003'), 'Deleting target removes block rows');
delete from auth.users where id = '00000000-0000-4000-8000-000000000004';
select pg_temp.check_true(not exists(select 1 from public.user_blocks where blocker_id = '00000000-0000-4000-8000-000000000004'), 'Deleting blocker removes block rows');
\echo PASS: block/unblock, search asymmetry, mutual blocks, friendship/request removal, feed/profile/storage denial, list ownership/pagination and account cleanup.
