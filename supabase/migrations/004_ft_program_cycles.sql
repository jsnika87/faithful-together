-- Faithful Together - restartable 75-day program cycles without losing history.
begin;
alter table public.ft_member_settings add column if not exists program_cycle integer not null default 1 check(program_cycle>0);
alter table public.ft_daily_checkins add column if not exists program_cycle integer not null default 1 check(program_cycle>0);
alter table public.ft_daily_checkins drop constraint if exists ft_daily_checkins_pkey;
alter table public.ft_daily_checkins add primary key(household_id,user_id,program_cycle,program_day);
create or replace function public.ft_restart_my_program(target_household uuid)
returns integer language plpgsql security definer set search_path=public as $$
declare next_cycle integer;
begin
 if auth.uid() is null or not public.ft_is_household_member(target_household) then raise exception 'Membership required'; end if;
 update public.ft_member_settings set program_cycle=program_cycle+1,personal_start_date=current_date,updated_at=now()
 where household_id=target_household and user_id=auth.uid() returning program_cycle into next_cycle;
 return next_cycle;
end; $$;
revoke all on function public.ft_restart_my_program(uuid) from public;
grant execute on function public.ft_restart_my_program(uuid) to authenticated;
commit;
