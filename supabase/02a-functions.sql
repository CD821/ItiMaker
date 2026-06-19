create or replace function public.is_trip_member(p_trip_id uuid)
returns boolean
as $$
  select exists (
    select 1
    from public.trip_members tm
    where tm.trip_id = p_trip_id
      and tm.user_id = (select auth.uid())
  );
$$ language sql stable security definer set search_path = '';

create or replace function public.join_trip_by_code(p_share_code text)
returns uuid
as $$
declare
  v_trip_id uuid;
begin
  select t.id
  into v_trip_id
  from public.trips t
  where t.share_enabled = true
    and t.share_code = upper(trim(p_share_code))
  limit 1;

  if v_trip_id is null then
    raise exception 'Trip share code not found';
  end if;

  insert into public.trip_members (trip_id, user_id, role)
  values (v_trip_id, (select auth.uid()), 'editor')
  on conflict (trip_id, user_id) do nothing;

  return v_trip_id;
end;
$$ language plpgsql security definer set search_path = '';

create or replace function public.storage_trip_id(p_storage_path text)
returns uuid
as $$
declare
  v_parts text[];
  v_trip_id text;
begin
  v_parts = storage.foldername(p_storage_path);
  if array_length(v_parts, 1) < 2 then
    return null;
  end if;

  v_trip_id = v_parts[2];
  if v_trip_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return null;
  end if;

  return v_trip_id::uuid;
end;
$$ language plpgsql stable security definer set search_path = '';

grant execute on function public.join_trip_by_code(text) to authenticated;
grant execute on function public.is_trip_member(uuid) to authenticated;
grant execute on function public.storage_trip_id(text) to authenticated;
