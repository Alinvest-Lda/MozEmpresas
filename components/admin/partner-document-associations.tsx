"use client";

import { useState } from "react";

type Partner = { id: string; name: string };
type Contract = { id: string; account_id: string; contract_code: string; title: string };
type Engagement = { id: string; account_id: string; title: string };
type Campaign = { id: string; account_id: string; title: string };
type Document = { id: string; account_id: string; document_type: string; title: string; version_number: number; storage_path: string };

export function PartnerReportAssociations({
  partners, contracts, engagements, campaigns, documents,
}: {
  partners: Partner[]; contracts: Contract[]; engagements: Engagement[];
  campaigns: Campaign[]; documents: Document[];
}) {
  const [accountId, setAccountId] = useState(partners[0]?.id ?? "");
  const [contractId, setContractId] = useState("");
  const [engagementId, setEngagementId] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [storagePath, setStoragePath] = useState("");
  const accountDocuments = documents.filter(d => d.account_id === accountId && ["REPORT","SUPPORTING","OTHER"].includes(d.document_type));
  return <>
    <label>Entidade<select name="account_id" required value={accountId} onChange={e => { setAccountId(e.target.value); setContractId(""); setEngagementId(""); setCampaignId(""); setStoragePath(""); }}>{partners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <label>Contrato<select name="contract_id" value={contractId} onChange={e => setContractId(e.target.value)}><option value="">Sem contrato</option>{contracts.filter(c => c.account_id === accountId).map(c => <option key={c.id} value={c.id}>{c.contract_code} · {c.title}</option>)}</select></label>
    <label>Execução associada (opcional)<select name="engagement_id" value={engagementId} onChange={e => setEngagementId(e.target.value)}><option value="">Sem execução</option>{engagements.filter(x => x.account_id === accountId).map(x => <option key={x.id} value={x.id}>{x.title}</option>)}</select></label>
    <label>Campanha associada (opcional)<select name="campaign_id" value={campaignId} onChange={e => setCampaignId(e.target.value)}><option value="">Sem campanha</option>{campaigns.filter(c => c.account_id === accountId).map(c => <option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
    <label>Ficheiro do relatório<select name="storage_path" value={storagePath} onChange={e => setStoragePath(e.target.value)}><option value="">Sem ficheiro (usar link externo)</option>{accountDocuments.map(d => <option key={d.id} value={d.storage_path}>{d.title} · v{d.version_number}</option>)}</select></label>
  </>;
}

export function PartnerDocumentAssociation({
  partners, contracts, engagements, reports, campaigns,
}: {
  partners: Partner[]; contracts: Contract[]; engagements: Engagement[];
  reports: Array<{id:string;account_id:string;title:string}>;
  campaigns: Campaign[];
}) {
  const [accountId, setAccountId] = useState(partners[0]?.id ?? "");
  const [parentRef, setParentRef] = useState("GENERAL");
  const options = [
    ...contracts.filter(x=>x.account_id===accountId).map(x=>({value:`CONTRACT:${x.id}`,label:`Contrato · ${x.contract_code} · ${x.title}`})),
    ...engagements.filter(x=>x.account_id===accountId).map(x=>({value:`ENGAGEMENT:${x.id}`,label:`Execução · ${x.title}`})),
    ...reports.filter(x=>x.account_id===accountId).map(x=>({value:`REPORT:${x.id}`,label:`Relatório · ${x.title}`})),
    ...campaigns.filter(x=>x.account_id===accountId).map(x=>({value:`CAMPAIGN:${x.id}`,label:`Campanha · ${x.title}`})),
  ];
  return <>
    <label>Entidade<select name="account_id" required value={accountId} onChange={e=>{setAccountId(e.target.value);setParentRef("GENERAL");}}>{partners.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
    <label>Associação<select name="parent_ref" value={parentRef} onChange={e=>setParentRef(e.target.value)}><option value="GENERAL">Dossiê geral</option>{options.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
  </>;
}
