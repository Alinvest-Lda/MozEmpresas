-- LIVE SCHEMA BASELINE SNAPSHOT — generated from Supabase production catalog
-- Project ref: zikjvjzbbfzrelbkaaci
-- Generated at (database clock): 2026-10-25T08:06:58.581523+00:00
-- Objects are scoped to schema public. Reference snapshot for reconciliation,
-- NOT a ready-to-apply standalone PostgreSQL migration: policies/functions may reference
-- Supabase-managed auth/storage/extensions/roles. Review provider dependencies first.
-- Do not apply this file directly to the live source database.
-- Inventory: 59 tables, 31 functions/procedures,
-- 121 RLS policies, 7 triggers, 1 views/materialized views.
-- Grants/roles, auth.users, storage objects, extension internals, sequence live values,
-- publication settings and data are intentionally not included in this schema-only snapshot.

CREATE TYPE public.listing_status AS ENUM ('DRAFT', 'PUBLISHED', 'PAUSED', 'SOLD_OUT', 'ARCHIVED');

CREATE TYPE public.listing_type AS ENUM ('PRODUCT', 'SERVICE');

CREATE TYPE public.opportunity_status AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED');

CREATE TYPE public.opportunity_type AS ENUM ('CONTEST', 'CALL', 'TENDER', 'FUNDING', 'PARTNERSHIP', 'TRAINING', 'EVENT', 'BUSINESS', 'OTHER', 'PROGRAM', 'AWARD_SCHOLARSHIP', 'EXPRESSION_OF_INTEREST', 'YOUTH_INITIATIVE', 'ENTREPRENEUR_SUPPORT', 'INNOVATION_TECH', 'EXPORT_INTERNATIONAL');

