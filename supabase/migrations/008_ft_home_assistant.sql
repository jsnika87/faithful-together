begin;
create table if not exists public.ft_home_entities(household_id uuid not null references public.ft_households(id) on delete cascade,entity_id text not null,display_name text not null,domain text not null check(domain in('light','switch','scene')),enabled boolean not null default true,updated_at timestamptz not null default now(),primary key(household_id,entity_id));
alter table public.ft_home_entities enable row level security;
revoke all on public.ft_home_entities from anon,authenticated;
commit;
