export const dynamic="force-dynamic";
import {createClient} from "@/lib/supabase/server";
import {createSupportTicket,addSupportMessage} from "@/lib/support/actions";
import {getManagedBusinessIds} from "@/lib/businesses/permissions";

const areas=["Técnico","Comercial","Conta e acessos","Pagamentos e créditos","Publicidade","Serviços MozEmpresas"];

export default async function SupportPage({searchParams}:{searchParams?:Promise<{status?:string}>}){
 const params=await searchParams;
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)return null;
 const managedIds=await getManagedBusinessIds(supabase,user.id);
 const feedback:Record<string,{kind:"success"|"error"|"warning";message:string}>={
  created:{kind:"success",message:"Atendimento criado. Pode acompanhar as respostas nesta página."},
  replied:{kind:"success",message:"Resposta enviada."},
  "reply-saved":{kind:"warning",message:"A sua mensagem foi guardada, mas o estado do atendimento mudou em simultâneo. Não envie novamente; actualize a página para confirmar o histórico."},
  "reply-closed":{kind:"warning",message:"Este atendimento está fechado. Abra um novo pedido se precisar de assistência adicional."},
  invalid:{kind:"error",message:"Preencha a área, o assunto e a mensagem. Verifique os limites dos campos."},
  "business-denied":{kind:"error",message:"Não tem acesso à empresa seleccionada. Actualize a página e tente novamente."},
  error:{kind:"error",message:"Não foi possível concluir a operação. Tente novamente."},
  "reply-error":{kind:"error",message:"Não foi possível enviar a resposta. O atendimento mantém-se no histórico."},
 };
 const [{data:businesses},{data:tickets}]=await Promise.all([
  managedIds.length?supabase.from("businesses").select("id,name").in("id",managedIds).is("archived_at",null).order("name"):Promise.resolve({data:[]}),
  supabase.from("support_tickets").select("id,business_id,area,subject,status,priority,created_at,updated_at").eq("user_id",user.id).order("updated_at",{ascending:false}).limit(30)
 ]);
 const ids=(tickets??[]).map(t=>t.id);
 const [{data:messages},{data:ticketEvents}]=await Promise.all([
  ids.length?supabase.from("support_messages").select("id,ticket_id,sender_role,body,created_at").in("ticket_id",ids).order("created_at",{ascending:true}):Promise.resolve({data:[]}),
  ids.length?supabase.from("support_ticket_events").select("id,ticket_id,event_type,old_status,new_status,created_at").in("ticket_id",ids).order("created_at",{ascending:false}):Promise.resolve({data:[]})
 ]);
 return <main className="dashboard-main"><div className="dashboard-content">
  {params?.status&&feedback[params.status]&&<p className={feedback[params.status].kind==="success"?"account-success":feedback[params.status].kind==="warning"?"notice":"form-error"} role="status">{feedback[params.status].message}</p>}
  <header className="dashboard-topbar"><div><span className="dashboard-kicker">Central de suporte</span><h1>Fale directamente com o backoffice.</h1><p>Abra um atendimento técnico ou comercial, associe-o a uma empresa e acompanhe toda a conversa no mesmo lugar.</p></div></header>
  <nav className="commerce-nav" aria-label="Suporte"><a className="active" href="#novo">Novo atendimento</a><a href="#atendimentos">Meus atendimentos</a><a href="#como-funciona">Como funciona</a></nav>
  <section id="novo" className="dashboard-section"><div className="dashboard-section-head"><div><span className="dashboard-kicker">Novo atendimento</span><h2>Em que podemos ajudar?</h2><p>Escolha a área para que o backoffice encaminhe o atendimento correctamente.</p></div></div>
   <form action={createSupportTicket} className="commerce-form-grid"><label>Área<select name="area" required>{areas.map(a=><option key={a}>{a}</option>)}</select></label><label>Empresa associada<select name="business_id"><option value="">Sem empresa específica</option>{(businesses??[]).map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label><label className="wide">Assunto<input name="subject" required placeholder="Descreva resumidamente o assunto"/></label><label className="wide">Mensagem<textarea name="body" rows={5} required placeholder="Explique o que precisa e inclua referências relevantes."/></label><div className="wide"><button className="btn primary" type="submit">Abrir atendimento →</button></div></form>
  </section>
  <section id="atendimentos" className="dashboard-section" style={{marginTop:18}}><div className="dashboard-section-head"><div><span className="dashboard-kicker">Acompanhamento</span><h2>Meus atendimentos</h2><p>Cada atendimento mantém o histórico da conversa e o estado operacional.</p></div></div>
   {(tickets??[]).length?(tickets??[]).map(t=><article className="support-ticket" key={t.id}><div className="support-ticket-head"><div><span>{t.area}</span><h3>{t.subject}</h3><small>{new Date(t.updated_at).toLocaleString("pt-MZ")}</small></div><strong>{t.status}</strong></div><div className="support-thread">{(messages??[]).filter(m=>m.ticket_id===t.id).map(m=><div className={"support-message "+m.sender_role.toLowerCase()} key={m.id}><span>{m.sender_role==="USER"?"Você":"Backoffice"}</span><p>{m.body}</p><small>{new Date(m.created_at).toLocaleString("pt-MZ")}</small></div>)}</div><details className="support-ticket-history"><summary>Histórico de estado ({(ticketEvents??[]).filter(e=>e.ticket_id===t.id).length})</summary><ol>{(ticketEvents??[]).filter(e=>e.ticket_id===t.id).map(e=><li key={e.id}><strong>{e.event_type==="CREATED"?"Atendimento criado":e.event_type==="ASSIGNED"?"Atribuído ao backoffice":e.event_type==="UNASSIGNED"?"Atribuição removida":e.event_type==="STATUS_CHANGED"?"Estado actualizado":"Prioridade actualizada"}</strong><span>{e.old_status?e.old_status+" → ":""}{e.new_status||""}</span><small>{new Date(e.created_at).toLocaleString("pt-MZ")}</small></li>)}</ol></details>{t.status!=="CLOSED"?<form action={addSupportMessage} className="support-reply"><input type="hidden" name="ticket_id" value={t.id}/><input name="body" placeholder="Responder ao atendimento…" required maxLength={5000}/><button className="btn" type="submit">Enviar</button></form>:<p className="notice">Atendimento fechado. Para continuar, abra um novo pedido.</p>}</article>):<div className="empty"><p>Ainda não existem atendimentos. Abra o primeiro acima.</p></div>}
  </section>
  <section id="como-funciona" className="dashboard-section" style={{marginTop:18}}><div className="dashboard-section-head"><div><span className="dashboard-kicker">Modelo de atendimento</span><h2>Suporte com contexto</h2><p>O backoffice recebe a área, assunto e empresa associada antes de responder, evitando que tenha de repetir a informação.</p></div></div></section>
 </div><style>{`.support-ticket-history{margin:12px 0;font-size:12px}.support-ticket-history summary{cursor:pointer;font-weight:700}.support-ticket-history ol{display:grid;gap:6px;margin:8px 0;padding-left:18px}.support-ticket-history li{display:grid;gap:2px}.support-ticket-history li small{color:var(--muted,#687572)}`}</style></main>;
}