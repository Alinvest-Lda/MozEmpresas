-- F3.85: normalize legacy business promotion placements to canonical surface/slot keys.
update public.business_promotions
set placement='DIRECTORY',
    slot=case placement
      when 'DIRECTORY_BILLBOARD' then 'BILLBOARD'
      when 'DIRECTORY_FEATURED' then 'FEATURED'
      when 'DIRECTORY_SIDEBAR' then 'CONTEXT'
      when 'DIRECTORY_INFEED' then 'INFEED'
      else slot
    end
where placement in ('DIRECTORY_BILLBOARD','DIRECTORY_FEATURED','DIRECTORY_SIDEBAR','DIRECTORY_INFEED');

-- Product-backed campaigns inherit the canonical surface/slot of the product
-- instead of retaining an older campaign snapshot.
update public.business_promotions bp
set placement=p.placement,
    slot=p.slot,
    updated_at=now()
from public.ad_products p
where bp.ad_product_id=p.id
  and p.placement in ('DIRECTORY','MARKETPLACE','HOME','OPPORTUNITIES')
  and (bp.placement is distinct from p.placement or bp.slot is null);
