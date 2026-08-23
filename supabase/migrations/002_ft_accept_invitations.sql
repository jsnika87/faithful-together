-- Faithful Together - allow an existing Supabase user to accept a family invitation.
begin;

create or replace function public.ft_accept_my_invitations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  accepted_count integer := 0;
  current_email text;
begin
  select email into current_email from auth.users where id = auth.uid();
  if current_email is null then return 0; end if;

  insert into public.ft_household_members (household_id, user_id, role, life_stage)
  select invitation.household_id, auth.uid(), invitation.role, invitation.life_stage
  from public.ft_household_invitations invitation
  where lower(invitation.email) = lower(current_email)
    and invitation.accepted_at is null
    and invitation.expires_at > now()
  on conflict (household_id, user_id) do nothing;
  get diagnostics accepted_count = row_count;

  insert into public.ft_member_settings (household_id, user_id, step_goal, sleep_goal_minutes, movement_goal_minutes, scripture_goal_minutes)
  select member.household_id, member.user_id,
    case when member.life_stage = 'teen' then 8000 else 7000 end,
    case when member.life_stage = 'teen' then 540 else 420 end,
    case when member.life_stage = 'teen' then 60 else 20 end,
    case when member.life_stage = 'teen' then 10 else 20 end
  from public.ft_household_members member
  where member.user_id = auth.uid()
  on conflict (household_id, user_id) do nothing;

  update public.ft_household_invitations set accepted_at = now()
  where lower(email) = lower(current_email) and accepted_at is null and expires_at > now();
  return accepted_count;
end;
$$;

revoke all on function public.ft_accept_my_invitations() from public;
grant execute on function public.ft_accept_my_invitations() to authenticated;
commit;
