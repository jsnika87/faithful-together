-- Faithful Together - reliable household creation and durable 75-day check-ins.
begin;

create or replace function public.ft_create_household(household_name text)
returns public.ft_households
language plpgsql
security definer
set search_path = public
as $$
declare created_household public.ft_households;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if nullif(trim(household_name), '') is null then raise exception 'Household name required'; end if;
  insert into public.ft_households(name, created_by)
  values (trim(household_name), auth.uid()) returning * into created_household;
  return created_household;
end;
$$;
revoke all on function public.ft_create_household(text) from public;
grant execute on function public.ft_create_household(text) to authenticated;

create table if not exists public.ft_daily_checkins (
  household_id uuid not null,
  user_id uuid not null,
  program_day smallint not null check (program_day between 1 and 75),
  capacity text not null default 'green' check (capacity in ('green','yellow','red')),
  completed_actions jsonb not null default '[]'::jsonb,
  journal_text text,
  steps integer check (steps between 0 and 100000),
  water_oz integer check (water_oz between 0 and 500),
  sleep_minutes integer check (sleep_minutes between 0 and 1440),
  weight_lbs numeric(5,1),
  status text not null default 'in_progress' check (status in ('in_progress','complete','modified','incomplete')),
  updated_at timestamptz not null default now(),
  primary key (household_id,user_id,program_day),
  foreign key (household_id,user_id) references public.ft_household_members(household_id,user_id) on delete cascade
);
alter table public.ft_daily_checkins enable row level security;
drop policy if exists ft_checkins_self_manage on public.ft_daily_checkins;
create policy ft_checkins_self_manage on public.ft_daily_checkins for all to authenticated
  using (user_id=auth.uid() and public.ft_is_household_member(household_id))
  with check (user_id=auth.uid() and public.ft_is_household_member(household_id));
drop policy if exists ft_checkins_household_read on public.ft_daily_checkins;
create policy ft_checkins_household_read on public.ft_daily_checkins for select to authenticated
  using (public.ft_is_household_member(household_id));
grant select,insert,update,delete on public.ft_daily_checkins to authenticated;
commit;
