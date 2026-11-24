-- Reconcile notification ownership after the established F3.72/F3.73 flows.
-- service_requests already has an atomic status-history + notification trigger from F3.72.
-- Remove only the overlapping generic lifecycle trigger; retain the shared function
-- because it is still used by credit, service-order and partner-campaign triggers.
drop trigger if exists service_request_status_notification on public.service_requests;