CREATE TABLE public.access_audit_log (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  business_id uuid,
  actor_user_id uuid NOT NULL,
  target_user_id uuid,
  action text NOT NULL,
  role_from text,
  role_to text,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.ad_delivery_events (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  visitor_key text NOT NULL,
  user_id uuid,
  campaign_source text NOT NULL,
  campaign_id uuid NOT NULL,
  surface text NOT NULL,
  slot text NOT NULL,
  event_type text NOT NULL,
  context jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.ad_impressions (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  source text NOT NULL,
  ad_id uuid NOT NULL,
  visitor_id text,
  user_id uuid,
  surface text NOT NULL,
  slot text NOT NULL,
  context text,
  interests text[] DEFAULT '{}'::text[] NOT NULL,
  score numeric(12,4) DEFAULT 0 NOT NULL,
  served_at timestamp with time zone DEFAULT now() NOT NULL,
  clicked_at timestamp with time zone);

CREATE TABLE public.ad_interest_events (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  visitor_id text,
  user_id uuid,
  interest text NOT NULL,
  weight numeric(8,3) DEFAULT 1 NOT NULL,
  surface text,
  context text,
  created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.ad_product_target_options (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  ad_product_id uuid NOT NULL,
  target_type text NOT NULL,
  target_value text NOT NULL,
  extra_price_mzn numeric(12,2) DEFAULT 0 NOT NULL,
  extra_credits integer DEFAULT 0 NOT NULL,
  active boolean DEFAULT true NOT NULL);

CREATE TABLE public.ad_products (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  placement text NOT NULL,
  description text,
  duration_days integer NOT NULL,
  direct_price_mzn numeric(12,2) NOT NULL,
  credit_price integer NOT NULL,
  capacity integer DEFAULT 1 NOT NULL,
  active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  access_type text DEFAULT 'PAID'::text NOT NULL,
  audience_level text DEFAULT 'GENERAL'::text NOT NULL,
  slot text);

CREATE TABLE public.ad_visitor_profiles (  visitor_key text NOT NULL,
  user_id uuid,
  interests jsonb DEFAULT '{}'::jsonb NOT NULL,
  last_context jsonb DEFAULT '{}'::jsonb NOT NULL,
  first_seen_at timestamp with time zone DEFAULT now() NOT NULL,
  last_seen_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.advertising_requests (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  business_id uuid,
  company_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  surface text DEFAULT 'DIRECTORY'::text NOT NULL,
  slot text DEFAULT 'BILLBOARD'::text NOT NULL,
  creative_type text DEFAULT 'BANNER'::text NOT NULL,
  package_name text,
  headline text,
  body text,
  image_url text,
  target_url text,
  cta_label text,
  alt_text text,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  message text,
  status text DEFAULT 'REQUESTED'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  audience_mode text DEFAULT 'CONTEXTUAL'::text NOT NULL,
  budget numeric,
  bid_cpm numeric,
  frequency_cap integer DEFAULT 2 NOT NULL,
  target_interests text[] DEFAULT '{}'::text[] NOT NULL,
  target_locations text[] DEFAULT '{}'::text[] NOT NULL);

CREATE TABLE public.audit_logs (  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  actor_id uuid,
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.business_buyer_interests (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  business_id uuid NOT NULL,
  category_id uuid,
  location text,
  listing_type text,
  created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.business_categories (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.business_credit_wallets (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  business_id uuid NOT NULL,
  balance_credits integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.business_invitations (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  business_id uuid NOT NULL,
  email text NOT NULL,
  role text DEFAULT 'member'::text NOT NULL,
  invited_by uuid NOT NULL,
  token_hash text NOT NULL,
  expires_at timestamp with time zone DEFAULT (now() + '7 days'::interval) NOT NULL,
  accepted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.business_members (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  business_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text DEFAULT 'member'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.business_partner_relationships (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  business_id uuid NOT NULL,
  partner_business_id uuid NOT NULL,
  status text DEFAULT 'ACTIVE'::text NOT NULL,
  relationship_type text DEFAULT 'PARTNERSHIP'::text NOT NULL,
  notes text,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.business_plan_subscriptions (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  business_id uuid NOT NULL,
  plan_id uuid NOT NULL,
  status text DEFAULT 'ACTIVE'::text NOT NULL,
  starts_at timestamp with time zone DEFAULT now() NOT NULL,
  ends_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.business_portfolio_media (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  business_id uuid NOT NULL,
  image_url text NOT NULL,
  title text,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.business_promotion_targets (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  promotion_id uuid NOT NULL,
  target_type text NOT NULL,
  target_value text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.business_promotions (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  business_id uuid NOT NULL,
  listing_id uuid,
  title text NOT NULL,
  placement text NOT NULL,
  status text DEFAULT 'DRAFT'::text NOT NULL,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  budget numeric(12,2),
  currency text DEFAULT 'MZN'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  ad_product_id uuid,
  payment_method text,
  price_mzn numeric(12,2),
  credits_charged integer,
  audience_mode text DEFAULT 'GENERAL'::text NOT NULL,
  slot text,
  creative_type text DEFAULT 'TEXT'::text,
  headline text,
  body text,
  image_url text,
  target_url text,
  cta_label text,
  alt_text text,
  campaign_mode text DEFAULT 'GUARANTEED'::text NOT NULL,
  priority integer DEFAULT 50 NOT NULL,
  bid_mzn numeric(12,2) DEFAULT 0 NOT NULL,
  frequency_cap integer DEFAULT 2 NOT NULL,
  targeting jsonb DEFAULT '{}'::jsonb NOT NULL,
  impression_goal integer,
  impressions_count bigint DEFAULT 0 NOT NULL,
  clicks_count bigint DEFAULT 0 NOT NULL,
  campaign_kind text DEFAULT 'AUCTION'::text NOT NULL,
  bid_cpm numeric DEFAULT 0 NOT NULL,
  target_interests text[] DEFAULT '{}'::text[] NOT NULL,
  target_locations text[] DEFAULT '{}'::text[] NOT NULL);

CREATE TABLE public.business_role_permissions (  role text NOT NULL,
  permission text NOT NULL);

CREATE TABLE public.businesses (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  owner_id uuid NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  category_id uuid,
  location text,
  phone text,
  email text,
  website text,
  logo_url text,
  is_public boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  cover_url text,
  archived_at timestamp with time zone);

CREATE TABLE public.commerce_order_events (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  order_id uuid NOT NULL,
  actor_user_id uuid,
  from_status text,
  to_status text NOT NULL,
  note text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  event_type text DEFAULT 'STATUS_CHANGED'::text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL);

CREATE TABLE public.commerce_order_items (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  order_id uuid NOT NULL,
  listing_id uuid,
  seller_business_id uuid,
  title text NOT NULL,
  type text NOT NULL,
  quantity numeric(12,2) DEFAULT 1 NOT NULL,
  unit_price numeric(14,2) DEFAULT 0 NOT NULL,
  currency text DEFAULT 'MZN'::text NOT NULL,
  line_total numeric(14,2) DEFAULT 0 NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.commerce_orders (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  buyer_user_id uuid NOT NULL,
  buyer_business_id uuid,
  status text DEFAULT 'PENDING'::text NOT NULL,
  currency text DEFAULT 'MZN'::text NOT NULL,
  subtotal numeric(14,2) DEFAULT 0 NOT NULL,
  total numeric(14,2) DEFAULT 0 NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  payment_status text DEFAULT 'NOT_REQUIRED'::text NOT NULL,
  payment_reference text,
  paid_at timestamp with time zone,
  fulfillment_status text DEFAULT 'NOT_STARTED'::text NOT NULL,
  service_started_at timestamp with time zone,
  completed_at timestamp with time zone);

CREATE TABLE public.commerce_transactions (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  order_id uuid NOT NULL,
  provider text,
  provider_reference text,
  status text DEFAULT 'PENDING'::text NOT NULL,
  amount numeric(14,2) DEFAULT 0 NOT NULL,
  currency text DEFAULT 'MZN'::text NOT NULL,
  paid_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.contact_messages (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  subject text NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.credit_packages (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  credit_volume integer NOT NULL,
  price_mzn numeric(12,2) NOT NULL,
  active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.credit_purchase_requests (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  business_id uuid NOT NULL,
  package_id uuid NOT NULL,
  requester_user_id uuid NOT NULL,
  status text DEFAULT 'REQUESTED'::text NOT NULL,
  amount_mzn numeric(12,2) NOT NULL,
  credits integer NOT NULL,
  payment_method text,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  proof_path text);

CREATE TABLE public.credit_transactions (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  wallet_id uuid NOT NULL,
  package_id uuid,
  type text NOT NULL,
  credits integer NOT NULL,
  amount_mzn numeric(12,2),
  reference_type text,
  reference_id uuid,
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.financial_documents (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  business_id uuid NOT NULL,
  user_id uuid NOT NULL,
  document_type text NOT NULL,
  document_number text NOT NULL,
  status text DEFAULT 'ISSUED'::text NOT NULL,
  amount_mzn numeric(14,2) DEFAULT 0 NOT NULL,
  currency text DEFAULT 'MZN'::text NOT NULL,
  reference_type text,
  reference_id uuid,
  issued_at timestamp with time zone DEFAULT now() NOT NULL,
  due_at timestamp with time zone,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL);

CREATE TABLE public.financial_payments (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  business_id uuid NOT NULL,
  user_id uuid NOT NULL,
  amount_mzn numeric(14,2) NOT NULL,
  currency text DEFAULT 'MZN'::text NOT NULL,
  method text NOT NULL,
  status text DEFAULT 'PENDING'::text NOT NULL,
  reference text,
  proof_url text,
  document_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  confirmed_at timestamp with time zone);

CREATE TABLE public.listing_attachments (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  listing_id uuid NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint DEFAULT 0 NOT NULL,
  kind text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.listing_categories (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  slug text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.listing_media (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  listing_id uuid NOT NULL,
  storage_path text NOT NULL,
  sort_order integer DEFAULT 0 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.listings (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  owner_id uuid NOT NULL,
  business_id uuid,
  title text NOT NULL,
  slug text NOT NULL,
  description text NOT NULL,
  category_id uuid,
  type listing_type NOT NULL,
  price numeric(14,2),
  currency character(3) DEFAULT 'MZN'::bpchar NOT NULL,
  status listing_status DEFAULT 'DRAFT'::listing_status NOT NULL,
  location text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.notifications (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  resource_type text,
  resource_id uuid,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.opportunities (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  owner_id uuid NOT NULL,
  title text NOT NULL,
  slug text NOT NULL,
  type opportunity_type NOT NULL,
  status opportunity_status DEFAULT 'DRAFT'::opportunity_status NOT NULL,
  description text NOT NULL,
  organization text,
  location text,
  opens_at timestamp with time zone,
  closes_at timestamp with time zone,
  requirements text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  partner_account_id uuid);

CREATE TABLE public.opportunity_applications (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  opportunity_id uuid NOT NULL,
  applicant_user_id uuid NOT NULL,
  applicant_business_id uuid,
  cover_note text,
  status text DEFAULT 'SUBMITTED'::text NOT NULL,
  submitted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.partner_account_members (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  account_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text DEFAULT 'manager'::text NOT NULL,
  active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.partner_accounts (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  status text DEFAULT 'ACTIVE'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  partner_code text,
  description text,
  website text,
  contact_email text,
  contact_phone text);

CREATE TABLE public.partner_ad_campaigns (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  account_id uuid NOT NULL,
  product_id uuid NOT NULL,
  title text NOT NULL,
  objective text,
  creative_url text,
  status text DEFAULT 'REQUESTED'::text NOT NULL,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  price_mzn numeric,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  surface text,
  slot text,
  creative_type text DEFAULT 'TEXT'::text,
  headline text,
  body text,
  image_url text,
  target_url text,
  cta_label text,
  alt_text text,
  campaign_mode text DEFAULT 'GUARANTEED'::text NOT NULL,
  priority integer DEFAULT 70 NOT NULL,
  bid_mzn numeric(12,2) DEFAULT 0 NOT NULL,
  frequency_cap integer DEFAULT 2 NOT NULL,
  targeting jsonb DEFAULT '{}'::jsonb NOT NULL,
  impression_goal integer,
  impressions_count bigint DEFAULT 0 NOT NULL,
  clicks_count bigint DEFAULT 0 NOT NULL,
  campaign_kind text DEFAULT 'GUARANTEED'::text NOT NULL,
  bid_cpm numeric DEFAULT 0 NOT NULL,
  target_interests text[] DEFAULT '{}'::text[] NOT NULL,
  target_locations text[] DEFAULT '{}'::text[] NOT NULL);

CREATE TABLE public.partner_ad_products (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  placement text NOT NULL,
  duration_days integer NOT NULL,
  price_mzn numeric,
  capacity integer DEFAULT 1 NOT NULL,
  active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  surface text,
  slot text);

CREATE TABLE public.partner_ad_targets (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  campaign_id uuid NOT NULL,
  target_type text NOT NULL,
  target_value text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.partner_entitlements (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  account_id uuid NOT NULL,
  entitlement_type text NOT NULL,
  name text NOT NULL,
  description text,
  scope text,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  status text DEFAULT 'ACTIVE'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.platform_conversion_events (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid,
  visitor_key text NOT NULL,
  event_type text NOT NULL,
  entity_type text,
  entity_id uuid,
  source text,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.platform_members (  user_id uuid NOT NULL,
  role text NOT NULL,
  active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.platform_plans (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  description text,
  monthly_price numeric(12,2) DEFAULT 0 NOT NULL,
  currency text DEFAULT 'MZN'::text NOT NULL,
  active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.platform_service_orders (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  service_id uuid NOT NULL,
  business_id uuid NOT NULL,
  requester_user_id uuid NOT NULL,
  amount_mzn numeric(12,2) NOT NULL,
  currency text DEFAULT 'MZN'::text NOT NULL,
  payment_method text NOT NULL,
  credits_charged integer,
  status text DEFAULT 'PENDING_PAYMENT'::text NOT NULL,
  mpesa_reference text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  renewal_period text,
  auto_renew boolean DEFAULT false NOT NULL,
  renewal_status text DEFAULT 'NONE'::text NOT NULL,
  renewed_from_order_id uuid);

CREATE TABLE public.platform_service_subscriptions (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  service_id uuid NOT NULL,
  business_id uuid NOT NULL,
  current_order_id uuid,
  status text DEFAULT 'ACTIVE'::text NOT NULL,
  starts_at timestamp with time zone NOT NULL,
  ends_at timestamp with time zone NOT NULL,
  renewal_period text NOT NULL,
  auto_renew boolean DEFAULT false NOT NULL,
  next_renewal_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.platform_services (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  slug text NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  price numeric(14,2),
  currency text DEFAULT 'MZN'::text NOT NULL,
  billing text DEFAULT 'ONE_TIME'::text NOT NULL,
  active boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  default_term_days integer,
  renewal_period text);

CREATE TABLE public.profiles (  id uuid NOT NULL,
  full_name text DEFAULT ''::text NOT NULL,
  location text,
  website text,
  bio text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  user_type text DEFAULT 'empresa'::text NOT NULL,
  account_status text DEFAULT 'ACTIVE'::text NOT NULL,
  deactivated_at timestamp with time zone,
  deletion_requested_at timestamp with time zone);

CREATE TABLE public.public_rate_limits (  key_hash text NOT NULL,
  window_started_at timestamp with time zone NOT NULL,
  request_count integer NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.publication_attachments (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes bigint DEFAULT 0 NOT NULL,
  kind text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.recommendation_events (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  business_id uuid,
  listing_id uuid,
  event_type text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.service_requests (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  service_id uuid NOT NULL,
  requester_user_id uuid NOT NULL,
  requester_business_id uuid,
  status text DEFAULT 'REQUESTED'::text NOT NULL,
  requested_price numeric(14,2),
  currency text DEFAULT 'MZN'::text NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.support_messages (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  ticket_id uuid NOT NULL,
  sender_user_id uuid,
  sender_role text DEFAULT 'USER'::text NOT NULL,
  body text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.support_tickets (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  business_id uuid,
  area text NOT NULL,
  subject text NOT NULL,
  status text DEFAULT 'OPEN'::text NOT NULL,
  priority text DEFAULT 'NORMAL'::text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  closed_at timestamp with time zone);

CREATE TABLE public.user_favorites (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  title text NOT NULL,
  href text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE TABLE public.user_saved_searches (  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL,
  entity_type text NOT NULL,
  filters jsonb DEFAULT '{}'::jsonb NOT NULL,
  alert_enabled boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL);

CREATE OR REPLACE FUNCTION public.business_ad_campaign_metrics()
 RETURNS TABLE(campaign_id uuid, impressions bigint, clicks bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select p.id,
    count(e.id) filter (where e.event_type = 'IMPRESSION')::bigint,
    count(e.id) filter (where e.event_type = 'CLICK')::bigint
  from public.business_promotions p
  join public.businesses b on b.id = p.business_id
  left join public.ad_delivery_events e
    on e.campaign_source = 'business'
   and e.campaign_id = p.id
  where b.owner_id = auth.uid()
     or exists (
       select 1 from public.business_members bm
       where bm.business_id = b.id
         and bm.user_id = auth.uid()
         and bm.role in ('owner','admin','operator')
     )
  group by p.id;
$function$
;

CREATE OR REPLACE FUNCTION public.consume_public_rate_limit(p_key_hash text, p_limit integer, p_window_seconds integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_count integer;
  v_now timestamptz := clock_timestamp();
begin
  if p_key_hash is null
     or p_key_hash !~ '^[a-f0-9]{64}$'
     or p_limit < 1 or p_limit > 1000
     or p_window_seconds < 1 or p_window_seconds > 86400 then
    raise exception 'invalid rate limit parameters' using errcode = '22023';
  end if;

  insert into public.public_rate_limits(key_hash, window_started_at, request_count, updated_at)
  values (p_key_hash, v_now, 1, v_now)
  on conflict (key_hash) do update
  set
    request_count = case
      when public.public_rate_limits.window_started_at <= v_now - make_interval(secs => p_window_seconds) then 1
      else public.public_rate_limits.request_count + 1
    end,
    window_started_at = case
      when public.public_rate_limits.window_started_at <= v_now - make_interval(secs => p_window_seconds) then v_now
      else public.public_rate_limits.window_started_at
    end,
    updated_at = v_now
  returning request_count into v_count;

  return v_count <= p_limit;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_commerce_order(p_listing_id uuid, p_buyer_business_id uuid DEFAULT NULL::uuid, p_quantity numeric DEFAULT 1, p_notes text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid := auth.uid();
  v_listing public.listings%rowtype;
  v_order_id uuid;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_quantity <= 0 then raise exception 'INVALID_QUANTITY'; end if;

  select * into v_listing
  from public.listings
  where id = p_listing_id and status = 'PUBLISHED'
  for share;

  if v_listing.id is null then raise exception 'LISTING_NOT_AVAILABLE'; end if;
  if v_listing.owner_id = v_user then raise exception 'OWN_LISTING'; end if;

  if p_buyer_business_id is not null and not exists (
    select 1 from public.businesses b
    where b.id = p_buyer_business_id
      and b.archived_at is null
      and (
        b.owner_id = v_user
        or exists (
          select 1 from public.business_members bm
          where bm.business_id = b.id and bm.user_id = v_user and bm.role in ('owner','admin','operator')
        )
      )
  ) then
    raise exception 'BUYER_BUSINESS_FORBIDDEN';
  end if;

  insert into public.commerce_orders (
    buyer_user_id, buyer_business_id, status, currency, subtotal, total, notes
  ) values (
    v_user, p_buyer_business_id, 'INTERESTED', coalesce(v_listing.currency, 'MZN'),
    coalesce(v_listing.price, 0), coalesce(v_listing.price, 0) * p_quantity, p_notes
  ) returning id into v_order_id;

  insert into public.commerce_order_items (
    order_id, listing_id, seller_business_id, title, type, quantity, unit_price,
    currency, line_total, metadata
  ) values (
    v_order_id, v_listing.id, v_listing.business_id, v_listing.title, v_listing.type,
    p_quantity, v_listing.price, coalesce(v_listing.currency, 'MZN'),
    case when v_listing.price is null then 0 else v_listing.price * p_quantity end,
    jsonb_build_object('transaction_mode','OFFLINE','quantity_requested',p_quantity)
  );

  insert into public.commerce_order_events (
    order_id, actor_user_id, event_type, to_status, note, metadata
  ) values (
    v_order_id, v_user, 'ORDER_CREATED', 'INTERESTED',
    'Interesse comercial registado. A negociação e qualquer compra decorrem fora da plataforma.',
    jsonb_build_object('buyer_business_id', p_buyer_business_id, 'listing_id', p_listing_id)
  );

  return v_order_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.current_partner_account_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select m.account_id
  from public.partner_account_members m
  join public.profiles p on p.id = m.user_id
  where m.user_id = auth.uid()
    and m.active = true
    and p.user_type = 'parceiro'
  limit 1
$function$
;

CREATE OR REPLACE FUNCTION public.current_partner_opportunity_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select m.role
  from public.partner_account_members m
  join public.partner_accounts a on a.id = m.account_id
  join public.profiles p on p.id = m.user_id
  where m.user_id = auth.uid()
    and m.account_id = (select public.current_partner_account_id())
    and m.active = true
    and a.status = 'ACTIVE'
    and p.user_type = 'parceiro'
    and coalesce(p.account_status, 'ACTIVE') = 'ACTIVE'
  limit 1
$function$
;

CREATE OR REPLACE FUNCTION public.get_ad_decision(p_visitor_key text, p_user_id uuid DEFAULT NULL::uuid, p_surface text DEFAULT 'DIRECTORY'::text, p_slot text DEFAULT 'BILLBOARD'::text, p_context jsonb DEFAULT '{}'::jsonb)
 RETURNS TABLE(campaign_source text, campaign_id uuid, title text, headline text, body text, image_url text, target_url text, cta_label text, alt_text text, creative_type text, score numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_interests jsonb := coalesce((select interests from public.ad_visitor_profiles where visitor_key=p_visitor_key),'{}'::jsonb); v_uid uuid := auth.uid();
begin
 if p_visitor_key is null or length(p_visitor_key)<16 then raise exception 'invalid visitor key'; end if;
 insert into public.ad_visitor_profiles(visitor_key,user_id,last_context,last_seen_at)
 values(p_visitor_key,v_uid,p_context,now())
 on conflict(visitor_key) do update set user_id=coalesce(v_uid,ad_visitor_profiles.user_id),last_context=excluded.last_context,last_seen_at=now();
 return query
 with candidates as (
  select 'business'::text source,bp.id,bp.title,bp.headline,bp.body,bp.image_url,bp.target_url,bp.cta_label,bp.alt_text,bp.creative_type,
   (bp.priority::numeric+bp.bid_cpm+case when bp.campaign_kind='GUARANTEED' then 1000 else 0 end+
    case when coalesce(array_length(bp.target_interests,1),0)=0 then 0 else coalesce((select count(*) from unnest(bp.target_interests) i where lower(i)=any(array(select jsonb_object_keys(v_interests))))*25,0) end+
    case when coalesce(array_length(bp.target_locations,1),0)=0 then 0 else case when lower(coalesce(p_context->>'location',''))=any(bp.target_locations) then 20 else -100 end end) score
  from business_promotions bp
  where p_slot <> 'EXCLUSIVE' and bp.status='ACTIVE' and bp.placement=p_surface and bp.slot=p_slot and bp.starts_at<=now() and bp.ends_at>now()
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
$function$
;

CREATE OR REPLACE FUNCTION public.home_ad_slots()
 RETURNS TABLE(campaign_id uuid, product_code text, slot text, title text, body text, image_url text, target_url text, cta_label text, alt_text text, starts_at timestamp with time zone, ends_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select
    c.id,
    p.code,
    case
      when p.code = 'PARTNER_HOME_TAKEOVER' then 'PREMIUM'
      when p.code = 'PARTNER_INSTITUTIONAL_SPONSORSHIP' then 'EXCLUSIVE'
      else p.slot
    end,
    c.title,
    c.body,
    c.image_url,
    c.target_url,
    c.cta_label,
    c.alt_text,
    c.starts_at,
    c.ends_at
  from public.partner_ad_campaigns c
  join public.partner_ad_products p on p.id = c.product_id
  where p.active = true
    and p.surface = 'HOME'
    and c.status in ('ACTIVE','RUNNING','PUBLISHED')
    and (c.starts_at is null or c.starts_at <= now())
    and (c.ends_at is null or c.ends_at >= now())
    and (
      nullif(trim(c.title), '') is not null
      or nullif(trim(c.body), '') is not null
      or nullif(trim(c.image_url), '') is not null
    )
  order by
    case when p.code = 'PARTNER_HOME_TAKEOVER' then 1
         when p.code = 'PARTNER_INSTITUTIONAL_SPONSORSHIP' then 2
         else 3 end,
    c.priority desc nulls last,
    c.created_at desc
  limit 2
$function$
;

CREATE OR REPLACE FUNCTION public.is_partner_account()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1
    from public.partner_account_members m
    join public.partner_accounts a on a.id = m.account_id
    join public.profiles p on p.id = m.user_id
    where m.user_id = auth.uid()
      and m.active = true
      and a.status = 'ACTIVE'
      and p.user_type = 'parceiro'
      and coalesce(p.account_status, 'ACTIVE') = 'ACTIVE'
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_super_admin()
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ select exists(select 1 from public.platform_members pm where pm.user_id=auth.uid() and pm.active=true and pm.role='super_admin'); $function$
;

CREATE OR REPLACE FUNCTION public.notify_commerce_order_created()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_buyer uuid;
  v_listing_title text;
begin
  select o.buyer_user_id, coalesce(l.title, new.title)
    into v_buyer, v_listing_title
  from public.commerce_orders o
  left join public.listings l on l.id = new.listing_id
  where o.id = new.order_id;

  if new.seller_business_id is not null then
    insert into public.notifications(user_id, type, title, body, resource_type, resource_id)
    select recipients.user_id,
           'ORDER',
           'Novo interesse comercial',
           'Recebeu um pedido de contacto para "' || left(coalesce(v_listing_title, 'uma oferta'), 120) || '". A negociação decorre directamente entre as partes.',
           'ORDER',
           new.order_id
    from (
      select b.owner_id as user_id
      from public.businesses b
      where b.id = new.seller_business_id
      union
      select bm.user_id
      from public.business_members bm
      where bm.business_id = new.seller_business_id
        and bm.role in ('owner', 'admin', 'operator')
    ) recipients
    where recipients.user_id is not null
      and recipients.user_id is distinct from v_buyer;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_commerce_order_updated()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_actor uuid := auth.uid();
  v_title text;
  v_body text;
begin
  if old.status is not distinct from new.status
     and old.payment_status is not distinct from new.payment_status
     and old.fulfillment_status is not distinct from new.fulfillment_status then
    return new;
  end if;

  if old.status is distinct from new.status then
    v_title := 'Estado da negociação actualizado';
    v_body := 'A negociação passou para "' || lower(replace(new.status, '_', ' ')) || '".';
  elsif old.payment_status is distinct from new.payment_status then
    v_title := 'Actualização de pagamento';
    v_body := 'O estado de pagamento foi actualizado para "' || lower(replace(new.payment_status, '_', ' ')) || '". Confirme os detalhes directamente com a outra parte.';
  else
    v_title := 'Actualização da execução';
    v_body := 'O estado de execução foi actualizado para "' || lower(replace(new.fulfillment_status, '_', ' ')) || '".';
  end if;

  if v_actor is not null and v_actor = new.buyer_user_id then
    insert into public.notifications(user_id, type, title, body, resource_type, resource_id)
    select recipients.user_id, 'ORDER', v_title, v_body, 'ORDER', new.id
    from (
      select b.owner_id as user_id
      from public.commerce_order_items oi
      join public.businesses b on b.id = oi.seller_business_id
      where oi.order_id = new.id
      union
      select bm.user_id
      from public.commerce_order_items oi
      join public.business_members bm on bm.business_id = oi.seller_business_id
      where oi.order_id = new.id and bm.role in ('owner', 'admin', 'operator')
    ) recipients
    where recipients.user_id is not null
      and recipients.user_id is distinct from v_actor;
  else
    insert into public.notifications(user_id, type, title, body, resource_type, resource_id)
    values (new.buyer_user_id, 'ORDER', v_title, v_body, 'ORDER', new.id);
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_opportunity_application_owner()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_owner uuid;
  v_title text;
begin
  select o.owner_id,o.title into v_owner,v_title
  from public.opportunities o where o.id=new.opportunity_id;
  if v_owner is not null and v_owner <> new.applicant_user_id then
    insert into public.notifications(user_id,type,title,body,resource_type,resource_id)
    values(v_owner,'OPPORTUNITY_APPLICATION','Nova resposta a uma oportunidade',
      'Foi submetida uma candidatura à oportunidade "' || left(coalesce(v_title,'oportunidade'),120) || '".',
      'OPPORTUNITY',new.opportunity_id);
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_saved_search_matches()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_entity_type text; v_title text; v_description text; v_location text; v_status text; v_type text; v_category_id text; v_is_new boolean := false;
  s record; v_q text; v_location_filter text;
begin
  if tg_table_name = 'businesses' then
    v_entity_type := 'businesses'; v_title := new.name; v_description := coalesce(new.description, '');
    v_location := coalesce(new.location, ''); v_category_id := new.category_id::text;
    v_is_new := new.is_public and new.archived_at is null and (tg_op = 'INSERT' or old.is_public is distinct from true);
  elsif tg_table_name = 'listings' then
    v_entity_type := 'marketplace'; v_title := new.title;
    v_description := coalesce(new.description, '') || ' ' || coalesce((select b.name from public.businesses b where b.id=new.business_id), '');
    v_location := coalesce(new.location, ''); v_status := new.status::text; v_type := new.type::text;
    v_is_new := v_status = 'PUBLISHED' and (tg_op = 'INSERT' or old.status::text is distinct from 'PUBLISHED');
  elsif tg_table_name = 'opportunities' then
    v_entity_type := 'opportunities'; v_title := new.title;
    v_description := concat_ws(' ',coalesce(new.description,''),coalesce(new.organization,''),coalesce(new.location,''));
    v_location := coalesce(new.location, ''); v_status := new.status::text; v_type := new.type::text;
    v_is_new := v_status = 'PUBLISHED' and (tg_op = 'INSERT' or old.status::text is distinct from 'PUBLISHED');
  end if;
  if not coalesce(v_is_new, false) then return new; end if;
  for s in select id,user_id,title,filters from public.user_saved_searches where entity_type=v_entity_type and alert_enabled=true loop
    v_q := nullif(trim(coalesce(s.filters->>'q','')), '');
    v_location_filter := nullif(trim(coalesce(s.filters->>'location','')), '');
    if (v_q is null or (coalesce(v_title,'') || ' ' || coalesce(v_description,'') ilike '%' || v_q || '%'))
      and (v_location_filter is null or coalesce(v_location,'') ilike '%' || v_location_filter || '%')
      and (v_entity_type <> 'marketplace' or coalesce(s.filters->>'type','') in ('','all') or s.filters->>'type'=v_type)
      and (v_entity_type <> 'opportunities' or coalesce(s.filters->>'type','')='' or s.filters->>'type'=v_type)
      and (v_entity_type <> 'businesses' or coalesce(s.filters->>'category','')='' or v_category_id=s.filters->>'category')
    then
      insert into public.notifications(user_id,type,title,body,resource_type,resource_id)
      values(s.user_id,'SAVED_SEARCH_MATCH','Nova correspondência: ' || left(coalesce(v_title,'conteúdo'),120),
        'Uma nova publicação corresponde à pesquisa guardada "' || left(s.title,120) || '".',
        case when v_entity_type='businesses' then 'BUSINESS' when v_entity_type='marketplace' then 'LISTING' else 'OPPORTUNITY' end,new.id);
    end if;
  end loop;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.partner_access_claim(p_token_hash text, p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.partner_access_create(p_email text, p_token_hash text, p_expires_at timestamp with time zone)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$ declare v_id uuid; begin if not exists(select 1 from public.platform_members pm where pm.user_id=auth.uid() and pm.active=true and pm.role='super_admin') then raise exception 'FORBIDDEN'; end if; insert into private.partner_access_grants(email,token_hash,created_by,expires_at) values(lower(trim(p_email)),p_token_hash,auth.uid(),p_expires_at) returning id into v_id; return v_id; end; $function$
;

CREATE OR REPLACE FUNCTION public.partner_access_validate(p_token_hash text)
 RETURNS TABLE(email text, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'private'
AS $function$ begin update private.partner_access_grants set status='EXPIRED' where token_hash=p_token_hash and status='PENDING' and expires_at<=now(); return query select g.email,g.expires_at from private.partner_access_grants g where g.token_hash=p_token_hash and g.status='PENDING' and g.expires_at>now(); end; $function$
;

CREATE OR REPLACE FUNCTION public.partner_account_add_manager(p_email text, p_role text DEFAULT 'manager'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_account uuid; v_user uuid; v_id uuid;
begin
  v_account := public.current_partner_account_id();
  if v_account is null then raise exception 'PARTNER_ACCOUNT_REQUIRED'; end if;
  if not exists (
    select 1 from public.partner_account_members
    where account_id=v_account and user_id=auth.uid() and active=true and role='owner'
  ) then raise exception 'FORBIDDEN'; end if;
  select id into v_user from auth.users where lower(email)=lower(trim(p_email));
  if v_user is null then raise exception 'USER_NOT_FOUND'; end if;
  if not exists (select 1 from public.profiles where id=v_user and user_type='parceiro') then
    raise exception 'NOT_PARTNER_USER';
  end if;
  if p_role not in ('manager','analyst','viewer') then raise exception 'INVALID_ROLE'; end if;
  insert into public.partner_account_members(account_id,user_id,role)
  values(v_account,v_user,p_role)
  on conflict (account_id,user_id) do update set active=true,role=excluded.role,updated_at=now()
  returning id into v_id;
  return v_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.partner_account_context()
 RETURNS TABLE(account_id uuid, account_name text, account_status text, member_role text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select a.id,a.name,a.status,m.role
  from public.partner_accounts a
  join public.partner_account_members m on m.account_id=a.id
  join public.profiles p on p.id=m.user_id
  where m.user_id=auth.uid()
    and m.active=true
    and p.user_type='parceiro'
  limit 1
$function$
;

CREATE OR REPLACE FUNCTION public.partner_account_members_list()
 RETURNS TABLE(member_id uuid, user_id uuid, full_name text, email text, member_role text, active boolean, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select m.id, m.user_id, p.full_name, u.email, m.role, m.active, m.created_at
  from public.partner_account_members m
  join public.profiles p on p.id=m.user_id
  join auth.users u on u.id=m.user_id
  where m.account_id = public.current_partner_account_id()
  order by m.role='owner' desc, m.created_at asc
$function$
;

CREATE OR REPLACE FUNCTION public.partner_account_profile()
 RETURNS TABLE(account_id uuid, account_name text, account_status text, partner_code text, description text, website text, contact_email text, contact_phone text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 select a.id,a.name,a.status,a.partner_code,a.description,a.website,a.contact_email,a.contact_phone
 from public.partner_accounts a where a.id=public.current_partner_account_id() limit 1
$function$
;

CREATE OR REPLACE FUNCTION public.partner_ad_campaign_metrics()
 RETURNS TABLE(campaign_id uuid, impressions bigint, clicks bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select c.id,
    count(e.id) filter (where e.event_type = 'IMPRESSION')::bigint,
    count(e.id) filter (where e.event_type = 'CLICK')::bigint
  from public.partner_ad_campaigns c
  left join public.ad_delivery_events e
    on e.campaign_source = 'partner'
   and e.campaign_id = c.id
  where c.account_id = public.current_partner_account_id()
  group by c.id;
$function$
;

CREATE OR REPLACE FUNCTION public.partner_ad_campaigns_list()
 RETURNS TABLE(id uuid, product_name text, placement text, title text, status text, starts_at timestamp with time zone, ends_at timestamp with time zone, price_mzn numeric, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 select c.id,p.name,p.placement,c.title,c.status,c.starts_at,c.ends_at,c.price_mzn,c.created_at from public.partner_ad_campaigns c join public.partner_ad_products p on p.id=c.product_id where c.account_id=public.current_partner_account_id() order by c.created_at desc
$function$
;

CREATE OR REPLACE FUNCTION public.partner_ad_products_list()
 RETURNS TABLE(id uuid, code text, name text, description text, placement text, duration_days integer, price_mzn numeric, capacity integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 select id,code,name,description,placement,duration_days,price_mzn,capacity from public.partner_ad_products where active=true order by price_mzn nulls last,name
$function$
;

CREATE OR REPLACE FUNCTION public.partner_ad_request(p_product_id uuid, p_title text, p_objective text, p_starts_at timestamp with time zone, p_ends_at timestamp with time zone, p_targets jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_account uuid := public.current_partner_account_id();
  v_id uuid;
  v_duration integer;
  v_capacity integer;
  v_existing integer;
begin
  if auth.uid() is null or v_account is null then
    raise exception 'PARTNER_ACCOUNT_REQUIRED';
  end if;
  if public.current_partner_opportunity_role() not in ('owner','manager') then
    raise exception 'FORBIDDEN';
  end if;
  if nullif(trim(coalesce(p_title,'')),'') is null or length(trim(p_title)) > 160 then
    raise exception 'INVALID_CAMPAIGN_TITLE';
  end if;
  if p_starts_at is null or p_ends_at is null or p_starts_at < now() or p_ends_at <= p_starts_at then
    raise exception 'INVALID_CAMPAIGN_DATES';
  end if;
  if jsonb_typeof(coalesce(p_targets,'[]'::jsonb)) <> 'array' then
    raise exception 'INVALID_CAMPAIGN_TARGETS';
  end if;

  select duration_days,capacity into v_duration,v_capacity
  from public.partner_ad_products
  where id=p_product_id and active=true;
  if v_duration is null then raise exception 'AD_PRODUCT_NOT_FOUND'; end if;
  if extract(epoch from (p_ends_at-p_starts_at))/86400 > v_duration then
    raise exception 'CAMPAIGN_EXCEEDS_PRODUCT_DURATION';
  end if;

  select count(*) into v_existing
  from public.partner_ad_campaigns c
  where c.product_id=p_product_id
    and c.status in ('REQUESTED','PENDING','UNDER_REVIEW','ACTIVE','RUNNING','PUBLISHED')
    and c.starts_at < p_ends_at
    and c.ends_at > p_starts_at;
  if v_existing >= greatest(v_capacity,1) then
    raise exception 'AD_SPACE_UNAVAILABLE';
  end if;

  insert into public.partner_ad_campaigns(account_id,product_id,title,objective,starts_at,ends_at,price_mzn,surface,slot)
  select v_account,id,trim(p_title),nullif(trim(p_objective),''),p_starts_at,p_ends_at,price_mzn,surface,slot
  from public.partner_ad_products where id=p_product_id and active=true
  returning id into v_id;
  if v_id is null then raise exception 'AD_PRODUCT_NOT_FOUND'; end if;

  insert into public.partner_ad_targets(campaign_id,target_type,target_value)
  select v_id,x->>'type',left(trim(x->>'value'),160)
  from jsonb_array_elements(coalesce(p_targets,'[]'::jsonb)) x
  where x->>'type' in ('SECTOR','PROVINCE','CITY','COMPANY_SIZE','INTENT','CATEGORY')
    and nullif(trim(x->>'value'),'') is not null
  on conflict do nothing;
  return v_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.partner_entitlements_list()
 RETURNS TABLE(id uuid, entitlement_type text, name text, description text, scope text, starts_at timestamp with time zone, ends_at timestamp with time zone, status text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 select e.id,e.entitlement_type,e.name,e.description,e.scope,e.starts_at,e.ends_at,e.status
 from public.partner_entitlements e where e.account_id=public.current_partner_account_id()
 order by e.status,e.created_at desc
$function$
;

CREATE OR REPLACE FUNCTION public.prevent_self_privilege_escalation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_role text := current_setting('request.jwt.claim.role', true);
begin
  if v_role = 'service_role' or public.is_super_admin() then
    return new;
  end if;

  if new.user_type is distinct from old.user_type then
    raise exception 'user_type can only be changed by a platform administrator'
      using errcode = '42501';
  end if;

  if new.account_status is distinct from old.account_status then
    if old.account_status <> 'ACTIVE'
       or new.account_status not in ('INACTIVE', 'DELETED') then
      raise exception 'account_status cannot be reactivated or changed by the account owner'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.purchase_platform_service_with_credits(p_service_id uuid, p_business_id uuid, p_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_service public.platform_services%rowtype;
  v_wallet public.business_credit_wallets%rowtype;
  v_order_id uuid;
  v_subscription_id uuid;
  v_credits integer;
  v_starts_at timestamptz := now();
  v_ends_at timestamptz;
  v_renewal_period text;
  v_renewal_status text := 'NONE';
begin
  if auth.uid() is null or p_user_id <> auth.uid() then raise exception 'UNAUTHENTICATED'; end if;

  select * into v_service from public.platform_services where id=p_service_id and active=true;
  if not found then raise exception 'SERVICE_NOT_FOUND'; end if;
  if v_service.price is null or v_service.price <= 0 then raise exception 'SERVICE_NOT_PRICED'; end if;

  if not exists(select 1 from public.businesses where id=p_business_id and owner_id=p_user_id)
  and not exists(select 1 from public.business_members where business_id=p_business_id and user_id=p_user_id and role in ('owner','admin','operator')) then
    raise exception 'FORBIDDEN';
  end if;

  v_credits:=ceil(v_service.price)::integer;
  select * into v_wallet from public.business_credit_wallets where business_id=p_business_id for update;
  if not found then raise exception 'NO_WALLET'; end if;
  if v_wallet.balance_credits < v_credits then raise exception 'INSUFFICIENT_CREDITS'; end if;

  v_renewal_period := case
    when v_service.billing = 'MONTHLY' then 'MONTHLY'
    when v_service.billing = 'ANNUAL' then 'ANNUAL'
    else null
  end;

  v_ends_at := case
    when v_service.billing = 'MONTHLY' then v_starts_at + interval '1 month'
    when v_service.billing = 'ANNUAL' then v_starts_at + interval '1 year'
    when v_service.default_term_days is not null then v_starts_at + make_interval(days => v_service.default_term_days)
    else null
  end;

  v_renewal_status := case when v_renewal_period is null then 'NONE' else 'ACTIVE' end;

  update public.business_credit_wallets
    set balance_credits=balance_credits-v_credits,updated_at=now()
    where id=v_wallet.id;

  insert into public.platform_service_orders(
    service_id,business_id,requester_user_id,amount_mzn,currency,payment_method,
    credits_charged,status,starts_at,ends_at,renewal_period,auto_renew,renewal_status
  )
  values(
    v_service.id,p_business_id,p_user_id,v_service.price,coalesce(v_service.currency,'MZN'),
    'CREDITS',v_credits,'PAID',v_starts_at,v_ends_at,v_renewal_period,false,v_renewal_status
  ) returning id into v_order_id;

  if v_renewal_period is not null then
    insert into public.platform_service_subscriptions(
      service_id,business_id,current_order_id,status,starts_at,ends_at,
      renewal_period,auto_renew,next_renewal_at
    )
    values(
      v_service.id,p_business_id,v_order_id,'ACTIVE',v_starts_at,v_ends_at,
      v_renewal_period,false,v_ends_at
    )
    returning id into v_subscription_id;
  end if;

  insert into public.credit_transactions(wallet_id,type,credits,amount_mzn,reference_type,reference_id,description)
  values(v_wallet.id,'SERVICE_PURCHASE',-v_credits,v_service.price,'PLATFORM_SERVICE_ORDER',v_order_id,'Compra de serviço: '||v_service.name);

  insert into public.financial_documents(
    business_id,user_id,document_type,document_number,status,amount_mzn,currency,
    reference_type,reference_id,due_at,metadata
  )
  values(
    p_business_id,p_user_id,'INVOICE',
    'INV-'||to_char(now(),'YYYYMMDD')||'-'||substr(replace(v_order_id::text,'-',''),1,8),
    'PAID',v_service.price,coalesce(v_service.currency,'MZN'),
    'PLATFORM_SERVICE_ORDER',v_order_id,v_ends_at,
    jsonb_build_object('subscription_id',v_subscription_id,'renewal_period',v_renewal_period)
  );

  return v_order_id;
end
$function$
;

CREATE OR REPLACE FUNCTION public.purchase_promotion_with_credits(p_business_id uuid, p_ad_product_id uuid, p_listing_id uuid, p_title text, p_starts_at timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid := auth.uid();
  v_product public.ad_products;
  v_wallet public.business_credit_wallets;
  v_end timestamptz;
  v_promotion uuid;
begin
  if v_user is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not exists (
    select 1 from public.businesses b
    where b.id = p_business_id and b.owner_id = v_user
  ) and not exists (
    select 1 from public.business_members bm
    where bm.business_id = p_business_id
      and bm.user_id = v_user
      and bm.role in ('owner','admin','operator')
  ) then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_product
  from public.ad_products
  where id = p_ad_product_id and active = true
  for share;

  if not found then raise exception 'PRODUCT_UNAVAILABLE'; end if;
  v_end := p_starts_at + make_interval(days => v_product.duration_days);

  if (
    select count(*) from public.business_promotions bp
    where bp.ad_product_id = v_product.id
      and bp.status in ('PENDING','ACTIVE')
      and bp.starts_at < v_end
      and bp.ends_at > p_starts_at
  ) >= v_product.capacity then
    raise exception 'NO_AVAILABILITY';
  end if;

  select * into v_wallet
  from public.business_credit_wallets
  where business_id = p_business_id
  for update;

  if not found then
    insert into public.business_credit_wallets(business_id,balance_credits)
    values (p_business_id,0)
    returning * into v_wallet;
  end if;

  if v_wallet.balance_credits < v_product.credit_price then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  update public.business_credit_wallets
  set balance_credits = balance_credits - v_product.credit_price,
      updated_at = now()
  where id = v_wallet.id;

  insert into public.business_promotions(
    business_id, listing_id, title, placement, status,
    starts_at, ends_at, budget, currency, ad_product_id,
    payment_method, price_mzn, credits_charged
  ) values (
    p_business_id, p_listing_id, coalesce(nullif(trim(p_title),''), v_product.name),
    v_product.placement, 'ACTIVE', p_starts_at, v_end,
    v_product.direct_price_mzn, 'MZN', v_product.id,
    'CREDITS', v_product.direct_price_mzn, v_product.credit_price
  )
  returning id into v_promotion;

  insert into public.credit_transactions(
    wallet_id, type, credits, amount_mzn, reference_type, reference_id, description
  ) values (
    v_wallet.id, 'CONSUMPTION', -v_product.credit_price,
    v_product.direct_price_mzn, 'BUSINESS_PROMOTION', v_promotion,
    'Compra de publicidade: ' || v_product.name
  );

  return jsonb_build_object('promotion_id', v_promotion, 'credits_charged', v_product.credit_price, 'ends_at', v_end);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.purchase_promotion_with_credits(p_business_id uuid, p_ad_product_id uuid, p_listing_id uuid, p_title text, p_starts_at timestamp with time zone, p_locations text[] DEFAULT '{}'::text[], p_categories text[] DEFAULT '{}'::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_user uuid:=auth.uid();v_product public.ad_products;v_wallet public.business_credit_wallets;v_end timestamptz;v_promotion uuid;v_factor numeric:=1;v_price numeric;v_credits integer;v_locations text[]:=coalesce(p_locations,'{}');v_categories text[]:=coalesce(p_categories,'{}');
begin
if v_user is null then raise exception 'AUTH_REQUIRED';end if;
if not exists(select 1 from public.businesses b where b.id=p_business_id and b.owner_id=v_user) and not exists(select 1 from public.business_members bm where bm.business_id=p_business_id and bm.user_id=v_user and bm.role in('owner','admin','operator')) then raise exception 'FORBIDDEN';end if;
select * into v_product from public.ad_products where id=p_ad_product_id and active=true and access_type='PAID' for share;
if not found then raise exception 'PRODUCT_UNAVAILABLE';end if;
if cardinality(v_locations)>0 then v_factor:=v_factor+0.10;end if;if cardinality(v_categories)>0 then v_factor:=v_factor+0.10;end if;
v_price:=round(v_product.direct_price_mzn*v_factor,2);v_credits:=ceil(v_product.credit_price*v_factor);v_end:=p_starts_at+make_interval(days=>v_product.duration_days);
if(select count(*) from public.business_promotions bp where bp.ad_product_id=v_product.id and bp.status in('PENDING','ACTIVE') and bp.starts_at<v_end and bp.ends_at>p_starts_at)>=v_product.capacity then raise exception 'NO_AVAILABILITY';end if;
select * into v_wallet from public.business_credit_wallets where business_id=p_business_id for update;
if not found then insert into public.business_credit_wallets(business_id,balance_credits) values(p_business_id,0) returning * into v_wallet;end if;
if v_wallet.balance_credits<v_credits then raise exception 'INSUFFICIENT_CREDITS';end if;
update public.business_credit_wallets set balance_credits=balance_credits-v_credits,updated_at=now() where id=v_wallet.id;
insert into public.business_promotions(business_id,listing_id,title,placement,status,starts_at,ends_at,budget,currency,ad_product_id,payment_method,price_mzn,credits_charged,audience_mode)
values(p_business_id,p_listing_id,coalesce(nullif(trim(p_title),''),v_product.name),v_product.placement,'ACTIVE',p_starts_at,v_end,v_price,'MZN',v_product.id,'CREDITS',v_price,v_credits,case when cardinality(v_locations)+cardinality(v_categories)>0 then 'TARGETED' else 'GENERAL' end) returning id into v_promotion;
insert into public.credit_transactions(wallet_id,type,credits,amount_mzn,reference_type,reference_id,description) values(v_wallet.id,'CONSUMPTION',-v_credits,v_price,'BUSINESS_PROMOTION',v_promotion,'Publicidade: '||v_product.name||case when cardinality(v_locations)+cardinality(v_categories)>0 then ' · visibilidade direccionada' else '' end);
insert into public.business_promotion_targets(promotion_id,target_type,target_value) select v_promotion,'LOCATION',trim(x) from unnest(v_locations)x where trim(x)<>'';
insert into public.business_promotion_targets(promotion_id,target_type,target_value) select v_promotion,'CATEGORY',trim(x) from unnest(v_categories)x where trim(x)<>'';
return jsonb_build_object('promotion_id',v_promotion,'credits_charged',v_credits,'price_mzn',v_price,'ends_at',v_end);
end;$function$
;

CREATE OR REPLACE FUNCTION public.record_ad_interest(p_visitor_key text, p_user_id uuid DEFAULT NULL::uuid, p_interests text[] DEFAULT '{}'::text[], p_context jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v_interests jsonb:=coalesce((select interests from public.ad_visitor_profiles where visitor_key=p_visitor_key),'{}'::jsonb); v_item text; v_uid uuid:=auth.uid();
begin
 if p_visitor_key is null or length(p_visitor_key)<16 then return; end if;
 foreach v_item in array p_interests loop
  if length(trim(v_item))>1 then v_interests:=jsonb_set(v_interests,array[lower(trim(v_item))],to_jsonb(coalesce((v_interests->>lower(trim(v_item)))::int,0)+1),true); end if;
 end loop;
 insert into public.ad_visitor_profiles(visitor_key,user_id,interests,last_context,last_seen_at) values(p_visitor_key,v_uid,v_interests,p_context,now())
 on conflict(visitor_key) do update set user_id=coalesce(v_uid,ad_visitor_profiles.user_id),interests=excluded.interests,last_context=excluded.last_context,last_seen_at=now();
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_commerce_order_progress(p_order_id uuid, p_payment_status text, p_fulfillment_status text, p_payment_reference text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_user uuid := auth.uid();
  v_current public.commerce_orders%rowtype;
  v_now timestamptz := now();
begin
  if v_user is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_payment_status not in ('NOT_REQUIRED','PENDING','PROOF_SUBMITTED','PAID','FAILED','REFUNDED')
     or p_fulfillment_status not in ('NOT_STARTED','IN_PROGRESS','DELIVERED','COMPLETED','CANCELLED') then
    raise exception 'INVALID_PROGRESS';
  end if;

  select * into v_current
  from public.commerce_orders
  where id = p_order_id
    and exists (
      select 1
      from public.commerce_order_items oi
      join public.businesses b on b.id = oi.seller_business_id
      where oi.order_id = p_order_id
        and (
          b.owner_id = v_user
          or exists (
            select 1 from public.business_members bm
            where bm.business_id = b.id and bm.user_id = v_user and bm.role in ('owner','admin','operator')
          )
        )
    )
  for update;

  if v_current.id is null then raise exception 'ORDER_FORBIDDEN'; end if;
  if p_payment_status = 'PAID' and v_current.status not in ('AGREED','COMPLETED') then raise exception 'PAYMENT_BEFORE_AGREEMENT'; end if;

  update public.commerce_orders
  set payment_status = p_payment_status,
      payment_reference = p_payment_reference,
      paid_at = case when p_payment_status = 'PAID' then coalesce(paid_at, v_now) else paid_at end,
      fulfillment_status = p_fulfillment_status,
      service_started_at = case when p_fulfillment_status = 'IN_PROGRESS' then coalesce(service_started_at, v_now) else service_started_at end,
      completed_at = case when p_fulfillment_status = 'COMPLETED' then coalesce(completed_at, v_now) else completed_at end
  where id = p_order_id;

  if v_current.payment_status is distinct from p_payment_status then
    insert into public.commerce_order_events (
      order_id, actor_user_id, event_type, from_status, to_status, note, metadata
    ) values (
      p_order_id, v_user, 'PAYMENT_UPDATED', v_current.payment_status, p_payment_status,
      'Estado de pagamento actualizado pela empresa vendedora.',
      jsonb_build_object('reference', p_payment_reference)
    );
  end if;

  if v_current.fulfillment_status is distinct from p_fulfillment_status then
    insert into public.commerce_order_events (
      order_id, actor_user_id, event_type, from_status, to_status, note, metadata
    ) values (
      p_order_id, v_user, 'FULFILLMENT_UPDATED', v_current.fulfillment_status, p_fulfillment_status,
      'Estado de execução actualizado pela empresa vendedora.',
      '{}'::jsonb
    );
  end if;
end;
$function$
;

ALTER TABLE public.access_audit_log ADD CONSTRAINT access_audit_log_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.access_audit_log ADD CONSTRAINT access_audit_log_business_id_fkey FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL;

ALTER TABLE public.access_audit_log ADD CONSTRAINT access_audit_log_pkey PRIMARY KEY (id);

ALTER TABLE public.access_audit_log ADD CONSTRAINT access_audit_log_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public.ad_delivery_events ADD CONSTRAINT ad_delivery_events_event_type_check CHECK (event_type = ANY (ARRAY['IMPRESSION'::text, 'CLICK'::text]));

ALTER TABLE public.ad_delivery_events ADD CONSTRAINT ad_delivery_events_pkey PRIMARY KEY (id);

ALTER TABLE public.ad_delivery_events ADD CONSTRAINT ad_delivery_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.ad_impressions ADD CONSTRAINT ad_impressions_pkey PRIMARY KEY (id);

ALTER TABLE public.ad_impressions ADD CONSTRAINT ad_impressions_source_check CHECK (source = ANY (ARRAY['BUSINESS'::text, 'PARTNER'::text]));

ALTER TABLE public.ad_interest_events ADD CONSTRAINT ad_interest_events_pkey PRIMARY KEY (id);

ALTER TABLE public.ad_product_target_options ADD CONSTRAINT ad_product_target_options_ad_product_id_fkey FOREIGN KEY (ad_product_id) REFERENCES ad_products(id) ON DELETE CASCADE;

ALTER TABLE public.ad_product_target_options ADD CONSTRAINT ad_product_target_options_ad_product_id_target_type_target__key UNIQUE (ad_product_id, target_type, target_value);

ALTER TABLE public.ad_product_target_options ADD CONSTRAINT ad_product_target_options_extra_credits_check CHECK (extra_credits >= 0);

ALTER TABLE public.ad_product_target_options ADD CONSTRAINT ad_product_target_options_extra_price_mzn_check CHECK (extra_price_mzn >= 0::numeric);

ALTER TABLE public.ad_product_target_options ADD CONSTRAINT ad_product_target_options_pkey PRIMARY KEY (id);

ALTER TABLE public.ad_product_target_options ADD CONSTRAINT ad_product_target_options_target_type_check CHECK (target_type = ANY (ARRAY['LOCATION'::text, 'CATEGORY'::text]));

ALTER TABLE public.ad_products ADD CONSTRAINT ad_products_access_type_check CHECK (access_type = ANY (ARRAY['FREE'::text, 'PAID'::text]));

ALTER TABLE public.ad_products ADD CONSTRAINT ad_products_audience_level_check CHECK (audience_level = ANY (ARRAY['GENERAL'::text, 'TARGETED'::text]));

ALTER TABLE public.ad_products ADD CONSTRAINT ad_products_capacity_check CHECK (capacity > 0);

ALTER TABLE public.ad_products ADD CONSTRAINT ad_products_code_key UNIQUE (code);

ALTER TABLE public.ad_products ADD CONSTRAINT ad_products_credit_price_check CHECK (credit_price > 0);

ALTER TABLE public.ad_products ADD CONSTRAINT ad_products_direct_price_mzn_check CHECK (direct_price_mzn >= 0::numeric);

ALTER TABLE public.ad_products ADD CONSTRAINT ad_products_duration_days_check CHECK (duration_days > 0);

ALTER TABLE public.ad_products ADD CONSTRAINT ad_products_pkey PRIMARY KEY (id);

ALTER TABLE public.ad_products ADD CONSTRAINT ad_products_placement_check CHECK (placement = ANY (ARRAY['DIRECTORY'::text, 'MARKETPLACE'::text, 'HOME'::text, 'OPPORTUNITIES'::text]));

ALTER TABLE public.ad_visitor_profiles ADD CONSTRAINT ad_visitor_profiles_pkey PRIMARY KEY (visitor_key);

ALTER TABLE public.ad_visitor_profiles ADD CONSTRAINT ad_visitor_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.advertising_requests ADD CONSTRAINT advertising_requests_business_id_fkey FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL;

ALTER TABLE public.advertising_requests ADD CONSTRAINT advertising_requests_pkey PRIMARY KEY (id);

ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES profiles(id) ON DELETE SET NULL;

ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);

ALTER TABLE public.business_buyer_interests ADD CONSTRAINT business_buyer_interests_business_id_category_id_location_l_key UNIQUE (business_id, category_id, location, listing_type);

ALTER TABLE public.business_buyer_interests ADD CONSTRAINT business_buyer_interests_business_id_fkey FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;

ALTER TABLE public.business_buyer_interests ADD CONSTRAINT business_buyer_interests_category_id_fkey FOREIGN KEY (category_id) REFERENCES business_categories(id) ON DELETE CASCADE;

ALTER TABLE public.business_buyer_interests ADD CONSTRAINT business_buyer_interests_listing_type_check CHECK (listing_type IS NULL OR (listing_type = ANY (ARRAY['PRODUCT'::text, 'SERVICE'::text])));

ALTER TABLE public.business_buyer_interests ADD CONSTRAINT business_buyer_interests_pkey PRIMARY KEY (id);

ALTER TABLE public.business_categories ADD CONSTRAINT business_categories_name_key UNIQUE (name);

ALTER TABLE public.business_categories ADD CONSTRAINT business_categories_pkey PRIMARY KEY (id);

ALTER TABLE public.business_categories ADD CONSTRAINT business_categories_slug_key UNIQUE (slug);

ALTER TABLE public.business_credit_wallets ADD CONSTRAINT business_credit_wallets_balance_credits_check CHECK (balance_credits >= 0);

ALTER TABLE public.business_credit_wallets ADD CONSTRAINT business_credit_wallets_business_id_fkey FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;

ALTER TABLE public.business_credit_wallets ADD CONSTRAINT business_credit_wallets_business_id_key UNIQUE (business_id);

ALTER TABLE public.business_credit_wallets ADD CONSTRAINT business_credit_wallets_pkey PRIMARY KEY (id);

ALTER TABLE public.business_invitations ADD CONSTRAINT business_invitations_business_id_fkey FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;

ALTER TABLE public.business_invitations ADD CONSTRAINT business_invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.business_invitations ADD CONSTRAINT business_invitations_pkey PRIMARY KEY (id);

ALTER TABLE public.business_invitations ADD CONSTRAINT business_invitations_role_check CHECK (role = ANY (ARRAY['admin'::text, 'operator'::text, 'member'::text, 'viewer'::text]));

ALTER TABLE public.business_invitations ADD CONSTRAINT business_invitations_token_hash_key UNIQUE (token_hash);

ALTER TABLE public.business_members ADD CONSTRAINT business_members_business_id_fkey FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;

ALTER TABLE public.business_members ADD CONSTRAINT business_members_business_id_user_id_key UNIQUE (business_id, user_id);

ALTER TABLE public.business_members ADD CONSTRAINT business_members_pkey PRIMARY KEY (id);

ALTER TABLE public.business_members ADD CONSTRAINT business_members_role_check CHECK (role = ANY (ARRAY['owner'::text, 'admin'::text, 'operator'::text, 'member'::text, 'viewer'::text]));

ALTER TABLE public.business_members ADD CONSTRAINT business_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.business_partner_relationships ADD CONSTRAINT business_partner_relationship_business_id_partner_business__key UNIQUE (business_id, partner_business_id);

ALTER TABLE public.business_partner_relationships ADD CONSTRAINT business_partner_relationships_business_id_fkey FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;

ALTER TABLE public.business_partner_relationships ADD CONSTRAINT business_partner_relationships_check CHECK (business_id <> partner_business_id);

ALTER TABLE public.business_partner_relationships ADD CONSTRAINT business_partner_relationships_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.business_partner_relationships ADD CONSTRAINT business_partner_relationships_partner_business_id_fkey FOREIGN KEY (partner_business_id) REFERENCES businesses(id) ON DELETE CASCADE;

ALTER TABLE public.business_partner_relationships ADD CONSTRAINT business_partner_relationships_pkey PRIMARY KEY (id);

ALTER TABLE public.business_partner_relationships ADD CONSTRAINT business_partner_relationships_status_check CHECK (status = ANY (ARRAY['PENDING'::text, 'ACTIVE'::text, 'PAUSED'::text, 'ENDED'::text]));

ALTER TABLE public.business_plan_subscriptions ADD CONSTRAINT business_plan_subscriptions_business_id_fkey FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;

ALTER TABLE public.business_plan_subscriptions ADD CONSTRAINT business_plan_subscriptions_pkey PRIMARY KEY (id);

ALTER TABLE public.business_plan_subscriptions ADD CONSTRAINT business_plan_subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES platform_plans(id);

ALTER TABLE public.business_plan_subscriptions ADD CONSTRAINT business_plan_subscriptions_status_check CHECK (status = ANY (ARRAY['ACTIVE'::text, 'PAUSED'::text, 'CANCELLED'::text, 'EXPIRED'::text]));

ALTER TABLE public.business_portfolio_media ADD CONSTRAINT business_portfolio_media_business_id_fkey FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;

ALTER TABLE public.business_portfolio_media ADD CONSTRAINT business_portfolio_media_pkey PRIMARY KEY (id);

ALTER TABLE public.business_promotion_targets ADD CONSTRAINT business_promotion_targets_pkey PRIMARY KEY (id);

ALTER TABLE public.business_promotion_targets ADD CONSTRAINT business_promotion_targets_promotion_id_fkey FOREIGN KEY (promotion_id) REFERENCES business_promotions(id) ON DELETE CASCADE;

ALTER TABLE public.business_promotion_targets ADD CONSTRAINT business_promotion_targets_promotion_id_target_type_target__key UNIQUE (promotion_id, target_type, target_value);

ALTER TABLE public.business_promotion_targets ADD CONSTRAINT business_promotion_targets_target_type_check CHECK (target_type = ANY (ARRAY['LOCATION'::text, 'CATEGORY'::text]));

ALTER TABLE public.business_promotions ADD CONSTRAINT business_promotions_ad_product_id_fkey FOREIGN KEY (ad_product_id) REFERENCES ad_products(id);

ALTER TABLE public.business_promotions ADD CONSTRAINT business_promotions_audience_mode_check CHECK (audience_mode = ANY (ARRAY['GENERAL'::text, 'TARGETED'::text]));

ALTER TABLE public.business_promotions ADD CONSTRAINT business_promotions_business_id_fkey FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;

ALTER TABLE public.business_promotions ADD CONSTRAINT business_promotions_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;

ALTER TABLE public.business_promotions ADD CONSTRAINT business_promotions_payment_method_check CHECK (payment_method = ANY (ARRAY['MPESA'::text, 'CREDITS'::text]));

ALTER TABLE public.business_promotions ADD CONSTRAINT business_promotions_pkey PRIMARY KEY (id);

ALTER TABLE public.business_promotions ADD CONSTRAINT business_promotions_placement_check CHECK (placement = ANY (ARRAY['DIRECTORY'::text, 'MARKETPLACE'::text, 'HOME'::text]));

ALTER TABLE public.business_promotions ADD CONSTRAINT business_promotions_status_check CHECK (status = ANY (ARRAY['DRAFT'::text, 'PENDING'::text, 'ACTIVE'::text, 'PAUSED'::text, 'EXPIRED'::text]));

ALTER TABLE public.business_role_permissions ADD CONSTRAINT business_role_permissions_pkey PRIMARY KEY (role, permission);

ALTER TABLE public.business_role_permissions ADD CONSTRAINT business_role_permissions_role_check CHECK (role = ANY (ARRAY['owner'::text, 'admin'::text, 'operator'::text, 'member'::text, 'viewer'::text]));

ALTER TABLE public.businesses ADD CONSTRAINT businesses_category_id_fkey FOREIGN KEY (category_id) REFERENCES business_categories(id) ON DELETE SET NULL;

ALTER TABLE public.businesses ADD CONSTRAINT businesses_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.businesses ADD CONSTRAINT businesses_pkey PRIMARY KEY (id);

ALTER TABLE public.businesses ADD CONSTRAINT businesses_slug_key UNIQUE (slug);

ALTER TABLE public.commerce_order_events ADD CONSTRAINT commerce_order_events_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.commerce_order_events ADD CONSTRAINT commerce_order_events_event_type_check CHECK (event_type = ANY (ARRAY['STATUS_CHANGED'::text, 'PAYMENT_UPDATED'::text, 'FULFILLMENT_UPDATED'::text, 'ORDER_CREATED'::text, 'CANCELLED'::text]));

ALTER TABLE public.commerce_order_events ADD CONSTRAINT commerce_order_events_order_id_fkey FOREIGN KEY (order_id) REFERENCES commerce_orders(id) ON DELETE CASCADE;

ALTER TABLE public.commerce_order_events ADD CONSTRAINT commerce_order_events_pkey PRIMARY KEY (id);

ALTER TABLE public.commerce_order_items ADD CONSTRAINT commerce_order_items_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE SET NULL;

ALTER TABLE public.commerce_order_items ADD CONSTRAINT commerce_order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES commerce_orders(id) ON DELETE CASCADE;

ALTER TABLE public.commerce_order_items ADD CONSTRAINT commerce_order_items_pkey PRIMARY KEY (id);

ALTER TABLE public.commerce_order_items ADD CONSTRAINT commerce_order_items_seller_business_id_fkey FOREIGN KEY (seller_business_id) REFERENCES businesses(id) ON DELETE SET NULL;

ALTER TABLE public.commerce_order_items ADD CONSTRAINT commerce_order_items_type_check CHECK (type = ANY (ARRAY['PRODUCT'::text, 'SERVICE'::text, 'PLATFORM_SERVICE'::text]));

ALTER TABLE public.commerce_orders ADD CONSTRAINT commerce_orders_buyer_business_id_fkey FOREIGN KEY (buyer_business_id) REFERENCES businesses(id) ON DELETE SET NULL;

ALTER TABLE public.commerce_orders ADD CONSTRAINT commerce_orders_buyer_user_id_fkey FOREIGN KEY (buyer_user_id) REFERENCES profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.commerce_orders ADD CONSTRAINT commerce_orders_fulfillment_status_check CHECK (fulfillment_status = ANY (ARRAY['NOT_STARTED'::text, 'IN_PROGRESS'::text, 'DELIVERED'::text, 'COMPLETED'::text, 'CANCELLED'::text]));

ALTER TABLE public.commerce_orders ADD CONSTRAINT commerce_orders_payment_status_check CHECK (payment_status = ANY (ARRAY['NOT_REQUIRED'::text, 'PENDING'::text, 'PROOF_SUBMITTED'::text, 'PAID'::text, 'FAILED'::text, 'REFUNDED'::text]));

ALTER TABLE public.commerce_orders ADD CONSTRAINT commerce_orders_pkey PRIMARY KEY (id);

ALTER TABLE public.commerce_orders ADD CONSTRAINT commerce_orders_status_check CHECK (status = ANY (ARRAY['INTERESTED'::text, 'CONTACTED'::text, 'NEGOTIATING'::text, 'AGREED'::text, 'COMPLETED'::text, 'CANCELLED'::text]));

ALTER TABLE public.commerce_transactions ADD CONSTRAINT commerce_transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES commerce_orders(id) ON DELETE CASCADE;

ALTER TABLE public.commerce_transactions ADD CONSTRAINT commerce_transactions_pkey PRIMARY KEY (id);

ALTER TABLE public.commerce_transactions ADD CONSTRAINT commerce_transactions_status_check CHECK (status = ANY (ARRAY['PENDING'::text, 'AUTHORIZED'::text, 'PAID'::text, 'FAILED'::text, 'REFUNDED'::text]));

ALTER TABLE public.contact_messages ADD CONSTRAINT contact_messages_email_check CHECK (char_length(TRIM(BOTH FROM email)) >= 3 AND char_length(TRIM(BOTH FROM email)) <= 180);

ALTER TABLE public.contact_messages ADD CONSTRAINT contact_messages_message_check CHECK (char_length(TRIM(BOTH FROM message)) >= 5 AND char_length(TRIM(BOTH FROM message)) <= 5000);

ALTER TABLE public.contact_messages ADD CONSTRAINT contact_messages_name_check CHECK (char_length(TRIM(BOTH FROM name)) >= 2 AND char_length(TRIM(BOTH FROM name)) <= 120);

ALTER TABLE public.contact_messages ADD CONSTRAINT contact_messages_pkey PRIMARY KEY (id);

ALTER TABLE public.contact_messages ADD CONSTRAINT contact_messages_subject_check CHECK (char_length(TRIM(BOTH FROM subject)) >= 2 AND char_length(TRIM(BOTH FROM subject)) <= 120);

ALTER TABLE public.credit_packages ADD CONSTRAINT credit_packages_code_key UNIQUE (code);

ALTER TABLE public.credit_packages ADD CONSTRAINT credit_packages_credit_volume_check CHECK (credit_volume > 0);

ALTER TABLE public.credit_packages ADD CONSTRAINT credit_packages_pkey PRIMARY KEY (id);

ALTER TABLE public.credit_packages ADD CONSTRAINT credit_packages_price_mzn_check CHECK (price_mzn >= 0::numeric);

ALTER TABLE public.credit_purchase_requests ADD CONSTRAINT credit_purchase_requests_amount_mzn_check CHECK (amount_mzn >= 0::numeric);

ALTER TABLE public.credit_purchase_requests ADD CONSTRAINT credit_purchase_requests_business_id_fkey FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;

ALTER TABLE public.credit_purchase_requests ADD CONSTRAINT credit_purchase_requests_credits_check CHECK (credits > 0);

ALTER TABLE public.credit_purchase_requests ADD CONSTRAINT credit_purchase_requests_package_id_fkey FOREIGN KEY (package_id) REFERENCES credit_packages(id);

ALTER TABLE public.credit_purchase_requests ADD CONSTRAINT credit_purchase_requests_payment_method_check CHECK (payment_method = ANY (ARRAY['MPESA'::text, 'BANK_TRANSFER'::text]));

ALTER TABLE public.credit_purchase_requests ADD CONSTRAINT credit_purchase_requests_pkey PRIMARY KEY (id);

ALTER TABLE public.credit_purchase_requests ADD CONSTRAINT credit_purchase_requests_requester_user_id_fkey FOREIGN KEY (requester_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.credit_purchase_requests ADD CONSTRAINT credit_purchase_requests_status_check CHECK (status = ANY (ARRAY['REQUESTED'::text, 'PAYMENT_PENDING'::text, 'PAID'::text, 'REJECTED'::text, 'CANCELLED'::text]));

ALTER TABLE public.credit_transactions ADD CONSTRAINT credit_transactions_credits_check CHECK (credits <> 0);

ALTER TABLE public.credit_transactions ADD CONSTRAINT credit_transactions_package_id_fkey FOREIGN KEY (package_id) REFERENCES credit_packages(id);

ALTER TABLE public.credit_transactions ADD CONSTRAINT credit_transactions_pkey PRIMARY KEY (id);

ALTER TABLE public.credit_transactions ADD CONSTRAINT credit_transactions_type_check CHECK (type = ANY (ARRAY['PURCHASE'::text, 'BONUS'::text, 'CONSUMPTION'::text, 'REFUND'::text, 'ADJUSTMENT'::text]));

ALTER TABLE public.credit_transactions ADD CONSTRAINT credit_transactions_wallet_id_fkey FOREIGN KEY (wallet_id) REFERENCES business_credit_wallets(id) ON DELETE CASCADE;

ALTER TABLE public.financial_documents ADD CONSTRAINT financial_documents_business_id_fkey FOREIGN KEY (business_id) REFERENCES businesses(id);

ALTER TABLE public.financial_documents ADD CONSTRAINT financial_documents_document_number_key UNIQUE (document_number);

ALTER TABLE public.financial_documents ADD CONSTRAINT financial_documents_document_type_check CHECK (document_type = ANY (ARRAY['INVOICE'::text, 'RECEIPT'::text, 'CREDIT_PURCHASE'::text, 'SERVICE_ORDER'::text, 'AD_PURCHASE'::text]));

ALTER TABLE public.financial_documents ADD CONSTRAINT financial_documents_pkey PRIMARY KEY (id);

ALTER TABLE public.financial_documents ADD CONSTRAINT financial_documents_status_check CHECK (status = ANY (ARRAY['DRAFT'::text, 'ISSUED'::text, 'PAID'::text, 'VOID'::text]));

ALTER TABLE public.financial_documents ADD CONSTRAINT financial_documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE public.financial_payments ADD CONSTRAINT financial_payments_amount_mzn_check CHECK (amount_mzn > 0::numeric);

ALTER TABLE public.financial_payments ADD CONSTRAINT financial_payments_business_id_fkey FOREIGN KEY (business_id) REFERENCES businesses(id);

ALTER TABLE public.financial_payments ADD CONSTRAINT financial_payments_document_id_fkey FOREIGN KEY (document_id) REFERENCES financial_documents(id);

ALTER TABLE public.financial_payments ADD CONSTRAINT financial_payments_method_check CHECK (method = ANY (ARRAY['MPESA'::text, 'BANK_TRANSFER'::text, 'CREDITS'::text]));

ALTER TABLE public.financial_payments ADD CONSTRAINT financial_payments_pkey PRIMARY KEY (id);

ALTER TABLE public.financial_payments ADD CONSTRAINT financial_payments_status_check CHECK (status = ANY (ARRAY['PENDING'::text, 'CONFIRMED'::text, 'FAILED'::text, 'REFUNDED'::text]));

ALTER TABLE public.financial_payments ADD CONSTRAINT financial_payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE public.listing_attachments ADD CONSTRAINT listing_attachments_kind_check CHECK (kind = ANY (ARRAY['IMAGE'::text, 'DOCUMENT'::text]));

ALTER TABLE public.listing_attachments ADD CONSTRAINT listing_attachments_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;

ALTER TABLE public.listing_attachments ADD CONSTRAINT listing_attachments_pkey PRIMARY KEY (id);

ALTER TABLE public.listing_attachments ADD CONSTRAINT listing_attachments_storage_path_key UNIQUE (storage_path);

ALTER TABLE public.listing_categories ADD CONSTRAINT listing_categories_name_key UNIQUE (name);

ALTER TABLE public.listing_categories ADD CONSTRAINT listing_categories_pkey PRIMARY KEY (id);

ALTER TABLE public.listing_categories ADD CONSTRAINT listing_categories_slug_key UNIQUE (slug);

ALTER TABLE public.listing_media ADD CONSTRAINT listing_media_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;

ALTER TABLE public.listing_media ADD CONSTRAINT listing_media_pkey PRIMARY KEY (id);

ALTER TABLE public.listings ADD CONSTRAINT listings_business_id_fkey FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL;

ALTER TABLE public.listings ADD CONSTRAINT listings_category_id_fkey FOREIGN KEY (category_id) REFERENCES listing_categories(id) ON DELETE SET NULL;

ALTER TABLE public.listings ADD CONSTRAINT listings_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.listings ADD CONSTRAINT listings_pkey PRIMARY KEY (id);

ALTER TABLE public.listings ADD CONSTRAINT listings_slug_key UNIQUE (slug);

ALTER TABLE public.notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.opportunities ADD CONSTRAINT opportunities_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES profiles(id) ON DELETE RESTRICT;

ALTER TABLE public.opportunities ADD CONSTRAINT opportunities_partner_account_id_fkey FOREIGN KEY (partner_account_id) REFERENCES partner_accounts(id) ON DELETE SET NULL;

ALTER TABLE public.opportunities ADD CONSTRAINT opportunities_pkey PRIMARY KEY (id);

ALTER TABLE public.opportunities ADD CONSTRAINT opportunities_slug_key UNIQUE (slug);

ALTER TABLE public.opportunity_applications ADD CONSTRAINT opportunity_applications_applicant_business_id_fkey FOREIGN KEY (applicant_business_id) REFERENCES businesses(id) ON DELETE SET NULL;

ALTER TABLE public.opportunity_applications ADD CONSTRAINT opportunity_applications_applicant_user_id_fkey FOREIGN KEY (applicant_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.opportunity_applications ADD CONSTRAINT opportunity_applications_opportunity_id_applicant_user_id_key UNIQUE (opportunity_id, applicant_user_id);

ALTER TABLE public.opportunity_applications ADD CONSTRAINT opportunity_applications_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE;

ALTER TABLE public.opportunity_applications ADD CONSTRAINT opportunity_applications_pkey PRIMARY KEY (id);

ALTER TABLE public.opportunity_applications ADD CONSTRAINT opportunity_applications_status_check CHECK (status = ANY (ARRAY['DRAFT'::text, 'SUBMITTED'::text, 'UNDER_REVIEW'::text, 'SHORTLISTED'::text, 'ACCEPTED'::text, 'REJECTED'::text, 'WITHDRAWN'::text]));

ALTER TABLE public.partner_account_members ADD CONSTRAINT partner_account_members_account_id_fkey FOREIGN KEY (account_id) REFERENCES partner_accounts(id) ON DELETE CASCADE;

ALTER TABLE public.partner_account_members ADD CONSTRAINT partner_account_members_account_id_user_id_key UNIQUE (account_id, user_id);

ALTER TABLE public.partner_account_members ADD CONSTRAINT partner_account_members_pkey PRIMARY KEY (id);

ALTER TABLE public.partner_account_members ADD CONSTRAINT partner_account_members_role_check CHECK (role = ANY (ARRAY['owner'::text, 'manager'::text, 'analyst'::text, 'viewer'::text]));

ALTER TABLE public.partner_account_members ADD CONSTRAINT partner_account_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.partner_accounts ADD CONSTRAINT partner_accounts_pkey PRIMARY KEY (id);

ALTER TABLE public.partner_accounts ADD CONSTRAINT partner_accounts_status_check CHECK (status = ANY (ARRAY['ACTIVE'::text, 'SUSPENDED'::text, 'CLOSED'::text]));

ALTER TABLE public.partner_ad_campaigns ADD CONSTRAINT partner_ad_campaigns_account_id_fkey FOREIGN KEY (account_id) REFERENCES partner_accounts(id) ON DELETE CASCADE;

ALTER TABLE public.partner_ad_campaigns ADD CONSTRAINT partner_ad_campaigns_pkey PRIMARY KEY (id);

ALTER TABLE public.partner_ad_campaigns ADD CONSTRAINT partner_ad_campaigns_product_id_fkey FOREIGN KEY (product_id) REFERENCES partner_ad_products(id);

ALTER TABLE public.partner_ad_campaigns ADD CONSTRAINT partner_ad_campaigns_status_check CHECK (status = ANY (ARRAY['DRAFT'::text, 'REQUESTED'::text, 'APPROVED'::text, 'ACTIVE'::text, 'PAUSED'::text, 'ENDED'::text, 'REJECTED'::text]));

ALTER TABLE public.partner_ad_products ADD CONSTRAINT partner_ad_products_code_key UNIQUE (code);

ALTER TABLE public.partner_ad_products ADD CONSTRAINT partner_ad_products_pkey PRIMARY KEY (id);

ALTER TABLE public.partner_ad_targets ADD CONSTRAINT partner_ad_targets_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES partner_ad_campaigns(id) ON DELETE CASCADE;

ALTER TABLE public.partner_ad_targets ADD CONSTRAINT partner_ad_targets_pkey PRIMARY KEY (id);

ALTER TABLE public.partner_ad_targets ADD CONSTRAINT partner_ad_targets_target_type_check CHECK (target_type = ANY (ARRAY['SECTOR'::text, 'PROVINCE'::text, 'CITY'::text, 'COMPANY_SIZE'::text, 'INTENT'::text, 'CATEGORY'::text]));

ALTER TABLE public.partner_entitlements ADD CONSTRAINT partner_entitlements_account_id_fkey FOREIGN KEY (account_id) REFERENCES partner_accounts(id) ON DELETE CASCADE;

ALTER TABLE public.partner_entitlements ADD CONSTRAINT partner_entitlements_entitlement_type_check CHECK (entitlement_type = ANY (ARRAY['SERVICE'::text, 'EXCLUSIVITY'::text, 'ADVERTISING'::text, 'INTELLIGENCE'::text]));

ALTER TABLE public.partner_entitlements ADD CONSTRAINT partner_entitlements_pkey PRIMARY KEY (id);

ALTER TABLE public.partner_entitlements ADD CONSTRAINT partner_entitlements_status_check CHECK (status = ANY (ARRAY['ACTIVE'::text, 'SUSPENDED'::text, 'EXPIRED'::text]));

ALTER TABLE public.platform_conversion_events ADD CONSTRAINT platform_conversion_events_event_type_check CHECK (event_type = ANY (ARRAY['PROFILE_VIEW'::text, 'CONTACT_CLICK'::text, 'WHATSAPP_SHARE'::text, 'SEARCH_SUBMITTED'::text, 'SEARCH_SAVED'::text, 'FAVORITE_SAVED'::text, 'OPPORTUNITY_APPLY'::text, 'SIGNUP_CLICK'::text, 'AD_CLICK'::text]));

ALTER TABLE public.platform_conversion_events ADD CONSTRAINT platform_conversion_events_pkey PRIMARY KEY (id);

ALTER TABLE public.platform_conversion_events ADD CONSTRAINT platform_conversion_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.platform_members ADD CONSTRAINT platform_members_pkey PRIMARY KEY (user_id);

ALTER TABLE public.platform_members ADD CONSTRAINT platform_members_role_check CHECK (role = ANY (ARRAY['admin'::text, 'operator'::text, 'super_admin'::text]));

ALTER TABLE public.platform_members ADD CONSTRAINT platform_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE public.platform_plans ADD CONSTRAINT platform_plans_code_key UNIQUE (code);

ALTER TABLE public.platform_plans ADD CONSTRAINT platform_plans_pkey PRIMARY KEY (id);

ALTER TABLE public.platform_service_orders ADD CONSTRAINT platform_service_orders_amount_mzn_check CHECK (amount_mzn >= 0::numeric);

ALTER TABLE public.platform_service_orders ADD CONSTRAINT platform_service_orders_business_id_fkey FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE RESTRICT;

ALTER TABLE public.platform_service_orders ADD CONSTRAINT platform_service_orders_dates_check CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at);

ALTER TABLE public.platform_service_orders ADD CONSTRAINT platform_service_orders_payment_method_check CHECK (payment_method = ANY (ARRAY['CREDITS'::text, 'MPESA'::text]));

ALTER TABLE public.platform_service_orders ADD CONSTRAINT platform_service_orders_pkey PRIMARY KEY (id);

ALTER TABLE public.platform_service_orders ADD CONSTRAINT platform_service_orders_renewal_period_check CHECK (renewal_period IS NULL OR (renewal_period = ANY (ARRAY['MONTHLY'::text, 'ANNUAL'::text])));

ALTER TABLE public.platform_service_orders ADD CONSTRAINT platform_service_orders_renewal_status_check CHECK (renewal_status = ANY (ARRAY['NONE'::text, 'ACTIVE'::text, 'EXPIRING'::text, 'EXPIRED'::text, 'CANCELLED'::text, 'PENDING_RENEWAL'::text]));

ALTER TABLE public.platform_service_orders ADD CONSTRAINT platform_service_orders_renewed_from_order_id_fkey FOREIGN KEY (renewed_from_order_id) REFERENCES platform_service_orders(id);

ALTER TABLE public.platform_service_orders ADD CONSTRAINT platform_service_orders_requester_user_id_fkey FOREIGN KEY (requester_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

ALTER TABLE public.platform_service_orders ADD CONSTRAINT platform_service_orders_service_id_fkey FOREIGN KEY (service_id) REFERENCES platform_services(id) ON DELETE RESTRICT;

ALTER TABLE public.platform_service_orders ADD CONSTRAINT platform_service_orders_status_check CHECK (status = ANY (ARRAY['PENDING_PAYMENT'::text, 'PAID'::text, 'PROCESSING'::text, 'COMPLETED'::text, 'CANCELLED'::text, 'FAILED'::text]));

ALTER TABLE public.platform_service_subscriptions ADD CONSTRAINT platform_service_subscriptions_business_id_fkey FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;

ALTER TABLE public.platform_service_subscriptions ADD CONSTRAINT platform_service_subscriptions_check CHECK (ends_at > starts_at);

ALTER TABLE public.platform_service_subscriptions ADD CONSTRAINT platform_service_subscriptions_current_order_id_fkey FOREIGN KEY (current_order_id) REFERENCES platform_service_orders(id) ON DELETE SET NULL;

ALTER TABLE public.platform_service_subscriptions ADD CONSTRAINT platform_service_subscriptions_pkey PRIMARY KEY (id);

ALTER TABLE public.platform_service_subscriptions ADD CONSTRAINT platform_service_subscriptions_renewal_period_check CHECK (renewal_period = ANY (ARRAY['MONTHLY'::text, 'ANNUAL'::text]));

ALTER TABLE public.platform_service_subscriptions ADD CONSTRAINT platform_service_subscriptions_service_id_fkey FOREIGN KEY (service_id) REFERENCES platform_services(id) ON DELETE RESTRICT;

ALTER TABLE public.platform_service_subscriptions ADD CONSTRAINT platform_service_subscriptions_status_check CHECK (status = ANY (ARRAY['ACTIVE'::text, 'PAST_DUE'::text, 'EXPIRED'::text, 'CANCELLED'::text]));

ALTER TABLE public.platform_services ADD CONSTRAINT platform_services_billing_check CHECK (billing = ANY (ARRAY['ONE_TIME'::text, 'MONTHLY'::text, 'ANNUAL'::text, 'QUOTE'::text]));

ALTER TABLE public.platform_services ADD CONSTRAINT platform_services_pkey PRIMARY KEY (id);

ALTER TABLE public.platform_services ADD CONSTRAINT platform_services_renewal_period_check CHECK (renewal_period IS NULL OR (renewal_period = ANY (ARRAY['MONTHLY'::text, 'ANNUAL'::text])));

ALTER TABLE public.platform_services ADD CONSTRAINT platform_services_slug_key UNIQUE (slug);

ALTER TABLE public.profiles ADD CONSTRAINT profiles_account_status_check CHECK (account_status = ANY (ARRAY['ACTIVE'::text, 'INACTIVE'::text, 'DELETED'::text]));

ALTER TABLE public.profiles ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.profiles ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_type_check CHECK (user_type = ANY (ARRAY['empresa'::text, 'profissional'::text, 'parceiro'::text]));

ALTER TABLE public.public_rate_limits ADD CONSTRAINT public_rate_limits_key_hash_check CHECK (key_hash ~ '^[a-f0-9]{64}$'::text);

ALTER TABLE public.public_rate_limits ADD CONSTRAINT public_rate_limits_pkey PRIMARY KEY (key_hash);

ALTER TABLE public.public_rate_limits ADD CONSTRAINT public_rate_limits_request_count_check CHECK (request_count >= 0);

ALTER TABLE public.publication_attachments ADD CONSTRAINT publication_attachments_kind_check CHECK (kind = ANY (ARRAY['IMAGE'::text, 'DOCUMENT'::text]));

ALTER TABLE public.publication_attachments ADD CONSTRAINT publication_attachments_pkey PRIMARY KEY (id);

ALTER TABLE public.publication_attachments ADD CONSTRAINT publication_attachments_resource_type_check CHECK (resource_type = ANY (ARRAY['OPPORTUNITY'::text, 'CONTEST'::text]));

ALTER TABLE public.publication_attachments ADD CONSTRAINT publication_attachments_storage_path_key UNIQUE (storage_path);

ALTER TABLE public.recommendation_events ADD CONSTRAINT recommendation_events_business_id_fkey FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE;

ALTER TABLE public.recommendation_events ADD CONSTRAINT recommendation_events_event_type_check CHECK (event_type = ANY (ARRAY['VIEW'::text, 'SEARCH'::text, 'CLICK'::text, 'CONTACT'::text, 'SAVE'::text, 'PURCHASE'::text]));

ALTER TABLE public.recommendation_events ADD CONSTRAINT recommendation_events_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE;

ALTER TABLE public.recommendation_events ADD CONSTRAINT recommendation_events_pkey PRIMARY KEY (id);

ALTER TABLE public.recommendation_events ADD CONSTRAINT recommendation_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.service_requests ADD CONSTRAINT service_requests_pkey PRIMARY KEY (id);

ALTER TABLE public.service_requests ADD CONSTRAINT service_requests_requester_business_id_fkey FOREIGN KEY (requester_business_id) REFERENCES businesses(id) ON DELETE SET NULL;

ALTER TABLE public.service_requests ADD CONSTRAINT service_requests_requester_user_id_fkey FOREIGN KEY (requester_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.service_requests ADD CONSTRAINT service_requests_service_id_fkey FOREIGN KEY (service_id) REFERENCES platform_services(id) ON DELETE RESTRICT;

ALTER TABLE public.service_requests ADD CONSTRAINT service_requests_status_check CHECK (status = ANY (ARRAY['REQUESTED'::text, 'UNDER_REVIEW'::text, 'QUOTED'::text, 'ACCEPTED'::text, 'IN_PROGRESS'::text, 'COMPLETED'::text, 'CANCELLED'::text]));

ALTER TABLE public.support_messages ADD CONSTRAINT support_messages_pkey PRIMARY KEY (id);

ALTER TABLE public.support_messages ADD CONSTRAINT support_messages_sender_role_check CHECK (sender_role = ANY (ARRAY['USER'::text, 'BACKOFFICE'::text]));

ALTER TABLE public.support_messages ADD CONSTRAINT support_messages_sender_user_id_fkey FOREIGN KEY (sender_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.support_messages ADD CONSTRAINT support_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE;

ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_business_id_fkey FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE SET NULL;

ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_pkey PRIMARY KEY (id);

ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_priority_check CHECK (priority = ANY (ARRAY['LOW'::text, 'NORMAL'::text, 'HIGH'::text, 'URGENT'::text]));

ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_status_check CHECK (status = ANY (ARRAY['OPEN'::text, 'IN_PROGRESS'::text, 'WAITING_USER'::text, 'RESOLVED'::text, 'CLOSED'::text]));

ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.user_favorites ADD CONSTRAINT user_favorites_entity_type_check CHECK (entity_type = ANY (ARRAY['business'::text, 'listing'::text, 'opportunity'::text]));

ALTER TABLE public.user_favorites ADD CONSTRAINT user_favorites_pkey PRIMARY KEY (id);

ALTER TABLE public.user_favorites ADD CONSTRAINT user_favorites_user_id_entity_type_entity_id_key UNIQUE (user_id, entity_type, entity_id);

ALTER TABLE public.user_favorites ADD CONSTRAINT user_favorites_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.user_saved_searches ADD CONSTRAINT user_saved_searches_entity_type_check CHECK (entity_type = ANY (ARRAY['businesses'::text, 'marketplace'::text, 'opportunities'::text]));

ALTER TABLE public.user_saved_searches ADD CONSTRAINT user_saved_searches_pkey PRIMARY KEY (id);

ALTER TABLE public.user_saved_searches ADD CONSTRAINT user_saved_searches_user_id_entity_type_filters_key UNIQUE (user_id, entity_type, filters);

ALTER TABLE public.user_saved_searches ADD CONSTRAINT user_saved_searches_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX access_audit_log_business_created_idx ON public.access_audit_log USING btree (business_id, created_at DESC);

CREATE INDEX ad_delivery_context_idx ON public.ad_delivery_events USING btree (surface, slot, event_type, created_at DESC);

CREATE INDEX ad_delivery_frequency_idx ON public.ad_delivery_events USING btree (visitor_key, campaign_source, campaign_id, event_type, created_at DESC);

CREATE INDEX ad_impressions_lookup_idx ON public.ad_impressions USING btree (source, ad_id, surface, slot, served_at DESC);

CREATE INDEX ad_impressions_visitor_idx ON public.ad_impressions USING btree (visitor_id, ad_id, served_at DESC);

CREATE INDEX ad_interest_events_visitor_idx ON public.ad_interest_events USING btree (visitor_id, created_at DESC);

CREATE INDEX ad_products_active_idx ON public.ad_products USING btree (active, placement);

CREATE INDEX ad_visitor_profiles_last_seen_idx ON public.ad_visitor_profiles USING btree (last_seen_at DESC);

CREATE INDEX advertising_requests_status_idx ON public.advertising_requests USING btree (status, created_at DESC);

CREATE INDEX business_buyer_interests_business_idx ON public.business_buyer_interests USING btree (business_id);

CREATE INDEX business_buyer_interests_category_idx ON public.business_buyer_interests USING btree (category_id);

CREATE INDEX business_buyer_interests_location_idx ON public.business_buyer_interests USING btree (location);

CREATE INDEX business_invitations_business_id_idx ON public.business_invitations USING btree (business_id);

CREATE INDEX business_invitations_email_idx ON public.business_invitations USING btree (lower(email));

CREATE INDEX business_members_user_id_idx ON public.business_members USING btree (user_id);

CREATE INDEX business_members_user_idx ON public.business_members USING btree (user_id);

CREATE INDEX business_portfolio_media_business_idx ON public.business_portfolio_media USING btree (business_id, sort_order);

CREATE INDEX business_promotions_audience_mode_idx ON public.business_promotions USING btree (audience_mode);

CREATE INDEX business_promotions_delivery_idx ON public.business_promotions USING btree (placement, slot, status, starts_at, ends_at, campaign_mode, priority);

CREATE INDEX business_promotions_inventory_idx ON public.business_promotions USING btree (placement, slot, status, starts_at, ends_at);

CREATE INDEX business_promotions_product_dates_idx ON public.business_promotions USING btree (ad_product_id, starts_at, ends_at);

CREATE INDEX businesses_archived_at_idx ON public.businesses USING btree (archived_at);

CREATE INDEX businesses_category_id_idx ON public.businesses USING btree (category_id);

CREATE INDEX businesses_owner_id_idx ON public.businesses USING btree (owner_id);

CREATE INDEX businesses_public_name_idx ON public.businesses USING btree (is_public, name);

CREATE INDEX commerce_order_events_order_created_idx ON public.commerce_order_events USING btree (order_id, created_at DESC);

CREATE INDEX commerce_order_items_listing_idx ON public.commerce_order_items USING btree (listing_id);

CREATE INDEX commerce_order_items_order_idx ON public.commerce_order_items USING btree (order_id);

CREATE INDEX commerce_orders_business_idx ON public.commerce_orders USING btree (buyer_business_id, created_at DESC);

CREATE INDEX commerce_orders_buyer_business_id_idx ON public.commerce_orders USING btree (buyer_business_id);

CREATE INDEX commerce_orders_buyer_idx ON public.commerce_orders USING btree (buyer_user_id, created_at DESC);

CREATE INDEX commerce_transactions_order_idx ON public.commerce_transactions USING btree (order_id);

CREATE INDEX credit_purchase_requests_business_idx ON public.credit_purchase_requests USING btree (business_id, created_at DESC);

CREATE INDEX credit_purchase_requests_status_idx ON public.credit_purchase_requests USING btree (status, created_at DESC);

CREATE INDEX financial_documents_business_idx ON public.financial_documents USING btree (business_id, issued_at DESC);

CREATE INDEX financial_payments_business_idx ON public.financial_payments USING btree (business_id, created_at DESC);

CREATE INDEX idx_order_events_order ON public.commerce_order_events USING btree (order_id, created_at DESC);

CREATE INDEX idx_partner_business ON public.business_partner_relationships USING btree (business_id, status);

CREATE INDEX idx_partner_partner ON public.business_partner_relationships USING btree (partner_business_id, status);

CREATE INDEX idx_recommendation_events_user ON public.recommendation_events USING btree (user_id, created_at DESC);

CREATE INDEX idx_service_requests_business ON public.service_requests USING btree (requester_business_id, status);

CREATE INDEX idx_service_requests_user ON public.service_requests USING btree (requester_user_id, status);

CREATE INDEX listing_attachments_listing_id_idx ON public.listing_attachments USING btree (listing_id, created_at);

CREATE INDEX listings_business_idx ON public.listings USING btree (business_id);

CREATE INDEX listings_owner_idx ON public.listings USING btree (owner_id);

CREATE INDEX listings_status_idx ON public.listings USING btree (status);

CREATE INDEX listings_type_idx ON public.listings USING btree (type);

CREATE INDEX opportunities_owner_idx ON public.opportunities USING btree (owner_id);

CREATE INDEX opportunities_partner_account_idx ON public.opportunities USING btree (partner_account_id, created_at DESC);

CREATE INDEX opportunities_status_idx ON public.opportunities USING btree (status);

CREATE INDEX opportunities_type_idx ON public.opportunities USING btree (type);

CREATE INDEX opportunity_applications_opportunity_idx ON public.opportunity_applications USING btree (opportunity_id, status);

CREATE INDEX partner_account_members_account_idx ON public.partner_account_members USING btree (account_id);

CREATE INDEX partner_ad_campaigns_account_idx ON public.partner_ad_campaigns USING btree (account_id, created_at DESC);

CREATE INDEX partner_ad_campaigns_delivery_idx ON public.partner_ad_campaigns USING btree (surface, slot, status, starts_at, ends_at, campaign_mode, priority);

CREATE INDEX partner_ad_campaigns_inventory_idx ON public.partner_ad_campaigns USING btree (surface, slot, status, starts_at, ends_at);

CREATE INDEX partner_ad_targets_campaign_idx ON public.partner_ad_targets USING btree (campaign_id);

CREATE INDEX partner_entitlements_account_idx ON public.partner_entitlements USING btree (account_id, status);

CREATE INDEX platform_conversion_events_type_date_idx ON public.platform_conversion_events USING btree (event_type, created_at DESC);

CREATE INDEX platform_conversion_events_user_date_idx ON public.platform_conversion_events USING btree (user_id, created_at DESC);

CREATE INDEX platform_service_orders_business_ends_idx ON public.platform_service_orders USING btree (business_id, ends_at DESC);

CREATE INDEX platform_service_orders_business_idx ON public.platform_service_orders USING btree (business_id, created_at DESC);

CREATE INDEX platform_service_orders_renewal_idx ON public.platform_service_orders USING btree (renewal_status, ends_at);

CREATE INDEX platform_service_orders_user_idx ON public.platform_service_orders USING btree (requester_user_id, created_at DESC);

CREATE INDEX platform_service_subscriptions_business_idx ON public.platform_service_subscriptions USING btree (business_id, status, ends_at);

CREATE INDEX platform_service_subscriptions_renewal_idx ON public.platform_service_subscriptions USING btree (status, next_renewal_at);

CREATE INDEX publication_attachments_resource_idx ON public.publication_attachments USING btree (resource_type, resource_id, created_at);

CREATE INDEX support_messages_ticket_idx ON public.support_messages USING btree (ticket_id, created_at);

CREATE INDEX support_tickets_business_idx ON public.support_tickets USING btree (business_id, created_at DESC);

CREATE INDEX support_tickets_user_idx ON public.support_tickets USING btree (user_id, created_at DESC);

CREATE INDEX user_favorites_user_created_idx ON public.user_favorites USING btree (user_id, created_at DESC);

CREATE INDEX user_saved_searches_user_created_idx ON public.user_saved_searches USING btree (user_id, created_at DESC);

CREATE UNIQUE INDEX business_active_plan_idx ON public.business_plan_subscriptions USING btree (business_id) WHERE (status = 'ACTIVE'::text);

CREATE UNIQUE INDEX partner_account_members_one_account_per_user ON public.partner_account_members USING btree (user_id);

CREATE OR REPLACE VIEW public.public_profiles WITH (security_invoker=true) AS  SELECT id,
    full_name,
    location,
    website,
    bio,
    created_at
   FROM profiles
  WHERE account_status = 'ACTIVE'::text;;

CREATE TRIGGER notify_commerce_order_created_trigger AFTER INSERT ON commerce_order_items FOR EACH ROW EXECUTE FUNCTION notify_commerce_order_created();

CREATE TRIGGER notify_commerce_order_updated_trigger AFTER UPDATE OF status, payment_status, fulfillment_status ON commerce_orders FOR EACH ROW EXECUTE FUNCTION notify_commerce_order_updated();

CREATE TRIGGER notify_opportunity_application_owner_trigger AFTER INSERT ON opportunity_applications FOR EACH ROW EXECUTE FUNCTION notify_opportunity_application_owner();

CREATE TRIGGER notify_saved_search_business_match AFTER INSERT OR UPDATE OF is_public ON businesses FOR EACH ROW EXECUTE FUNCTION notify_saved_search_matches();

CREATE TRIGGER notify_saved_search_listing_match AFTER INSERT OR UPDATE OF status ON listings FOR EACH ROW EXECUTE FUNCTION notify_saved_search_matches();

CREATE TRIGGER notify_saved_search_opportunity_match AFTER INSERT OR UPDATE OF status ON opportunities FOR EACH ROW EXECUTE FUNCTION notify_saved_search_matches();

CREATE TRIGGER profiles_prevent_self_privilege_escalation BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION prevent_self_privilege_escalation();

ALTER TABLE public.access_audit_log ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.access_audit_log NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.ad_delivery_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ad_delivery_events NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.ad_impressions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ad_impressions NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.ad_interest_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ad_interest_events NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.ad_product_target_options ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ad_product_target_options NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.ad_products ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ad_products NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.ad_visitor_profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.ad_visitor_profiles NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.advertising_requests ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.advertising_requests NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.audit_logs NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.business_buyer_interests ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.business_buyer_interests NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.business_categories ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.business_categories NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.business_credit_wallets ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.business_credit_wallets NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.business_invitations ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.business_invitations NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.business_members NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.business_partner_relationships ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.business_partner_relationships NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.business_plan_subscriptions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.business_plan_subscriptions NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.business_portfolio_media ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.business_portfolio_media NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.business_promotion_targets ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.business_promotion_targets NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.business_promotions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.business_promotions NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.business_role_permissions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.business_role_permissions NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.businesses NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.commerce_order_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.commerce_order_events NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.commerce_order_items ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.commerce_order_items NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.commerce_orders ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.commerce_orders NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.commerce_transactions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.commerce_transactions NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.contact_messages NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.credit_packages NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.credit_purchase_requests ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.credit_purchase_requests NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.credit_transactions NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.financial_documents ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.financial_documents NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.financial_payments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.financial_payments NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.listing_attachments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.listing_attachments NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.listing_categories ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.listing_categories NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.listing_media ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.listing_media NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.listings NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.notifications NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.opportunities NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.opportunity_applications ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.opportunity_applications NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.partner_account_members ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.partner_account_members NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.partner_accounts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.partner_accounts NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.partner_ad_campaigns ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.partner_ad_campaigns NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.partner_ad_products ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.partner_ad_products NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.partner_ad_targets ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.partner_ad_targets NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.partner_entitlements ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.partner_entitlements NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.platform_conversion_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.platform_conversion_events NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.platform_members ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.platform_members NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.platform_plans ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.platform_plans NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.platform_service_orders ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.platform_service_orders NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.platform_service_subscriptions ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.platform_service_subscriptions NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.platform_services ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.platform_services NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.profiles NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.public_rate_limits ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.public_rate_limits NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.publication_attachments ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.publication_attachments NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.recommendation_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.recommendation_events NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.service_requests NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.support_messages NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.support_tickets NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_favorites NO FORCE FORCE ROW LEVEL SECURITY;

ALTER TABLE public.user_saved_searches ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.user_saved_searches NO FORCE FORCE ROW LEVEL SECURITY;

CREATE POLICY "active ad products are readable" ON public.ad_products AS PERMISSIVE FOR SELECT TO authenticated USING ((active = true));

CREATE POLICY "active ad targeting options are readable" ON public.ad_product_target_options AS PERMISSIVE FOR SELECT TO authenticated USING ((active = true));

CREATE POLICY "active credit packages are readable" ON public.credit_packages AS PERMISSIVE FOR SELECT TO authenticated USING (((active = true) OR (EXISTS ( SELECT 1
   FROM platform_members pm
  WHERE ((pm.user_id = ( SELECT auth.uid() AS uid)) AND (pm.active = true))))));

CREATE POLICY "active partner ad products are readable" ON public.partner_ad_products AS PERMISSIVE FOR SELECT TO authenticated USING ((active = true));

CREATE POLICY "active platform plans are readable" ON public.platform_plans AS PERMISSIVE FOR SELECT TO authenticated USING (((active = true) OR (EXISTS ( SELECT 1
   FROM platform_members pm
  WHERE ((pm.user_id = ( SELECT auth.uid() AS uid)) AND (pm.active = true))))));

CREATE POLICY "applicants may update own application before final review" ON public.opportunity_applications AS PERMISSIVE FOR UPDATE TO authenticated USING (((applicant_user_id = ( SELECT auth.uid() AS uid)) AND (status = ANY (ARRAY['DRAFT'::text, 'SUBMITTED'::text])))) WITH CHECK (((applicant_user_id = ( SELECT auth.uid() AS uid)) AND (status = ANY (ARRAY['DRAFT'::text, 'SUBMITTED'::text, 'WITHDRAWN'::text])) AND (EXISTS ( SELECT 1
   FROM opportunities o
  WHERE ((o.id = opportunity_applications.opportunity_id) AND (o.status = 'PUBLISHED'::opportunity_status) AND ((o.opens_at IS NULL) OR (o.opens_at <= now())) AND ((o.closes_at IS NULL) OR (o.closes_at >= now()) OR (opportunity_applications.status = 'WITHDRAWN'::text)))))));

CREATE POLICY "business managers add listing attachments" ON public.listing_attachments AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((EXISTS ( SELECT 1
   FROM (listings l
     JOIN business_members bm ON ((bm.business_id = l.business_id)))
  WHERE ((l.id = listing_attachments.listing_id) AND (bm.user_id = ( SELECT auth.uid() AS uid)) AND (bm.role = ANY (ARRAY['owner'::text, 'admin'::text, 'operator'::text]))))) OR (EXISTS ( SELECT 1
   FROM listings l
  WHERE ((l.id = listing_attachments.listing_id) AND (l.owner_id = ( SELECT auth.uid() AS uid)))))));

CREATE POLICY "business managers create listings" ON public.listings AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((owner_id = ( SELECT auth.uid() AS uid)) AND ((business_id IS NULL) OR (business_id IN ( SELECT private.user_managed_business_ids() AS user_managed_business_ids)))));

CREATE POLICY "business managers create promotion targets" ON public.business_promotion_targets AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM business_promotions bp
  WHERE ((bp.id = business_promotion_targets.promotion_id) AND ((EXISTS ( SELECT 1
           FROM businesses b
          WHERE ((b.id = bp.business_id) AND (b.owner_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
           FROM business_members bm
          WHERE ((bm.business_id = bp.business_id) AND (bm.user_id = ( SELECT auth.uid() AS uid)) AND (bm.role = ANY (ARRAY['owner'::text, 'admin'::text, 'operator'::text]))))))))));

CREATE POLICY "business managers create promotions" ON public.business_promotions AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_promotions.business_id) AND (b.owner_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM business_members bm
  WHERE ((bm.business_id = business_promotions.business_id) AND (bm.user_id = ( SELECT auth.uid() AS uid)) AND (bm.role = ANY (ARRAY['owner'::text, 'admin'::text, 'operator'::text])))))));

CREATE POLICY "business managers delete listing attachments" ON public.listing_attachments AS PERMISSIVE FOR DELETE TO authenticated USING (((EXISTS ( SELECT 1
   FROM (listings l
     JOIN business_members bm ON ((bm.business_id = l.business_id)))
  WHERE ((l.id = listing_attachments.listing_id) AND (bm.user_id = ( SELECT auth.uid() AS uid)) AND (bm.role = ANY (ARRAY['owner'::text, 'admin'::text, 'operator'::text]))))) OR (EXISTS ( SELECT 1
   FROM listings l
  WHERE ((l.id = listing_attachments.listing_id) AND (l.owner_id = ( SELECT auth.uid() AS uid)))))));

CREATE POLICY "business managers delete listings" ON public.listings AS PERMISSIVE FOR DELETE TO authenticated USING (((owner_id = ( SELECT auth.uid() AS uid)) OR (business_id IN ( SELECT private.user_managed_business_ids() AS user_managed_business_ids))));

CREATE POLICY "business managers read businesses" ON public.businesses AS PERMISSIVE FOR SELECT TO authenticated USING ((id IN ( SELECT private.user_managed_business_ids() AS user_managed_business_ids)));

CREATE POLICY "business managers read credit transactions" ON public.credit_transactions AS PERMISSIVE FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM (business_credit_wallets w
     JOIN businesses b ON ((b.id = w.business_id)))
  WHERE ((w.id = credit_transactions.wallet_id) AND (b.owner_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM (business_credit_wallets w
     JOIN business_members bm ON ((bm.business_id = w.business_id)))
  WHERE ((w.id = credit_transactions.wallet_id) AND (bm.user_id = ( SELECT auth.uid() AS uid)) AND (bm.role = ANY (ARRAY['owner'::text, 'admin'::text]))))) OR (EXISTS ( SELECT 1
   FROM platform_members pm
  WHERE ((pm.user_id = ( SELECT auth.uid() AS uid)) AND (pm.active = true))))));

CREATE POLICY "business managers read credit wallet" ON public.business_credit_wallets AS PERMISSIVE FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_credit_wallets.business_id) AND (b.owner_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM business_members bm
  WHERE ((bm.business_id = business_credit_wallets.business_id) AND (bm.user_id = ( SELECT auth.uid() AS uid)) AND (bm.role = ANY (ARRAY['owner'::text, 'admin'::text]))))) OR (EXISTS ( SELECT 1
   FROM platform_members pm
  WHERE ((pm.user_id = ( SELECT auth.uid() AS uid)) AND (pm.active = true))))));

CREATE POLICY "business managers read promotion targets" ON public.business_promotion_targets AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM business_promotions bp
  WHERE ((bp.id = business_promotion_targets.promotion_id) AND ((EXISTS ( SELECT 1
           FROM businesses b
          WHERE ((b.id = bp.business_id) AND (b.owner_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
           FROM business_members bm
          WHERE ((bm.business_id = bp.business_id) AND (bm.user_id = ( SELECT auth.uid() AS uid)) AND (bm.role = ANY (ARRAY['owner'::text, 'admin'::text, 'operator'::text]))))))))));

CREATE POLICY "business managers read promotions" ON public.business_promotions AS PERMISSIVE FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_promotions.business_id) AND (b.owner_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM business_members bm
  WHERE ((bm.business_id = business_promotions.business_id) AND (bm.user_id = ( SELECT auth.uid() AS uid)) AND (bm.role = ANY (ARRAY['owner'::text, 'admin'::text, 'operator'::text]))))) OR (status = 'ACTIVE'::text) OR (EXISTS ( SELECT 1
   FROM platform_members pm
  WHERE ((pm.user_id = ( SELECT auth.uid() AS uid)) AND (pm.active = true))))));

CREATE POLICY "business managers read subscriptions" ON public.business_plan_subscriptions AS PERMISSIVE FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_plan_subscriptions.business_id) AND (b.owner_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM business_members bm
  WHERE ((bm.business_id = business_plan_subscriptions.business_id) AND (bm.user_id = ( SELECT auth.uid() AS uid)) AND (bm.role = ANY (ARRAY['owner'::text, 'admin'::text]))))) OR (EXISTS ( SELECT 1
   FROM platform_members pm
  WHERE ((pm.user_id = ( SELECT auth.uid() AS uid)) AND (pm.active = true))))));

CREATE POLICY "business managers update businesses" ON public.businesses AS PERMISSIVE FOR UPDATE TO authenticated USING ((id IN ( SELECT private.user_managed_business_ids() AS user_managed_business_ids))) WITH CHECK ((id IN ( SELECT private.user_managed_business_ids() AS user_managed_business_ids)));

CREATE POLICY "business managers update listings" ON public.listings AS PERMISSIVE FOR UPDATE TO authenticated USING (((owner_id = ( SELECT auth.uid() AS uid)) OR (business_id IN ( SELECT private.user_managed_business_ids() AS user_managed_business_ids)))) WITH CHECK (((business_id IS NULL) OR (business_id IN ( SELECT private.user_managed_business_ids() AS user_managed_business_ids))));

CREATE POLICY "business owners manage portfolio" ON public.business_portfolio_media AS PERMISSIVE FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_portfolio_media.business_id) AND (b.owner_id = ( SELECT auth.uid() AS uid)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_portfolio_media.business_id) AND (b.owner_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY "buyer interests managers delete" ON public.business_buyer_interests AS PERMISSIVE FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_buyer_interests.business_id) AND ((b.owner_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
           FROM business_members bm
          WHERE ((bm.business_id = b.id) AND (bm.user_id = ( SELECT auth.uid() AS uid)) AND (bm.role = ANY (ARRAY['owner'::text, 'admin'::text, 'operator'::text]))))))))));

CREATE POLICY "buyer interests managers insert" ON public.business_buyer_interests AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_buyer_interests.business_id) AND ((b.owner_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
           FROM business_members bm
          WHERE ((bm.business_id = b.id) AND (bm.user_id = ( SELECT auth.uid() AS uid)) AND (bm.role = ANY (ARRAY['owner'::text, 'admin'::text, 'operator'::text]))))))))));

CREATE POLICY "buyer interests managers read" ON public.business_buyer_interests AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_buyer_interests.business_id) AND ((b.owner_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
           FROM business_members bm
          WHERE ((bm.business_id = b.id) AND (bm.user_id = ( SELECT auth.uid() AS uid)) AND (bm.role = ANY (ARRAY['owner'::text, 'admin'::text, 'operator'::text]))))))))));

CREATE POLICY "commerce orders sellers can manage offline requests" ON public.commerce_orders AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM (commerce_order_items oi
     JOIN businesses b ON ((b.id = oi.seller_business_id)))
  WHERE ((oi.order_id = commerce_orders.id) AND ((b.owner_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
           FROM business_members bm
          WHERE ((bm.business_id = b.id) AND (bm.user_id = ( SELECT auth.uid() AS uid)) AND (bm.role = ANY (ARRAY['owner'::text, 'admin'::text, 'operator'::text])))))))))) WITH CHECK ((status = ANY (ARRAY['INTERESTED'::text, 'CONTACTED'::text, 'NEGOTIATING'::text, 'AGREED'::text, 'COMPLETED'::text, 'CANCELLED'::text])));

CREATE POLICY "commerce orders sellers can view offline requests" ON public.commerce_orders AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM (commerce_order_items oi
     JOIN businesses b ON ((b.id = oi.seller_business_id)))
  WHERE ((oi.order_id = commerce_orders.id) AND ((b.owner_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
           FROM business_members bm
          WHERE ((bm.business_id = b.id) AND (bm.user_id = ( SELECT auth.uid() AS uid))))))))));

CREATE POLICY "credit purchase platform read" ON public.credit_purchase_requests AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM platform_members pm
  WHERE ((pm.user_id = ( SELECT auth.uid() AS uid)) AND (pm.active = true)))));

CREATE POLICY "credit purchase platform update" ON public.credit_purchase_requests AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM platform_members pm
  WHERE ((pm.user_id = ( SELECT auth.uid() AS uid)) AND (pm.active = true))))) WITH CHECK ((status = ANY (ARRAY['REQUESTED'::text, 'PAYMENT_PENDING'::text, 'PAID'::text, 'REJECTED'::text, 'CANCELLED'::text])));

CREATE POLICY "credit purchase requester read" ON public.credit_purchase_requests AS PERMISSIVE FOR SELECT TO authenticated USING (((( SELECT auth.uid() AS uid) = requester_user_id) OR (EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = credit_purchase_requests.business_id) AND (b.owner_id = ( SELECT auth.uid() AS uid)))))));

CREATE POLICY "financial documents own business read" ON public.financial_documents AS PERMISSIVE FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = financial_documents.business_id) AND (b.owner_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM business_members bm
  WHERE ((bm.business_id = financial_documents.business_id) AND (bm.user_id = ( SELECT auth.uid() AS uid)) AND (bm.role = ANY (ARRAY['owner'::text, 'admin'::text, 'operator'::text])))))));

CREATE POLICY "financial payments own business read" ON public.financial_payments AS PERMISSIVE FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = financial_payments.business_id) AND (b.owner_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM business_members bm
  WHERE ((bm.business_id = financial_payments.business_id) AND (bm.user_id = ( SELECT auth.uid() AS uid)) AND (bm.role = ANY (ARRAY['owner'::text, 'admin'::text, 'operator'::text])))))));

