begin;
create table if not exists public.ft_routines(
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.ft_households(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, title text not null check(length(title) between 1 and 160),
 category text not null default 'personal' check(category in('personal','faith','health','home','meal')),
 days_of_week int[] not null default array[1,2,3,4,5,6,0], due_time time, enabled boolean not null default true,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(household_id,user_id) references public.ft_household_members(household_id,user_id) on delete cascade
);
alter table public.ft_routines enable row level security;
drop policy if exists ft_routines_self on public.ft_routines;
create policy ft_routines_self on public.ft_routines for all to authenticated using(user_id=auth.uid() and public.ft_is_household_member(household_id)) with check(user_id=auth.uid() and public.ft_is_household_member(household_id));
grant select,insert,update,delete on public.ft_routines to authenticated;
alter table public.ft_tasks add column if not exists routine_id uuid references public.ft_routines(id) on delete set null;
create unique index if not exists ft_tasks_routine_day_unique on public.ft_tasks(assigned_to,routine_id,due_date) where routine_id is not null;
create or replace function public.ft_generate_my_routines(for_date date default current_date) returns integer language plpgsql security definer set search_path=public as $$
declare r public.ft_routines; made integer:=0;
begin
 for r in select * from public.ft_routines where user_id=auth.uid() and enabled and extract(dow from for_date)::int=any(days_of_week) loop
  insert into public.ft_tasks(household_id,created_by,assigned_to,title,category,visibility,priority,due_date,due_time,recurrence,routine_id)
  values(r.household_id,r.user_id,r.user_id,r.title,r.category,'private','normal',for_date,r.due_time,'none',r.id)
  on conflict(assigned_to,routine_id,due_date) where routine_id is not null do nothing;
  if found then made:=made+1;end if;
 end loop;return made;
end;$$;
revoke all on function public.ft_generate_my_routines(date) from public;
grant execute on function public.ft_generate_my_routines(date) to authenticated;
commit;
