-- Fresh-database setup. Already-applied projects do not rerun this combined migration.
begin;

create table public.photo_file_cleanup (
  path text primary key,
  user_id uuid not null references auth.users(id) on delete cascade
);
alter table public.photo_file_cleanup enable row level security;
revoke all on public.photo_file_cleanup from anon, authenticated;
grant select, delete on public.photo_file_cleanup to authenticated;
create policy "Owners process their file cleanup" on public.photo_file_cleanup
  for all to authenticated using (user_id = (select auth.uid()));

create function public.queue_deleted_photo_files() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Account deletion has separate bucket cleanup; do not block its FK cascade.
  if not exists (select 1 from auth.users where id = old.user_id) then return old; end if;
  insert into public.photo_file_cleanup(path, user_id)
    select path, old.user_id from unnest(array[old.storage_path, old.thumb_storage_path]) path
    where path is not null on conflict do nothing;
  return old;
end;
$$;
revoke all on function public.queue_deleted_photo_files() from public, anon, authenticated;
create trigger queue_deleted_photo_files after delete on public.photos
  for each row execute function public.queue_deleted_photo_files();

-- Upload files first, then save all database changes in this single transaction.
create function public.save_hangout_with_photos(p_id uuid, p_input jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_h public.hangouts;
  v_photo jsonb;
  v_id uuid;
  v_photo_id uuid;
  v_path text;
  v_thumb text;
  v_sort integer := 0;
  v_now bigint := floor(extract(epoch from clock_timestamp()) * 1000);
  v_retained uuid[];
  v_result jsonb;
begin
  if v_uid is null then raise exception 'Sign in first.'; end if;
  if p_id is null then raise exception 'Missing upload folder ID.'; end if;
  if p_input->>'mode' is null or p_input->>'mode' not in ('create', 'edit')
    or jsonb_typeof(p_input->'photos') is distinct from 'array'
    or nullif(btrim(p_input->'hangout'->>'title'), '') is null then
    raise exception 'Invalid hangout draft.';
  end if;
  if jsonb_array_length(p_input->'photos') > 5 then raise exception 'Choose up to 5 photos.'; end if;
  if exists (select 1 from jsonb_array_elements(p_input->'photos') p
    where p->>'kind' is null or p->>'kind' not in ('new', 'existing') or p->>'id' is null)
    or (select count(distinct (p->>'id')::uuid) from jsonb_array_elements(p_input->'photos') p)
      <> jsonb_array_length(p_input->'photos') then raise exception 'Invalid or duplicate photo.'; end if;
  v_id := (p_input->'hangout'->>'id')::uuid;
  select * into v_h from public.hangouts where id = v_id and user_id = v_uid for update;
  if p_input->>'mode' = 'create' then
    insert into public.hangouts(id, user_id, date, title, note, circle_id, updated_at)
    values(v_id, v_uid, (p_input->'hangout'->>'date')::date,
      btrim(p_input->'hangout'->>'title'), btrim(coalesce(p_input->'hangout'->>'note', '')),
      (p_input->'hangout'->>'circleId')::uuid, v_now) returning * into v_h;
  else
    if v_h.id is null then raise exception 'This hangout is unavailable.'; end if;
    if v_h.date is distinct from (p_input->'hangout'->>'date')::date then raise exception 'The hangout date cannot be changed.'; end if;
    if v_h.updated_at is distinct from (p_input->'hangout'->>'updatedAt')::bigint then
      raise exception 'This hangout changed. Reopen it before editing.';
    end if;
    update public.hangouts set title = btrim(p_input->'hangout'->>'title'),
      note = btrim(coalesce(p_input->'hangout'->>'note', '')),
      circle_id = (p_input->'hangout'->>'circleId')::uuid,
      updated_at = greatest(v_now, updated_at + 1)
      where id = v_id and user_id = v_uid returning * into v_h;
  end if;
  select coalesce(array_agg((p->>'id')::uuid), '{}'::uuid[]) into v_retained
    from jsonb_array_elements(p_input->'photos') p where p->>'kind' = 'existing';
  if (select count(*) from public.photos where user_id = v_uid and hangout_id = v_id and id = any(v_retained))
    <> cardinality(v_retained) then raise exception 'A selected photo no longer belongs to this hangout.'; end if;
  delete from public.photos where user_id = v_uid and hangout_id = v_id and not (id = any(v_retained));
  -- Retained photos preserve their order; new photos append in selection order.
  for v_photo in select to_jsonb(p) from public.photos p where user_id = v_uid and hangout_id = v_id order by sort, id loop
    update public.photos set sort = v_sort where id = (v_photo->>'id')::uuid;
    v_sort := v_sort + 1;
  end loop;
  for v_photo in select value from jsonb_array_elements(p_input->'photos') where value->>'kind' = 'new' loop
    v_photo_id := (v_photo->>'id')::uuid;
    v_path := v_uid::text || '/' || p_id::text || '/' || v_photo_id::text || '/image.jpg';
    v_thumb := v_uid::text || '/' || p_id::text || '/' || v_photo_id::text || '/thumb.jpg';
    if (select count(*) from storage.objects where bucket_id = 'photos' and name in (v_path, v_thumb)) <> 2 then
      raise exception 'A photo upload is incomplete.';
    end if;
    if exists (select 1 from public.photo_file_cleanup where path in (v_path, v_thumb)) then
      raise exception 'These files are scheduled for deletion. Choose the photo again.';
    end if;
    insert into public.photos(id, user_id, hangout_id, storage_path, thumb_storage_path, sort, updated_at)
      values(v_photo_id, v_uid, v_id, v_path, v_thumb, v_sort, v_h.updated_at);
    v_sort := v_sort + 1;
  end loop;
  select jsonb_build_object('hangout', jsonb_build_object('id', v_h.id, 'date', v_h.date,
    'title', v_h.title, 'note', v_h.note, 'circleId', v_h.circle_id, 'updatedAt', v_h.updated_at),
    'photos', coalesce(jsonb_agg(to_jsonb(p) - 'user_id' order by p.sort, p.id) filter (where p.id is not null), '[]'::jsonb))
    into v_result from public.photos p where p.hangout_id = v_id and p.user_id = v_uid;
  return v_result;
end;
$$;
revoke all on function public.save_hangout_with_photos(uuid, jsonb) from public, anon;
grant execute on function public.save_hangout_with_photos(uuid, jsonb) to authenticated;

-- All photo additions/reorders go through the transaction above.
revoke insert, update on public.photos from authenticated;
revoke update(sort, updated_at) on public.photos from authenticated;

commit;
