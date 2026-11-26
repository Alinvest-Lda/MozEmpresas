"use client";

import { useState, useTransition } from "react";
import { createPartnerDocumentDownload, type PartnerDocumentItem } from "@/lib/partner/documents";

const typeLabel: Record<string,string> = { SIGNED_CONTRACT:"Contrato assinado", REPORT:"Relatório", SUPPORTING:"Documento de apoio", OTHER:"Outro" };
const parentLabel: Record<string,string> = { GENERAL:"Documentação geral", CONTRACT:"Contrato", ENGAGEMENT:"Engajamento", REPORT:"Relatório", CAMPAIGN:"Campanha" };
const sizeLabel = (n:number) => !Number.isFinite(n) || n < 0 ? "Tamanho indisponível" : n < 1024 ? n+" B" : n < 1048576 ? (n/1024).toFixed(1)+" KB" : (n/1048576).toFixed(1)+" MB";
const dateLabel = (v:string) => { const d=new Date(v); return Number.isNaN(d.getTime()) ? "Data indisponível" : d.toLocaleDateString("pt-MZ"); };

export default function PartnerDocumentsList({documents}:{documents:PartnerDocumentItem[]}) {
  const [pending,setPending] = useState<string|null>(null);
  const [error,setError] = useState<string|null>(null);
  const [busy, startTransition] = useTransition();
  const groups = documents.reduce<Record<string,PartnerDocumentItem[]>>((acc,doc)=>{const key=doc.parent_type||"GENERAL"; (acc[key] ||= []).push(doc); return acc;}, {});
  return <div className="partner-document-list" aria-label="Arquivo de documentos da organização">
    {error && <p role="alert" className="notice">{error}</p>}
    {Object.entries(groups).map(([group,items])=><section key={group} aria-labelledby={"partner-docs-"+group}>
      <h3 id={"partner-docs-"+group}>{parentLabel[group]||"Documentação geral"}</h3>
      <ul className="partner-document-group" style={{listStyle:"none",padding:0,margin:0}}>
      {items.map(doc=><li key={doc.id}><article className="partner-document-row">
        <div className="partner-document-main"><span>{typeLabel[doc.document_type] || doc.document_type} · Versão {doc.version_number}</span>
          <strong>{doc.title}</strong><small>{doc.original_filename} · {sizeLabel(doc.size_bytes)} · {dateLabel(doc.created_at)}</small>
          {doc.notes && <p>{doc.notes}</p>}
        </div>
        <button disabled={busy} aria-busy={busy && pending===doc.id} onClick={()=>{
          setError(null); setPending(doc.id);
          startTransition(async()=>{const result=await createPartnerDocumentDownload(doc.id); setPending(null); if(result.error||!result.url){setError(result.error||"Falha de acesso");return;} window.location.assign(result.url);});
        }}>{busy && pending===doc.id ? "A preparar…" : "Descarregar"}</button>
      </article></li>)}
      </ul>
    </section>)}
  </div>;
}
