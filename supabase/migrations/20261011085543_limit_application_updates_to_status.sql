revoke update on table public.opportunity_applications from authenticated;
grant update (status, updated_at) on table public.opportunity_applications to authenticated;
