begin;
create table if not exists public.ft_weekly_scriptures(
 household_id uuid not null, user_id uuid not null, program_cycle int not null default 1, week_number int not null check(week_number between 1 and 11),
 reference text not null, passage_text text not null, updated_at timestamptz not null default now(),
 primary key(household_id,user_id,program_cycle,week_number), foreign key(household_id,user_id) references public.ft_household_members(household_id,user_id) on delete cascade
);
alter table public.ft_weekly_scriptures enable row level security;
drop policy if exists ft_weekly_scriptures_self on public.ft_weekly_scriptures;
create policy ft_weekly_scriptures_self on public.ft_weekly_scriptures for all to authenticated using(user_id=auth.uid() and public.ft_is_household_member(household_id)) with check(user_id=auth.uid() and public.ft_is_household_member(household_id));
grant select,insert,update,delete on public.ft_weekly_scriptures to authenticated;
create table if not exists public.ft_daily_reflections(
 household_id uuid not null, user_id uuid not null, program_cycle int not null default 1, program_day int not null check(program_day between 1 and 75),
 prompt_kind text not null default 'growth', prompt text not null, response text not null default '', updated_at timestamptz not null default now(),
 primary key(household_id,user_id,program_cycle,program_day,prompt_kind), foreign key(household_id,user_id) references public.ft_household_members(household_id,user_id) on delete cascade
);
alter table public.ft_daily_reflections enable row level security;
drop policy if exists ft_daily_reflections_self on public.ft_daily_reflections;
create policy ft_daily_reflections_self on public.ft_daily_reflections for all to authenticated using(user_id=auth.uid() and public.ft_is_household_member(household_id)) with check(user_id=auth.uid() and public.ft_is_household_member(household_id));
grant select,insert,update,delete on public.ft_daily_reflections to authenticated;
commit;
