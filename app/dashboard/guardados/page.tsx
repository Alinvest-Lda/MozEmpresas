export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RemoveSavedItem } from "@/components/save-to-mozempresas";

export default async function SavedItemsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/guardados");

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const [{ data: favorites }, { data: searches }, { data: notifications }, { data: events }] = await Promise.all([
    supabase.from("user_favorites").select("id,entity_type,title,href,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
    supabase.from("user_saved_searches").select("id,title,entity_type,filters,alert_enabled,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
    supabase.from("notifications").select("id,title,body,resource_type,resource_id,read_at,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    supabase.from("platform_conversion_events").select("id,event_type,entity_type,source,created_at").eq("user_id", user.id).gte("created_at", since).order("created_at", { ascending: false }).limit(500),
  ]);

  const searchHref = (entityType: string, filters: Record<string,string>) => {
    const query = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key,value]) => { if (value && value !== "all") query.set(key,value); });
    const base = entityType === "businesses" ? "/empresas" : entityType === "marketplace" ? "/marketplace" : "/oportunidades";
    const qs = query.toString();
    return base + (qs ? "?" + qs : "");
  };
  const dateLabel = (value: string) => new Intl.DateTimeFormat("pt-MZ",{day:"2-digit",month:"short",year:"numeric"}).format(new Date(value));

  return <main className="dashboard-main workspace-dashboard">
    <div className="dashboard-content">
      <header className="workspace-hero">
        <div className="workspace-hero-copy">
          <span className="dashboard-kicker">A sua área · Preferências</span>
          <h1>Guardados e alertas</h1>
          <p>Regresse a empresas, ofertas e oportunidades importantes. As pesquisas guardadas geram notificações quando uma nova publicação corresponde aos filtros básicos.</p>
        </div>
        <div className="workspace-hero-context">
          <span>Resumo</span><strong>{(favorites??[]).length + (searches??[]).length} itens guardados</strong>
          <small>{(notifications??[]).filter(n=>!n.read_at).length} notificações por ler</small>
          <Link href="/dashboard/notificacoes" className="text-link">Ver todas as notificações →</Link>
        </div>
      </header>

      <section className="workspace-metrics" aria-label="Actividade dos últimos 30 dias">
        <article className="workspace-metric workspace-metric-featured"><span>Eventos registados</span><strong>{(events??[]).length}</strong><small>Últimos 30 dias</small></article>
        <article className="workspace-metric"><span>Contactos iniciados</span><strong>{(events??[]).filter(e=>e.event_type==="CONTACT_CLICK").length}</strong><small>Telefone, email ou website</small></article>
        <article className="workspace-metric"><span>Partilhas</span><strong>{(events??[]).filter(e=>e.event_type==="WHATSAPP_SHARE").length}</strong><small>Partilhas via WhatsApp</small></article>
        <article className="workspace-metric"><span>Itens guardados</span><strong>{(events??[]).filter(e=>e.event_type==="FAVORITE_SAVED"||e.event_type==="SEARCH_SAVED").length}</strong><small>Favoritos e pesquisas</small></article>
      </section>

      <section className="workspace-secondary-grid">
        <article className="workspace-panel">
          <div className="workspace-panel-head"><div><span className="dashboard-kicker">Favoritos</span><h2>Itens guardados</h2><p>Empresas e publicações que quer consultar novamente.</p></div></div>
          {(favorites??[]).length ? <div className="workspace-entity-list">{(favorites??[]).map(item=><div key={item.id} className="saved-item-row"><Link href={item.href}><span>{item.entity_type==="business"?"EMPRESA":item.entity_type==="listing"?"PRODUTO OU SERVIÇO":"OPORTUNIDADE"}</span><strong>{item.title}</strong><small>Guardado {dateLabel(item.created_at)}</small></Link><RemoveSavedItem kind="favorite" id={item.id}/></div>)}</div> : <div className="workspace-empty"><strong>Ainda não guardou itens.</strong><p>Abra um perfil empresarial ou uma oportunidade e seleccione “Guardar nos favoritos”.</p><Link href="/empresas" className="btn primary">Explorar empresas</Link></div>}
        </article>
        <article className="workspace-panel">
          <div className="workspace-panel-head"><div><span className="dashboard-kicker">Pesquisas guardadas</span><h2>As suas pesquisas</h2><p>Os alertas estão activos por defeito para novas correspondências.</p></div></div>
          {(searches??[]).length ? <div className="workspace-entity-list">{(searches??[]).map(item=><div key={item.id} className="saved-item-row"><Link href={searchHref(item.entity_type,item.filters as Record<string,string>)}><span>{item.entity_type==="businesses"?"DIRECTÓRIO":item.entity_type==="marketplace"?"MARKETPLACE":"OPORTUNIDADES"} · {item.alert_enabled?"ALERTAS ACTIVOS":"ALERTAS PAUSADOS"}</span><strong>{item.title}</strong><small>Guardada {dateLabel(item.created_at)}</small></Link><RemoveSavedItem kind="search" id={item.id}/></div>)}</div> : <div className="workspace-empty"><strong>Sem pesquisas guardadas.</strong><p>Faça uma pesquisa no directório, Marketplace ou Oportunidades e guarde os filtros.</p><Link href="/empresas" className="btn primary">Pesquisar empresas</Link></div>}
        </article>
      </section>

      <section className="workspace-panel">
        <div className="workspace-panel-head"><div><span className="dashboard-kicker">Actividade registada</span><h2>Interacções dos últimos 30 dias</h2><p>Eventos registados enquanto estava autenticado. Os indicadores não representam vendas nem retorno financeiro.</p></div></div>
        {(events??[]).length ? <div className="workspace-activity-list">{(events??[]).slice(0,8).map(item=><div key={item.id}><span>{item.event_type.replaceAll("_"," ")}</span><strong>{item.entity_type||"Plataforma"}</strong><small>{item.source||"Interacção"} · {dateLabel(item.created_at)}</small></div>)}</div> : <div className="workspace-empty"><strong>Ainda não há eventos associados à conta.</strong><p>Os contactos, partilhas e itens guardados começarão a aparecer à medida que utilizar a plataforma com sessão iniciada.</p></div>}
      </section>

    </div>
    <style>{`
      .saved-item-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px;border-bottom:1px solid #e5ebe8}
      .saved-item-row:last-child{border-bottom:0}
      .saved-item-row>a{min-width:0;flex:1;display:grid;gap:5px}
      .saved-item-row>div{flex:0 0 auto}
      .moz-save-action{margin-top:10px}
      .moz-save-action p{font-size:12px;color:#52615d;margin:7px 0 0}
      @media(max-width:600px){.saved-item-row{align-items:flex-start;flex-direction:column}.saved-item-row>div{align-self:flex-start}}
    `}</style>
  </main>;
}
