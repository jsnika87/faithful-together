begin;
create table if not exists public.ft_recipes(
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.ft_households(id) on delete cascade,
 created_by uuid not null references auth.users(id), name text not null check(length(name) between 1 and 160),
 ingredient_text text not null, instructions text, portion_notes text, yield_servings numeric(6,2) not null default 1 check(yield_servings>0),
 calories_total numeric(10,1), protein_total_g numeric(10,1), carbs_total_g numeric(10,1), fat_total_g numeric(10,1),
 shared boolean not null default true, source_note text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.ft_recipes enable row level security;
drop policy if exists ft_recipes_read on public.ft_recipes;
create policy ft_recipes_read on public.ft_recipes for select to authenticated using(public.ft_is_household_member(household_id) and (shared or created_by=auth.uid()));
drop policy if exists ft_recipes_add on public.ft_recipes;
create policy ft_recipes_add on public.ft_recipes for insert to authenticated with check(created_by=auth.uid() and public.ft_is_household_member(household_id));
drop policy if exists ft_recipes_change on public.ft_recipes;
create policy ft_recipes_change on public.ft_recipes for update to authenticated using(created_by=auth.uid() or public.ft_is_household_admin(household_id));
drop policy if exists ft_recipes_remove on public.ft_recipes;
create policy ft_recipes_remove on public.ft_recipes for delete to authenticated using(created_by=auth.uid() or public.ft_is_household_admin(household_id));
grant select,insert,update,delete on public.ft_recipes to authenticated;
commit;