CREATE POLICY "listing attachments are publicly readable" ON public.listing_attachments AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "listing media managers" ON public.listing_media AS PERMISSIVE FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM listings l
  WHERE ((l.id = listing_media.listing_id) AND ((l.owner_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
           FROM business_members bm
          WHERE ((bm.business_id = l.business_id) AND (bm.user_id = ( SELECT auth.uid() AS uid)) AND (bm.role = ANY (ARRAY['owner'::text, 'admin'::text, 'operator'::text])))))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM listings l
  WHERE ((l.id = listing_media.listing_id) AND ((l.owner_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
           FROM business_members bm
          WHERE ((bm.business_id = l.business_id) AND (bm.user_id = ( SELECT auth.uid() AS uid)) AND (bm.role = ANY (ARRAY['owner'::text, 'admin'::text, 'operator'::text]))))))))));

CREATE POLICY "listing media readable" ON public.listing_media AS PERMISSIVE FOR SELECT TO anon, authenticated USING ((EXISTS ( SELECT 1
   FROM listings l
  WHERE ((l.id = listing_media.listing_id) AND ((l.status = 'PUBLISHED'::listing_status) OR (l.owner_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
           FROM business_members bm
          WHERE ((bm.business_id = l.business_id) AND (bm.user_id = ( SELECT auth.uid() AS uid))))))))));

