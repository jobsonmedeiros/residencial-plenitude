drop policy if exists "Admins can delete apartments" on public.apartments;
create policy "Admins can delete apartments"
on public.apartments for delete
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.user_id = (select auth.uid())
      and profiles.role = 'admin'
  )
);

grant delete on public.apartments to authenticated;
