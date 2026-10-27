-- Plenitude demo: run this in Supabase SQL Editor after creating the project.
create table if not exists public.apartments (
  building_number smallint not null check (building_number between 1 and 13),
  apartment_code text not null check (apartment_code in ('101','102','103','201','202','203')),
  price numeric(12,2) check (price is null or price >= 0),
  status text not null check (status in ('Disponível','Em negociação','Vendido')),
  bedrooms smallint not null default 2 check (bedrooms between 0 and 10),
  area numeric(6,2) not null default 50 check (area > 0),
  parking smallint not null default 1 check (parking between 0 and 10),
  floor text not null,
  primary key (building_number, apartment_code)
);

create table if not exists public.site_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.apartments enable row level security;
alter table public.site_admins enable row level security;

revoke all on public.apartments from anon, authenticated;
grant select on public.apartments to anon, authenticated;
grant update (price,status,bedrooms,area,parking,floor) on public.apartments to authenticated;
revoke all on public.site_admins from anon, authenticated;
grant select on public.site_admins to authenticated;

create or replace function public.is_site_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.site_admins
    where user_id = (select auth.uid())
  );
$$;
revoke all on function public.is_site_admin() from public;
grant execute on function public.is_site_admin() to authenticated;

drop policy if exists apartments_public_read_current on public.apartments;
create policy apartments_public_read_current
  on public.apartments for select to anon
  using (building_number between 11 and 13);

drop policy if exists apartments_admin_read_current on public.apartments;
create policy apartments_admin_read_current
  on public.apartments for select to authenticated
  using (building_number between 11 and 13 and public.is_site_admin());

drop policy if exists apartments_admin_update_current on public.apartments;
create policy apartments_admin_update_current
  on public.apartments for update to authenticated
  using (building_number between 11 and 13 and public.is_site_admin())
  with check (building_number between 11 and 13 and public.is_site_admin());

drop policy if exists site_admins_read_own on public.site_admins;
create policy site_admins_read_own
  on public.site_admins for select to authenticated
  using (user_id = (select auth.uid()));

with buildings(building_number) as (
  values (1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12),(13)
), units(apartment_code, floor) as (
  values ('101','1º andar'),('102','1º andar'),('103','1º andar'),
         ('201','2º andar'),('202','2º andar'),('203','2º andar')
)
insert into public.apartments (building_number, apartment_code, price, status, bedrooms, area, parking, floor)
select b.building_number, u.apartment_code, null,
       case when b.building_number >= 11 then 'Disponível' else 'Vendido' end,
       2, 50, 1, u.floor
from buildings b cross join units u
on conflict (building_number, apartment_code) do nothing;
