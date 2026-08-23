begin;
drop policy if exists ft_profiles_insert_self on public.ft_profiles;
create policy ft_profiles_insert_self on public.ft_profiles for insert to authenticated with check(id=auth.uid());
grant insert on public.ft_profiles to authenticated;
commit;
