-- Run ONLY in an empty, disposable local PostgreSQL database (not Supabase).
-- Reuse the existing schema setup and run the existing save regressions first.
\set ON_ERROR_STOP on
\ir test-combined-save.sql

insert into auth.users values ('00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-8000-000000000002');
insert into public.circles(id, user_id, name, color, updated_at)
select id, id, 'Circle', '#123456', 1 from auth.users;

-- Generate uploaded-file fixtures, then exercise the real atomic save RPC.
create function public.test_save_day(p_date date, p_photos jsonb,
  p_hangout jsonb default null, p_missing uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_op uuid := gen_random_uuid();
  v_photo jsonb;
begin
  for v_photo in select value from jsonb_array_elements(p_photos)
    where value->>'kind' = 'new' loop
    if (v_photo->>'id')::uuid is distinct from p_missing then
      insert into storage.objects(bucket_id, name)
        select 'photos', auth.uid()::text || '/' || v_op::text || '/' ||
          (v_photo->>'id') || '/' || file
        from (values ('image.jpg'), ('thumb.jpg')) f(file);
    end if;
  end loop;
  return public.save_hangout_with_photos(v_op, jsonb_build_object(
    'mode', case when p_hangout is null then 'create' else 'edit' end,
    'hangout', coalesce(p_hangout, jsonb_build_object('id', gen_random_uuid(),
      'date', p_date, 'title', 'Test hangout', 'note', '', 'circleId', auth.uid(), 'updatedAt', 1)),
    'photos', p_photos));
end;
$$;

set role authenticated;
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000001';
-- Legacy blank date and legacy selected date must both survive the migration.
select public.test_save_day('2026-09-01', '[{"kind":"new","id":"00000000-0000-4000-8000-000000000101"}]');
select public.test_save_day('2026-09-02', '[{"kind":"new","id":"00000000-0000-4000-8000-000000000102"}]');
insert into public.day_faces(date, photo_id, updated_at)
  values ('2026-09-02', '00000000-0000-4000-8000-000000000102', 1);
reset role;
\ir ../supabase/migrations/20260929000000_auto_day_faces.sql

set role authenticated;
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  d uuid := gen_random_uuid();
  saved jsonb;
  edited jsonb;
  empty_day jsonb;
begin
  if exists(select 1 from public.day_faces where date = '2026-09-01')
    or (select photo_id from public.day_faces where date = '2026-09-02')
      is distinct from '00000000-0000-4000-8000-000000000102'::uuid then
    raise exception 'Migration changed existing covers';
  end if;
  perform public.test_save_day('2026-09-01', jsonb_build_array(jsonb_build_object('kind','new','id',gen_random_uuid())));
  perform public.test_save_day('2026-09-02', jsonb_build_array(jsonb_build_object('kind','new','id',gen_random_uuid())));
  if exists(select 1 from public.day_faces where date = '2026-09-01')
    or (select photo_id from public.day_faces where date = '2026-09-02')
      is distinct from '00000000-0000-4000-8000-000000000102'::uuid then
    raise exception 'Later upload changed legacy state';
  end if;

  empty_day := public.test_save_day('2026-09-29', '[]');
  if exists(select 1 from public.day_faces where date = '2026-09-29') then
    raise exception 'Empty hangout got a cover';
  end if;
  saved := public.test_save_day('2026-09-29', jsonb_build_array(
    jsonb_build_object('kind','new','id',a), jsonb_build_object('kind','new','id',b)), empty_day->'hangout');
  if (select photo_id from public.day_faces where date = '2026-09-29') is distinct from a then
    raise exception 'First selected photo did not become the cover';
  end if;
  edited := public.test_save_day('2026-09-29', jsonb_build_array(
    jsonb_build_object('kind','existing','id',a), jsonb_build_object('kind','existing','id',b),
    jsonb_build_object('kind','new','id',c)), saved->'hangout');
  perform public.test_save_day('2026-09-29', jsonb_build_array(jsonb_build_object('kind','new','id',d)));
  if (select photo_id from public.day_faces where date = '2026-09-29') is distinct from a then
    raise exception 'Append or second hangout replaced cover';
  end if;

  -- Use the same upsert/delete operations as the profile picker.
  insert into public.day_faces(date, photo_id, updated_at) values ('2026-09-29', b, 2)
    on conflict(user_id,date) do update set photo_id = excluded.photo_id;
  perform public.test_save_day('2026-09-29', jsonb_build_array(jsonb_build_object('kind','new','id',gen_random_uuid())));
  if (select photo_id from public.day_faces where date = '2026-09-29') is distinct from b then
    raise exception 'Manual cover replaced';
  end if;
  delete from public.day_faces where date = '2026-09-29';
  perform public.test_save_day('2026-09-29', jsonb_build_array(jsonb_build_object('kind','new','id',gen_random_uuid())));
  if exists(select 1 from public.day_faces where date = '2026-09-29') then
    raise exception 'Removed cover was restored';
  end if;
  if not exists(select 1 from public.photos p join public.hangouts h on h.id = p.hangout_id
    where h.date = '2026-09-29') then raise exception 'Photo-available indicator lost its source'; end if;
  insert into public.day_faces(date, photo_id, updated_at) values ('2026-09-29', b, 3);
  if (select photo_id from public.day_faces where date = '2026-09-29') is distinct from b then
    raise exception 'Could not manually reselect after removal';
  end if;

  -- Deleting a cover photo clears the cover without selecting another one.
  perform public.test_save_day('2026-09-29', jsonb_build_array(
    jsonb_build_object('kind','existing','id',a), jsonb_build_object('kind','existing','id',c),
    jsonb_build_object('kind','new','id',gen_random_uuid())), edited->'hangout');
  if exists(select 1 from public.day_faces where date = '2026-09-29') then
    raise exception 'Deleted cover replaced automatically';
  end if;
  delete from public.hangouts where date = '2026-09-29';
  perform public.test_save_day('2026-09-29', jsonb_build_array(jsonb_build_object('kind','new','id',gen_random_uuid())));
  if exists(select 1 from public.day_faces where date = '2026-09-29') then
    raise exception 'Deleting all hangouts erased initialization';
  end if;

  -- Failure after the first photo insert must roll back its cover and marker.
  begin
    perform public.test_save_day('2026-09-30', jsonb_build_array(
      jsonb_build_object('kind','new','id',a), jsonb_build_object('kind','new','id',b)), null, b);
    raise exception 'Expected incomplete upload failure';
  exception when raise_exception then
    if sqlerrm not like '%incomplete%' then raise; end if;
  end;
  if exists(select 1 from public.day_faces where date = '2026-09-30') then
    raise exception 'Failed save left a cover';
  end if;
  perform public.test_save_day('2026-09-30', jsonb_build_array(jsonb_build_object('kind','new','id',a)));
  if (select photo_id from public.day_faces where date = '2026-09-30') is distinct from a then
    raise exception 'Failed save consumed initialization';
  end if;

  begin
    delete from public.day_face_initializations;
    raise exception 'Client can erase initialization history';
  exception when insufficient_privilege then null;
  end;
end $$;

-- The same date initializes independently for a different user.
set request.jwt.claim.sub = '00000000-0000-4000-8000-000000000002';
do $$
declare p uuid := gen_random_uuid();
begin
  if exists(select 1 from public.day_faces) then raise exception 'Cross-user cover read'; end if;
  perform public.test_save_day('2026-09-29', jsonb_build_array(jsonb_build_object('kind','new','id',p)));
  if (select photo_id from public.day_faces where date = '2026-09-29') is distinct from p then
    raise exception 'Another user consumed this date';
  end if;
end $$;
reset role;
delete from auth.users;
do $$ begin
  if exists(select 1 from public.day_face_initializations) then
    raise exception 'Account deletion left initialization records';
  end if;
end $$;
\echo PASS: first upload, ordering, append, second hangout, manual change/removal/reselection, indicator data, deletion, rollback, legacy migration, owner isolation and cleanup.