CREATE POLICY "opportunities readable by authenticated users and partner accou" ON public.opportunities AS PERMISSIVE FOR SELECT TO authenticated USING (((status = 'PUBLISHED'::opportunity_status) OR (owner_id = ( SELECT auth.uid() AS uid)) OR ((partner_account_id = current_partner_account_id()) AND (current_partner_opportunity_role() IS NOT NULL))));

CREATE POLICY "opportunity applications insert by applicant during open window" ON public.opportunity_applications AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((applicant_user_id = ( SELECT auth.uid() AS uid)) AND (status = ANY (ARRAY['DRAFT'::text, 'SUBMITTED'::text])) AND (EXISTS ( SELECT 1
   FROM opportunities o
  WHERE ((o.id = opportunity_applications.opportunity_id) AND (o.status = 'PUBLISHED'::opportunity_status) AND ((o.opens_at IS NULL) OR (o.opens_at <= now())) AND ((o.closes_at IS NULL) OR (o.closes_at >= now())))))));

CREATE POLICY "opportunity applications readable by applicant or partner accou" ON public.opportunity_applications AS PERMISSIVE FOR SELECT TO authenticated USING (((applicant_user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM opportunities o
  WHERE ((o.id = opportunity_applications.opportunity_id) AND (o.partner_account_id = current_partner_account_id()) AND (current_partner_opportunity_role() = ANY (ARRAY['owner'::text, 'manager'::text, 'analyst'::text, 'viewer'::text])))))));

