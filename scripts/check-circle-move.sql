-- Run the WHOLE file in Supabase SQL Editor with its default postgres role.
-- Replace the two placeholders with DIFFERENT existing Authentication user IDs.
-- This is a rollback-only test, not a migration. It uploads no files.
begin;

do $$
declare
  user_a uuid := 'USER_A_ID';
  user_b uuid := 'USER_B_ID';
  source_id uuid := gen_random_uuid();
  destination_id uuid := gen_random_uuid();
  foreign_id uuid := gen_random_uuid();
  hangout_id uuid := gen_random_uuid();
  photo_id uuid := gen_random_uuid();
  test_date date := current_date;
  photo_before jsonb;
  face_before jsonb;
begin
  if user_a = user_b then raise exception 'Use two different accounts.'; end if;
  if (select count(*) from auth.users where id in (user_a, user_b)) <> 2 then
    raise exception 'Both IDs must exist in Authentication > Users.';
  end if;

  -- Choose an unused date so an existing daily selection is never overwritten.
  while exists (select 1 from public.day_faces where user_id = user_a and date = test_date) loop
    test_date := test_date + 1;
  end loop;
  insert into public.circles(id, user_id, name, color, updated_at) values
    (source_id, user_a, 'Temporary source', '#3377cc', 1),
    (destination_id, user_a, 'Temporary destination', '#3377cc', 1),
    (foreign_id, user_b, 'Temporary other account', '#3377cc', 1);
  insert into public.hangouts(id, user_id, date, title, circle_id, updated_at)
    values (hangout_id, user_a, test_date, 'Temporary hangout', source_id, 1);
  -- Seed metadata as admin; the move itself runs with normal user permissions.
  insert into public.photos(id, user_id, hangout_id, storage_path, thumb_storage_path, updated_at)
    values (photo_id, user_a, hangout_id,
      user_a || '/circle-test/' || photo_id || '/image.jpg',
      user_a || '/circle-test/' || photo_id || '/thumb.jpg', 1);
  insert into public.day_faces(user_id, date, photo_id, updated_at)
    values (user_a, test_date, photo_id, 1);
  select to_jsonb(p) into photo_before from public.photos p where id = photo_id;
  select to_jsonb(f) into face_before from public.day_faces f where f.user_id = user_a and f.date = test_date;

  perform set_config('request.jwt.claim.sub', user_b::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', user_b, 'role', 'authenticated')::text, true);
  set local role authenticated;

  -- B cannot move/delete A's circle, even knowing its ID.
  begin
    perform public.move_hangouts_and_delete_circle(source_id, foreign_id);
    raise exception 'FAIL: another account could move/delete the circle';
  exception when raise_exception then
    if sqlerrm <> 'This circle is unavailable. Reload your circles.' then raise; end if;
  end;
  -- B also cannot use A's circle as a destination.
  begin
    perform public.move_hangouts_and_delete_circle(foreign_id, destination_id);
    raise exception 'FAIL: another account could use the destination';
  exception when raise_exception then
    if sqlerrm <> 'The destination circle is unavailable. Reload your circles.' then raise; end if;
  end;
  if not exists (select 1 from public.circles where id = foreign_id) then
    raise exception 'FAIL: rejected move deleted the source';
  end if;

  perform set_config('request.jwt.claim.sub', user_a::text, true);
  perform set_config('request.jwt.claims', jsonb_build_object('sub', user_a, 'role', 'authenticated')::text, true);
  if not exists (select 1 from public.hangouts where id = hangout_id and circle_id = source_id) then
    raise exception 'FAIL: another account changed the hangout';
  end if;
  perform public.move_hangouts_and_delete_circle(source_id, destination_id);
  if exists (select 1 from public.circles where id = source_id)
    or not exists (select 1 from public.hangouts where id = hangout_id and circle_id = destination_id) then
    raise exception 'FAIL: owner move did not succeed';
  end if;
  if (select to_jsonb(p) from public.photos p where id = photo_id) is distinct from photo_before then
    raise exception 'FAIL: photo metadata changed or disappeared';
  end if;
  if (select to_jsonb(f) from public.day_faces f where f.user_id = user_a and f.date = test_date) is distinct from face_before then
    raise exception 'FAIL: daily selection changed or disappeared';
  end if;
  if exists (select 1 from public.photo_file_cleanup where path in
    (photo_before->>'storage_path', photo_before->>'thumb_storage_path')) then
    raise exception 'FAIL: preserved photos were queued for deletion';
  end if;
end;
$$;

reset role;
select 'PASS: account isolation, photo metadata, and daily selection preserved' as result;
rollback;
