insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- a family's photos live under media/<family id>/...; only that family's signed-in members reach them
create policy media_obj_read on storage.objects for select to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = private.my_family());
create policy media_obj_add on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = private.my_family() and private.active());
create policy media_obj_del on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = private.my_family() and (private.is_host() or owner_id = auth.uid()::text));
