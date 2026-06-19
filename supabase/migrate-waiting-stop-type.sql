alter table public.stops
drop constraint if exists stops_stop_type_check;

alter table public.stops
add constraint stops_stop_type_check
check (stop_type in ('flight', 'stay', 'food', 'sight', 'drive', 'waiting', 'note'));
