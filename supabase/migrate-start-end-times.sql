alter table public.stops
  add column if not exists ends_at_utc timestamptz,
  add column if not exists local_start_date date,
  add column if not exists local_start_time time,
  add column if not exists local_end_date date,
  add column if not exists local_end_time time;

do $$
declare
  has_old_local_date boolean;
  has_old_duration boolean;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'stops' and column_name = 'local_date'
  ) into has_old_local_date;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'stops' and column_name = 'duration_minutes'
  ) into has_old_duration;

  if has_old_local_date and has_old_duration then
    execute $migrate$
      update public.stops
      set
        local_start_date = coalesce(local_start_date, local_date),
        local_start_time = coalesce(local_start_time, local_time),
        ends_at_utc = coalesce(ends_at_utc, starts_at_utc + make_interval(mins => coalesce(duration_minutes, 60))),
        local_end_date = coalesce(local_end_date, (starts_at_utc + make_interval(mins => coalesce(duration_minutes, 60)))::date),
        local_end_time = coalesce(local_end_time, (starts_at_utc + make_interval(mins => coalesce(duration_minutes, 60)))::time)
      where local_start_date is null
         or local_start_time is null
         or ends_at_utc is null
         or local_end_date is null
         or local_end_time is null
    $migrate$;
  else
    update public.stops
    set
      local_start_date = coalesce(local_start_date, starts_at_utc::date),
      local_start_time = coalesce(local_start_time, starts_at_utc::time),
      ends_at_utc = coalesce(ends_at_utc, starts_at_utc + interval '1 hour'),
      local_end_date = coalesce(local_end_date, (starts_at_utc + interval '1 hour')::date),
      local_end_time = coalesce(local_end_time, (starts_at_utc + interval '1 hour')::time)
    where local_start_date is null
       or local_start_time is null
       or ends_at_utc is null
       or local_end_date is null
       or local_end_time is null;
  end if;
end;
$$;

alter table public.stops
  alter column ends_at_utc set not null,
  alter column local_start_date set not null,
  alter column local_start_time set not null,
  alter column local_end_date set not null,
  alter column local_end_time set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'stops_ends_after_starts'
      and conrelid = 'public.stops'::regclass
  ) then
    alter table public.stops
      add constraint stops_ends_after_starts check (ends_at_utc > starts_at_utc);
  end if;
end;
$$;
