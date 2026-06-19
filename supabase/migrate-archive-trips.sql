alter table public.trips
add column if not exists archived_at timestamptz;

create index if not exists trips_active_updated_at_idx
on public.trips(updated_at desc)
where archived_at is null;
