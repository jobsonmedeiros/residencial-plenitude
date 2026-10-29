alter table public.apartments
  add column if not exists residential_name text;

grant insert (residential_number, residential_name, apartment_number, floor)
on public.apartments to authenticated;
