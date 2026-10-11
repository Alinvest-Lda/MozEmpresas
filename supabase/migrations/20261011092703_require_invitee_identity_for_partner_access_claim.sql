create or replace function public.partner_access_claim(p_token_hash text, p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path to public, private
as $function$
declare
  v_email text;
  v_name text;
  v_account uuid;
begin
  if auth.uid() is null or p_user_id is distinct from auth.uid() then
    raise exception 'FORBIDDEN';
  end if;
  select g.email into v_email
  from private.partner_access_grants g
  where g.token_hash=p_token_hash and g.status='PENDING' and g.expires_at>now()
  for update;
  if v_email is null then raise exception 'INVALID_OR_EXPIRED_ACCESS'; end if;
  if not exists (select 1 from auth.users u where u.id=p_user_id and lower(u.email)=lower(v_email)) then
    raise exception 'EMAIL_MISMATCH';
  end if;
  select coalesce(nullif(trim(raw_user_meta_data->>'full_name'),''),split_part(email,'@',1))
  into v_name from auth.users where id=p_user_id;
  insert into public.profiles(id,full_name,user_type)
  values(p_user_id,v_name,'parceiro')
  on conflict(id) do update set user_type='parceiro',full_name=excluded.full_name;
  select id into v_account from public.partner_accounts
  where id in (select account_id from public.partner_account_members where user_id=p_user_id)
  limit 1;
  if v_account is null then
    insert into public.partner_accounts(name) values(v_name) returning id into v_account;
    insert into public.partner_account_members(account_id,user_id,role)
    values(v_account,p_user_id,'owner');
  end if;
  update private.partner_access_grants
  set status='ACCEPTED',accepted_user_id=p_user_id,accepted_at=now()
  where token_hash=p_token_hash and status='PENDING';
  return true;
end;
$function$;
revoke all on function public.partner_access_claim(text, uuid) from anon;
grant execute on function public.partner_access_claim(text, uuid) to authenticated;
