begin;

-- A durable receipt makes retrying or canceling an uncertain save safe.
create table public.hangout_saves (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  input jsonb not null,
  state text not null default 'pending' check (state in ('pending', 'saved', 'canceled')),
  result jsonb,
  created_at timestamptz not null default now()
);
create index hangout_saves_user_idx on public.hangout_saves(user_id);
alter table public.hangout_saves enable row level security;
revoke all on public.hangout_saves from anon, authenticated;

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

create function public.begin_hangout_save(p_id uuid, p_input jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_old public.hangout_saves;
begin
  if v_uid is null then raise exception 'Sign in first.'; end if;
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
  insert into public.hangout_saves(id, user_id, input) values(p_id, v_uid, p_input)
    on conflict do nothing;
  select * into v_old from public.hangout_saves where id = p_id;
  if v_old.user_id <> v_uid or v_old.input <> p_input then raise exception 'Save ID already used.'; end if;
  if v_old.state <> 'pending' then raise exception 'This save has already finished.'; end if;
end;
$$;

create function public.finish_hangout_save(p_id uuid, p_cancel boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_op public.hangout_saves;
  v_h public.hangouts;
  v_input jsonb;
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
  -- Commit and cancel serialize on this row: cleanup can never race a commit.
  select * into v_op from public.hangout_saves where id = p_id and user_id = v_uid for update;
  if not found then
    if p_cancel and not exists (select 1 from public.hangout_saves where id = p_id) then return null; end if;
    raise exception 'Save unavailable.';
  end if;
  if v_op.state = 'saved' then return v_op.result; end if;
  if v_op.state = 'canceled' then
    if p_cancel then return null; end if;
    raise exception 'This save was canceled. Reopen the hangout.';
  end if;
  v_input := v_op.input;
  if p_cancel then
    for v_photo in select value from jsonb_array_elements(v_input->'photos') where value->>'kind' = 'new' loop
      v_path := v_uid::text || '/' || p_id::text || '/' || (v_photo->>'id')::uuid::text;
      insert into public.photo_file_cleanup(path, user_id) values
        (v_path || '/image.jpg', v_uid), (v_path || '/thumb.jpg', v_uid) on conflict do nothing;
    end loop;
    update public.hangout_saves set state = 'canceled' where id = p_id;
    return null;
  end if;

  v_id := (v_input->'hangout'->>'id')::uuid;
  select * into v_h from public.hangouts where id = v_id and user_id = v_uid for update;
  if v_input->>'mode' = 'create' then
    insert into public.hangouts(id, user_id, date, title, note, circle_id, updated_at)
    values(v_id, v_uid, (v_input->'hangout'->>'date')::date,
      btrim(v_input->'hangout'->>'title'), btrim(coalesce(v_input->'hangout'->>'note', '')),
      (v_input->'hangout'->>'circleId')::uuid, v_now) returning * into v_h;
  else
    if v_h.id is null then raise exception 'This hangout is unavailable.'; end if;
    if v_h.date is distinct from (v_input->'hangout'->>'date')::date then raise exception 'The hangout date cannot be changed.'; end if;
    if v_h.updated_at is distinct from (v_input->'hangout'->>'updatedAt')::bigint then
      raise exception 'This hangout changed. Reopen it before editing.';
    end if;
    update public.hangouts set title = btrim(v_input->'hangout'->>'title'),
      note = btrim(coalesce(v_input->'hangout'->>'note', '')),
      circle_id = (v_input->'hangout'->>'circleId')::uuid,
      updated_at = greatest(v_now, updated_at + 1)
      where id = v_id and user_id = v_uid returning * into v_h;
  end if;
  select coalesce(array_agg((p->>'id')::uuid), '{}'::uuid[]) into v_retained
    from jsonb_array_elements(v_input->'photos') p where p->>'kind' = 'existing';
  if (select count(*) from public.photos where user_id = v_uid and hangout_id = v_id and id = any(v_retained))
    <> cardinality(v_retained) then raise exception 'A selected photo no longer belongs to this hangout.'; end if;
  delete from public.photos where user_id = v_uid and hangout_id = v_id and not (id = any(v_retained));
  -- Retained photos preserve their order; new photos append in selection order.
  for v_photo in select to_jsonb(p) from public.photos p where user_id = v_uid and hangout_id = v_id order by sort, id loop
    update public.photos set sort = v_sort where id = (v_photo->>'id')::uuid;
    v_sort := v_sort + 1;
  end loop;
  for v_photo in select value from jsonb_array_elements(v_input->'photos') where value->>'kind' = 'new' loop
    v_photo_id := (v_photo->>'id')::uuid;
    v_path := v_uid::text || '/' || p_id::text || '/' || v_photo_id::text || '/image.jpg';
    v_thumb := v_uid::text || '/' || p_id::text || '/' || v_photo_id::text || '/thumb.jpg';
    if (select count(*) from storage.objects where bucket_id = 'photos' and name in (v_path, v_thumb)) <> 2 then
      raise exception 'A photo upload is incomplete.';
    end if;
    insert into public.photos(id, user_id, hangout_id, storage_path, thumb_storage_path, sort, updated_at)
      values(v_photo_id, v_uid, v_id, v_path, v_thumb, v_sort, v_h.updated_at);
    v_sort := v_sort + 1;
  end loop;
  select jsonb_build_object('hangout', jsonb_build_object('id', v_h.id, 'date', v_h.date,
    'title', v_h.title, 'note', v_h.note, 'circleId', v_h.circle_id, 'updatedAt', v_h.updated_at),
    'photos', coalesce(jsonb_agg(to_jsonb(p) - 'user_id' order by p.sort, p.id) filter (where p.id is not null), '[]'::jsonb))
    into v_result from public.photos p where p.hangout_id = v_id and p.user_id = v_uid;
  update public.hangout_saves set state = 'saved', result = v_result where id = p_id;
  return v_result;
end;
$$;

-- All photo additions/reorders go through the transaction above.
revoke insert, update on public.photos from authenticated;
revoke update(sort, updated_at) on public.photos from authenticated;
revoke all on function public.begin_hangout_save(uuid, jsonb) from public, anon;
revoke all on function public.finish_hangout_save(uuid, boolean) from public, anon;
grant execute on function public.begin_hangout_save(uuid, jsonb) to authenticated;
grant execute on function public.finish_hangout_save(uuid, boolean) to authenticated;

commit;
