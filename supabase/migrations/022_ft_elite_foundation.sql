-- Faithful Together elite foundation: shared lists, private daily plans, and diagnostics.
begin;

alter table public.ft_tasks drop constraint if exists ft_tasks_category_check;
alter table public.ft_tasks add constraint ft_tasks_category_check
  check(category in('personal','family','faith','health','home','meal'));

create table if not exists public.ft_household_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.ft_households(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  assigned_to uuid references auth.users(id),
  kind text not null check(kind in('grocery','prayer','meeting')),
  title text not null check(length(title) between 1 and 240),
  notes text,
  private boolean not null default false,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.ft_household_items enable row level security;
drop policy if exists ft_household_items_read on public.ft_household_items;
create policy ft_household_items_read on public.ft_household_items for select to authenticated
  using(public.ft_is_household_member(household_id) and (not private or created_by=auth.uid() or assigned_to=auth.uid()));
drop policy if exists ft_household_items_add on public.ft_household_items;
create policy ft_household_items_add on public.ft_household_items for insert to authenticated
  with check(created_by=auth.uid() and public.ft_is_household_member(household_id));
drop policy if exists ft_household_items_change on public.ft_household_items;
create policy ft_household_items_change on public.ft_household_items for update to authenticated
  using(created_by=auth.uid() or assigned_to=auth.uid() or public.ft_is_household_admin(household_id));
drop policy if exists ft_household_items_remove on public.ft_household_items;
create policy ft_household_items_remove on public.ft_household_items for delete to authenticated
  using(created_by=auth.uid() or public.ft_is_household_admin(household_id));
grant select,insert,update,delete on public.ft_household_items to authenticated;

create table if not exists public.ft_daily_plans (
  household_id uuid not null,
  user_id uuid not null,
  planned_on date not null,
  focus text,
  simplified boolean not null default false,
  prepared_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(household_id,user_id,planned_on),
  foreign key(household_id,user_id) references public.ft_household_members(household_id,user_id) on delete cascade
);
alter table public.ft_daily_plans enable row level security;
drop policy if exists ft_daily_plans_self on public.ft_daily_plans;
create policy ft_daily_plans_self on public.ft_daily_plans for all to authenticated
  using(user_id=auth.uid() and public.ft_is_household_member(household_id))
  with check(user_id=auth.uid() and public.ft_is_household_member(household_id));
grant select,insert,update,delete on public.ft_daily_plans to authenticated;

create table if not exists public.ft_app_events (
  id bigint generated always as identity primary key,
  household_id uuid,
  user_id uuid not null references auth.users(id) on delete cascade,
  level text not null default 'info' check(level in('info','warning','error')),
  area text not null,
  message text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.ft_app_events enable row level security;
drop policy if exists ft_app_events_self on public.ft_app_events;
create policy ft_app_events_self on public.ft_app_events for all to authenticated
  using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select,insert,delete on public.ft_app_events to authenticated;

commit;
