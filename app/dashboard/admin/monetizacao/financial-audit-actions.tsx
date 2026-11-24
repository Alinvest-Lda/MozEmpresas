"use client";
import { useState } from "react";
import styles from "./audit-actions.module.css";

type AuditIssue = { issue_key:string; record_id:string; issue_code:string; module:string; severity:string; summary:string; status:string; assigned_to:string|null; resolution_note:string|null; evidence_reference:string|null; occurred_at:string|null };
const labels:Record<string,string>={OPEN:"Em aberto",IN_PROGRESS:"Em tratamento",RESOLVED:"Resolvido",IGNORED:"Ignorado"};
export default function FinancialAuditActions({issues}:{issues:AuditIssue[]}) {
 const [drafts,setDrafts]=useState<Record<string,{status:string;assigned_to:string;resolution_note:string;evidence_reference:string}>>({});
 const [busy,setBusy]=useState<string|null>(null);
 const [messages,setMessages]=useState<Record<string,string>>({});
 const value=(issue:AuditIssue)=>drafts[issue.issue_key]??{status:issue.status||"OPEN",assigned_to:issue.assigned_to||"",resolution_note:issue.resolution_note||"",evidence_reference:issue.evidence_reference||""};
 const patch=(key:string,field:string,val:string)=>setDrafts(prev=>({...prev,[key]:{...value(issues.find(i=>i.issue_key===key)!),[field]:val}}));
 const save=async(issue:AuditIssue)=>{
  const v=value(issue);setBusy(issue.issue_key);setMessages(prev=>({...prev,[issue.issue_key]:""}));
  try { const res=await fetch("/api/admin/financial-audit-actions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({issue_key:issue.issue_key,status:v.status,assigned_to:v.assigned_to||null,resolution_note:v.resolution_note||null,evidence_reference:v.evidence_reference||null})});const data=await res.json();if(!res.ok)throw new Error(data.error||"Falha ao guardar.");setMessages(prev=>({...prev,[issue.issue_key]:"Guardado. Actualize a página para recarregar o estado da auditoria."})); }
  catch(e){setMessages(prev=>({...prev,[issue.issue_key]:e instanceof Error?e.message:"Falha ao guardar."}));}
  finally{setBusy(null);}
 };
 return <div className={styles.list}>{issues.map(issue=>{const v=value(issue);return <article className={styles.item} key={issue.issue_key}>
  <header><div><span className={styles.meta}>{issue.module} · {issue.severity} · {labels[issue.status]||issue.status}</span><h3>{issue.issue_code}</h3><p>{issue.summary}</p><small>ID: {issue.record_id}</small></div></header>
  <div className={styles.controls}>
   <label>Estado<select value={v.status} onChange={e=>patch(issue.issue_key,"status",e.target.value)}>{Object.entries(labels).map(([k,l])=><option value={k} key={k}>{l}</option>)}</select></label>
   <label>Responsável (UUID)<input value={v.assigned_to} onChange={e=>patch(issue.issue_key,"assigned_to",e.target.value)} placeholder="UUID do membro responsável"/></label>
   <label>Nota de tratamento<textarea value={v.resolution_note} onChange={e=>patch(issue.issue_key,"resolution_note",e.target.value)} maxLength={3000} rows={3} placeholder="Descreva a intervenção ou decisão"/></label>
   <label>Referência de evidência<input value={v.evidence_reference} onChange={e=>patch(issue.issue_key,"evidence_reference",e.target.value)} maxLength={1000} placeholder="Referência de documento, ticket ou comprovativo"/></label>
  </div>
  <footer><button disabled={busy===issue.issue_key} onClick={()=>save(issue)}>{busy===issue.issue_key?"A guardar…":"Guardar intervenção"}</button>{messages[issue.issue_key]?<span role="status">{messages[issue.issue_key]}</span>:null}</footer>
 </article>})}</div>
}
