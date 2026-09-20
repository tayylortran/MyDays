begin;

-- The server determines today in the viewer's time zone. There is no date
-- parameter that could be used to retrieve historical hangout titles.
create function public.get_friends_today(p_timezone text, p_limit integer default 50, p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  today date;
  result jsonb;
begin
  if actor is null then raise exception 'Sign in to view friends.' using errcode = '42501'; end if;
  if p_timezone is null or not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception 'Choose a valid time zone.';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 100 or p_offset is null or p_offset < 0 then
    raise exception 'Invalid feed page.';
  end if;
  today := (now() at time zone p_timezone)::date;
  with my_friends as materialized (
    select p.user_id, p.username, p.avatar_storage_path
    from public.friendships f join public.profiles p
      on p.user_id = case when f.requester_id = actor then f.recipient_id else f.requester_id end
    where f.status = 'accepted' and actor in (f.requester_id, f.recipient_id)
  ), page as (
    select * from my_friends order by lower(username), user_id limit p_limit offset p_offset
  )
  select jsonb_build_object(
    'date', today, 'friend_count', (select count(*) from my_friends),
    'friends', coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id', p.user_id, 'username', p.username, 'avatar_storage_path', p.avatar_storage_path,
        'cover', case when photo.id is null or h.id is null then null else jsonb_build_object(
          'id', photo.id, 'date', face.date, 'title', h.title,
          'storage_path', photo.storage_path, 'thumb_storage_path', photo.thumb_storage_path,
          'updated_at', face.updated_at
        ) end
      ) order by lower(p.username), p.user_id)
      from page p
      left join public.day_faces face on face.user_id = p.user_id and face.date = today
      left join public.photos photo on photo.user_id = face.user_id and photo.id = face.photo_id
      left join public.hangouts h on h.user_id = photo.user_id and h.id = photo.hangout_id and h.date = today
    ), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

revoke all on function public.get_friends_today(text, integer, integer) from public, anon, authenticated;
grant execute on function public.get_friends_today(text, integer, integer) to authenticated;

-- Existing profile responses and raw table policies are unchanged.
commit;
