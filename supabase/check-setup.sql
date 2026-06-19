select
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('trips', 'trip_members', 'stops', 'attachments')
order by tablename;

select
  id,
  name,
  public,
  file_size_limit
from storage.buckets
where id = 'itinerary-attachments';
