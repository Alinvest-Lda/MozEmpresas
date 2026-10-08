-- Expand the public opportunity taxonomy without changing existing values or RLS.
alter type opportunity_type add value if not exists 'ENTREPRENEUR_SUPPORT';
alter type opportunity_type add value if not exists 'INNOVATION_TECH';
alter type opportunity_type add value if not exists 'EXPORT_INTERNATIONAL';
