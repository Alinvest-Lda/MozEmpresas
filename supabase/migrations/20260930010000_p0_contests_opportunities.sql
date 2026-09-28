-- P0: contest + opportunity participation and offline marketplace foundations
alter table public.contests add column if not exists category text;
alter table public.contests add column if not exists rules text;
create table if not exists public.contest_requirements (
 id uuid primary key default gen_random_uuid(),
 contest_id uuid not null references public.contests(id) on delete cascade,
 title text not null,
 description text,
 required boolean not null default true,
 created_at timestamptz not null default now()
);
-- The application/evaluation tables are intentionally transaction/payment-free.
create table if not exists public.contest_applications (
 id uuid primary key default gen_random_uuid(),
 contest_id uuid not null references public.contests(id) on delete cascade,
 applicant_user_id uuid not null references auth.users(id) on delete cascade,
 applicant_business_id uuid references public.businesses(id) on delete set null,
 cover_note text,
 status text not null default 'SUBMITTED' check (status in ('DRAFT','SUBMITTED','UNDER_REVIEW','SHORTLISTED','ACCEPTED','REJECTED','WITHDRAWN')),
 submitted_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(contest_id, applicant_user_id)
);
create table if not exists public.contest_evaluation_criteria (
 id uuid primary key default gen_random_uuid(),
 contest_id uuid not null references public.contests(id) on delete cascade,
 name text not null,
 description text,
 weight numeric not null default 1 check(weight > 0),
 sort_order int not null default 0
);
create table if not exists public.contest_evaluators (
 id uuid primary key default gen_random_uuid(),
 contest_id uuid not null references public.contests(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 unique(contest_id,user_id)
);
create table if not exists public.contest_evaluations (
 id uuid primary key default gen_random_uuid(),
 application_id uuid not null references public.contest_applications(id) on delete cascade,
 criterion_id uuid not null references public.contest_evaluation_criteria(id) on delete cascade,
 evaluator_user_id uuid not null references auth.users(id) on delete cascade,
 score numeric not null check(score between 0 and 100),
 notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(application_id,criterion_id,evaluator_user_id)
);
create table if not exists public.opportunity_applications (
 id uuid primary key default gen_random_uuid(),
 opportunity_id uuid not null references public.opportunities(id) on delete cascade,
 applicant_user_id uuid not null references auth.users(id) on delete cascade,
 applicant_business_id uuid references public.businesses(id) on delete set null,
 cover_note text,
 status text not null default 'SUBMITTED' check(status in ('DRAFT','SUBMITTED','UNDER_REVIEW','SHORTLISTED','ACCEPTED','REJECTED','WITHDRAWN')),
 submitted_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(opportunity_id, applicant_user_id)
);
alter table public.contests enable row level security;
alter table public.contest_requirements enable row level security;
alter table public.contest_applications enable row level security;
alter table public.contest_evaluation_criteria enable row level security;
alter table public.contest_evaluators enable row level security;
alter table public.contest_evaluations enable row level security;
alter table public.opportunity_applications enable row level security;
create index if not exists contest_applications_contest_idx on public.contest_applications(contest_id,status);
create index if not exists opportunity_applications_opportunity_idx on public.opportunity_applications(opportunity_id,status);
