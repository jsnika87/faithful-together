begin;
create table if not exists public.ft_meal_templates(id uuid primary key default gen_random_uuid(),household_id uuid not null,user_id uuid not null,kind text not null check(kind in('recent','favorite')),name text not null,meal_text text not null,meal text not null default 'meal',last_used_at timestamptz not null default now(),created_at timestamptz not null default now(),foreign key(household_id,user_id) references public.ft_household_members(household_id,user_id) on delete cascade);
alter table public.ft_meal_templates enable row level security;
create policy ft_meal_templates_self on public.ft_meal_templates for all to authenticated using(user_id=auth.uid() and public.ft_is_household_member(household_id)) with check(user_id=auth.uid() and public.ft_is_household_member(household_id));
grant select,insert,update,delete on public.ft_meal_templates to authenticated;
commit;
