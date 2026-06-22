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

create or replace function public.has_trip_role(p_trip_id uuid, p_roles text[])
returns boolean
as $$
  select exists (
    select 1
    from public.trips t
    where t.id = p_trip_id
      and t.owner_user_id = (select auth.uid())
      and 'owner' = any(p_roles)
  )
  or exists (
    select 1
    from public.trip_members tm
    where tm.trip_id = p_trip_id
      and tm.user_id = (select auth.uid())
      and tm.role = any(p_roles)
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
  values (v_trip_id, (select auth.uid()), 'viewer')
  on conflict (trip_id, user_id) do nothing;

  return v_trip_id;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.upsert_owned_trip(
  p_trip_id uuid,
  p_name text,
  p_origin_zone text,
  p_destination_zone text,
  p_active_view text,
  p_time_lens text,
  p_share_code text
)
returns public.trips
as $$
declare
  v_trip public.trips;
  v_share_code text;
begin
  if (select auth.uid()) is null then
    raise exception 'Not authenticated';
  end if;

  v_share_code = coalesce(
    nullif(upper(trim(p_share_code)), ''),
    upper(substr(replace(p_trip_id::text, '-', ''), 1, 10))
  );

  insert into public.trips (
    id,
    owner_user_id,
    name,
    origin_zone,
    destination_zone,
    active_view,
    time_lens,
    selected_stop_id,
    share_code,
    share_enabled
  )
  values (
    p_trip_id,
    (select auth.uid()),
    coalesce(nullif(trim(p_name), ''), 'New Trip'),
    coalesce(nullif(trim(p_origin_zone), ''), 'UTC'),
    coalesce(nullif(trim(p_destination_zone), ''), 'UTC'),
    case when p_active_view in ('timeline', 'calendar', 'board') then p_active_view else 'timeline' end,
    case when p_time_lens in ('both', 'origin', 'destination') then p_time_lens else 'both' end,
    null,
    v_share_code,
    true
  )
  on conflict (id) do update
  set
    name = excluded.name,
    origin_zone = excluded.origin_zone,
    destination_zone = excluded.destination_zone,
    active_view = excluded.active_view,
    time_lens = excluded.time_lens,
    share_code = excluded.share_code,
    share_enabled = true,
    updated_at = now()
  where public.trips.owner_user_id = (select auth.uid())
    or public.has_trip_role(public.trips.id, array['owner', 'editor'])
  returning * into v_trip;

  if v_trip.id is null then
    raise exception 'Trip not found for this account';
  end if;

  insert into public.trip_members (trip_id, user_id, role)
  values (
    v_trip.id,
    (select auth.uid()),
    case when v_trip.owner_user_id = (select auth.uid()) then 'owner' else 'editor' end
  )
  on conflict (trip_id, user_id) do nothing;

  return v_trip;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.list_trip_members(p_trip_id uuid)
returns table (
  user_id uuid,
  email text,
  role text,
  created_at timestamptz,
  is_current_user boolean
)
as $$
begin
  if not public.is_trip_member(p_trip_id) then
    raise exception 'Not allowed';
  end if;

  return query
    select
      tm.user_id,
      coalesce(u.email, 'Unknown user')::text as email,
      tm.role,
      tm.created_at,
      tm.user_id = (select auth.uid()) as is_current_user
    from public.trip_members tm
    left join auth.users u on u.id = tm.user_id
    where tm.trip_id = p_trip_id
    order by
      case tm.role when 'owner' then 0 when 'editor' then 1 else 2 end,
      tm.created_at;
end;
$$ language plpgsql stable security definer set search_path = public;

create or replace function public.update_trip_member_role(p_trip_id uuid, p_user_id uuid, p_role text)
returns void
as $$
begin
  if not public.has_trip_role(p_trip_id, array['owner']) then
    raise exception 'Only the trip owner can change access';
  end if;

  if p_role not in ('editor', 'viewer') then
    raise exception 'Role must be editor or viewer';
  end if;

  update public.trip_members
  set role = p_role
  where trip_id = p_trip_id
    and user_id = p_user_id
    and role <> 'owner';
end;
$$ language plpgsql security definer set search_path = public;

create or replace function public.remove_trip_member(p_trip_id uuid, p_user_id uuid)
returns void
as $$
begin
  if not (
    public.has_trip_role(p_trip_id, array['owner'])
    or p_user_id = (select auth.uid())
  ) then
    raise exception 'Only the owner can remove access';
  end if;

  delete from public.trip_members
  where trip_id = p_trip_id
    and user_id = p_user_id
    and role <> 'owner';
end;
$$ language plpgsql security definer set search_path = public;

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
grant execute on function public.upsert_owned_trip(uuid, text, text, text, text, text, text) to authenticated;
grant execute on function public.is_trip_member(uuid) to authenticated;
grant execute on function public.has_trip_role(uuid, text[]) to authenticated;
grant execute on function public.list_trip_members(uuid) to authenticated;
grant execute on function public.update_trip_member_role(uuid, uuid, text) to authenticated;
grant execute on function public.remove_trip_member(uuid, uuid) to authenticated;
grant execute on function public.storage_trip_id(text) to authenticated;
