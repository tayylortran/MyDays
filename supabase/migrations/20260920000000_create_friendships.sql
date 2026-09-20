begin;

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  check (requester_id <> recipient_id),
  check ((status = 'pending' and accepted_at is null)
    or (status = 'accepted' and accepted_at is not null))
);

-- A pair has one relationship, regardless of which person sent the request.
create unique index friendships_pair_unique on public.friendships
  (least(requester_id, recipient_id), greatest(requester_id, recipient_id));
create index friendships_requester on public.friendships(requester_id, status, created_at desc, id);
create index friendships_recipient on public.friendships(recipient_id, status, created_at desc, id);

alter table public.friendships enable row level security;
revoke all on public.friendships from public, anon, authenticated;
grant select on public.friendships to authenticated;
create policy "Participants read their own friendships" on public.friendships
  for select to authenticated
  using ((select auth.uid()) in (requester_id, recipient_id));

-- Writes use narrow functions so clients cannot change participants, forge an
-- accepted relationship, or accept their own outgoing request.
create function public.send_friend_request(p_recipient_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  request_id uuid;
begin
  if actor is null then raise exception 'Sign in to manage friends.'; end if;
  if p_recipient_id is null or actor = p_recipient_id then
    raise exception 'Choose another user.';
  end if;
  if not exists (select 1 from public.profiles where user_id = actor) then
    raise exception 'Set your username before adding friends.';
  end if;
  if not exists (select 1 from public.profiles where user_id = p_recipient_id) then
    raise exception 'This user is unavailable.';
  end if;

  insert into public.friendships as f(requester_id, recipient_id)
    values (actor, p_recipient_id)
    on conflict (least(requester_id, recipient_id), greatest(requester_id, recipient_id))
    do update set requester_id = f.requester_id
    returning id into request_id;
  -- A retry or a request in the opposite direction returns the existing request.
  -- It never accepts a pending request automatically.
  return request_id;
end;
$$;

create function public.accept_friend_request(p_friendship_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  if actor is null then raise exception 'Sign in to manage friends.'; end if;
  update public.friendships
    set status = 'accepted', accepted_at = coalesce(accepted_at, now())
    where id = p_friendship_id and recipient_id = actor;
  if not found then raise exception 'This incoming request is unavailable.'; end if;
end;
$$;

create function public.end_friendship(p_friendship_id uuid, p_action text) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  if actor is null then raise exception 'Sign in to manage friends.'; end if;
  if p_action is null or p_action not in ('decline', 'cancel', 'remove') then
    raise exception 'Choose decline, cancel, or remove.';
  end if;
  delete from public.friendships where id = p_friendship_id and (
    (p_action = 'decline' and status = 'pending' and recipient_id = actor)
    or (p_action = 'cancel' and status = 'pending' and requester_id = actor)
    or (p_action = 'remove' and status = 'accepted' and actor in (requester_id, recipient_id))
  );
  if not found then raise exception 'This relationship changed. Refresh your friends and try again.'; end if;
end;
$$;

-- Expose only an exact username match, not profiles, hangouts, or photo records.
create function public.find_friend_by_username(p_username text)
returns table(user_id uuid, username text, friendship_id uuid, relationship text)
language plpgsql stable security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  if actor is null then raise exception 'Sign in to find friends.'; end if;
  if p_username is null or btrim(p_username) !~ '^[A-Za-z0-9_.]{3,30}$' then
    raise exception 'Enter a username with 3 to 30 letters, numbers, underscores, or periods.';
  end if;
  return query select p.user_id, p.username, f.id,
    case when f.status = 'accepted' then 'friends'
      when f.recipient_id = actor then 'incoming'
      when f.requester_id = actor then 'outgoing'
      else 'none' end
    from public.profiles p
    left join public.friendships f on
      least(f.requester_id, f.recipient_id) = least(actor, p.user_id)
      and greatest(f.requester_id, f.recipient_id) = greatest(actor, p.user_id)
    where lower(p.username) = lower(btrim(p_username)) and p.user_id <> actor;
end;
$$;

create function public.list_my_friendships(p_kind text, p_limit integer default 50, p_offset integer default 0)
returns table(friendship_id uuid, user_id uuid, username text, created_at timestamptz, accepted_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  if actor is null then raise exception 'Sign in to view friends.'; end if;
  if p_kind is null or p_kind not in ('friends', 'incoming', 'outgoing') then
    raise exception 'Choose friends, incoming, or outgoing.';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 or p_offset is null or p_offset < 0 then
    raise exception 'Invalid friends page.';
  end if;
  return query select f.id, p.user_id, p.username, f.created_at, f.accepted_at
    from public.friendships f join public.profiles p
      on p.user_id = case when f.requester_id = actor then f.recipient_id else f.requester_id end
    where (p_kind = 'friends' and f.status = 'accepted' and actor in (f.requester_id, f.recipient_id))
      or (p_kind = 'incoming' and f.status = 'pending' and f.recipient_id = actor)
      or (p_kind = 'outgoing' and f.status = 'pending' and f.requester_id = actor)
    order by lower(p.username), p.user_id
    limit p_limit offset p_offset;
end;
$$;

revoke all on function public.send_friend_request(uuid) from public, anon, authenticated;
revoke all on function public.accept_friend_request(uuid) from public, anon, authenticated;
revoke all on function public.end_friendship(uuid, text) from public, anon, authenticated;
revoke all on function public.find_friend_by_username(text) from public, anon, authenticated;
revoke all on function public.list_my_friendships(text, integer, integer) from public, anon, authenticated;
grant execute on function public.send_friend_request(uuid) to authenticated;
grant execute on function public.accept_friend_request(uuid) to authenticated;
grant execute on function public.end_friendship(uuid, text) to authenticated;
grant execute on function public.find_friend_by_username(text) to authenticated;
grant execute on function public.list_my_friendships(text, integer, integer) to authenticated;

-- Shared covers, feed titles, and avatar file access will be added separately.
-- Existing profile, hangout, photo, and storage policies remain owner-only.
commit;
