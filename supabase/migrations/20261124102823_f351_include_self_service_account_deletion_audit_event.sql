-- F3.51: allow the self-service deletion-request event in the account audit stream.
alter table public.platform_account_audit_log
  drop constraint if exists platform_account_audit_log_action_check;
alter table public.platform_account_audit_log
  add constraint platform_account_audit_log_action_check
  check (action in (
    'ACCOUNT_SUSPENDED',
    'ACCOUNT_REACTIVATED',
    'ACCOUNT_DELETION_REQUESTED',
    'ACCOUNT_DELETION_REVIEWED',
    'PASSWORD_RECOVERY_REQUESTED'
  ));
