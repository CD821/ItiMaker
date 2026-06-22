alter table public.stops
add column if not exists location text not null default '';
