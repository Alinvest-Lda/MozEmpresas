export const dynamic="force-dynamic";
import Link from "next/link"; import {createClient} from "@/lib/supabase/server";
function dateLabel(v:string|null){return v?new Date(v).toLocaleDateString("pt-MZ",{day:"2-digit",month:"short"}):"Sem prazo"}
export default async function PartnerHome(){const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return null;
const [{data:profile},{data:opportunities},{data:requests},{data:relationships}]=await Promise.all([
supabase.from("profiles").select("full_name").eq("id",user.id).maybeSingle(),
supabase.from("opportunities").select("id,title,slug,type,organization,location,closes_at").eq("status","PUBLISHED").order("closes_at",{ascending:true,nullsFirst:false}).limit(6),
supabase.from("service_requests").select("id,status,created_at").eq("requester_user_id",user.id).order("created_at",{ascending:false}).limit(6),
supabase.from("business_partner_relationships").select("id,status,relationship_type,created_at").eq("created_by",user.id).order("created_at",{ascending:false}).limit(6)
]);
const active=(relationships??[]).filter(x=>x.status==="ACTIVE").length;const pending=(requests??[]).filter(x=>["REQUESTED","UNDER_REVIEW","QUOTED"].includes(x.status)).length;const completed=(requests??[]).filter(x=>x.status==="COMPLETED").length;const name=profile?.full_name||user.email?.split("@")[0]||"Parceiro";
return <main className="dashboard-main"><div className="dashboard-content">
<header className="dashboard-topbar"><div className="dashboard-welcome"><span className="dashboard-kicker">Área de parceiro</span><h1>Bom trabalho, {name}.</h1><p>Acompanhe oportunidades, relações e actividade do seu trabalho no ecossistema MozEmpresas.</p></div><div className="dashboard-actions"><Link href="/parceiro/oportunidades" className="btn primary">Ver oportunidades</Link></div></header>
<section className="dashboard-overview"><div className="dashboard-stat-grid">
<div className="dashboard-stat"><small>Oportunidades disponíveis</small><strong>{opportunities?.length??0}</strong><span>Publicadas na plataforma</span></div>
<div className="dashboard-stat"><small>Relações activas</small><strong>{active}</strong><span>Relações registadas pela conta</span></div>
<div className="dashboard-stat"><small>Pedidos em curso</small><strong>{pending}</strong><span>Serviços em acompanhamento</span></div>
<div className="dashboard-stat"><small>Pedidos concluídos</small><strong>{completed}</strong><span>Serviços concluídos</span></div>
</div></section>
<section className="dashboard-section responsive-priority"><div className="dashboard-section-head"><div><span className="dashboard-kicker">Centro de trabalho</span><h2>O que precisa de fazer hoje?</h2><p>Aceda directamente às actividades disponíveis para a sua função.</p></div></div>
<div className="dashboard-action-grid">
{[["/parceiro/oportunidades","Oportunidades","Encontrar processos relevantes para a sua rede","↗"],["/parceiro/empresas","Empresas","Consultar empresas e relações acompanhadas","□"],["/parceiro/servicos","Serviços","Acompanhar pedidos e respectivos estados","⌘"],["/parceiro/indicacoes","Indicações e recomendações","Consultar actividade de recomendações","◈"]].map(([href,title,text,icon])=><Link href={href} className="dashboard-action-card" key={title}><span className="dashboard-action-icon">{icon}</span><div><strong>{title}</strong><small>{text}</small></div><b>→</b></Link>)}
</div></section>
<div className="dashboard-lower-grid">
<section className="dashboard-section"><div className="dashboard-section-head"><div><span className="dashboard-kicker">Mercado</span><h2>Oportunidades recentes</h2></div><Link href="/parceiro/oportunidades" className="text-link">Ver todas →</Link></div>
{opportunities?.length?<div className="dashboard-list">{opportunities.map(x=><Link href={"/oportunidades/"+x.slug} key={x.id}><strong>{x.title}</strong><span>{x.organization||"Organização não indicada"} · {x.location||"Localização não indicada"} · {dateLabel(x.closes_at)}</span><b>→</b></Link>)}</div>:<div className="empty"><div className="empty-icon">—</div><p>Não há oportunidades publicadas neste momento.</p></div>}</section>
<section className="dashboard-section"><div className="dashboard-section-head"><div><span className="dashboard-kicker">Acesso rápido</span><h2>Outras ferramentas</h2></div></div>
<div className="dashboard-quick-links"><Link href="/parceiro/resultados"><div><strong>Resultados</strong><small>Consultar a leitura factual da actividade</small></div><b>→</b></Link><Link href="/parceiro/conta"><div><strong>A minha conta</strong><small>Consultar identidade e acesso</small></div><b>→</b></Link></div></section>
</div></div></div></main>