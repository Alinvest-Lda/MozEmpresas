-- F331: append-only history and evidence gates for financial audit issue actions.
create table if not exists public.financial_audit_issue_action_history (
  id bigint generated always as identity primary key,
  issue_key text not null,
  issue_code text,
  record_id uuid,
  module text,
  previous_status text,
  new_status text not null,
  previous_assigned_to uuid,
  new_assigned_to uuid,
  resolution_note text,
  evidence_reference text,
  actor uuid,
  created_at timestamptz not null default now()
);
alter table public.financial_audit_issue_action_history enable row level security;
revoke all on public.financial_audit_issue_action_history from public, anon, authenticated;
grant select, insert on public.financial_audit_issue_action_history to service_role;
revoke all on sequence public.financial_audit_issue_action_history_id_seq from public, anon, authenticated;
grant usage, select on sequence public.financial_audit_issue_action_history_id_seq to service_role;

create or replace function public.f331_capture_financial_audit_action_history()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.status = 'RESOLVED' and (nullif(trim(coalesce(new.resolution_note,'')),'') is null or nullif(trim(coalesce(new.evidence_reference,'')),'') is null) then
    raise exception 'RESOLUTION_REQUIRES_NOTE_AND_EVIDENCE';
  end if;
  if tg_op = 'INSERT' then
    insert into public.financial_audit_issue_action_history(issue_key,issue_code,record_id,module,previous_status,new_status,previous_assigned_to,new_assigned_to,resolution_note,evidence_reference,actor)
    values(new.issue_key,new.issue_code,new.record_id,new.module,null,new.status,null,new.assigned_to,new.resolution_note,new.evidence_reference,auth.uid());
    return new;
  end if;
  if row(new.status,new.assigned_to,new.resolution_note,new.evidence_reference) is distinct from row(old.status,old.assigned_to,old.resolution_note,old.evidence_reference) then
    insert into public.financial_audit_issue_action_history(issue_key,issue_code,record_id,module,previous_status,new_status,previous_assigned_to,new_assigned_to,resolution_note,evidence_reference,actor)
    values(new.issue_key,new.issue_code,new.record_id,new.module,old.status,new.status,old.assigned_to,new.assigned_to,new.resolution_note,new.evidence_reference,auth.uid());
  end if;
  return new;
end $$;
drop trigger if exists f331_financial_audit_action_history on public.financial_audit_issue_actions;
create trigger f331_financial_audit_action_history before insert or update on public.financial_audit_issue_actions for each row execute function public.f331_capture_financial_audit_action_history();

create or replace function public.f331_restrict_financial_audit_history_mutation()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin raise exception 'FINANCIAL_AUDIT_HISTORY_IMMUTABLE'; end $$;
drop trigger if exists f331_financial_audit_history_immutable on public.financial_audit_issue_action_history;
create trigger f331_financial_audit_history_immutable before update or delete on public.financial_audit_issue_action_history for each row execute function public.f331_restrict_financial_audit_history_mutation();

create or replace function public.admin_financial_audit_issue_history_f331(p_issue_key text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_actor uuid := auth.uid(); v_rows jsonb;
begin
 if v_actor is null or not exists(select 1 from public.platform_members pm where pm.user_id=v_actor and pm.active=true and pm.role='super_admin') then raise exception 'FORBIDDEN'; end if;
 if p_issue_key !~ '^[a-f0-9]{32}$' then raise exception 'INVALID_ISSUE_KEY'; end if;
 select coalesce(jsonb_agg(jsonb_build_object('id',h.id,'previous_status',h.previous_status,'new_status',h.new_status,'previous_assigned_to',h.previous_assigned_to,'new_assigned_to',h.new_assigned_to,'resolution_note',h.resolution_note,'evidence_reference',h.evidence_reference,'actor',h.actor,'created_at',h.created_at) order by h.created_at desc),'[]'::jsonb)
 into v_rows from public.financial_audit_issue_action_history h where h.issue_key=p_issue_key;
 return jsonb_build_object('issue_key',p_issue_key,'history',v_rows);
end $$;
revoke all on function public.admin_financial_audit_issue_history_f331(text) from public, anon;
grant execute on function public.admin_financial_audit_issue_history_f331(text) to authenticated, service_role;
