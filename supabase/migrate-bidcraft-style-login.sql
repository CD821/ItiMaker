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
    upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10))
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
    or public.is_trip_member(public.trips.id)
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

grant execute on function public.upsert_owned_trip(uuid, text, text, text, text, text, text) to authenticated;
