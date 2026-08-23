begin;
create table if not exists public.ft_calendar_credentials(
 id uuid primary key default gen_random_uuid(),household_id uuid not null references public.ft_households(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,provider text not null check(provider in('google','icloud')),
 provider_account text,access_token text,refresh_token text,token_expires_at timestamptz,scope text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(household_id,user_id,provider));
create table if not exists public.ft_calendar_oauth_states(
 state uuid primary key default gen_random_uuid(),household_id uuid not null references public.ft_households(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,expires_at timestamptz not null default(now()+interval '10 minutes'));
alter table public.ft_calendar_credentials enable row level security;
alter table public.ft_calendar_oauth_states enable row level security;
revoke all on public.ft_calendar_credentials from anon,authenticated;
revoke all on public.ft_calendar_oauth_states from anon,authenticated;
commit;
