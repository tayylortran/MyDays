begin;

create function public.is_my_friend(p_user_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.friendships f where f.status = 'accepted'
      and least(f.requester_id, f.recipient_id) = least(auth.uid(), p_user_id)
      and greatest(f.requester_id, f.recipient_id) = greatest(auth.uid(), p_user_id)
      and p_user_id <> auth.uid()
  );
$$;

-- This API deliberately does not return hangout IDs, titles, notes, circles,
-- or unselected photos. Raw table policies stay owner-only.
create function public.get_friend_profile(p_user_id uuid, p_month text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  month_start date;
  result jsonb;
begin
  if not public.is_my_friend(p_user_id) then
    raise exception 'This profile is only available to accepted friends.' using errcode = '42501';
  end if;
  if p_month is null or p_month !~ '^\d{4}-(0[1-9]|1[0-2])$' or left(p_month, 4) = '0000' then
    raise exception 'Use a month in YYYY-MM format.';
  end if;
  month_start := (p_month || '-01')::date;
  select jsonb_build_object(
    'user_id', p.user_id, 'username', p.username, 'avatar_storage_path', p.avatar_storage_path,
    'total_photos', (select count(*) from public.day_faces f where f.user_id = p_user_id),
    'covers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'date', f.date, 'id', photo.id, 'storage_path', photo.storage_path,
        'thumb_storage_path', photo.thumb_storage_path
      ) order by f.date)
      from public.day_faces f join public.photos photo on photo.user_id = f.user_id and photo.id = f.photo_id
      where f.user_id = p_user_id and f.date >= month_start and f.date < month_start + interval '1 month'
    ), '[]'::jsonb)
  ) into result from public.profiles p where p.user_id = p_user_id;
  if result is null then raise exception 'This profile is unavailable.' using errcode = '42501'; end if;
  return result;
end;
$$;

-- Check the exact currently shared file, not an entire user's storage folder.
create function public.can_read_friend_profile_file(p_path text) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    exists (
      select 1 from public.photos p join public.day_faces f on f.user_id = p.user_id and f.photo_id = p.id
      where (p.storage_path = p_path or p.thumb_storage_path = p_path) and public.is_my_friend(p.user_id)
    ) or exists (
      select 1 from public.profiles p where p.avatar_storage_path = p_path and public.is_my_friend(p.user_id)
    )
  );
$$;

revoke all on function public.is_my_friend(uuid) from public, anon, authenticated;
revoke all on function public.get_friend_profile(uuid, text) from public, anon, authenticated;
revoke all on function public.can_read_friend_profile_file(text) from public, anon, authenticated;
grant execute on function public.get_friend_profile(uuid, text) to authenticated;
grant execute on function public.can_read_friend_profile_file(text) to authenticated;

create policy "Accepted friends read selected profile files" on storage.objects
  for select to authenticated
  using (bucket_id = 'photos' and public.can_read_friend_profile_file(name));

commit;
