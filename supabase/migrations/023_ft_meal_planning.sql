begin;
create table if not exists public.ft_meal_plans(
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.ft_households(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  assigned_to uuid references auth.users(id),
  planned_for date not null,
  meal text not null default 'dinner' check(meal in('breakfast','lunch','dinner','snack','meal')),
  title text not null check(length(title) between 1 and 160),
  meal_description text not null,
  ingredients text,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.ft_meal_plans enable row level security;
drop policy if exists ft_meal_plans_read on public.ft_meal_plans;
create policy ft_meal_plans_read on public.ft_meal_plans for select to authenticated using(public.ft_is_household_member(household_id));
drop policy if exists ft_meal_plans_add on public.ft_meal_plans;
create policy ft_meal_plans_add on public.ft_meal_plans for insert to authenticated with check(created_by=auth.uid() and public.ft_is_household_member(household_id));
drop policy if exists ft_meal_plans_change on public.ft_meal_plans;
create policy ft_meal_plans_change on public.ft_meal_plans for update to authenticated using(created_by=auth.uid() or assigned_to=auth.uid() or public.ft_is_household_admin(household_id));
drop policy if exists ft_meal_plans_remove on public.ft_meal_plans;
create policy ft_meal_plans_remove on public.ft_meal_plans for delete to authenticated using(created_by=auth.uid() or public.ft_is_household_admin(household_id));
grant select,insert,update,delete on public.ft_meal_plans to authenticated;
commit;
