-- F3.42: close invitation self-escalation and restore the advertised admin flow.
revoke update on table public.business_invitations from authenticated;
grant update (accepted_at) on table public.business_invitations to authenticated;

create or replace function public.guard_business_invitation_immutable_fields()
returns trigger language plpgsql
set search_path = pg_catalog, public
as $function$
begin
  if row(new.id,new.business_id,new.email,new.role,new.invited_by,new.token_hash,new.expires_at,new.created_at)
     is distinct from
     row(old.id,old.business_id,old.email,old.role,old.invited_by,old.token_hash,old.expires_at,old.created_at)
  then
    raise exception 'INVITATION_IMMUTABLE_FIELDS';
  end if;
  return new;
end;
$function$;

revoke all on function public.guard_business_invitation_immutable_fields() from public,anon,authenticated;
drop trigger if exists guard_business_invitation_immutable_fields_trigger on public.business_invitations;
create trigger guard_business_invitation_immutable_fields_trigger
before update on public.business_invitations
for each row execute function public.guard_business_invitation_immutable_fields();

drop policy if exists business_invitations_admin_read on public.business_invitations;
create policy business_invitations_admin_read
on public.business_invitations for select to authenticated
using (
  exists(select 1 from public.business_members bm
    where bm.business_id=business_invitations.business_id
      and bm.user_id=(select auth.uid()) and bm.role='admin')
);

drop policy if exists business_invitations_admin_insert on public.business_invitations;
create policy business_invitations_admin_insert
on public.business_invitations for insert to authenticated
with check (
  exists(select 1 from public.business_members bm
    where bm.business_id=business_invitations.business_id
      and bm.user_id=(select auth.uid()) and bm.role='admin')
);
