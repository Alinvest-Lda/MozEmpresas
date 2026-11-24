create index if not exists partner_entitlements_active_exclusivity_scope_idx
  on public.partner_entitlements (lower(btrim(scope)), starts_at, ends_at)
  where entitlement_type = 'EXCLUSIVITY' and status = 'ACTIVE';

create or replace function public.guard_partner_entitlement_exclusivity()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.starts_at is not null and new.ends_at is not null and new.ends_at < new.starts_at then
    raise exception 'PARTNER_ENTITLEMENT_INVALID_DATES';
  end if;

  if new.entitlement_type = 'EXCLUSIVITY' and new.status = 'ACTIVE' then
    if nullif(btrim(new.scope), '') is null then
      raise exception 'PARTNER_EXCLUSIVITY_SCOPE_REQUIRED';
    end if;

    perform pg_advisory_xact_lock(hashtextextended(lower(btrim(new.scope)), 0));

    if exists (
      select 1
      from public.partner_entitlements e
      where e.id is distinct from new.id
        and e.account_id <> new.account_id
        and e.entitlement_type = 'EXCLUSIVITY'
        and e.status = 'ACTIVE'
        and lower(btrim(e.scope)) = lower(btrim(new.scope))
        and tstzrange(
          coalesce(e.starts_at, '-infinity'::timestamptz),
          coalesce(e.ends_at, 'infinity'::timestamptz),
          '[]'
        ) && tstzrange(
          coalesce(new.starts_at, '-infinity'::timestamptz),
          coalesce(new.ends_at, 'infinity'::timestamptz),
          '[]'
        )
    ) then
      raise exception 'PARTNER_EXCLUSIVITY_SCOPE_CONFLICT';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists partner_entitlements_exclusivity_guard on public.partner_entitlements;
create trigger partner_entitlements_exclusivity_guard
before insert or update of account_id, entitlement_type, scope, starts_at, ends_at, status
on public.partner_entitlements
for each row execute function public.guard_partner_entitlement_exclusivity();

revoke all on function public.guard_partner_entitlement_exclusivity() from public, anon, authenticated;
