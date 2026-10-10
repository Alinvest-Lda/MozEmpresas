-- Remove the contests feature from MozEmpresas.
-- Opportunity-related tables are intentionally retained for the Partner module.
delete from public.platform_services
where slug in ('concursos-empresariais', 'monitoria-concursos-oportunidades');

drop table if exists public.contest_evaluations;
drop table if exists public.contest_evaluators;
drop table if exists public.contest_evaluation_criteria;
drop table if exists public.contest_requirements;
drop table if exists public.contest_applications;
drop table if exists public.contests;

drop type if exists public.contest_status;
