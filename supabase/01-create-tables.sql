create extension if not exists pgcrypto;

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'New Trip',
  origin_zone text not null default 'America/Chicago',
  destination_zone text not null default 'Atlantic/Reykjavik',
  active_view text not null default 'timeline' check (active_view in ('timeline', 'calendar', 'board')),
  time_lens text not null default 'both' check (time_lens in ('both', 'origin', 'destination')),
  selected_stop_id uuid,
  share_code text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10)),
  share_enabled boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trip_members (
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'editor')),
  created_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

create table if not exists public.stops (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  title text not null,
  stop_type text not null default 'note' check (stop_type in ('flight', 'stay', 'food', 'sight', 'drive', 'waiting', 'note')),
  starts_at_utc timestamptz not null,
  ends_at_utc timestamptz not null,
  source_timezone text not null,
  local_start_date date not null,
  local_start_time time not null,
  local_end_date date not null,
  local_end_time time not null,
  notes text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at_utc > starts_at_utc)
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  stop_id uuid not null references public.stops(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  name text not null,
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists trips_owner_user_id_idx on public.trips(owner_user_id);
create index if not exists trips_share_code_idx on public.trips(share_code) where share_enabled;
create index if not exists trips_active_updated_at_idx on public.trips(updated_at desc) where archived_at is null;
create index if not exists trip_members_user_id_idx on public.trip_members(user_id);
create index if not exists stops_trip_id_starts_at_idx on public.stops(trip_id, starts_at_utc);
create index if not exists attachments_trip_id_idx on public.attachments(trip_id);
create index if not exists attachments_stop_id_idx on public.attachments(stop_id);
create index if not exists attachments_created_by_idx on public.attachments(created_by);

create or replace function public.set_updated_at()
returns trigger
as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trips_set_updated_at on public.trips;
create trigger trips_set_updated_at
before update on public.trips
for each row execute function public.set_updated_at();

drop trigger if exists stops_set_updated_at on public.stops;
create trigger stops_set_updated_at
before update on public.stops
for each row execute function public.set_updated_at();
