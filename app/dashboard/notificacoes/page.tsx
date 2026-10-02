export const dynamic="force-dynamic";
import Link from "next/link";
import {createClient} from "@/lib/supabase/server";
import {markNotificationRead,markAllNotificationsRead} from "@/lib/notifications/actions";

function dateLabel(value:string){return new Intl.DateTimeFormat("pt-MZ",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value));}
const typeLabels:Record<string,string>={SERVICE_REQUEST:"Serviços",ORDER:"Comprar e vender",PAYMENT:"Pagamentos",ADVERTISING:"Publicidade",ACCOUNT:"Conta",SYSTEM:"Sistema"};

export default async function NotificationsPage({searchParams}:{searchParams?:Promise<{filter?:string}>}){
 const params=await searchParams; const filter=params?.filter||"all"; const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)return null;
 const {data:notifications}=await supabase.from("notifications").select("id,type,title,body,resource_type,resource_id,read_at,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(100);
 const items=(notifications??[]).filter(n=>filter==="unread"?!n.read_at:filter==="read"?Boolean(n.read_at):filter==="all"||n.type===filter); const unread=(notifications??[]).filter(n=>!n.read_at).length;
 const types=[...new Set((notifications??[]).map(n=>n.type).filter(Boolean))];
 return <main className="dashboard-main"><div className="dashboard-content">
  <header className="dashboard-topbar"><div className="dashboard-welcome"><span className="dashboard-kicker">Conta · Centro de actividade</span><h1>Notificações</h1><p>Organize alertas por área e trate primeiro o que exige uma acção.</p></div>{unread>0&&<form action={markAllNotificationsRead}><button className="btn secondary" type="submit">Marcar todas como lidas</button></form>}</header>
  <nav className="commerce-nav" aria-label="Filtros de notificações"><Link href="/dashboard/notificacoes?filter=all" className={filter==="all"?"active":""}>Todas</Link><Link href="/dashboard/notificacoes?filter=unread" className={filter==="unread"?"active":""}>Por ler ({unread})</Link><Link href="/dashboard/notificacoes?filter=read" className={filter==="read"?"active":""}>Lidas</Link>{types.map(t=><Link key={t} href={"/dashboard/notificacoes?filter="+encodeURIComponent(t)} className={filter===t?"active":""}>{typeLabels[t]||t}</Link>)}</nav>
  <section className="dashboard-section"><div className="dashboard-section-head"><div><span className="dashboard-kicker">{unread?unread+" por ler":"Tudo em dia"}</span><h2>{filter==="unread"?"Notificações por ler":filter==="read"?"Notificações lidas":filter!=="all"?(typeLabels[filter]||filter):"Todas as notificações"}</h2><p>As notificações permanecem no histórico até deixarem de ser relevantes.</p></div></div>
   {items.length?<div className="dashboard-list">{items.map(item=><div key={item.id} className={"notification-item"+(item.read_at?"":" unread")}><div><span className="notification-type">{typeLabels[item.type]||item.type}</span><strong>{item.title}</strong>{item.body&&<span>{item.body}</span>}<small>{dateLabel(item.created_at)}</small></div><div className="notification-actions">{!item.read_at&&<form action={markNotificationRead}><input type="hidden" name="notificationId" value={item.id}/><button className="text-link" type="submit">Marcar como lida</button></form>}{item.resource_type==="SERVICE_REQUEST"&&<Link className="text-link" href="/dashboard/servicos">Abrir serviço →</Link>}{item.resource_type==="ORDER"&&<Link className="text-link" href="/dashboard/marketplace?tab=negociacoes">Abrir negociação →</Link>}</div></div>)}</div>:<div className="empty"><div className="empty-icon">✓</div><p>Não existem notificações neste filtro.</p></div>}
  </section>
 </div></main>;
}