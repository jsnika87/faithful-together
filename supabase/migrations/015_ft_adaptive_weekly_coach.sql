-- Faithful Together - private weekly reflections and adaptive coaching notes.
begin;

create table if not exists public.ft_weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null,
  user_id uuid not null,
  week_ending date not null,
  strongest_moment text,
  hardest_moment text,
  prayer_intention text,
  next_week_priorities text,
  coach_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (household_id, user_id, week_ending),
  foreign key (household_id, user_id)
    references public.ft_household_members(household_id, user_id) on delete cascade
);

alter table public.ft_weekly_reviews enable row level security;
drop policy if exists ft_weekly_reviews_self on public.ft_weekly_reviews;
create policy ft_weekly_reviews_self on public.ft_weekly_reviews
  for all to authenticated
  using (user_id = auth.uid() and public.ft_is_household_member(household_id))
  with check (user_id = auth.uid() and public.ft_is_household_member(household_id));

grant select, insert, update, delete on public.ft_weekly_reviews to authenticated;

commit;
