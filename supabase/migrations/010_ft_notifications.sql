begin;

create table if not exists public.ft_notification_preferences (
  household_id uuid not null,
  user_id uuid not null,
  checkin_enabled boolean not null default false,
  checkin_time time not null default '19:30',
  workout_enabled boolean not null default false,
  workout_time time not null default '07:00',
  weekly_review_enabled boolean not null default false,
  weekly_review_day smallint not null default 0 check (weekly_review_day between 0 and 6),
  weekly_review_time time not null default '18:00',
  encouragement_enabled boolean not null default false,
  timezone text not null default 'America/Chicago',
  last_checkin_sent_at timestamptz,
  last_workout_sent_at timestamptz,
  last_weekly_review_sent_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (household_id, user_id),
  foreign key (household_id, user_id)
    references public.ft_household_members(household_id, user_id) on delete cascade
);

create table if not exists public.ft_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  user_id uuid not null,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (household_id, user_id)
    references public.ft_household_members(household_id, user_id) on delete cascade
);

alter table public.ft_notification_preferences enable row level security;
alter table public.ft_push_subscriptions enable row level security;

drop policy if exists ft_notification_preferences_self on public.ft_notification_preferences;
create policy ft_notification_preferences_self on public.ft_notification_preferences
  for all to authenticated
  using (user_id = auth.uid() and public.ft_is_household_member(household_id))
  with check (user_id = auth.uid() and public.ft_is_household_member(household_id));

drop policy if exists ft_push_subscriptions_self on public.ft_push_subscriptions;
create policy ft_push_subscriptions_self on public.ft_push_subscriptions
  for all to authenticated
  using (user_id = auth.uid() and public.ft_is_household_member(household_id))
  with check (user_id = auth.uid() and public.ft_is_household_member(household_id));

grant select, insert, update, delete on public.ft_notification_preferences to authenticated;
grant select, insert, update, delete on public.ft_push_subscriptions to authenticated;

commit;
