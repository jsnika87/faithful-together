-- Faithful Together - store an auditable iPhone + Apple Watch merged step total.
begin;

alter table public.ft_daily_checkins
  add column if not exists steps_watch integer,
  add column if not exists steps_phone integer,
  add column if not exists steps_overlap_buckets integer,
  add column if not exists steps_merge_method text;

alter table public.ft_daily_checkins drop constraint if exists ft_daily_checkins_steps_source_check;
alter table public.ft_daily_checkins add constraint ft_daily_checkins_steps_source_check
  check (steps_source in ('manual', 'apple_health', 'apple_health_merge'));

create or replace function public.ft_import_merged_health_steps(
  supplied_token_hash text, supplied_steps integer, supplied_watch_steps integer,
  supplied_phone_steps integer, supplied_overlap_buckets integer, supplied_date date
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  key_row public.ft_health_import_tokens;
  settings_row public.ft_member_settings;
  target_day integer;
begin
  if supplied_steps < 0 or supplied_steps > 100000
    or supplied_watch_steps < 0 or supplied_watch_steps > 100000
    or supplied_phone_steps < 0 or supplied_phone_steps > 100000 then
    raise exception 'Valid merged step totals required';
  end if;
  select * into key_row from public.ft_health_import_tokens
    where token_hash = supplied_token_hash and active limit 1;
  if key_row.id is null then raise exception 'Connection code is invalid or revoked'; end if;
  select * into settings_row from public.ft_member_settings
    where household_id = key_row.household_id and user_id = key_row.user_id;
  target_day := greatest(1, least(75,
    supplied_date - coalesce(settings_row.personal_start_date, supplied_date) + 1));
  insert into public.ft_daily_checkins (
    household_id,user_id,program_cycle,program_day,steps,steps_source,steps_synced_at,
    steps_watch,steps_phone,steps_overlap_buckets,steps_merge_method,updated_at
  ) values (
    key_row.household_id,key_row.user_id,coalesce(settings_row.program_cycle,1),target_day,
    supplied_steps,'apple_health_merge',now(),supplied_watch_steps,supplied_phone_steps,
    supplied_overlap_buckets,'five_minute_max',now()
  ) on conflict (household_id,user_id,program_cycle,program_day) do update set
    steps=excluded.steps,steps_source='apple_health_merge',steps_synced_at=now(),
    steps_watch=excluded.steps_watch,steps_phone=excluded.steps_phone,
    steps_overlap_buckets=excluded.steps_overlap_buckets,steps_merge_method='five_minute_max',updated_at=now();
  update public.ft_health_import_tokens set last_used_at=now() where id=key_row.id;
  return jsonb_build_object('saved',true,'steps',supplied_steps,'watch_steps',supplied_watch_steps,
    'phone_steps',supplied_phone_steps,'overlap_buckets',supplied_overlap_buckets,
    'date',supplied_date,'program_day',target_day,'method','five_minute_max');
end;
$$;

revoke all on function public.ft_import_merged_health_steps(text,integer,integer,integer,integer,date) from public;
grant execute on function public.ft_import_merged_health_steps(text,integer,integer,integer,integer,date) to service_role;
commit;