CREATE POLICY "order events participants insert" ON public.commerce_order_events AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((actor_user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM commerce_orders o
  WHERE ((o.id = commerce_order_events.order_id) AND ((o.buyer_user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
           FROM (commerce_order_items oi
             JOIN businesses b ON ((b.id = oi.seller_business_id)))
          WHERE ((oi.order_id = o.id) AND ((b.owner_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
                   FROM business_members bm
                  WHERE ((bm.business_id = b.id) AND (bm.user_id = ( SELECT auth.uid() AS uid)) AND (bm.role = ANY (ARRAY['owner'::text, 'admin'::text, 'operator'::text])))))))))))))));

CREATE POLICY "order events participants read" ON public.commerce_order_events AS PERMISSIVE FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM commerce_orders o
  WHERE ((o.id = commerce_order_events.order_id) AND (o.buyer_user_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM (commerce_order_items oi
     JOIN businesses b ON ((b.id = oi.seller_business_id)))
  WHERE ((oi.order_id = commerce_order_events.order_id) AND ((b.owner_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
           FROM business_members bm
          WHERE ((bm.business_id = b.id) AND (bm.user_id = ( SELECT auth.uid() AS uid)))))))))));

CREATE POLICY "owners can add publication attachments" ON public.publication_attachments AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((resource_type = 'OPPORTUNITY'::text) AND (EXISTS ( SELECT 1
   FROM opportunities o
  WHERE ((o.id = publication_attachments.resource_id) AND (o.owner_id = ( SELECT auth.uid() AS uid)))))));

