begin;

-- Remember that a date has had its initial cover, even if the user removes
-- that cover or deletes every photo/hangout for the date later.
create table public.day_face_initializations (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  primary key (user_id, date)
);
alter table public.day_face_initializations enable row level security;
revoke all on public.day_face_initializations from public, anon, authenticated;

-- Prevent a save from slipping between the migration snapshot and trigger.
lock table public.photos in share row exclusive mode;

-- Existing blank dates may represent a deliberate removal. Do not backfill
-- covers or change their behavior when more photos are uploaded later.
insert into public.day_face_initializations(user_id, date)
select h.user_id, h.date
from public.hangouts h join public.photos p
  on p.user_id = h.user_id and p.hangout_id = h.id
union
select user_id, date from public.day_faces;

create function public.initialize_day_face() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_date date;
begin
  select h.date into strict v_date from public.hangouts h
    where h.user_id = new.user_id and h.id = new.hangout_id;

  -- The unique key serializes concurrent first uploads for the same user/day.
  -- Both the marker and cover roll back if the surrounding save fails.
  insert into public.day_face_initializations(user_id, date)
    values (new.user_id, v_date) on conflict (user_id, date) do nothing;
  if found then
    insert into public.day_faces(user_id, date, photo_id, updated_at)
      values (new.user_id, v_date, new.id, new.updated_at)
      on conflict (user_id, date) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.initialize_day_face() from public, anon, authenticated;

-- The save RPC inserts new photos in selection order. Its first insert wins;
-- subsequent photos, edits, and other hangouts on the same day leave it alone.
create trigger initialize_day_face after insert on public.photos
  for each row execute function public.initialize_day_face();

commit;
