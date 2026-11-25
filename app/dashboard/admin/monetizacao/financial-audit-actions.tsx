"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./audit-actions.module.css";
type AuditIssue = { issue_key:string; record_id:string; issue_code:string; module:string; severity:string; summary:string; status:string; assigned_to:string|null; resolution_note:string|null; evidence_reference:string|null; occurred_at:string|null };
type AuditHistory = { id:number; previous_status:string|null; new_status:string; previous_assigned_to:string|null; new_assigned_to:string|null; resolution_note:string|null; evidence_reference:string|null; actor:string|null; created_at:string };
const labels:Record<string,string>={OPEN:"Em aberto",IN_PROGRESS:"Em tratamento",RESOLVED:"Resolvido",IGNORED:"Ignorado"};
export default function FinancialAuditActions({issues}:{issues:AuditIssue[]}) {
 const router = useRouter();
 const [drafts,setDrafts]=useState<Record<string,{status:string;assigned_to:string;resolution_note:string;evidence_reference:string}>>({});
 const [busy,setBusy]=useState<string|null>(null);
 const [messages,setMessages]=useState<Record<string,string>>({});
 const [histories,setHistories]=useState<Record<string,AuditHistory[]>>({});
 const [historyBusy,setHistoryBusy]=useState<string|null>(null);
 const value=(issue:AuditIssue)=>drafts[issue.issue_key]??{status:issue.status||"OPEN",assigned_to:issue.assigned_to||"",resolution_note:issue.resolution_note||"",evidence_reference:issue.evidence_reference||""};
 const patch=(issue:AuditIssue,field:"status"|"assigned_to"|"resolution_note"|"evidence_reference",val:string)=>setDrafts(prev=>({...prev,[issue.issue_key]:{...value(issue),[field]:val}}));
 const showHistory=async(issue:AuditIssue)=>{
  setHistoryBusy(issue.issue_key);
  try{const res=await fetch("/api/admin/financial-audit-actions?issue_key="+encodeURIComponent(issue.issue_key));const data=await res.json();if(!res.ok)throw new Error(data.error||"Falha a carregar histórico.");setHistories(prev=>({...prev,[issue.issue_key]:data.result?.history||[]}));}
  catch(e){setMessages(prev=>({...prev,[issue.issue_key]:e instanceof Error?e.message:"Falha a carregar histórico."}));}
  finally{setHistoryBusy(null);}
 };
 const save=async(issue:AuditIssue)=>{
  const v=value(issue);
  if (v.status === "RESOLVED" && (!v.resolution_note.trim() || !v.evidence_reference.trim())) {
   setMessages(prev=>({...prev,[issue.issue_key]:"Para resolver, indique uma nota e a referência de evidência."}));
   return;
  }
  if (v.status === "IGNORED" && !v.resolution_note.trim()) {
   setMessages(prev=>({...prev,[issue.issue_key]:"Para ignorar, indique o motivo da decisão."}));
   return;
  }
  setBusy(issue.issue_key);setMessages(prev=>({...prev,[issue.issue_key]:""}));
  try{const res=await fetch("/api/admin/financial-audit-actions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({issue_key:issue.issue_key,status:v.status,assigned_to:v.assigned_to||null,resolution_note:v.resolution_note||null,evidence_reference:v.evidence_reference||null})});const data=await res.json();if(!res.ok)throw new Error(data.error||"Falha ao guardar.");setMessages(prev=>({...prev,[issue.issue_key]:"Intervenção guardada; estado actualizado."}));
   await showHistory(issue);
   router.refresh();}
  catch(e){setMessages(prev=>({...prev,[issue.issue_key]:e instanceof Error?e.message:"Falha ao guardar."}));}
  finally{setBusy(null);}
 };
 return <div className={styles.list}>{issues.map(issue=>{const v=value(issue);return <article className={styles.item} key={issue.issue_key}>
  <header><div><span className={styles.meta}>{issue.module} · {issue.severity} · {labels[issue.status]||issue.status}</span><h3>{issue.issue_code}</h3><p>{issue.summary}</p><small>ID: {issue.record_id}</small></div></header>
  <div className={styles.controls}>
   <label>Estado<select value={v.status} onChange={e=>patch(issue,"status",e.target.value)}>{Object.entries(labels).map(([k,l])=><option value={k} key={k}>{l}</option>)}</select></label>
   <label>Responsável (UUID)<input value={v.assigned_to} onChange={e=>patch(issue,"assigned_to",e.target.value)} placeholder="UUID do membro responsável"/></label>
   <label>Nota de tratamento<textarea value={v.resolution_note} onChange={e=>patch(issue,"resolution_note",e.target.value)} maxLength={3000} rows={3} placeholder="Descreva a intervenção ou decisão"/></label>
   <label>Referência de evidência<input value={v.evidence_reference} onChange={e=>patch(issue,"evidence_reference",e.target.value)} maxLength={1000} placeholder="Referência de documento, ticket ou comprovativo"/></label>
  </div>
  <footer><button disabled={busy===issue.issue_key} onClick={()=>save(issue)}>{busy===issue.issue_key?"A guardar…":"Guardar intervenção"}</button><button disabled={historyBusy===issue.issue_key} onClick={()=>showHistory(issue)}>{historyBusy===issue.issue_key?"A carregar…":"Ver histórico"}</button>{messages[issue.issue_key]?<span role="status">{messages[issue.issue_key]}</span>:null}</footer>
  {histories[issue.issue_key]?<div className={styles.history}><strong>Histórico de tratamento ({histories[issue.issue_key].length})</strong>{histories[issue.issue_key].length===0?<p>Sem intervenções registadas.</p>:histories[issue.issue_key].map(h=><section key={h.id}><small>{new Date(h.created_at).toLocaleString("pt-MZ")} · {h.previous_status?labels[h.previous_status]||h.previous_status+" → ":""}{labels[h.new_status]||h.new_status}</small>{h.resolution_note?<p>{h.resolution_note}</p>:null}{h.evidence_reference?<p>Evidência: {h.evidence_reference}</p>:null}<small>Actor: {h.actor||"—"} · Responsável: {h.new_assigned_to||"—"}</small></section>)}</div>:null}
 </article>})}</div>
}