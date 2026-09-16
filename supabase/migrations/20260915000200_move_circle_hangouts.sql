begin;

create function public.move_hangouts_and_delete_circle(p_circle_id uuid, p_destination_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  if p_circle_id = p_destination_id then raise exception 'Choose a different destination circle.'; end if;

  -- Lock in a consistent order, including against new hangouts referencing either circle.
  perform id from public.circles
    where user_id = auth.uid() and id in (p_circle_id, p_destination_id)
    order by id for update;
  if not exists (select 1 from public.circles where id = p_circle_id and user_id = auth.uid()) then
    raise exception 'This circle is unavailable. Reload your circles.';
  end if;

  if p_destination_id is null then
    if exists (select 1 from public.hangouts where circle_id = p_circle_id and user_id = auth.uid()) then
      raise exception 'Choose a destination for this circle''s hangouts.';
    end if;
  else
    if not exists (select 1 from public.circles where id = p_destination_id and user_id = auth.uid()) then
      raise exception 'The destination circle is unavailable. Reload your circles.';
    end if;
    update public.hangouts set circle_id = p_destination_id,
      updated_at = greatest(updated_at + 1, floor(extract(epoch from clock_timestamp()) * 1000)::bigint)
      where circle_id = p_circle_id and user_id = auth.uid();
  end if;
  delete from public.circles where id = p_circle_id and user_id = auth.uid();
end;
$$;

revoke all on function public.move_hangouts_and_delete_circle(uuid, uuid) from public, anon;
grant execute on function public.move_hangouts_and_delete_circle(uuid, uuid) to authenticated;

commit;
