-- Faithful Together - Supabase family identity and privacy foundation
-- Run once in Supabase Studio > SQL Editor as the database owner.

begin;

create extension if not exists pgcrypto;

create table if not exists public.ft_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text not null default 'New member',
  avatar_color text not null default 'sage',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ft_households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ft_household_members (
  household_id uuid not null references public.ft_households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  life_stage text not null default 'adult' check (life_stage in ('teen', 'adult')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table if not exists public.ft_household_invitations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.ft_households(id) on delete cascade,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  life_stage text not null default 'adult' check (life_stage in ('teen', 'adult')),
  invited_by uuid not null references auth.users(id),
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now()
);

create unique index if not exists ft_household_invitations_active_email_idx
  on public.ft_household_invitations (household_id, lower(email))
  where accepted_at is null;

create table if not exists public.ft_household_settings (
  household_id uuid primary key references public.ft_households(id) on delete cascade,
  program_name text not null default 'Faithful Together',
  shared_start_date date,
  weekly_review_day smallint not null default 0 check (weekly_review_day between 0 and 6),
  quiet_hours_start time not null default '21:00',
  quiet_hours_end time not null default '06:00',
  shared_daily_action_enabled boolean not null default true,
  encouragement_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.ft_member_settings (
  household_id uuid not null,
  user_id uuid not null,
  personal_start_date date,
  goal_weight_lbs numeric(5,1),
  step_goal integer not null default 7000 check (step_goal between 0 and 100000),
  hydration_goal_oz integer check (hydration_goal_oz between 0 and 500),
  sleep_goal_minutes integer not null default 420 check (sleep_goal_minutes between 0 and 1440),
  movement_goal_minutes integer not null default 20 check (movement_goal_minutes between 0 and 1440),
  scripture_goal_minutes integer not null default 20 check (scripture_goal_minutes between 0 and 1440),
  reminders_enabled boolean not null default true,
  show_weight_to_household boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (household_id, user_id),
  foreign key (household_id, user_id)
    references public.ft_household_members(household_id, user_id) on delete cascade
);

create table if not exists public.ft_exercise_substitutions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  user_id uuid not null,
  original_exercise text not null,
  replacement_exercise text not null,
  reason text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (household_id, user_id)
    references public.ft_household_members(household_id, user_id) on delete cascade
);

create index if not exists ft_exercise_substitutions_member_idx
  on public.ft_exercise_substitutions (household_id, user_id)
  where active = true;

create table if not exists public.ft_integrations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.ft_households(id) on delete cascade,
  kind text not null check (kind in ('calendar', 'smart_home', 'wearable', 'tasks')),
  provider text not null,
  display_label text not null,
  status text not null default 'planned' check (status in ('planned', 'connected', 'attention')),
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, kind, provider)
);

create or replace function public.ft_is_household_member(target_household uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.ft_household_members
    where household_id = target_household and user_id = auth.uid()
  );
$$;

create or replace function public.ft_is_household_admin(target_household uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.ft_household_members
    where household_id = target_household and user_id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.ft_share_household_with(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.ft_household_members mine
    join public.ft_household_members theirs using (household_id)
    where mine.user_id = auth.uid() and theirs.user_id = target_user
  );
$$;

create or replace function public.ft_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ft_profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(coalesce(new.email, 'Member'), '@', 1))
  )
  on conflict (id) do update set email = excluded.email, updated_at = now();

  insert into public.ft_household_members (household_id, user_id, role, life_stage)
  select invitation.household_id, new.id, invitation.role, invitation.life_stage
  from public.ft_household_invitations invitation
  where lower(invitation.email) = lower(new.email)
    and invitation.accepted_at is null
    and invitation.expires_at > now()
  on conflict (household_id, user_id) do nothing;

  insert into public.ft_member_settings (household_id, user_id, step_goal, sleep_goal_minutes, movement_goal_minutes, scripture_goal_minutes)
  select member.household_id, member.user_id,
    case when member.life_stage = 'teen' then 8000 else 7000 end,
    case when member.life_stage = 'teen' then 540 else 420 end,
    case when member.life_stage = 'teen' then 60 else 20 end,
    case when member.life_stage = 'teen' then 10 else 20 end
  from public.ft_household_members member
  where member.user_id = new.id
  on conflict (household_id, user_id) do nothing;

  update public.ft_household_invitations
  set accepted_at = now()
  where lower(email) = lower(new.email)
    and accepted_at is null
    and expires_at > now();

  return new;
end;
$$;

drop trigger if exists ft_on_auth_user_created on auth.users;
create trigger ft_on_auth_user_created
  after insert or update of email on auth.users
  for each row execute function public.ft_handle_new_user();

create or replace function public.ft_handle_new_household()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.ft_household_members (household_id, user_id, role, life_stage)
  values (new.id, new.created_by, 'admin', 'adult')
  on conflict do nothing;

  insert into public.ft_household_settings (household_id)
  values (new.id)
  on conflict do nothing;

  insert into public.ft_member_settings (household_id, user_id)
  values (new.id, new.created_by)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists ft_on_household_created on public.ft_households;
