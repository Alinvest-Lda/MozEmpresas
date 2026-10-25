-- Permit users to deactivate or request deletion of their own profile.
-- The profiles_prevent_self_privilege_escalation trigger blocks reactivation and role changes.
grant update (account_status) on public.profiles to authenticated;
