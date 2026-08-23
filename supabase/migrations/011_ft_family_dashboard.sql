begin;

alter table public.ft_member_settings
  add column if not exists share_progress_to_household boolean not null default true,
  add column if not exists share_daily_completion boolean not null default true;

drop policy if exists ft_checkins_household_read on public.ft_daily_checkins;

create table if not exists public.ft_family_encouragements (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.ft_households(id) on delete cascade,
  from_user_id uuid not null references auth.users(id) on delete cascade,
  to_user_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (message in ('Way to stay faithful!','Proud of your progress!','Keep taking the next right step!','We are in this together!')),
  created_at timestamptz not null default now()
);

alter table public.ft_family_encouragements enable row level security;
drop policy if exists ft_encouragements_household_read on public.ft_family_encouragements;
create policy ft_encouragements_household_read on public.ft_family_encouragements for select to authenticated
  using (public.ft_is_household_member(household_id));
drop policy if exists ft_encouragements_member_insert on public.ft_family_encouragements;
create policy ft_encouragements_member_insert on public.ft_family_encouragements for insert to authenticated
  with check (from_user_id=auth.uid() and public.ft_is_household_member(household_id) and public.ft_share_household_with(to_user_id));
grant select,insert on public.ft_family_encouragements to authenticated;

create or replace function public.ft_family_dashboard(target_household uuid)
returns table(
  user_id uuid,
  display_name text,
  life_stage text,
  role text,
  is_self boolean,
  progress_shared boolean,
  daily_shared boolean,
  current_day integer,
  faithful_last_7 integer,
  current_streak integer,
  today_complete boolean
)
language sql
stable
security definer
set search_path=public
as $$
  with base as (
    select m.user_id,p.display_name,m.life_stage,m.role,
      m.user_id=auth.uid() is_self,
      coalesce(s.share_progress_to_household,true) progress_shared,
      coalesce(s.share_daily_completion,true) daily_shared,
      coalesce(s.program_cycle,1) cycle,
      greatest(1,least(75,(current_date-coalesce(s.personal_start_date,current_date))+1))::int current_day
    from ft_household_members m
    join ft_profiles p on p.id=m.user_id
    left join ft_member_settings s on s.household_id=m.household_id and s.user_id=m.user_id
    where m.household_id=target_household and ft_is_household_member(target_household)
  ), completed as (
    select c.user_id,c.program_day,
      c.program_day-row_number() over(partition by c.user_id order by c.program_day)::int island
    from ft_daily_checkins c join base b on b.user_id=c.user_id
    where c.household_id=target_household and c.program_cycle=b.cycle and c.status in('complete','modified')
  ), streaks as (
    select user_id,count(*)::int streak,max(program_day) last_day
    from completed group by user_id,island
  )
  select b.user_id,b.display_name,b.life_stage,b.role,b.is_self,
    b.progress_shared,b.daily_shared,b.current_day,
    case when b.is_self or b.progress_shared then (select count(*)::int from ft_daily_checkins c where c.household_id=target_household and c.user_id=b.user_id and c.program_cycle=b.cycle and c.program_day between greatest(1,b.current_day-6) and b.current_day and c.status in('complete','modified')) else null end,
    case when b.is_self or b.progress_shared then coalesce((select s.streak from streaks s where s.user_id=b.user_id and s.last_day in(b.current_day,b.current_day-1) order by s.last_day desc limit 1),0) else null end,
    case when b.is_self or b.daily_shared then exists(select 1 from ft_daily_checkins c where c.household_id=target_household and c.user_id=b.user_id and c.program_cycle=b.cycle and c.program_day=b.current_day and c.status in('complete','modified')) else null end
  from base b order by b.is_self desc,b.display_name;
$$;

revoke all on function public.ft_family_dashboard(uuid) from public;
grant execute on function public.ft_family_dashboard(uuid) to authenticated;

commit;
