-- F3.65b grant required for the audit trigger's invoker-context insert; constrained by RLS.
grant insert on public.partner_relationship_action_history to authenticated;