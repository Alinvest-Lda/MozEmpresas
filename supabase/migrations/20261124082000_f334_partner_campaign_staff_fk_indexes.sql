create index if not exists partner_ad_campaigns_assigned_operations_user_id_idx
  on public.partner_ad_campaigns (assigned_operations_user_id)
  where assigned_operations_user_id is not null;

create index if not exists partner_ad_campaigns_created_by_internal_user_id_idx
  on public.partner_ad_campaigns (created_by_internal_user_id)
  where created_by_internal_user_id is not null;