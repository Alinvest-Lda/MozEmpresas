export const dynamic="force-dynamic";
import {createClient} from "@/lib/supabase/server";
import {replySupportAsStaff} from "@/lib/support/admin-actions";

const areas=["","Técnico","Comercial","Conta e acessos","Pagamentos e créditos","Publicidade","Serviços MozEmpresas"];
const statuses=["","OPEN","IN_PROGRESS","WAITING_USER","RESOLVED","CLOSED"];

export default async function AdminSupport({searchParams}:{searchParams?:Promise<{area?:string;status?:string;business?:string}>}){
 const p=await searchParams;const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return null;
 const {data:staff}=await supabase.from("platform_members").select("active").eq("user_id",user.id).eq("active",true).maybeSingle();if(!staff)return null;
 let query=supabase.from("support_tickets").select("id,user_id,business_id,area,subject,status,priority,created_at,updated_at").order("updated_at",{ascending:false}).limit(100);
 if(p?.area)query=query.eq("area",p.area);if(p?.status)query=query.eq("status",p.status);if(p?.business)query=query.eq("business_id",p.business);if(p?.subject)query=query.ilike("subject","%"+p.subject.replace(/[%_,]/g," ")+"%");
 const {data:tickets}=await query;
 const businessIds=[...new Set((tickets??[]).map(t=>t.business_id).filter(Boolean))];const userIds=[...new Set((tickets??[]).map(t=>t.user_id))];
 const [{data:businesses},{data:profiles}]=await Promise.all([
  businessIds.length?supabase.from("businesses").select("id,name").in("id",businessIds):Promise.resolve({data:[]}),
  userIds.length?supabase.from("profiles").select("id,full_name").in("id",userIds):Promise.resolve({data:[]})
 ]);
 const ids=(tickets??[]).map(t=>t.id);const {data:messages}=ids.length?await supabase.from("support_messages").select("id,ticket_id,sender_role,body,created_at").in("ticket_id",ids).order("created_at",{ascending:true}):{data:[]};
 return <main className="dashboard-main"><div className="dashboard-content">
  <header className="dashboard-topbar"><div><span className="dashboard-kicker">Plataforma · Suporte</span><h1>Central de atendimento</h1><p>Fila operacional do backoffice para suporte técnico e comercial.</p></div></header>
  <section className="dashboard-section"><form className="commerce-form-grid" method="get"><label>Área<select name="area" defaultValue={p?.area||""}>{areas.map(a=><option key={a} value={a}>{a||"Todas as áreas"}</option>)}</select></label><label>Estado<select name="status" defaultValue={p?.status||""}>{statuses.map(s=><option key={s} value={s}>{s||"Todos os estados"}</option>)}</select></label><label>Empresa<select name="business" defaultValue={p?.business||""}><option value="">Todas as empresas</option>{(businesses??[]).map(b=><option value={b.id} key={b.id}>{b.name}</option>)}</select></label><label>Assunto<input name="subject" defaultValue={p?.subject||""} placeholder="Pesquisar assunto"/></label><div className="wide"><button className="btn primary">Filtrar atendimentos</button></div></form></section>
  <section className="dashboard-section" style={{marginTop:18}}><div className="dashboard-section-head"><div><span className="dashboard-kicker">{(tickets??[]).length} atendimentos</span><h2>Fila de suporte</h2></div></div>{(tickets??[]).length?(tickets??[]).map(t=><article className="support-ticket" key={t.id}><div className="support-ticket-head"><div><span>{t.area} · {profiles?.find(x=>x.id===t.user_id)?.full_name||"Utilizador"}</span><h3>{t.subject}</h3><small>{businesses?.find(x=>x.id===t.business_id)?.name||"Sem empresa associada"} · {new Date(t.updated_at).toLocaleString("pt-MZ")}</small></div><strong>{t.status}</strong></div><div className="support-thread">{(messages??[]).filter(m=>m.ticket_id===t.id).map(m=><div className={"support-message "+m.sender_role.toLowerCase()} key={m.id}><span>{m.sender_role==="USER"?"Utilizador":"Backoffice"}</span><p>{m.body}</p><small>{new Date(m.created_at).toLocaleString("pt-MZ")}</small></div>)}</div><form action={replySupportAsStaff} className="support-reply"><input type="hidden" name="ticket_id" value={t.id}/><input name="body" placeholder="Responder como backoffice…"/><button className="btn primary" type="submit">Responder</button></form></article>):<div className="empty"><p>Não existem atendimentos neste filtro.</p></div>}</section>
 </div></main>;
}