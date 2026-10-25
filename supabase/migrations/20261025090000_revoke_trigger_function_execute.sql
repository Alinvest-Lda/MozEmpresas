-- Trigger functions must not be callable as ordinary PostgREST RPCs.
-- PostgreSQL still invokes this function from its trigger after EXECUTE is revoked.
revoke execute on function public.prevent_self_privilege_escalation() from public, anon, authenticated;
