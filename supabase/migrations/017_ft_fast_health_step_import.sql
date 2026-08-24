-- Faithful Together - perform step imports in one short transaction.
begin;

create or replace function public.ft_import_health_steps(
  supplied_token_hash text,
  supplied_steps integer,
  supplied_date date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  key_row public.ft_health_import_tokens;
  settings_row public.ft_member_settings;
  target_day integer;
begin
  if supplied_steps < 0 or supplied_steps > 100000 then
    raise exception 'Valid steps required';
  end if;

  select * into key_row
  from public.ft_health_import_tokens
  where token_hash = supplied_token_hash and active
  limit 1;

  if key_row.id is null then raise exception 'Connection code is invalid or revoked'; end if;

  select * into settings_row
  from public.ft_member_settings
  where household_id = key_row.household_id and user_id = key_row.user_id;

  target_day := greatest(1, least(75,
    supplied_date - coalesce(settings_row.personal_start_date, supplied_date) + 1
  ));

  insert into public.ft_daily_checkins (
    household_id, user_id, program_cycle, program_day,
    steps, steps_source, steps_synced_at, updated_at
  ) values (
    key_row.household_id, key_row.user_id, coalesce(settings_row.program_cycle, 1), target_day,
    supplied_steps, 'apple_health', now(), now()
  )
  on conflict (household_id, user_id, program_cycle, program_day)
  do update set
    steps = excluded.steps,
    steps_source = 'apple_health',
    steps_synced_at = now(),
    updated_at = now();

  update public.ft_health_import_tokens set last_used_at = now() where id = key_row.id;

  return jsonb_build_object(
    'saved', true,
    'steps', supplied_steps,
    'date', supplied_date,
    'program_day', target_day
  );
end;
$$;

revoke all on function public.ft_import_health_steps(text,integer,date) from public;
grant execute on function public.ft_import_health_steps(text,integer,date) to service_role;

commit;
