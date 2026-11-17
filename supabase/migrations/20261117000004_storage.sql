-- Product photos uploaded from the dashboard. Anyone can view, staff upload.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

create policy "product photos are public"
  on storage.objects for select
  using (bucket_id = 'product-images');

create policy "staff upload product photos"
  on storage.objects for insert
  with check (bucket_id = 'product-images' and public.staff_can('Products'));

create policy "staff replace product photos"
  on storage.objects for update
  using (bucket_id = 'product-images' and public.staff_can('Products'));

create policy "staff delete product photos"
  on storage.objects for delete
  using (bucket_id = 'product-images' and public.staff_can('Products'));
