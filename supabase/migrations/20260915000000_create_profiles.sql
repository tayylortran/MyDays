begin;

create table public.day_faces (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  date date not null,
  photo_id uuid not null,
  updated_at bigint not null,
  primary key (user_id, date),
  unique (user_id, photo_id),
  foreign key (user_id, photo_id) references public.photos(user_id, id) on delete cascade
);
alter table public.day_faces enable row level security;
revoke all on public.day_faces from anon, authenticated;
grant select, insert, update, delete on public.day_faces to authenticated;
create policy "Owners manage daily profile photos" on public.day_faces
  for all to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create function public.check_day_face_date() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (
    select 1 from public.photos p join public.hangouts h
      on h.user_id = p.user_id and h.id = p.hangout_id
    where p.user_id = new.user_id and p.id = new.photo_id and h.date = new.date
  ) then raise exception 'Choose one of your photos from this date.'; end if;
  return new;
end;
$$;
revoke all on function public.check_day_face_date() from public, anon, authenticated;
create trigger check_day_face_date before insert or update on public.day_faces
  for each row execute function public.check_day_face_date();

create table public.profiles (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  username text not null check (username ~ '^[A-Za-z0-9_.]{3,30}$'),
  updated_at bigint not null
);
-- Preserve display capitalization, but reserve the name regardless of case.
create unique index profiles_username_unique on public.profiles(lower(username));
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
create policy "Owners manage their profile" on public.profiles
  for all to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

commit;