CREATE POLICY "owners can delete publication attachments" ON public.publication_attachments AS PERMISSIVE FOR DELETE TO authenticated USING (((resource_type = 'OPPORTUNITY'::text) AND (EXISTS ( SELECT 1
   FROM opportunities o
  WHERE ((o.id = publication_attachments.resource_id) AND (o.owner_id = ( SELECT auth.uid() AS uid)))))));

CREATE POLICY "partner account managers manage opportunities" ON public.opportunities AS PERMISSIVE FOR ALL TO authenticated USING (((partner_account_id = current_partner_account_id()) AND (current_partner_opportunity_role() = ANY (ARRAY['owner'::text, 'manager'::text])))) WITH CHECK (((partner_account_id = current_partner_account_id()) AND (current_partner_opportunity_role() = ANY (ARRAY['owner'::text, 'manager'::text]))));

CREATE POLICY "partner accounts read own ad campaigns" ON public.partner_ad_campaigns AS PERMISSIVE FOR SELECT TO authenticated USING (((account_id = ( SELECT current_partner_account_id() AS current_partner_account_id)) AND (current_partner_opportunity_role() IS NOT NULL)));

CREATE POLICY "partner accounts read own ad targets" ON public.partner_ad_targets AS PERMISSIVE FOR SELECT TO authenticated USING (((current_partner_opportunity_role() IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM partner_ad_campaigns c
  WHERE ((c.id = partner_ad_targets.campaign_id) AND (c.account_id = ( SELECT current_partner_account_id() AS current_partner_account_id)))))));

