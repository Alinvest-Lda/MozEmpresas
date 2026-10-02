export const dynamic="force-dynamic";
import {createClient} from "@/lib/supabase/server";
import {createSupportTicket,addSupportMessage} from "@/lib/support/actions";

const areas=["Técnico","Comercial","Conta e acessos","Pagamentos e créditos","Publicidade","Serviços MozEmpresas"];

export default async function SupportPage(){
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)return null;
 const [{data:businesses},{data:tickets}]=await Promise.all([
  supabase.from("businesses").select("id,name").eq("owner_id",user.id).order("name"),
  supabase.from("support_tickets").select("id,business_id,area,subject,status,priority,created_at,updated_at").eq("user_id",user.id).order("updated_at",{ascending:false}).limit(30)
 ]);
 const ids=(tickets??[]).map(t=>t.id);
 const {data:messages}=ids.length?await supabase.from("support_messages").select("id,ticket_id,sender_role,body,created_at").in("ticket_id",ids).order("created_at",{ascending:true}):{data:[]};
 return <main className="dashboard-main"><div className="dashboard-content">
  <header className="dashboard-topbar"><div><span className="dashboard-kicker">Central de suporte</span><h1>Fale directamente com o backoffice.</h1><p>Abra um atendimento técnico ou comercial, associe-o a uma empresa e acompanhe toda a conversa no mesmo lugar.</p></div></header>
  <nav className="commerce-nav" aria-label="Suporte"><a className="active" href="#novo">Novo atendimento</a><a href="#atendimentos">Meus atendimentos</a><a href="#como-funciona">Como funciona</a></nav>
  <section id="novo" className="dashboard-section"><div className="dashboard-section-head"><div><span className="dashboard-kicker">Novo atendimento</span><h2>Em que podemos ajudar?</h2><p>Escolha a área para que o backoffice encaminhe o atendimento correctamente.</p></div></div>
   <form action={createSupportTicket} className="commerce-form-grid"><label>Área<select name="area" required>{areas.map(a=><option key={a}>{a}</option>)}</select></label><label>Empresa associada<select name="business_id"><option value="">Sem empresa específica</option>{(businesses??[]).map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label><label className="wide">Assunto<input name="subject" required placeholder="Descreva resumidamente o assunto"/></label><label className="wide">Mensagem<textarea name="body" rows={5} required placeholder="Explique o que precisa e inclua referências relevantes."/></label><div className="wide"><button className="btn primary" type="submit">Abrir atendimento →</button></div></form>
  </section>
  <section id="atendimentos" className="dashboard-section" style={{marginTop:18}}><div className="dashboard-section-head"><div><span className="dashboard-kicker">Acompanhamento</span><h2>Meus atendimentos</h2><p>Cada atendimento mantém o histórico da conversa e o estado operacional.</p></div></div>
   {(tickets??[]).length?(tickets??[]).map(t=><article className="support-ticket" key={t.id}><div className="support-ticket-head"><div><span>{t.area}</span><h3>{t.subject}</h3><small>{new Date(t.updated_at).toLocaleString("pt-MZ")}</small></div><strong>{t.status}</strong></div><div className="support-thread">{(messages??[]).filter(m=>m.ticket_id===t.id).map(m=><div className={"support-message "+m.sender_role.toLowerCase()} key={m.id}><span>{m.sender_role==="USER"?"Você":"Backoffice"}</span><p>{m.body}</p><small>{new Date(m.created_at).toLocaleString("pt-MZ")}</small></div>)}</div><form action={addSupportMessage} className="support-reply"><input type="hidden" name="ticket_id" value={t.id}/><input name="body" placeholder="Responder ao atendimento…"/><button className="btn" type="submit">Enviar</button></form></article>):<div className="empty"><p>Ainda não existem atendimentos. Abra o primeiro acima.</p></div>}
  </section>
  <section id="como-funciona" className="dashboard-section" style={{marginTop:18}}><div className="dashboard-section-head"><div><span className="dashboard-kicker">Modelo de atendimento</span><h2>Suporte com contexto</h2><p>O backoffice recebe a área, assunto e empresa associada antes de responder, evitando que tenha de repetir a informação.</p></div></div></section>
 </div></main>;
}