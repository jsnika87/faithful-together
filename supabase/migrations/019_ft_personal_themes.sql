-- Faithful Together - each family member chooses their own visual theme.
begin;

alter table public.ft_member_settings
  add column if not exists color_scheme text not null default 'sage';

alter table public.ft_member_settings
  drop constraint if exists ft_member_settings_color_scheme_check;

alter table public.ft_member_settings
  add constraint ft_member_settings_color_scheme_check
  check (color_scheme in ('sage','navy','forest','charcoal','plum'));

commit;
