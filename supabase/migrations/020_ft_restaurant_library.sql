begin;

create table if not exists public.ft_restaurant_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.ft_households(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  visibility text not null default 'personal' check (visibility in ('personal','household')),
  restaurant_name text not null default '',
  item_name text not null,
  serving_label text not null default '1 menu item',
  calories numeric(8,1) not null default 0,
  protein_g numeric(8,1) not null default 0,
  carbs_g numeric(8,1) not null default 0,
  fat_g numeric(8,1) not null default 0,
  source_note text not null default 'Family verified',
  search_terms text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ft_restaurant_items_lookup
  on public.ft_restaurant_items (household_id, updated_at desc);

alter table public.ft_restaurant_items enable row level security;

create policy ft_restaurant_items_read on public.ft_restaurant_items
for select to authenticated using (
  public.ft_is_household_member(household_id)
  and (visibility = 'household' or owner_user_id = auth.uid())
);

create policy ft_restaurant_items_add on public.ft_restaurant_items
for insert to authenticated with check (
  owner_user_id = auth.uid()
  and public.ft_is_household_member(household_id)
);

create policy ft_restaurant_items_change on public.ft_restaurant_items
for update to authenticated using (
  owner_user_id = auth.uid() or public.ft_is_household_admin(household_id)
) with check (
  owner_user_id = auth.uid() or public.ft_is_household_admin(household_id)
);

create policy ft_restaurant_items_remove on public.ft_restaurant_items
for delete to authenticated using (
  owner_user_id = auth.uid() or public.ft_is_household_admin(household_id)
);

grant select, insert, update, delete on public.ft_restaurant_items to authenticated;

commit;
