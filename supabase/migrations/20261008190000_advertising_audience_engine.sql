-- MozEmpresas Advertising & Audience Engine
alter table public.business_promotions
  add column if not exists campaign_kind text not null default 'AUCTION',
  add column if not exists priority integer not null default 50,
  add column if not exists bid_cpm numeric not null default 0,
  add column if not exists frequency_cap integer not null default 2,
  add column if not exists target_interests text[] not null default '{}',
  add column if not exists target_locations text[] not null default '{}';

alter table public.partner_ad_campaigns
  add column if not exists campaign_kind text not null default 'GUARANTEED',
  add column if not exists priority integer not null default 70,
  add column if not exists bid_cpm numeric not null default 0,
  add column if not exists frequency_cap integer not null default 2,
  add column if not exists target_interests text[] not null default '{}',
  add column if not exists target_locations text[] not null default '{}';

alter table public.advertising_requests
  add column if not exists audience_mode text not null default 'CONTEXTUAL',
  add column if not exists budget numeric,
  add column if not exists bid_cpm numeric,
  add column if not exists frequency_cap integer not null default 2,
  add column if not exists target_interests text[] not null default '{}',
  add column if not exists target_locations text[] not null default '{}';

create table if not exists public.ad_visitor_profiles (
  visitor_key text primary key,
  user_id uuid null references auth.users(id) on delete set null,
  interests jsonb not null default '{}'::jsonb,
  last_context jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create table if not exists public.ad_delivery_events (
  id uuid primary key default gen_random_uuid(),
  visitor_key text not null,
  user_id uuid null references auth.users(id) on delete set null,
  campaign_source text not null,
  campaign_id uuid not null,
  surface text not null,
  slot text not null,
  event_type text not null check (event_type in ('IMPRESSION','CLICK')),
  context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ad_delivery_frequency_idx on public.ad_delivery_events(visitor_key,campaign_source,campaign_id,event_type,created_at desc);
create index if not exists ad_delivery_context_idx on public.ad_delivery_events(surface,slot,event_type,created_at desc);
create index if not exists ad_visitor_profiles_last_seen_idx on public.ad_visitor_profiles(last_seen_at desc);

alter table public.ad_visitor_profiles enable row level security;
alter table public.ad_delivery_events enable row level security;

drop policy if exists ad_visitor_profiles_insert on public.ad_visitor_profiles;
drop policy if exists ad_visitor_profiles_update on public.ad_visitor_profiles;
drop policy if exists ad_delivery_events_insert on public.ad_delivery_events;

create policy ad_visitor_profiles_insert on public.ad_visitor_profiles for insert to anon,authenticated with check (user_id is null or user_id=(select auth.uid()));
create policy ad_visitor_profiles_update on public.ad_visitor_profiles for update to anon,authenticated using (user_id is null or user_id=(select auth.uid())) with check (user_id is null or user_id=(select auth.uid()));
create policy ad_delivery_events_insert on public.ad_delivery_events for insert to anon,authenticated with check (user_id is null or user_id=(select auth.uid()));

grant select,insert,update on public.ad_visitor_profiles to anon,authenticated;
grant insert on public.ad_delivery_events to anon,authenticated;

-- The production rollout also creates/replaces these two functions.
-- They always derive user identity from auth.uid(); client-supplied user IDs are ignored.


create or replace function public.get_ad_decision(
 p_visitor_key text,p_user_id uuid default null,p_surface text default 'DIRECTORY',p_slot text default 'BILLBOARD',p_context jsonb default '{}'::jsonb)
returns table(campaign_source text,campaign_id uuid,title text,headline text,body text,image_url text,target_url text,cta_label text,alt_text text,creative_type text,score numeric)
language plpgsql security definer set search_path=public
as $$
declare v_interests jsonb:=coalesce((select interests from public.ad_visitor_profiles where visitor_key=p_visitor_key),'{}'::jsonb); v_uid uuid:=auth.uid();
begin
 if p_visitor_key is null or length(p_visitor_key)<16 then raise exception 'invalid visitor key'; end if;
 insert into public.ad_visitor_profiles(visitor_key,user_id,last_context,last_seen_at) values(p_visitor_key,v_uid,p_context,now())
 on conflict(visitor_key) do update set user_id=coalesce(v_uid,ad_visitor_profiles.user_id),last_context=excluded.last_context,last_seen_at=now();
 return query
 with candidates as (
  select 'business'::text source,bp.id,bp.title,bp.headline,bp.body,bp.image_url,bp.target_url,bp.cta_label,bp.alt_text,bp.creative_type,
   (bp.priority::numeric+bp.bid_cpm+case when bp.campaign_kind='GUARANTEED' then 1000 else 0 end+
    case when coalesce(array_length(bp.target_interests,1),0)=0 then 0 else coalesce((select count(*) from unnest(bp.target_interests) i where lower(i)=any(array(select jsonb_object_keys(v_interests))))*25,0) end+
    case when coalesce(array_length(bp.target_locations,1),0)=0 then 0 else case when lower(coalesce(p_context->>'location',''))=any(bp.target_locations) then 20 else -100 end end) score
  from business_promotions bp
  where bp.status='ACTIVE' and bp.placement=p_surface and bp.slot=p_slot and bp.starts_at<=now() and bp.ends_at>now()
   and coalesce((select count(*) from ad_delivery_events e where e.visitor_key=p_visitor_key and e.campaign_source='business' and e.campaign_id=bp.id and e.event_type='IMPRESSION' and e.created_at>now()-interval '24 hours'),0)<greatest(bp.frequency_cap,1)
 ),
 partner_candidates as (
  select 'partner'::text source,pc.id,pc.title,pc.headline,pc.body,pc.image_url,pc.target_url,pc.cta_label,pc.alt_text,pc.creative_type,
   (pc.priority::numeric+pc.bid_cpm+case when pc.campaign_kind='GUARANTEED' then 1000 else 0 end+
    case when coalesce(array_length(pc.target_interests,1),0)=0 then 0 else coalesce((select count(*) from unnest(pc.target_interests) i where lower(i)=any(array(select jsonb_object_keys(v_interests))))*25,0) end+
    case when coalesce(array_length(pc.target_locations,1),0)=0 then 0 else case when lower(coalesce(p_context->>'location',''))=any(pc.target_locations) then 20 else -100 end end) score
  from partner_ad_campaigns pc
  where pc.status='ACTIVE' and pc.surface=p_surface and pc.slot=p_slot and pc.starts_at<=now() and pc.ends_at>now()
   and coalesce((select count(*) from ad_delivery_events e where e.visitor_key=p_visitor_key and e.campaign_source='partner' and e.campaign_id=pc.id and e.event_type='IMPRESSION' and e.created_at>now()-interval '24 hours'),0)<greatest(pc.frequency_cap,1)
 )
 select c.source,c.id,c.title,c.headline,c.body,c.image_url,c.target_url,c.cta_label,c.alt_text,c.creative_type,c.score
 from (select * from candidates union all select * from partner_candidates) c
 where c.score>0 order by c.score desc,md5(p_visitor_key||c.id::text) limit 1;
end;
$$;
revoke all on function public.get_ad_decision(text,uuid,text,text,jsonb) from public;
grant execute on function public.get_ad_decision(text,uuid,text,text,jsonb) to anon,authenticated;

create or replace function public.record_ad_interest(
 p_visitor_key text,p_user_id uuid default null,p_interests text[] default '{}',p_context jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path=public
as $$
declare v_interests jsonb:=coalesce((select interests from public.ad_visitor_profiles where visitor_key=p_visitor_key),'{}'::jsonb); v_item text; v_uid uuid:=auth.uid();
begin
 if p_visitor_key is null or length(p_visitor_key)<16 then return; end if;
 foreach v_item in array p_interests loop
  if length(trim(v_item))>1 then v_interests:=jsonb_set(v_interests,array[lower(trim(v_item))],to_jsonb(coalesce((v_interests->>lower(trim(v_item)))::int,0)+1),true); end if;
 end loop;
 insert into public.ad_visitor_profiles(visitor_key,user_id,interests,last_context,last_seen_at) values(p_visitor_key,v_uid,v_interests,p_context,now())
 on conflict(visitor_key) do update set user_id=coalesce(v_uid,ad_visitor_profiles.user_id),interests=excluded.interests,last_context=excluded.last_context,last_seen_at=now();
end;
$$;
revoke all on function public.record_ad_interest(text,uuid,text[],jsonb) from public;
grant execute on function public.record_ad_interest(text,uuid,text[],jsonb) to anon,authenticated;
