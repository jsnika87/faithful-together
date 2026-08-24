begin;
drop policy if exists ft_app_events_admin_read on public.ft_app_events;
create policy ft_app_events_admin_read on public.ft_app_events for select to authenticated using(household_id is not null and public.ft_is_household_admin(household_id));
drop policy if exists ft_app_events_admin_remove on public.ft_app_events;
create policy ft_app_events_admin_remove on public.ft_app_events for delete to authenticated using(user_id=auth.uid() or (household_id is not null and public.ft_is_household_admin(household_id)));
commit;
