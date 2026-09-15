begin;

alter table public.profiles add column avatar_storage_path text
  check (avatar_storage_path is null or avatar_storage_path ~
    ('^' || user_id::text || '/avatars/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'));

create function public.manage_profile_avatar() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op <> 'DELETE' then
    if new.avatar_storage_path is not null and
      (tg_op = 'INSERT' or new.avatar_storage_path is distinct from old.avatar_storage_path) then
      if not exists (select 1 from storage.objects where bucket_id = 'photos' and name = new.avatar_storage_path)
        or exists (select 1 from public.photo_file_cleanup where path = new.avatar_storage_path) then
        raise exception 'Avatar upload is missing or scheduled for deletion. Choose the image again.';
      end if;
    end if;
  end if;
  if tg_op <> 'INSERT' then
    if old.avatar_storage_path is not null and
      (tg_op = 'DELETE' or old.avatar_storage_path is distinct from new.avatar_storage_path) and
      exists (select 1 from auth.users where id = old.user_id) then
      insert into public.photo_file_cleanup(path, user_id) values(old.avatar_storage_path, old.user_id)
        on conflict do nothing;
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function public.manage_profile_avatar() from public, anon, authenticated;
create trigger manage_profile_avatar before insert or update or delete on public.profiles
  for each row execute function public.manage_profile_avatar();

commit;
