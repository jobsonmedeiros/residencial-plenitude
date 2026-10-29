alter table public.apartments
  add column if not exists residential_name text;

do $$
begin
  if exists (
    select 1
    from public.apartments
    where residential_name is null
      or trim(regexp_replace(residential_name, '[[:space:]]+', ' ', 'g')) = ''
  ) then
    raise exception 'Existem apartamentos sem nome de residencial. Corrija esses dados antes de aplicar esta migração.';
  end if;

  if exists (
    select 1
    from public.apartments
    where residential_name is not null
      and trim(regexp_replace(residential_name, '[[:space:]]+', ' ', 'g')) <> ''
    group by lower(trim(regexp_replace(residential_name, '[[:space:]]+', ' ', 'g')))
    having count(distinct residential_number) > 1
  ) then
    raise exception 'Existem residenciais com nomes repetidos. Corrija os nomes antes de aplicar esta migração.';
  end if;

  if exists (
    select 1
    from public.apartments
    where residential_name is not null
      and trim(regexp_replace(residential_name, '[[:space:]]+', ' ', 'g')) <> ''
    group by residential_number
    having count(distinct lower(trim(regexp_replace(residential_name, '[[:space:]]+', ' ', 'g')))) > 1
  ) then
    raise exception 'Existem unidades do mesmo residencial com nomes diferentes. Corrija os nomes antes de aplicar esta migração.';
  end if;
end;
$$;

alter table public.apartments
  alter column residential_name set not null;

alter table public.apartments
  drop constraint if exists apartments_residential_name_nonblank_check;
alter table public.apartments
  add constraint apartments_residential_name_nonblank_check
  check (trim(regexp_replace(residential_name, '[[:space:]]+', ' ', 'g')) <> '');

create or replace function public.prevent_duplicate_residential_name()
returns trigger
language plpgsql
as $$
declare
  normalized_name text;
begin
  new.residential_name := trim(regexp_replace(coalesce(new.residential_name, ''), '[[:space:]]+', ' ', 'g'));
  normalized_name := lower(new.residential_name);

  if normalized_name = '' then
    raise exception 'Informe um nome para o residencial.'
      using errcode = '23514';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(normalized_name, 0));

  if exists (
    select 1
    from public.apartments
    where residential_number <> new.residential_number
      and residential_name is not null
      and lower(trim(regexp_replace(residential_name, '[[:space:]]+', ' ', 'g'))) = normalized_name
  ) then
    raise exception 'Já existe um residencial com o nome "%". Informe um nome diferente.', new.residential_name
      using errcode = '23505';
  end if;

  if exists (
    select 1
    from public.apartments
    where residential_number = new.residential_number
      and residential_name is not null
      and lower(trim(regexp_replace(residential_name, '[[:space:]]+', ' ', 'g'))) <> normalized_name
  ) then
    raise exception 'Todas as unidades do mesmo residencial devem ter o mesmo nome.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists apartments_prevent_duplicate_residential_name on public.apartments;
create trigger apartments_prevent_duplicate_residential_name
before insert or update of residential_number, residential_name on public.apartments
for each row execute function public.prevent_duplicate_residential_name();

grant insert (residential_number, residential_name, apartment_number, floor)
on public.apartments to authenticated;
