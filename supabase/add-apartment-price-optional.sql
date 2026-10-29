alter table public.apartments
  alter column price drop not null,
  alter column price drop default;

alter table public.apartments
  drop constraint if exists apartments_price_check;

update public.apartments
set price = null
where price = 0;

alter table public.apartments
  add constraint apartments_price_check check (price is null or price > 0);
