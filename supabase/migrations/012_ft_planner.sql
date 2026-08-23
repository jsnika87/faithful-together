begin;
create table if not exists public.ft_tasks(
 id uuid primary key default gen_random_uuid(), household_id uuid not null references public.ft_households(id) on delete cascade,
 created_by uuid not null references auth.users(id), assigned_to uuid not null references auth.users(id), title text not null check(length(title) between 1 and 160),
 notes text, category text not null default 'personal' check(category in('personal','family','faith','health','home')),
 visibility text not null default 'household' check(visibility in('household','private')), priority text not null default 'normal' check(priority in('low','normal','high')),
 due_date date, due_time time, recurrence text not null default 'none' check(recurrence in('none','daily','weekly')),
 status text not null default 'open' check(status in('open','complete')), completed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.ft_tasks enable row level security;
create policy ft_tasks_read on public.ft_tasks for select to authenticated using(public.ft_is_household_member(household_id) and (visibility='household' or created_by=auth.uid() or assigned_to=auth.uid()));
create policy ft_tasks_add on public.ft_tasks for insert to authenticated with check(created_by=auth.uid() and public.ft_is_household_member(household_id) and public.ft_share_household_with(assigned_to));
create policy ft_tasks_change on public.ft_tasks for update to authenticated using(created_by=auth.uid() or assigned_to=auth.uid()) with check(created_by=auth.uid() or assigned_to=auth.uid());
create policy ft_tasks_remove on public.ft_tasks for delete to authenticated using(created_by=auth.uid() or public.ft_is_household_admin(household_id));
grant select,insert,update,delete on public.ft_tasks to authenticated;
create or replace function public.ft_complete_task(task_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare t ft_tasks; next_date date;
begin select * into t from ft_tasks where id=task_id and (created_by=auth.uid() or assigned_to=auth.uid());if t.id is null then raise exception 'Task not found';end if;
 update ft_tasks set status='complete',completed_at=now(),updated_at=now() where id=t.id;
 if t.recurrence<>'none' then next_date=coalesce(t.due_date,current_date)+(case when t.recurrence='daily' then 1 else 7 end);insert into ft_tasks(household_id,created_by,assigned_to,title,notes,category,visibility,priority,due_date,due_time,recurrence) values(t.household_id,t.created_by,t.assigned_to,t.title,t.notes,t.category,t.visibility,t.priority,next_date,t.due_time,t.recurrence);end if;
end;$$;
revoke all on function public.ft_complete_task(uuid) from public;grant execute on function public.ft_complete_task(uuid) to authenticated;
commit;
