begin;
alter table public.ft_daily_checkins add column if not exists morning_saved_at timestamptz;
alter table public.ft_daily_checkins add column if not exists evening_saved_at timestamptz;
commit;