create trigger ft_on_household_created
  after insert on public.ft_households
  for each row execute function public.ft_handle_new_household();

alter table public.ft_profiles enable row level security;
alter table public.ft_households enable row level security;
alter table public.ft_household_members enable row level security;
alter table public.ft_household_invitations enable row level security;
alter table public.ft_household_settings enable row level security;
alter table public.ft_member_settings enable row level security;
alter table public.ft_exercise_substitutions enable row level security;
alter table public.ft_integrations enable row level security;

drop policy if exists ft_profiles_select_household on public.ft_profiles;
create policy ft_profiles_select_household on public.ft_profiles for select to authenticated
  using (id = auth.uid() or public.ft_share_household_with(id));
drop policy if exists ft_profiles_update_self on public.ft_profiles;
create policy ft_profiles_update_self on public.ft_profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists ft_households_select_member on public.ft_households;
create policy ft_households_select_member on public.ft_households for select to authenticated
  using (public.ft_is_household_member(id));
drop policy if exists ft_households_insert_owner on public.ft_households;
create policy ft_households_insert_owner on public.ft_households for insert to authenticated
  with check (created_by = auth.uid());
drop policy if exists ft_households_update_admin on public.ft_households;
create policy ft_households_update_admin on public.ft_households for update to authenticated
  using (public.ft_is_household_admin(id)) with check (public.ft_is_household_admin(id));

drop policy if exists ft_members_select_household on public.ft_household_members;
create policy ft_members_select_household on public.ft_household_members for select to authenticated
  using (public.ft_is_household_member(household_id));
drop policy if exists ft_members_manage_admin on public.ft_household_members;
create policy ft_members_manage_admin on public.ft_household_members for all to authenticated
  using (public.ft_is_household_admin(household_id))
  with check (public.ft_is_household_admin(household_id));

drop policy if exists ft_invitations_manage_admin on public.ft_household_invitations;
create policy ft_invitations_manage_admin on public.ft_household_invitations for all to authenticated
  using (public.ft_is_household_admin(household_id))
  with check (public.ft_is_household_admin(household_id) and invited_by = auth.uid());

drop policy if exists ft_household_settings_select_member on public.ft_household_settings;
create policy ft_household_settings_select_member on public.ft_household_settings for select to authenticated
  using (public.ft_is_household_member(household_id));
drop policy if exists ft_household_settings_manage_admin on public.ft_household_settings;
create policy ft_household_settings_manage_admin on public.ft_household_settings for all to authenticated
  using (public.ft_is_household_admin(household_id))
  with check (public.ft_is_household_admin(household_id));

drop policy if exists ft_member_settings_select_owner_or_admin on public.ft_member_settings;
create policy ft_member_settings_select_owner_or_admin on public.ft_member_settings for select to authenticated
  using (user_id = auth.uid() or public.ft_is_household_admin(household_id));
drop policy if exists ft_member_settings_manage_owner_or_admin on public.ft_member_settings;
create policy ft_member_settings_manage_owner_or_admin on public.ft_member_settings for all to authenticated
  using (user_id = auth.uid() or public.ft_is_household_admin(household_id))
  with check (user_id = auth.uid() or public.ft_is_household_admin(household_id));

drop policy if exists ft_substitutions_select_owner_or_admin on public.ft_exercise_substitutions;
create policy ft_substitutions_select_owner_or_admin on public.ft_exercise_substitutions for select to authenticated
  using (user_id = auth.uid() or public.ft_is_household_admin(household_id));
drop policy if exists ft_substitutions_manage_owner_or_admin on public.ft_exercise_substitutions;
create policy ft_substitutions_manage_owner_or_admin on public.ft_exercise_substitutions for all to authenticated
  using (user_id = auth.uid() or public.ft_is_household_admin(household_id))
  with check (user_id = auth.uid() or public.ft_is_household_admin(household_id));

drop policy if exists ft_integrations_select_member on public.ft_integrations;
create policy ft_integrations_select_member on public.ft_integrations for select to authenticated
  using (public.ft_is_household_member(household_id));
drop policy if exists ft_integrations_manage_admin on public.ft_integrations;
create policy ft_integrations_manage_admin on public.ft_integrations for all to authenticated
  using (public.ft_is_household_admin(household_id))
  with check (public.ft_is_household_admin(household_id));

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.ft_profiles to authenticated;
grant select, insert, update, delete on public.ft_households to authenticated;
grant select, insert, update, delete on public.ft_household_members to authenticated;
grant select, insert, update, delete on public.ft_household_invitations to authenticated;
grant select, insert, update, delete on public.ft_household_settings to authenticated;
grant select, insert, update, delete on public.ft_member_settings to authenticated;
grant select, insert, update, delete on public.ft_exercise_substitutions to authenticated;
grant select, insert, update, delete on public.ft_integrations to authenticated;
grant execute on function public.ft_is_household_member(uuid) to authenticated;
grant execute on function public.ft_is_household_admin(uuid) to authenticated;
grant execute on function public.ft_share_household_with(uuid) to authenticated;

commit;
