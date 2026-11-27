"use server";

import { requirePartnerAccount } from "@/lib/auth/access";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export type PartnerDocumentItem = {
  id: string; title: string; document_type: string; parent_type: string;
  original_filename: string; mime_type: string; size_bytes: number;
  version_number: number; series_key: string; created_at: string; notes: string | null;
};

export async function listPartnerDocuments(): Promise<{ documents: PartnerDocumentItem[]; error: boolean }> {
  const context = await requirePartnerAccount();
  const partner = context.partnerContext as { account_id?: string };
  if (!partner?.account_id) return { documents: [], error: true };
  try {
    const admin = createServiceRoleClient();
    const { data: account, error: accountError } = await admin.from("partner_accounts").select("status,portal_enabled").eq("id", partner.account_id).maybeSingle();
    if (accountError || !account || account.status !== "ACTIVE" || account.portal_enabled !== true) return { documents: [], error: true };
    const { data, error } = await admin.from("partner_documents")
      .select("id,title,document_type,parent_type,original_filename,mime_type,size_bytes,version_number,series_key,created_at,notes")
      .eq("account_id", partner.account_id)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) return { documents: [], error: true };
    return { documents: (data ?? []) as PartnerDocumentItem[], error: false };
  } catch {
    return { documents: [], error: true };
  }
}

export async function createPartnerDocumentDownload(documentId: string): Promise<{ url: string | null; error: string | null }> {
  const context = await requirePartnerAccount();
  const partner = context.partnerContext as { account_id?: string };
  if (!partner?.account_id) return { url: null, error: "Acesso documental não autorizado." };
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(documentId)) {
    return { url: null, error: "Documento inválido." };
  }
  try {
    const admin = createServiceRoleClient();
    const { data: account, error: accountError } = await admin.from("partner_accounts").select("status,portal_enabled").eq("id", partner.account_id).maybeSingle();
    if (accountError || !account || account.status !== "ACTIVE" || account.portal_enabled !== true) return { url: null, error: "Acesso documental não autorizado." };
    const { data: doc, error: docError } = await admin.from("partner_documents")
      .select("storage_path,original_filename")
      .eq("id", documentId).eq("account_id", partner.account_id).maybeSingle();
    if (docError || !doc) return { url: null, error: "Documento não encontrado ou sem acesso." };
    const { data: signed, error: signedError } = await admin.storage.from("partner-documents").createSignedUrl(doc.storage_path, 120);
    if (signedError || !signed?.signedUrl) return { url: null, error: "Não foi possível gerar o acesso temporário." };

    const actorUserId = context.user?.id;
    if (!actorUserId) return { url: null, error: "Acesso documental não autorizado." };
    const { error: auditError } = await admin.from("partner_document_access_audit").insert({
      account_id: partner.account_id,
      document_id: documentId,
      actor_user_id: actorUserId,
      event_type: "SIGNED_URL_ISSUED",
      expires_in_seconds: 120,
    });
    if (auditError) return { url: null, error: "Não foi possível registar o acesso documental. Tente novamente." };

    return { url: signed.signedUrl, error: null };
  } catch {
    return { url: null, error: "Não foi possível gerar o acesso temporário." };
  }
}
