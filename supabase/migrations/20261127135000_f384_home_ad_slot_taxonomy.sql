-- F3.84: reconcile legacy home sponsorship product codes with the canonical surface/slot vocabulary.
update public.partner_ad_products
set surface='HOME',
    slot=case code
      when 'PARTNER_HOME_TAKEOVER' then 'HERO'
      when 'PARTNER_INSTITUTIONAL_SPONSORSHIP' then 'EXCLUSIVE'
      else slot
    end
where code in ('PARTNER_HOME_TAKEOVER','PARTNER_INSTITUTIONAL_SPONSORSHIP');

update public.partner_ad_campaigns c
set surface=p.surface,slot=p.slot,updated_at=now()
from public.partner_ad_products p
where c.product_id=p.id
  and p.code in ('PARTNER_HOME_TAKEOVER','PARTNER_INSTITUTIONAL_SPONSORSHIP')
  and (c.surface is distinct from p.surface or c.slot is distinct from p.slot);

create or replace function public.home_ad_slots()
returns table(
  campaign_id uuid,product_code text,slot text,title text,body text,image_url text,
  target_url text,cta_label text,alt_text text,starts_at timestamptz,ends_at timestamptz
)
language sql
stable
security definer
set search_path=pg_catalog,public,pg_temp
as $function$
  select c.id,p.code,p.slot,c.title,c.body,c.image_url,c.target_url,c.cta_label,c.alt_text,c.starts_at,c.ends_at
  from public.partner_ad_campaigns c
  join public.partner_ad_products p on p.id=c.product_id
  where p.active=true and p.surface='HOME'
    and c.status='ACTIVE'
    and c.starts_at<=now() and c.ends_at>now()
    and (
      nullif(trim(c.title),'') is not null
      or nullif(trim(c.body),'') is not null
      or nullif(trim(c.image_url),'') is not null
    )
  order by c.priority desc nulls last,c.created_at desc
  limit 2;
$function$;
revoke all on function public.home_ad_slots() from public,anon;
grant execute on function public.home_ad_slots() to anon,authenticated;
