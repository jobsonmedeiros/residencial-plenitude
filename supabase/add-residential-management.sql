alter table public.apartments drop constraint if exists apartments_residential_number_check;
alter table public.apartments drop constraint if exists apartments_apartment_number_check;
alter table public.apartments drop constraint if exists apartments_floor_check;

alter table public.apartments
  add constraint apartments_residential_number_check check (residential_number between 1 and 32767),
  add constraint apartments_apartment_number_check check (apartment_number between 1 and 32767),
  add constraint apartments_floor_check check (length(trim(floor)) > 0);

drop policy if exists "Admins can insert apartments" on public.apartments;
create policy "Admins can insert apartments"
on public.apartments for insert
to authenticated
with check (
  exists (
    select 1 from public.profiles
    where profiles.user_id = (select auth.uid())
      and profiles.role = 'admin'
  )
);

grant insert (residential_number, apartment_number, floor)
on public.apartments to authenticated;