CREATE POLICY "partner accounts read own entitlements" ON public.partner_entitlements AS PERMISSIVE FOR SELECT TO authenticated USING (((account_id = ( SELECT current_partner_account_id() AS current_partner_account_id)) AND (current_partner_opportunity_role() IS NOT NULL)));

CREATE POLICY "partner managers update opportunity applications" ON public.opportunity_applications AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM opportunities o
  WHERE ((o.id = opportunity_applications.opportunity_id) AND (o.partner_account_id = current_partner_account_id()) AND (current_partner_opportunity_role() = ANY (ARRAY['owner'::text, 'manager'::text])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM opportunities o
  WHERE ((o.id = opportunity_applications.opportunity_id) AND (o.partner_account_id = current_partner_account_id()) AND (current_partner_opportunity_role() = ANY (ARRAY['owner'::text, 'manager'::text]))))));

CREATE POLICY "partner relationships managers write" ON public.business_partner_relationships AS PERMISSIVE FOR ALL TO authenticated USING (((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_partner_relationships.business_id) AND (b.owner_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM business_members bm
  WHERE ((bm.business_id = business_partner_relationships.business_id) AND (bm.user_id = ( SELECT auth.uid() AS uid)) AND (bm.role = ANY (ARRAY['admin'::text, 'operator'::text]))))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_partner_relationships.business_id) AND (b.owner_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM business_members bm
  WHERE ((bm.business_id = business_partner_relationships.business_id) AND (bm.user_id = ( SELECT auth.uid() AS uid)) AND (bm.role = ANY (ARRAY['admin'::text, 'operator'::text])))))));

CREATE POLICY "partner relationships members read" ON public.business_partner_relationships AS PERMISSIVE FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_partner_relationships.business_id) AND (b.owner_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM business_members bm
  WHERE ((bm.business_id = business_partner_relationships.business_id) AND (bm.user_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_partner_relationships.partner_business_id) AND (b.owner_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM business_members bm
  WHERE ((bm.business_id = business_partner_relationships.partner_business_id) AND (bm.user_id = ( SELECT auth.uid() AS uid)))))));

CREATE POLICY "platform admins manage partner ad campaigns" ON public.partner_ad_campaigns AS PERMISSIVE FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "platform admins manage partner ad products" ON public.partner_ad_products AS PERMISSIVE FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "platform admins manage partner ad targets" ON public.partner_ad_targets AS PERMISSIVE FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "platform admins manage partner entitlements" ON public.partner_entitlements AS PERMISSIVE FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "platform members read own access" ON public.platform_members AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "platform staff create notifications" ON public.notifications AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM platform_members pm
  WHERE ((pm.user_id = ( SELECT auth.uid() AS uid)) AND (pm.active = true)))));

