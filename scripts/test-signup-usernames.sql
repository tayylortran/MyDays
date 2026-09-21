-- ONLY run against an empty, disposable local PostgreSQL database.
\set ON_ERROR_STOP on
\ir test-combined-save.sql
alter table auth.users add column raw_user_meta_data jsonb;
-- An existing account without a profile can still choose its initial name in Settings.
insert into auth.users(id) values ('00000000-0000-4000-8000-000000000003');
\ir ../supabase/migrations/20260920000300_signup_usernames.sql

create function pg_temp.check_true(value boolean, message text) returns void
language plpgsql as $$ begin
  if value is distinct from true then raise exception 'FAIL: %', message; end if;
end $$;
create function pg_temp.expect_error(statement text, expected text) returns void
language plpgsql as $$ begin
  begin execute statement;
  exception when others then
    if sqlerrm like expected then return; end if;
    raise;
  end;
  raise exception 'FAIL: expected error %', expected;
end $$;

insert into auth.users(id, raw_user_meta_data) values
 ('00000000-0000-4000-8000-000000000001', '{"username":" Alice "}'),
 ('00000000-0000-4000-8000-000000000002', '{"username":"Bob"}');
select pg_temp.check_true((select username = 'Alice' from public.profiles where user_id = '00000000-0000-4000-8000-000000000001'), 'Signup creates profile without a session');
select pg_temp.check_true((select count(*) = 0 from public.username_changes), 'Creation does not count');
select pg_temp.expect_error($q$insert into auth.users(id) values ('00000000-0000-4000-8000-000000000004')$q$, 'Choose a username%');
select pg_temp.expect_error($q$insert into auth.users(id,raw_user_meta_data) values ('00000000-0000-4000-8000-000000000004','{"username":"aLICE"}')$q$, '%duplicate key%');
select pg_temp.check_true((select count(*) = 0 from auth.users where id = '00000000-0000-4000-8000-000000000004'), 'Failed signup is atomic');
set role anon;
select pg_temp.check_true(not public.is_username_available(' ALICE '), 'Availability ignores case and spaces');
select pg_temp.check_true(public.is_username_available('available'), 'Available name');
select pg_temp.check_true(not public.is_username_available(null) and not public.is_username_available('a%'), 'Invalid candidates');
select pg_temp.expect_error('select * from public.username_changes', '%permission denied%');
reset role;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000003';
insert into public.profiles(user_id, username, updated_at) values (auth.uid(), 'Legacy', 1);
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
select pg_temp.expect_error($q$update public.profiles set username = 'bob' where user_id = auth.uid()$q$, '%duplicate key%');
update public.profiles set username = 'Alice_one' where user_id = auth.uid();
update public.profiles set username = 'Alice_two' where user_id = auth.uid();
select pg_temp.expect_error($q$update public.profiles set username = 'Alice_three', updated_at = 0 where user_id = auth.uid()$q$, 'You can change your username twice%');
-- The Settings upsert and unrelated saves remain usable at the limit.
insert into public.profiles(user_id,username,updated_at) values(auth.uid(),'Alice_two',123)
on conflict(user_id) do update set username = excluded.username, updated_at = excluded.updated_at;
update public.profiles set avatar_storage_path = null where user_id = auth.uid();
select pg_temp.expect_error('delete from public.username_changes', '%permission denied%');
select pg_temp.expect_error($q$insert into public.username_changes(user_id) values(auth.uid())$q$, '%permission denied%');
select pg_temp.expect_error('delete from public.profiles where user_id = auth.uid()', '%permission denied%');
update public.profiles set username = 'Stolen' where user_id = '00000000-0000-4000-8000-000000000002';
reset role;
select pg_temp.check_true((select username = 'Bob' from public.profiles where user_id = '00000000-0000-4000-8000-000000000002'), 'Cannot change another profile');
select pg_temp.check_true((select count(*) = 2 from public.username_changes), 'Failed and unchanged saves never consume quota');
-- Expire only the first change: one new change becomes available, not two.
update public.username_changes set changed_at = clock_timestamp() - interval '15 days'
where ctid = (select ctid from public.username_changes order by changed_at limit 1);
set role authenticated;
update public.profiles set username = 'Alice_three' where user_id = auth.uid();
select pg_temp.expect_error($q$update public.profiles set username = 'Alice_four' where user_id = auth.uid()$q$, 'You can change your username twice%');
reset role;
\echo PASS: signup profiles, uniqueness, rolling limits, Settings upsert, and permissions
