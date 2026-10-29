alter table public.apartments
  alter column bedrooms drop not null,
  alter column bedrooms drop default,
  add column if not exists technical_attributes jsonb not null default '[]'::jsonb,
  add column if not exists technical_extra text not null default '',
  add column if not exists financial_attributes jsonb not null default '[]'::jsonb,
  add column if not exists financial_extra text not null default '';

grant update (status, price, area, bedrooms, description, technical_attributes, technical_extra, financial_attributes, financial_extra)
on public.apartments to authenticated;
