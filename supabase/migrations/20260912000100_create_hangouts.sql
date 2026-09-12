begin;

create table public.hangouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  date date not null,
  title text not null check (length(btrim(title)) > 0),
  note text not null default '',
  circle_id uuid not null,
  updated_at bigint not null,

  unique (user_id, id),
  foreign key (user_id, circle_id)
    references public.circles (user_id, id)
);

create index hangouts_user_date_idx
  on public.hangouts (user_id, date);

create index hangouts_user_circle_idx
  on public.hangouts (user_id, circle_id);

alter table public.hangouts enable row level security;

revoke all on table public.hangouts from anon, authenticated;

grant select, insert, delete
  on table public.hangouts to authenticated;

-- Editing preserves the original day, ID, and owner.
grant update (title, note, circle_id, updated_at)
  on table public.hangouts to authenticated;

create policy "Users manage their own hangouts"
  on public.hangouts
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

commit;
