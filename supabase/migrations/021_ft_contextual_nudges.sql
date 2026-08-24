begin;
alter table public.ft_notification_preferences
  add column if not exists smart_nudges_enabled boolean not null default false,
  add column if not exists hydration_nudge_time time not null default '14:00',
  add column if not exists movement_nudge_time time not null default '16:30',
  add column if not exists faithful_nudge_time time not null default '20:30',
  add column if not exists smart_nudges_sent_on date,
  add column if not exists smart_nudges_sent_count smallint not null default 0;
commit;
