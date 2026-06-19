drop policy if exists "Trip owners can update memberships" on public.trip_members;

create policy "Trip owners can update memberships"
on public.trip_members for update
to authenticated
using (
  exists (
    select 1
    from public.trips t
    where t.id = trip_id
      and t.owner_user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.trips t
    where t.id = trip_id
      and t.owner_user_id = (select auth.uid())
  )
);
