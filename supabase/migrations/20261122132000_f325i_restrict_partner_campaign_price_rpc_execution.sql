-- F3.25i: remove default PUBLIC execute on the new negotiated-price admin RPC.
revoke all on function public.admin_issue_partner_ad_payment(uuid,text,numeric) from public,anon,authenticated;
grant execute on function public.admin_issue_partner_ad_payment(uuid,text,numeric) to authenticated;
