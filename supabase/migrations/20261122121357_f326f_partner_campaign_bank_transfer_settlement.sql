
alter table public.financial_documents
 add column if not exists campaign_id uuid references public.partner_ad_campaigns(id) on delete set null;
alter table public.financial_payments
 add column if not exists campaign_id uuid references public.partner_ad_campaigns(id) on delete set null;
create index if not exists financial_documents_partner_campaign_idx on public.financial_documents(campaign_id);
create index if not exists financial_payments_partner_campaign_idx on public.financial_payments(campaign_id);

create or replace function public.admin_confirm_partner_bank_transfer(p_payment_id uuid,p_notes text default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp
as $$
declare
 v_payment public.financial_payments%rowtype;
 v_campaign_total numeric(14,2);
 v_campaign_price numeric(14,2);
 v_campaign_status text;
begin
 if auth.uid() is null or not public.is_super_admin() then raise exception 'FORBIDDEN'; end if;
 select * into v_payment from public.financial_payments where id=p_payment_id for update;
 if not found then raise exception 'PAYMENT_NOT_FOUND'; end if;
 if v_payment.method<>'BANK_TRANSFER' then raise exception 'INVALID_PAYMENT_METHOD'; end if;
 if v_payment.status<>'PENDING' then raise exception 'PAYMENT_NOT_PENDING'; end if;
 update public.financial_payments set status='CONFIRMED',verified_by=auth.uid(),verified_at=now(),
   confirmed_at=now(),verification_notes=nullif(trim(p_notes),'') where id=p_payment_id;
 if v_payment.campaign_id is not null then
   select price_mzn,status into v_campaign_price,v_campaign_status from public.partner_ad_campaigns where id=v_payment.campaign_id for update;
   if not found then raise exception 'CAMPAIGN_NOT_FOUND'; end if;
   select coalesce(sum(amount_mzn),0) into v_campaign_total from public.financial_payments where campaign_id=v_payment.campaign_id and status='CONFIRMED';
   if v_campaign_total>=v_campaign_price and v_campaign_status='REQUESTED' then
     update public.partner_ad_campaigns set status='APPROVED',updated_at=now() where id=v_payment.campaign_id;
   end if;
 end if;
 return jsonb_build_object('payment_id',p_payment_id,'status','CONFIRMED','campaign_id',v_payment.campaign_id,
   'campaign_paid_amount',coalesce(v_campaign_total,0),'campaign_price',v_campaign_price);
end;
$$;
revoke all on function public.admin_confirm_partner_bank_transfer(uuid,text) from public,anon;
grant execute on function public.admin_confirm_partner_bank_transfer(uuid,text) to authenticated;
