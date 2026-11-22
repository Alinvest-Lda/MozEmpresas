-- F3.25c: only Super Admin can associate a partner account with its legal business wallet.
create or replace function public.admin_link_partner_business(p_account_id uuid,p_business_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp
as $function$
declare v_actor uuid:=auth.uid();
begin
  if v_actor is null or not exists(select 1 from public.platform_members pm where pm.user_id=v_actor and pm.active=true and pm.role='super_admin') then raise exception 'FORBIDDEN'; end if;
  if p_business_id is not null and not exists(select 1 from public.businesses b where b.id=p_business_id and b.archived_at is null) then raise exception 'BUSINESS_NOT_AVAILABLE'; end if;
  update public.partner_accounts set business_id=p_business_id,updated_at=now() where id=p_account_id;
  if not found then raise exception 'PARTNER_ACCOUNT_NOT_FOUND'; end if;
exception when unique_violation then raise exception 'BUSINESS_ALREADY_LINKED_TO_PARTNER';
end;
$function$;
revoke all on function public.admin_link_partner_business(uuid,uuid) from public,anon,authenticated;
grant execute on function public.admin_link_partner_business(uuid,uuid) to authenticated;
