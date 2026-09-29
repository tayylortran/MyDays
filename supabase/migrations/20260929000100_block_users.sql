begin;

create table public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index user_blocks_target_idx on public.user_blocks(blocked_id, blocker_id);
alter table public.user_blocks enable row level security;
revoke all on public.user_blocks from public, anon, authenticated;

-- Internal helpers: callers cannot inspect arbitrary pairs or hold their locks.
create function public.lock_friend_pair(p_a uuid, p_b uuid) returns void
language sql security definer set search_path = '' as $$
  select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    least(p_a, p_b)::text || ':' || greatest(p_a, p_b)::text, 0));
$$;
create function public.friend_pair_blocked(p_a uuid, p_b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.user_blocks b
    where (b.blocker_id = p_a and b.blocked_id = p_b)
      or (b.blocker_id = p_b and b.blocked_id = p_a));
$$;
revoke all on function public.lock_friend_pair(uuid, uuid) from public, anon, authenticated;
revoke all on function public.friend_pair_blocked(uuid, uuid) from public, anon, authenticated;

create function public.block_user(p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  if actor is null then raise exception 'Sign in to manage blocked users.' using errcode = '42501'; end if;
  if p_user_id is null or p_user_id = actor then raise exception 'Choose another user.'; end if;
  perform public.lock_friend_pair(actor, p_user_id);
  if not exists(select 1 from public.profiles where user_id = p_user_id) then
    raise exception 'This user is unavailable.';
  end if;
  insert into public.user_blocks(blocker_id, blocked_id) values (actor, p_user_id)
    on conflict (blocker_id, blocked_id) do nothing;
  -- Covers both accepted friendships and requests in either direction.
  delete from public.friendships f
    where least(f.requester_id, f.recipient_id) = least(actor, p_user_id)
      and greatest(f.requester_id, f.recipient_id) = greatest(actor, p_user_id);
end;
$$;

create function public.unblock_user(p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  if actor is null then raise exception 'Sign in to manage blocked users.' using errcode = '42501'; end if;
  if p_user_id is null or p_user_id = actor then raise exception 'Choose another user.'; end if;
  perform public.lock_friend_pair(actor, p_user_id);
  delete from public.user_blocks where blocker_id = actor and blocked_id = p_user_id;
  -- Unblocking never restores an old friendship or removes the other user's block.
end;
$$;

create function public.list_blocked_users(p_limit integer default 50, p_offset integer default 0)
returns table(user_id uuid, username text, blocked_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  if actor is null then raise exception 'Sign in to view blocked users.' using errcode = '42501'; end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 or p_offset is null or p_offset < 0 then
    raise exception 'Invalid blocked users page.';
  end if;
  return query select p.user_id, p.username, b.created_at
    from public.user_blocks b join public.profiles p on p.user_id = b.blocked_id
    where b.blocker_id = actor order by lower(p.username), p.user_id
    limit p_limit offset p_offset;
end;
$$;

create or replace function public.send_friend_request(p_recipient_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  request_id uuid;
begin
  if actor is null then raise exception 'Sign in to manage friends.'; end if;
  if p_recipient_id is null or actor = p_recipient_id then raise exception 'Choose another user.'; end if;
  -- Lock before any relationship row lock. Concurrent block/send/accept calls
  -- therefore cannot leave a friendship behind after a committed block.
  perform public.lock_friend_pair(actor, p_recipient_id);
  if public.friend_pair_blocked(actor, p_recipient_id) then raise exception 'This user is unavailable.'; end if;
  if not exists(select 1 from public.profiles where user_id = actor) then
    raise exception 'Set your username before adding friends.';
  end if;
  if not exists(select 1 from public.profiles where user_id = p_recipient_id) then
    raise exception 'This user is unavailable.';
  end if;
  insert into public.friendships as f(requester_id, recipient_id) values (actor, p_recipient_id)
    on conflict (least(requester_id, recipient_id), greatest(requester_id, recipient_id))
    do update set requester_id = f.requester_id returning id into request_id;
  return request_id;
end;
$$;

create or replace function public.accept_friend_request(p_friendship_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  sender uuid;
begin
  if actor is null then raise exception 'Sign in to manage friends.'; end if;
  select requester_id into sender from public.friendships
    where id = p_friendship_id and recipient_id = actor;
  if sender is null then raise exception 'This incoming request is unavailable.'; end if;
  perform public.lock_friend_pair(actor, sender);
  if public.friend_pair_blocked(actor, sender) then raise exception 'This incoming request is unavailable.'; end if;
  update public.friendships set status = 'accepted', accepted_at = coalesce(accepted_at, now())
    where id = p_friendship_id and recipient_id = actor;
  if not found then raise exception 'This incoming request is unavailable.'; end if;
end;
$$;

create or replace function public.find_friend_by_username(p_username text)
returns table(user_id uuid, username text, friendship_id uuid, relationship text)
language plpgsql stable security definer set search_path = '' as $$
declare actor uuid := auth.uid();
begin
  if actor is null then raise exception 'Sign in to find friends.'; end if;
  if p_username is null or btrim(p_username) !~ '^[A-Za-z0-9_.]{3,30}$' then
    raise exception 'Enter a username with 3 to 30 letters, numbers, underscores, or periods.';
  end if;
  return query select p.user_id, p.username,
    case when own_block.blocked_id is not null then null::uuid else f.id end,
    case when own_block.blocked_id is not null then 'blocked'
      when f.status = 'accepted' then 'friends'
      when f.recipient_id = actor then 'incoming'
      when f.requester_id = actor then 'outgoing'
      else 'none' end
    from public.profiles p
    left join public.user_blocks own_block on own_block.blocker_id = actor and own_block.blocked_id = p.user_id
    left join public.friendships f on
      least(f.requester_id, f.recipient_id) = least(actor, p.user_id)
      and greatest(f.requester_id, f.recipient_id) = greatest(actor, p.user_id)
    where lower(p.username) = lower(btrim(p_username)) and p.user_id <> actor
      -- Own blocks remain discoverable for unblocking, including mutual blocks.
      and (own_block.blocked_id is not null or not exists(
        select 1 from public.user_blocks reverse_block
        where reverse_block.blocker_id = p.user_id and reverse_block.blocked_id = actor));
end;
$$;

create or replace function public.is_my_friend(p_user_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and not public.friend_pair_blocked(auth.uid(), p_user_id)
    and exists(select 1 from public.friendships f where f.status = 'accepted'
      and least(f.requester_id, f.recipient_id) = least(auth.uid(), p_user_id)
      and greatest(f.requester_id, f.recipient_id) = greatest(auth.uid(), p_user_id)
      and p_user_id <> auth.uid());
$$;

revoke all on function public.block_user(uuid) from public, anon, authenticated;
revoke all on function public.unblock_user(uuid) from public, anon, authenticated;
revoke all on function public.list_blocked_users(integer, integer) from public, anon, authenticated;
grant execute on function public.block_user(uuid) to authenticated;
grant execute on function public.unblock_user(uuid) to authenticated;
grant execute on function public.list_blocked_users(integer, integer) to authenticated;

commit;
