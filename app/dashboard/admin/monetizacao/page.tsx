export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";

export default async function AdminMonetizationPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: member } = await supabase.from("platform_members").select("active").eq("user_id", user.id).maybeSingle();
  if (!member?.active) return null;

  const [{ data: plans }, { data: promotions }, { count: subscriptions }, { data: businessAdProducts }, { data: partnerAdProducts }, { count: impressions }, { count: clicks }] = await Promise.all([
    supabase.from("platform_plans").select("id,code,name,description,monthly_price,currency,active").order("monthly_price"),
    supabase.from("business_promotions").select("id,title,placement,status,budget,currency,starts_at,ends_at,businesses:business_id(name)").order("created_at",{ascending:false}).limit(30),
    supabase.from("business_plan_subscriptions").select("id",{count:"exact",head:true}).eq("status","ACTIVE"),
    supabase.from("ad_products").select("id,code,name,placement,slot,description,duration_days,direct_price_mzn,credit_price,capacity,active").order("placement").order("name"),
    supabase.from("partner_ad_products").select("id,code,name,placement,surface,slot,description,duration_days,price_mzn,capacity,active").order("surface").order("placement"),
    supabase.from("ad_delivery_events").select("id",{count:"exact",head:true}).eq("event_type","IMPRESSION"),
    supabase.from("ad_delivery_events").select("id",{count:"exact",head:true}).eq("event_type","CLICK"),
  ]);

  return <main className="dashboard-main"><div className="dashboard-content">
    <div className="page-header">
      <span className="eyebrow">Monetização</span>
      <h1>Planos, promoção e publicidade</h1>
      <p className="muted">Fundação operacional para gerir planos empresariais e espaços promocionais.</p>
    </div>
    <div className="grid">
      <div className="card"><span className="muted">Planos activos</span><h2>{plans?.filter(p=>p.active).length ?? 0}</h2><p>Estruturas comerciais disponíveis.</p></div>
      <div className="card"><span className="muted">Assinaturas activas</span><h2>{subscriptions ?? 0}</h2><p>Empresas com plano activo.</p></div>
      <div className="card"><span className="muted">Promoções recentes</span><h2>{promotions?.length ?? 0}</h2><p>Campanhas empresariais.</p></div>
      <div className="card"><span className="muted">Impressões registadas</span><h2>{(impressions ?? 0).toLocaleString("pt-MZ")}</h2><p>Eventos de exibição publicitária.</p></div>
      <div className="card"><span className="muted">Cliques registados</span><h2>{(clicks ?? 0).toLocaleString("pt-MZ")}</h2><p>Interacções publicitárias.</p></div>
    </div>
    <section className="dashboard-section" style={{marginTop:18}}>
      <div className="dashboard-section-head"><div><span className="dashboard-kicker">Planos</span><h2>Estrutura comercial</h2><p>Os preços podem ser configurados antes da activação comercial.</p></div></div>
      <div className="grid" style={{marginTop:18}}>
        {plans?.map(plan=><article className="card" key={plan.id}><span className="dashboard-kicker">{plan.code}</span><h3 style={{marginTop:8}}>{plan.name}</h3><p>{plan.description || "Sem descrição."}</p><strong>{Number(plan.monthly_price).toLocaleString("pt-MZ",{minimumFractionDigits:2})} {plan.currency}/mês</strong></article>)}
      </div>
    </section>
    <section className="dashboard-section" style={{marginTop:18}}>
      <div className="dashboard-section-head"><div><span className="dashboard-kicker">Inventário de monetização</span><h2>Catálogo de espaços publicitários</h2><p>Definições carregadas directamente das tabelas de produtos. Os módulos de utilizador e parceiro recebem os respectivos catálogos, sem duplicar os espaços entre experiências.</p></div></div>
      <div className="grid">
        <article className="card"><span className="dashboard-kicker">Experiência empresarial</span><h3>{businessAdProducts?.length ?? 0} formato(s)</h3><p className="muted">Espaços usados na publicidade da área empresarial, com preço directo/créditos e segmentação.</p></article>
        <article className="card"><span className="dashboard-kicker">Experiência parceira</span><h3>{partnerAdProducts?.length ?? 0} formato(s)</h3><p className="muted">Espaços contratados no Partner Workspace, com superfície, slot, duração e capacidade próprios.</p></article>
      </div>
      <div className="admin-request-list" style={{marginTop:16}}>
        {[...(businessAdProducts??[]).map(x=>({...x,experience:"Empresarial",surface:"—",priceLabel:x.direct_price_mzn!=null?Number(x.direct_price_mzn).toLocaleString("pt-MZ")+" MZN":(x.credit_price??"—")+" créditos"})),...(partnerAdProducts??[]).map(x=>({...x,experience:"Parceiro",priceLabel:x.price_mzn!=null?Number(x.price_mzn).toLocaleString("pt-MZ")+" MZN":"Proposta personalizada"}))].map(x=><article className="admin-request-card" key={x.experience+"-"+x.id}><div className="admin-request-head"><div><span className="dashboard-kicker">{x.experience} · {x.surface||"Espaço empresarial"} · {x.slot||"Slot não definido"}</span><h3>{x.name}</h3><small>{x.code} · {x.placement} · {x.duration_days?x.duration_days+" dias":"Duração personalizada"} · capacidade {x.capacity??"—"}</small></div><span className="tag">{x.active?"Activo":"Inactivo"}</span></div><p>{x.description||"Sem descrição."}</p><strong>{x.priceLabel}</strong></article>)}
      </div>
    </section>

    <section className="dashboard-section" style={{marginTop:18}}>
      <div className="dashboard-section-head"><div><span className="dashboard-kicker">Publicidade</span><h2>Promoções recentes</h2><p>Registos de promoção por empresa, oferta e placement.</p></div></div>
      <div className="admin-request-list">
        {promotions?.length ? promotions.map(p=>{const b=Array.isArray(p.businesses)?p.businesses[0]:p.businesses;return <article className="admin-request-card" key={p.id}><div className="admin-request-head"><div><span className="dashboard-kicker">{p.placement}</span><h3>{p.title}</h3><small>{b?.name || "Empresa"}</small></div><span className="tag">{p.status}</span></div><p>{p.budget != null ? Number(p.budget).toLocaleString("pt-MZ")+" "+p.currency : "Sem orçamento definido."}</p></article>}) : <div className="admin-request-empty"><strong>Nenhuma promoção registada.</strong></div>}
      </div>
    </section>
  </div></main>;
}
