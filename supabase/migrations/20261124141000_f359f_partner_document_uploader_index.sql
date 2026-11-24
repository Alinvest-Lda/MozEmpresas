create index if not exists partner_documents_uploaded_by_idx
on public.partner_documents(uploaded_by,created_at desc);