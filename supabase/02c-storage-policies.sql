insert into storage.buckets (id, name, public, file_size_limit)
values ('itinerary-attachments', 'itinerary-attachments', false, 52428800)
on conflict (id) do nothing;

drop policy if exists "Trip members can read itinerary files" on storage.objects;
create policy "Trip members can read itinerary files"
on storage.objects for select
to authenticated
using (
  bucket_id = 'itinerary-attachments'
  and public.is_trip_member(public.storage_trip_id(name))
);

drop policy if exists "Trip members can upload itinerary files" on storage.objects;
create policy "Trip members can upload itinerary files"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'itinerary-attachments'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and public.is_trip_member(public.storage_trip_id(name))
);

drop policy if exists "Trip members can update itinerary files" on storage.objects;
create policy "Trip members can update itinerary files"
on storage.objects for update
to authenticated
using (
  bucket_id = 'itinerary-attachments'
  and public.is_trip_member(public.storage_trip_id(name))
)
with check (
  bucket_id = 'itinerary-attachments'
  and public.is_trip_member(public.storage_trip_id(name))
);

drop policy if exists "Trip members can delete itinerary files" on storage.objects;
create policy "Trip members can delete itinerary files"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'itinerary-attachments'
  and public.is_trip_member(public.storage_trip_id(name))
);
