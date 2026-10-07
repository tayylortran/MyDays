begin;

-- A date becomes new again after its last hangout is deleted. Removing a
-- profile cover or editing photos while hangouts remain must stay permanent.
lock table public.hangouts in share row exclusive mode;
lock table public.photos in share row exclusive mode;

delete from public.day_face_initializations i
where not exists (
  select 1 from public.hangouts h where h.user_id = i.user_id and h.date = i.date
);

create function public.reset_deleted_day_face() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.hangouts h
    where h.user_id = old.user_id and h.date = old.date
  ) then
    delete from public.day_face_initializations
      where user_id = old.user_id and date = old.date;
  end if;
  return old;
end;
$$;
revoke all on function public.reset_deleted_day_face() from public, anon, authenticated;

create trigger reset_deleted_day_face after delete on public.hangouts
  for each row execute function public.reset_deleted_day_face();

commit;
