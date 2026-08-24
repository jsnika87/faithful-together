-- Faithful Together - private Apple Health step imports.
begin;

alter table public.ft_daily_checkins
  add column if not exists steps_source text not null default 'manual'
    check (steps_source in ('manual', 'apple_health')),
  add column if not exists steps_synced_at timestamptz;

create table if not exists public.ft_health_import_tokens (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  user_id uuid not null,
  token_hash text not null unique,
  active boolean not null default true,
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (household_id, user_id)
    references public.ft_household_members(household_id, user_id) on delete cascade
);

create unique index if not exists ft_health_import_tokens_one_active
  on public.ft_health_import_tokens(user_id) where active;

alter table public.ft_health_import_tokens enable row level security;
drop policy if exists ft_health_import_tokens_self_read on public.ft_health_import_tokens;
create policy ft_health_import_tokens_self_read on public.ft_health_import_tokens
  for select to authenticated using (user_id = auth.uid());

grant select on public.ft_health_import_tokens to authenticated;

commit;
