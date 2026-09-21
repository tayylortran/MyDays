-- Apply before shipping the signup form that supplies username metadata.
begin;

create table public.username_changes (
  user_id uuid not null references auth.users(id) on delete cascade,
  changed_at timestamptz not null default clock_timestamp()
);
create index username_changes_recent on public.username_changes(user_id, changed_at);
alter table public.username_changes enable row level security;
revoke all on public.username_changes from public, anon, authenticated;

create function public.limit_username_changes()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  change_count integer;
  oldest_change timestamptz;
  server_time timestamptz := clock_timestamp();
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'Profile ownership cannot be changed.';
  end if;
  if new.username is not distinct from old.username then
    return new;
  end if;
  -- UPDATE holds the profile row lock; concurrent changes for this user serialize.
  select count(*), min(changed_at) into change_count, oldest_change
  from public.username_changes
  where user_id = old.user_id and changed_at > server_time - interval '14 days';
  if change_count >= 2 then
    raise exception 'You can change your username twice in any 14-day period. Try again after % UTC.',
      to_char((oldest_change + interval '14 days') at time zone 'UTC', 'Mon DD, YYYY HH24:MI:SS');
  end if;
  insert into public.username_changes(user_id, changed_at) values (old.user_id, server_time);
  return new;
end;
$$;
revoke all on function public.limit_username_changes() from public, anon, authenticated;
create trigger limit_username_changes before update on public.profiles
for each row execute function public.limit_username_changes();

create function public.create_signup_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  chosen_username text := btrim(new.raw_user_meta_data ->> 'username');
begin
  if chosen_username is null or chosen_username !~ '^[A-Za-z0-9_.]{3,30}$' then
    raise exception 'Choose a username with 3 to 30 letters, numbers, underscores, or periods.';
  end if;
  insert into public.profiles(user_id, username, updated_at)
  values (new.id, chosen_username, (extract(epoch from clock_timestamp()) * 1000)::bigint);
  return new;
end;
$$;
revoke all on function public.create_signup_profile() from public, anon, authenticated;
create trigger create_signup_profile after insert on auth.users
for each row execute function public.create_signup_profile();

-- Only exposes whether a specific valid username is available, never profile data.
create function public.is_username_available(candidate text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(btrim(candidate) ~ '^[A-Za-z0-9_.]{3,30}$', false)
    and not exists(select 1 from public.profiles where lower(username) = lower(btrim(candidate)));
$$;
revoke all on function public.is_username_available(text) from public, anon, authenticated;
grant execute on function public.is_username_available(text) to anon, authenticated;

commit;
