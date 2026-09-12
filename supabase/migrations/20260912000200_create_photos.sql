begin;

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid()
    references auth.users(id) on delete cascade,
  hangout_id uuid not null,
  storage_path text not null unique,
  thumb_storage_path text unique,
  sort integer not null default 0 check (sort >= 0),
  updated_at bigint not null,

  unique (user_id, id),
  foreign key (user_id, hangout_id)
    references public.hangouts (user_id, id) on delete cascade,

  -- File paths stay inside the owner's folder in the photo bucket.
  check (
    split_part(storage_path, '/', 1) = user_id::text
    and length(storage_path) > length(user_id::text) + 1
  ),
  check (
    thumb_storage_path is null or (
      split_part(thumb_storage_path, '/', 1) = user_id::text
      and length(thumb_storage_path) > length(user_id::text) + 1
    )
  )
);

create index photos_user_hangout_sort_idx
  on public.photos (user_id, hangout_id, sort, id);

alter table public.photos enable row level security;

revoke all on table public.photos from anon, authenticated;

grant select, insert, delete
  on table public.photos to authenticated;

-- Reordering does not move a photo to a different hangout or owner.
grant update (sort, updated_at)
  on table public.photos to authenticated;

create policy "Users manage their own photos"
  on public.photos
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

commit;
