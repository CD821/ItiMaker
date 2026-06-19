alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.stops enable row level security;
alter table public.attachments enable row level security;

drop policy if exists "Trip members can read trips" on public.trips;
create policy "Trip members can read trips"
on public.trips for select
to authenticated
using (public.is_trip_member(id) or owner_user_id = (select auth.uid()));

drop policy if exists "Authenticated users can create owned trips" on public.trips;
create policy "Authenticated users can create owned trips"
on public.trips for insert
to authenticated
with check (owner_user_id = (select auth.uid()));

drop policy if exists "Trip members can update trips" on public.trips;
create policy "Trip members can update trips"
on public.trips for update
to authenticated
using (public.is_trip_member(id) or owner_user_id = (select auth.uid()))
with check (public.is_trip_member(id) or owner_user_id = (select auth.uid()));

drop policy if exists "Trip owners can delete trips" on public.trips;
create policy "Trip owners can delete trips"
on public.trips for delete
to authenticated
using (owner_user_id = (select auth.uid()));

drop policy if exists "Trip members can read memberships" on public.trip_members;
create policy "Trip members can read memberships"
on public.trip_members for select
to authenticated
using (public.is_trip_member(trip_id));

drop policy if exists "Trip owners can add memberships" on public.trip_members;
create policy "Trip owners can add memberships"
on public.trip_members for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.trips t
    where t.id = trip_id
      and t.owner_user_id = (select auth.uid())
  )
);

drop policy if exists "Members can leave and owners can remove members" on public.trip_members;
create policy "Members can leave and owners can remove members"
on public.trip_members for delete
to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1
    from public.trips t
    where t.id = trip_id
      and t.owner_user_id = (select auth.uid())
  )
);

drop policy if exists "Trip members can read stops" on public.stops;
create policy "Trip members can read stops"
on public.stops for select
to authenticated
using (public.is_trip_member(trip_id));

drop policy if exists "Trip members can insert stops" on public.stops;
create policy "Trip members can insert stops"
on public.stops for insert
to authenticated
with check (public.is_trip_member(trip_id));

drop policy if exists "Trip members can update stops" on public.stops;
create policy "Trip members can update stops"
on public.stops for update
to authenticated
using (public.is_trip_member(trip_id))
with check (public.is_trip_member(trip_id));

drop policy if exists "Trip members can delete stops" on public.stops;
create policy "Trip members can delete stops"
on public.stops for delete
to authenticated
using (public.is_trip_member(trip_id));

drop policy if exists "Trip members can read attachments" on public.attachments;
create policy "Trip members can read attachments"
on public.attachments for select
to authenticated
using (public.is_trip_member(trip_id));

drop policy if exists "Trip members can insert attachments" on public.attachments;
create policy "Trip members can insert attachments"
on public.attachments for insert
to authenticated
with check (
  created_by = (select auth.uid())
  and public.is_trip_member(trip_id)
);

drop policy if exists "Trip members can update attachments" on public.attachments;
create policy "Trip members can update attachments"
on public.attachments for update
to authenticated
using (public.is_trip_member(trip_id))
with check (public.is_trip_member(trip_id));

drop policy if exists "Trip members can delete attachments" on public.attachments;
create policy "Trip members can delete attachments"
on public.attachments for delete
to authenticated
using (public.is_trip_member(trip_id));