CREATE POLICY "platform staff manage ad products" ON public.ad_products AS PERMISSIVE FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM platform_members pm
  WHERE ((pm.user_id = ( SELECT auth.uid() AS uid)) AND (pm.active = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM platform_members pm
  WHERE ((pm.user_id = ( SELECT auth.uid() AS uid)) AND (pm.active = true)))));

CREATE POLICY "platform staff manage promotions" ON public.business_promotions AS PERMISSIVE FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM platform_members pm
  WHERE ((pm.user_id = ( SELECT auth.uid() AS uid)) AND (pm.active = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM platform_members pm
  WHERE ((pm.user_id = ( SELECT auth.uid() AS uid)) AND (pm.active = true)))));

CREATE POLICY "platform staff read businesses" ON public.businesses AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM platform_members pm
  WHERE ((pm.user_id = ( SELECT auth.uid() AS uid)) AND (pm.active = true) AND (pm.role = 'super_admin'::text)))));

CREATE POLICY "platform staff read listings" ON public.listings AS PERMISSIVE FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM platform_members pm
  WHERE ((pm.user_id = ( SELECT auth.uid() AS uid)) AND (pm.active = true) AND (pm.role = 'super_admin'::text)))) OR (status = 'PUBLISHED'::listing_status) OR (owner_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM business_members bm
  WHERE ((bm.business_id = listings.business_id) AND (bm.user_id = ( SELECT auth.uid() AS uid)) AND (bm.role = ANY (ARRAY['owner'::text, 'admin'::text, 'operator'::text])))))));

CREATE POLICY "platform staff update businesses" ON public.businesses AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM platform_members pm
  WHERE ((pm.user_id = ( SELECT auth.uid() AS uid)) AND (pm.active = true) AND (pm.role = 'super_admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM platform_members pm
  WHERE ((pm.user_id = ( SELECT auth.uid() AS uid)) AND (pm.active = true) AND (pm.role = 'super_admin'::text)))));

CREATE POLICY "platform staff update listings" ON public.listings AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM platform_members pm
  WHERE ((pm.user_id = ( SELECT auth.uid() AS uid)) AND (pm.active = true) AND (pm.role = 'super_admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM platform_members pm
  WHERE ((pm.user_id = ( SELECT auth.uid() AS uid)) AND (pm.active = true) AND (pm.role = 'super_admin'::text)))));

CREATE POLICY "public can read business portfolio" ON public.business_portfolio_media AS PERMISSIVE FOR SELECT TO anon, authenticated USING ((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_portfolio_media.business_id) AND (b.is_public = true)))));

CREATE POLICY "public listing categories readable" ON public.listing_categories AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "publication attachments are publicly readable" ON public.publication_attachments AS PERMISSIVE FOR SELECT TO public USING (true);

CREATE POLICY "published listings are readable" ON public.listings AS PERMISSIVE FOR SELECT TO anon, authenticated USING ((((status = 'PUBLISHED'::listing_status) AND ((business_id IS NULL) OR (EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = listings.business_id) AND (b.archived_at IS NULL)))))) OR (owner_id = ( SELECT auth.uid() AS uid)) OR (business_id IN ( SELECT private.user_managed_business_ids() AS user_managed_business_ids))));

CREATE POLICY "published opportunities readable by public" ON public.opportunities AS PERMISSIVE FOR SELECT TO anon USING ((status = 'PUBLISHED'::opportunity_status));

CREATE POLICY "recommendation events own" ON public.recommendation_events AS PERMISSIVE FOR ALL TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "seller can view order items" ON public.commerce_order_items AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = commerce_order_items.seller_business_id) AND ((b.owner_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
           FROM business_members bm
          WHERE ((bm.business_id = b.id) AND (bm.user_id = ( SELECT auth.uid() AS uid))))))))));

CREATE POLICY "service orders own read" ON public.platform_service_orders AS PERMISSIVE FOR SELECT TO authenticated USING (((requester_user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = platform_service_orders.business_id) AND (b.owner_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM business_members bm
  WHERE ((bm.business_id = platform_service_orders.business_id) AND (bm.user_id = ( SELECT auth.uid() AS uid)) AND (bm.role = ANY (ARRAY['owner'::text, 'admin'::text, 'operator'::text])))))));

CREATE POLICY "service requests platform staff read" ON public.service_requests AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM platform_members pm
  WHERE ((pm.user_id = ( SELECT auth.uid() AS uid)) AND (pm.active = true) AND (pm.role = 'super_admin'::text)))));

CREATE POLICY "service requests platform staff update" ON public.service_requests AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM platform_members pm
  WHERE ((pm.user_id = ( SELECT auth.uid() AS uid)) AND (pm.active = true) AND (pm.role = 'super_admin'::text))))) WITH CHECK (((status = ANY (ARRAY['REQUESTED'::text, 'UNDER_REVIEW'::text, 'QUOTED'::text, 'ACCEPTED'::text, 'IN_PROGRESS'::text, 'COMPLETED'::text])) AND (EXISTS ( SELECT 1
   FROM platform_members pm
  WHERE ((pm.user_id = ( SELECT auth.uid() AS uid)) AND (pm.active = true) AND (pm.role = 'super_admin'::text))))));

CREATE POLICY "service requests requester create" ON public.service_requests AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((requester_user_id = ( SELECT auth.uid() AS uid)) AND ((requester_business_id IS NULL) OR (EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = service_requests.requester_business_id) AND (b.owner_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM business_members bm
  WHERE ((bm.business_id = service_requests.requester_business_id) AND (bm.user_id = ( SELECT auth.uid() AS uid)) AND (bm.role = ANY (ARRAY['owner'::text, 'admin'::text, 'operator'::text]))))))));

CREATE POLICY "service requests requester read" ON public.service_requests AS PERMISSIVE FOR SELECT TO authenticated USING (((requester_user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = service_requests.requester_business_id) AND (b.owner_id = ( SELECT auth.uid() AS uid))))) OR (EXISTS ( SELECT 1
   FROM business_members bm
  WHERE ((bm.business_id = service_requests.requester_business_id) AND (bm.user_id = ( SELECT auth.uid() AS uid)))))));

CREATE POLICY "service requests requester update" ON public.service_requests AS PERMISSIVE FOR UPDATE TO authenticated USING ((requester_user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((requester_user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "service subscriptions owner read" ON public.platform_service_subscriptions AS PERMISSIVE FOR SELECT TO authenticated USING (((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = platform_service_subscriptions.business_id) AND (b.owner_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM business_members bm
  WHERE ((bm.business_id = platform_service_subscriptions.business_id) AND (bm.user_id = auth.uid()) AND (bm.role = ANY (ARRAY['owner'::text, 'admin'::text, 'operator'::text]))))) OR (EXISTS ( SELECT 1
   FROM platform_members pm
  WHERE ((pm.user_id = auth.uid()) AND (pm.active = true))))));

CREATE POLICY "service subscriptions owner update" ON public.platform_service_subscriptions AS PERMISSIVE FOR UPDATE TO authenticated USING (((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = platform_service_subscriptions.business_id) AND (b.owner_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM business_members bm
  WHERE ((bm.business_id = platform_service_subscriptions.business_id) AND (bm.user_id = auth.uid()) AND (bm.role = ANY (ARRAY['owner'::text, 'admin'::text, 'operator'::text]))))) OR (EXISTS ( SELECT 1
   FROM platform_members pm
  WHERE ((pm.user_id = auth.uid()) AND (pm.active = true)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = platform_service_subscriptions.business_id) AND (b.owner_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM business_members bm
  WHERE ((bm.business_id = platform_service_subscriptions.business_id) AND (bm.user_id = auth.uid()) AND (bm.role = ANY (ARRAY['owner'::text, 'admin'::text, 'operator'::text]))))) OR (EXISTS ( SELECT 1
   FROM platform_members pm
  WHERE ((pm.user_id = auth.uid()) AND (pm.active = true))))));

CREATE POLICY "support messages participant read" ON public.support_messages AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM support_tickets st
  WHERE ((st.id = support_messages.ticket_id) AND ((st.user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
           FROM platform_members pm
          WHERE ((pm.user_id = ( SELECT auth.uid() AS uid)) AND (pm.active = true) AND (pm.role = 'super_admin'::text)))))))));

CREATE POLICY "support messages staff insert" ON public.support_messages AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((sender_user_id = ( SELECT auth.uid() AS uid)) AND (sender_role = 'BACKOFFICE'::text) AND (EXISTS ( SELECT 1
   FROM platform_members pm
  WHERE ((pm.user_id = ( SELECT auth.uid() AS uid)) AND (pm.active = true) AND (pm.role = 'super_admin'::text))))));

CREATE POLICY "support messages user insert" ON public.support_messages AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((sender_user_id = ( SELECT auth.uid() AS uid)) AND (sender_role = 'USER'::text) AND (EXISTS ( SELECT 1
   FROM support_tickets st
  WHERE ((st.id = support_messages.ticket_id) AND (st.user_id = ( SELECT auth.uid() AS uid)))))));

CREATE POLICY "support tickets owner insert" ON public.support_tickets AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = user_id));

CREATE POLICY "support tickets owner read" ON public.support_tickets AS PERMISSIVE FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM platform_members pm
  WHERE ((pm.user_id = ( SELECT auth.uid() AS uid)) AND (pm.active = true) AND (pm.role = 'super_admin'::text))))));

CREATE POLICY "support tickets staff update" ON public.support_tickets AS PERMISSIVE FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM platform_members pm
  WHERE ((pm.user_id = ( SELECT auth.uid() AS uid)) AND (pm.active = true) AND (pm.role = 'super_admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM platform_members pm
  WHERE ((pm.user_id = ( SELECT auth.uid() AS uid)) AND (pm.active = true) AND (pm.role = 'super_admin'::text)))));

CREATE POLICY "users manage own favorites" ON public.user_favorites AS PERMISSIVE FOR ALL TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "users manage own saved searches" ON public.user_saved_searches AS PERMISSIVE FOR ALL TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "users read own audit logs" ON public.audit_logs AS PERMISSIVE FOR SELECT TO authenticated USING ((actor_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "users read own conversion events" ON public.platform_conversion_events AS PERMISSIVE FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR is_super_admin()));

CREATE POLICY "users read own notifications" ON public.notifications AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "users update own notifications" ON public.notifications AS PERMISSIVE FOR UPDATE TO authenticated USING ((user_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "visitors record conversion events" ON public.platform_conversion_events AS PERMISSIVE FOR INSERT TO anon, authenticated WITH CHECK (((user_id IS NULL) OR (user_id = ( SELECT auth.uid() AS uid))));

CREATE POLICY access_audit_log_insert ON public.access_audit_log AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((actor_user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = access_audit_log.business_id) AND (b.owner_id = ( SELECT auth.uid() AS uid)))))));

CREATE POLICY access_audit_log_read ON public.access_audit_log AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = access_audit_log.business_id) AND (b.owner_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY ad_delivery_events_insert ON public.ad_delivery_events AS PERMISSIVE FOR INSERT TO anon, authenticated WITH CHECK (((user_id IS NULL) OR (user_id = ( SELECT auth.uid() AS uid))));

CREATE POLICY ad_impressions_public_insert ON public.ad_impressions AS PERMISSIVE FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY ad_impressions_public_update ON public.ad_impressions AS PERMISSIVE FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY ad_interest_events_public_insert ON public.ad_interest_events AS PERMISSIVE FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY ad_visitor_profiles_insert ON public.ad_visitor_profiles AS PERMISSIVE FOR INSERT TO anon, authenticated WITH CHECK (((user_id IS NULL) OR (user_id = ( SELECT auth.uid() AS uid))));

CREATE POLICY ad_visitor_profiles_update ON public.ad_visitor_profiles AS PERMISSIVE FOR UPDATE TO anon, authenticated USING (((user_id IS NULL) OR (user_id = ( SELECT auth.uid() AS uid)))) WITH CHECK (((user_id IS NULL) OR (user_id = ( SELECT auth.uid() AS uid))));

CREATE POLICY advertising_requests_public_insert ON public.advertising_requests AS PERMISSIVE FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY business_categories_public_read ON public.business_categories AS PERMISSIVE FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY business_invitations_invitee_accept ON public.business_invitations AS PERMISSIVE FOR UPDATE TO authenticated USING (((lower(email) = lower(COALESCE(( SELECT (auth.jwt() ->> 'email'::text)), ''::text))) AND (accepted_at IS NULL) AND (expires_at > now()))) WITH CHECK ((lower(email) = lower(COALESCE(( SELECT (auth.jwt() ->> 'email'::text)), ''::text))));

CREATE POLICY business_invitations_invitee_read ON public.business_invitations AS PERMISSIVE FOR SELECT TO authenticated USING (((lower(email) = lower(COALESCE(( SELECT (auth.jwt() ->> 'email'::text)), ''::text))) AND (accepted_at IS NULL) AND (expires_at > now())));

CREATE POLICY business_invitations_manage ON public.business_invitations AS PERMISSIVE FOR ALL TO authenticated USING ((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_invitations.business_id) AND (b.owner_id = ( SELECT auth.uid() AS uid)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_invitations.business_id) AND (b.owner_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY business_role_permissions_read ON public.business_role_permissions AS PERMISSIVE FOR SELECT TO authenticated USING (true);

CREATE POLICY businesses_owner_insert ON public.businesses AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = owner_id));

CREATE POLICY businesses_owner_update ON public.businesses AS PERMISSIVE FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = owner_id)) WITH CHECK ((( SELECT auth.uid() AS uid) = owner_id));

CREATE POLICY businesses_public_read ON public.businesses AS PERMISSIVE FOR SELECT TO anon, authenticated USING (((archived_at IS NULL) AND ((is_public = true) OR (( SELECT auth.uid() AS uid) = owner_id))));

CREATE POLICY commerce_order_items_buyer_insert ON public.commerce_order_items AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM commerce_orders o
  WHERE ((o.id = commerce_order_items.order_id) AND (o.buyer_user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY commerce_order_items_buyer_read ON public.commerce_order_items AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM commerce_orders o
  WHERE ((o.id = commerce_order_items.order_id) AND (o.buyer_user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY commerce_orders_buyer_insert ON public.commerce_orders AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((buyer_user_id = ( SELECT auth.uid() AS uid)) AND ((buyer_business_id IS NULL) OR (EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = commerce_orders.buyer_business_id) AND ((b.owner_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
           FROM business_members bm
          WHERE ((bm.business_id = b.id) AND (bm.user_id = ( SELECT auth.uid() AS uid)) AND (bm.role = ANY (ARRAY['owner'::text, 'admin'::text, 'operator'::text]))))))))))));

CREATE POLICY commerce_orders_buyer_read ON public.commerce_orders AS PERMISSIVE FOR SELECT TO authenticated USING (((buyer_user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = commerce_orders.buyer_business_id) AND (b.archived_at IS NULL) AND ((b.owner_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
           FROM business_members bm
          WHERE ((bm.business_id = b.id) AND (bm.user_id = ( SELECT auth.uid() AS uid)) AND (bm.role = ANY (ARRAY['owner'::text, 'admin'::text, 'operator'::text])))))))))));

CREATE POLICY commerce_orders_buyer_update ON public.commerce_orders AS PERMISSIVE FOR UPDATE TO authenticated USING (((buyer_user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = commerce_orders.buyer_business_id) AND (b.archived_at IS NULL) AND ((b.owner_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
           FROM business_members bm
          WHERE ((bm.business_id = b.id) AND (bm.user_id = ( SELECT auth.uid() AS uid)) AND (bm.role = ANY (ARRAY['owner'::text, 'admin'::text, 'operator'::text]))))))))))) WITH CHECK (((buyer_user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = commerce_orders.buyer_business_id) AND (b.archived_at IS NULL) AND ((b.owner_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
           FROM business_members bm
          WHERE ((bm.business_id = b.id) AND (bm.user_id = ( SELECT auth.uid() AS uid)) AND (bm.role = ANY (ARRAY['owner'::text, 'admin'::text, 'operator'::text])))))))))));

CREATE POLICY commerce_transactions_buyer_read ON public.commerce_transactions AS PERMISSIVE FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM commerce_orders o
  WHERE ((o.id = commerce_transactions.order_id) AND (o.buyer_user_id = ( SELECT auth.uid() AS uid))))));

CREATE POLICY members_delete_managers ON public.business_members AS PERMISSIVE FOR DELETE TO authenticated USING (((role <> 'owner'::text) AND (business_id IN ( SELECT private.user_managed_business_ids() AS user_managed_business_ids))));

CREATE POLICY members_insert_invitation ON public.business_members AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((( SELECT auth.uid() AS uid) = user_id) AND (EXISTS ( SELECT 1
   FROM business_invitations i
  WHERE ((i.business_id = business_members.business_id) AND (lower(i.email) = lower(COALESCE(( SELECT (auth.jwt() ->> 'email'::text)), ''::text))) AND (i.accepted_at IS NULL) AND (i.expires_at > now()) AND (i.role = business_members.role))))));

CREATE POLICY members_insert_self ON public.business_members AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (((( SELECT auth.uid() AS uid) = user_id) AND (EXISTS ( SELECT 1
   FROM businesses b
  WHERE ((b.id = business_members.business_id) AND (b.owner_id = ( SELECT auth.uid() AS uid)))))));

CREATE POLICY members_select_own ON public.business_members AS PERMISSIVE FOR SELECT TO authenticated USING (((user_id = ( SELECT auth.uid() AS uid)) OR (business_id IN ( SELECT private.user_managed_business_ids() AS user_managed_business_ids))));

CREATE POLICY members_update_managers ON public.business_members AS PERMISSIVE FOR UPDATE TO authenticated USING ((business_id IN ( SELECT private.user_managed_business_ids() AS user_managed_business_ids))) WITH CHECK ((business_id IN ( SELECT private.user_managed_business_ids() AS user_managed_business_ids)));

CREATE POLICY platform_services_public_read ON public.platform_services AS PERMISSIVE FOR SELECT TO public USING ((active = true));

CREATE POLICY profiles_insert_own ON public.profiles AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((( SELECT auth.uid() AS uid) = id));

CREATE POLICY profiles_public_read_active ON public.profiles AS PERMISSIVE FOR SELECT TO anon USING ((account_status = 'ACTIVE'::text));

CREATE POLICY profiles_select_own ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = id));

CREATE POLICY profiles_update_own ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated USING ((( SELECT auth.uid() AS uid) = id)) WITH CHECK ((( SELECT auth.uid() AS uid) = id));

COMMENT ON COLUMN public.businesses.archived_at IS 'Soft-delete timestamp. Archived businesses remain available for historical/commercial integrity but are excluded from public discovery.';
