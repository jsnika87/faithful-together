begin;
alter table public.ft_calendar_credentials add column if not exists selected_calendar_ids text[];
commit;
