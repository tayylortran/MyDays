begin;

create table public.circles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  name text not null,
  color text not null,
  sort integer not null default 0,
  updated_at bigint not null,

  unique (user_id, id)
);

create index circles_user_sort_idx
  on public.circles (user_id, sort);

alter table public.circles enable row level security;

revoke all on table public.circles from anon, authenticated;

grant select, insert, update, delete
  on table public.circles to authenticated;

create policy "Users manage their own circles"
  on public.circles
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

commit;
