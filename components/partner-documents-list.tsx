"use client";

import { useState, useTransition } from "react";
import { createPartnerDocumentDownload, type PartnerDocumentItem } from "@/lib/partner/documents";

const typeLabel: Record<string,string> = { SIGNED_CONTRACT:"Contrato assinado", REPORT:"Relatório", SUPPORTING:"Documento de apoio", OTHER:"Outro" };
const sizeLabel = (n:number) => n < 1024 ? n+" B" : n < 1048576 ? (n/1024).toFixed(1)+" KB" : (n/1048576).toFixed(1)+" MB";

export default function PartnerDocumentsList({documents}:{documents:PartnerDocumentItem[]}) {
  const [pending,setPending] = useState<string|null>(null);
  const [error,setError] = useState<string|null>(null);
  const [busy, startTransition] = useTransition();
  return <div className="partner-document-list">
    {error && <p role="alert" className="notice">{error}</p>}
    {documents.map(doc=><article key={doc.id} className="partner-document-row">
      <div className="partner-document-main"><span>{typeLabel[doc.document_type] || doc.document_type} · V{doc.version_number}</span>
        <strong>{doc.title}</strong><small>{doc.original_filename} · {sizeLabel(doc.size_bytes)} · {new Date(doc.created_at).toLocaleDateString("pt-MZ")}</small>
        {doc.notes && <p>{doc.notes}</p>}
      </div>
      <button disabled={busy} onClick={()=>{
        setError(null); setPending(doc.id);
        startTransition(async()=>{const result=await createPartnerDocumentDownload(doc.id); setPending(null); if(result.error||!result.url){setError(result.error||"Falha de acesso");return;} window.location.assign(result.url);});
      }}>{busy && pending===doc.id ? "A preparar…" : "Descarregar"}</button>
    </article>)}
  </div>;
}
