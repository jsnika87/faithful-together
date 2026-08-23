begin;
alter table public.ft_home_entities add column if not exists room text not null default 'Other';
commit;
