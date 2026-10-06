export const dynamic="force-dynamic";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function dateLabel(value:string|null){return value?new Date(value).toLocaleDateString("pt-MZ",{day:"2-digit",month:"short"}):"Sem prazo"}

export default async function PartnerHome(){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return null;
 const [{data:profile},{data:opportunities},{data:requests},{data:relationships}]=await Promise.all([
  supabase.from("profiles").select("full_name").eq("id",user.id).maybeSingle(),
  supabase.from("opportunities").select("id,title,slug,type,organization,location,closes_at").eq("status","PUBLISHED").order("closes_at",{ascending:true,nullsFirst:false}).limit(6),
  supabase.from("service_requests").select("id,status,created_at").eq("requester_user_id",user.id).order("created_at",{ascending:false}).limit(6),
  supabase.from("business_partner_relationships").select("id,status,relationship_type,created_at").eq("created_by",user.id).order("created_at",{ascending:false}).limit(6)
 ]);
 const active=(relationships??[]).filter(x=>x.status==="ACTIVE").length;
 const pending=(requests??[]).filter(x=>["REQUESTED","UNDER_REVIEW","QUOTED"].includes(x.status)).length;
 const completed=(requests??[]).filter(x=>x.status==="COMPLETED").length;
 const name=profile?.full_name||user.email?.split("@")[0]||"Parceiro";
 return <main className="partner-main"><div className="partner-content">
  <header className="partner-home-head">
   <div><span className="partner-kicker">Área de parceiro · Trabalho</span><h1>Bom trabalho, {name}.</h1><p>Um espaço operacional para acompanhar oportunidades, relações e actividade dentro do ecossistema MozEmpresas.</p></div>
   <div className="partner-home-actions"><Link href="/parceiro/oportunidades" className="btn primary">Ver oportunidades</Link></div>
  </header>
  <section className="partner-stats">
   <article><span>Oportunidades disponíveis</span><strong>{opportunities?.length??0}</strong><small>Publicadas e disponíveis para consulta</small></article>
   <article><span>Relações activas</span><strong>{active}</strong><small>Relações registadas pela sua conta</small></article>
   <article><span>Pedidos em curso</span><strong>{pending}</strong><small>Serviços ainda em acompanhamento</small></article>
   <article><span>Pedidos concluídos</span><strong>{completed}</strong><small>Serviços concluídos pela conta</small></article>
  </section>
  <div className="partner-dashboard-grid">
   <section className="partner-panel">
    <div className="partner-panel-head"><div><span className="partner-kicker">Mercado</span><h2>Oportunidades recentes</h2><p>Priorize processos que merecem a sua atenção.</p></div><Link href="/parceiro/oportunidades" className="text-link">Ver todas →</Link></div>
    <div className="partner-list">
     {(opportunities??[]).map(x=><Link href={"/oportunidades/"+x.slug} key={x.id}><div className="partner-list-main"><strong>{x.title}</strong><small>{x.organization||"Organização não indicada"} · {x.location||"Localização não indicada"}</small></div><div className="partner-list-side"><span>{x.type||"Oportunidade"}</span><b>{dateLabel(x.closes_at)}</b></div></Link>)}
     {!opportunities?.length&&<div className="partner-empty"><strong>Não há oportunidades publicadas.</strong><p>Quando houver novos processos, eles aparecerão automaticamente nesta área.</p></div>}
    </div>
   </section>
   <aside className="partner-panel">
    <div className="partner-panel-head"><div><span className="partner-kicker">Acesso rápido</span><h2>Próximas acções</h2></div></div>
    <div className="partner-quick">
     <Link href="/parceiro/empresas"><div><strong>Empresas e relações</strong><small>Consultar a rede que acompanha</small></div><b>→</b></Link>
     <Link href="/parceiro/servicos"><div><strong>Serviços</strong><small>Ver pedidos e respectivos estados</small></div><b>→</b></Link>
     <Link href="/parceiro/indicacoes"><div><strong>Indicações</strong><small>Consultar actividade de recomendações</small></div><b>→</b></Link>
     <Link href="/parceiro/resultados"><div><strong>Resultados</strong><small>Ver leitura factual da actividade</small></div><b>→</b></Link>
    </div>
   </aside>
  </div>
  <section className="partner-section">
   <div className="partner-panel">
    <div className="partner-panel-head"><div><span className="partner-kicker">Actividade</span><h2>Estado actual</h2><p>Resumo dos registos mais recentes da sua conta.</p></div></div>
    <div className="partner-list">
      {(relationships??[]).slice(0,3).map(x=><div key={x.id}><div className="partner-list-main"><strong>Relação {x.relationship_type||"de parceria"}</strong><small>Registada em {new Date(x.created_at).toLocaleDateString("pt-MZ")}</small></div><div className="partner-list-side"><span>Estado</span><b>{x.status||"—"}</b></div></div>)}
      {(requests??[]).slice(0,3).map(x=><div key={"request-"+x.id}><div className="partner-list-main"><strong>Pedido de serviço</strong><small>Registado em {new Date(x.created_at).toLocaleDateString("pt-MZ")}</small></div><div className="partner-list-side"><span>Estado</span><b>{x.status||"—"}</b></div></div>)}
      {!relationships?.length&&!requests?.length&&<div className="partner-empty"><strong>Ainda não há actividade registada.</strong><p>As relações e pedidos associados à conta aparecerão aqui à medida que forem criados.</p></div>}
    </div>
   </div>
  </section>
 </div></main>;
}
