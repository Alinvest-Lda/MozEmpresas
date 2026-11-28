-- Isolated fixture for the F3.76 advertising campaign expiry reconciliation.
create role service_role;
create table public.business_promotions (
  id uuid primary key,
  status text not null,
  ends_at timestamptz,
  updated_at timestamptz
);
create table public.partner_ad_campaigns (
  id uuid primary key,
  status text not null,
  ends_at timestamptz,
  updated_at timestamptz
);
insert into public.business_promotions(id,status,ends_at) values
  ('76000000-0000-4000-8000-000000000001','ACTIVE',now()-interval '1 minute'),
  ('76000000-0000-4000-8000-000000000002','ACTIVE',now()+interval '1 day'),
  ('76000000-0000-4000-8000-000000000003','EXPIRED',now()-interval '1 day');
insert into public.partner_ad_campaigns(id,status,ends_at) values
  ('76100000-0000-4000-8000-000000000001','ACTIVE',now()-interval '1 minute'),
  ('76100000-0000-4000-8000-000000000002','PAUSED',now()-interval '1 minute'),
  ('76100000-0000-4000-8000-000000000003','ACTIVE',now()+interval '1 day'),
  ('76100000-0000-4000-8000-000000000004','ENDED',now()-interval '1 day');
