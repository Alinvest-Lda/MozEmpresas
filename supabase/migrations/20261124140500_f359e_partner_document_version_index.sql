create index if not exists partner_documents_previous_version_idx
on public.partner_documents(previous_version_id)
where previous_version_id is not null;