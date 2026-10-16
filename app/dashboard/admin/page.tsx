export const dynamic = "force-dynamic";

import { updatePlatformServiceRequest } from "@/lib/services/actions";
import { moderateBusiness, moderateListing } from "@/lib/admin/actions";
import { getSuperAdminContext } from "@/lib/auth/super-admin";
import { redirect } from "next/navigation";

const statuses = [
  ["REQUESTED", "Recebido"],
  ["UNDER_REVIEW", "Em análise"],
  ["QUOTED", "Orçamentado"],
  ["ACCEPTED", "Aceite"],
  ["IN_PROGRESS", "Em execução"],
  ["COMPLETED", "Concluído"],
] as const;

type SearchParams = Promise<{ result?: string; action?: string }>;

export default async function AdminPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = await searchParams;
  const result = params?.result === "success" || params?.result === "error" ? params.result : "";
  const action = ["business", "listing", "service"].includes(params?.action ?? "") ? params?.action ?? "" : "";
  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) return null;

  const [
    { count: businesses },
    { count: users },
    { count: listings },
    { count: opportunities },
    { data: requests },
    { count: newRequests },
    { count: reviewRequests },
    { count: privateBusinesses },
    { count: draftListings },
  ] = await Promise.all([
    supabase.from("businesses").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("listings").select("id", { count: "exact", head: true }),
    supabase.from("opportunities").select("id", { count: "exact", head: true }),
    supabase.from("service_requests").select("id,status,requested_price,currency,notes,created_at,updated_at,requester_user_id,requester_business_id,platform_services(name),businesses:requester_business_id(name)").order("created_at", { ascending: false }).limit(30),
    supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("status", "REQUESTED"),
    supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("status", "UNDER_REVIEW"),
    supabase.from("businesses").select("id", { count: "exact", head: true }).eq("is_public", false).is("archived_at", null),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "DRAFT"),
  ]);

  const statusLabel = new Map(statuses);
  const [{ data: adminBusinesses }, { data: adminListings }] = await Promise.all([
    supabase.from("businesses").select("id,name,is_public,location,created_at").order("created_at", { ascending: false }).limit(20),
    supabase.from("listings").select("id,title,type,status,business_id,created_at,businesses:business_id(name)").order("created_at", { ascending: false }).limit(20),
  ]);

  return <main className="dashboard-main admin-workspace"><div className="dashboard-content">
    <div className="dashboard-topbar">
      <span className="eyebrow">Administração MozEmpresas</span>
      <h1>Painel da plataforma</h1>
      <p className="muted">Gestão central da plataforma, com prioridades operacionais e acesso rápido às tarefas.</p>
    </div>
    {result ? <div className="notice" role={result === "error" ? "alert" : "status"} style={{ marginTop: 16 }}>
      {result === "success"
        ? action === "business" ? "Visibilidade da empresa actualizada." : action === "listing" ? "Estado da oferta actualizado." : "Pedido de serviço actualizado."
        : action === "business" ? "Não foi possível actualizar a empresa. Verifique os dados e as permissões." : action === "listing" ? "Não foi possível actualizar a oferta. Verifique os dados e as permissões." : "Não foi possível actualizar o pedido. Verifique os dados e as permissões."}
    </div> : null}

    <section className="admin-control-center" aria-label="Resumo operacional">
      <div className="admin-control-heading">
        <div><span className="dashboard-kicker">Centro de controlo</span><h2>O que precisa de atenção</h2><p>Indicadores operacionais para orientar a próxima acção.</p></div>
        <a className="btn" href="/dashboard/admin/suporte">Abrir suporte <span aria-hidden="true">↗</span></a>
      </div>
      <div className="admin-control-stats">
        <a className="admin-control-stat admin-control-stat-priority" href="#pedidos-servico">
          <span className="admin-control-stat-label">Pedidos por tratar</span><strong>{(newRequests ?? 0) + (reviewRequests ?? 0)}</strong><span>{newRequests ?? 0} recebidos · {reviewRequests ?? 0} em análise</span><b>Rever pedidos <span aria-hidden="true">→</span></b>
        </a>
        <a className="admin-control-stat" href="/dashboard/admin/empresas">
          <span className="admin-control-stat-label">Empresas privadas</span><strong>{privateBusinesses ?? 0}</strong><span>Registos não arquivados sem publicação pública</span><b>Consultar empresas <span aria-hidden="true">→</span></b>
        </a>
        <a className="admin-control-stat" href="#ofertas">
          <span className="admin-control-stat-label">Ofertas em rascunho</span><strong>{draftListings ?? 0}</strong><span>Produtos e serviços ainda em DRAFT</span><b>Rever ofertas <span aria-hidden="true">→</span></b>
        </a>
        <a className="admin-control-stat" href="/dashboard/admin/usuarios">
          <span className="admin-control-stat-label">Utilizadores</span><strong>{users ?? 0}</strong><span>Contas registadas na plataforma</span><b>Localizar conta <span aria-hidden="true">→</span></b>
        </a>
      </div>
      <div className="admin-control-secondary">
        <span><strong>{businesses ?? 0}</strong> empresas registadas</span>
        <span><strong>{listings ?? 0}</strong> ofertas no total</span>
        <span><strong>{opportunities ?? 0}</strong> oportunidades registadas</span>
      </div>
    </section>

    <section className="dashboard-section admin-quick-actions">
      <div className="dashboard-section-head"><div><span className="dashboard-kicker">Atalhos operacionais</span><h2>Ir directamente para</h2><p>Aceda às áreas mais utilizadas sem percorrer o painel.</p></div></div>
      <div className="dashboard-action-grid">
        <a className="dashboard-action-card" href="#pedidos-servico"><span className="dashboard-action-icon">01</span><span><strong>Pedidos de serviços</strong><small>Actualizar estado, valor e nota operacional.</small></span></a>
        <a className="dashboard-action-card" href="/dashboard/admin/empresas"><span className="dashboard-action-icon">02</span><span><strong>Directório de empresas</strong><small>Pesquisar registos e gerir visibilidade.</small></span></a>
        <a className="dashboard-action-card" href="/dashboard/admin/oportunidades"><span className="dashboard-action-icon">03</span><span><strong>Oportunidades</strong><small>Consultar publicações e prazos.</small></span></a>
        <a className="dashboard-action-card" href="/dashboard/admin/suporte"><span className="dashboard-action-icon">04</span><span><strong>Central de suporte</strong><small>Filtrar atendimentos e responder a tickets.</small></span></a>
      </div>
    </section>

    <section className="dashboard-section" id="pedidos-servico" style={{marginTop:18}}>
      <div className="dashboard-section-head">
        <div><span className="dashboard-kicker">Operação prioritária</span><h2>Pedidos de serviços MozEmpresas</h2><p>Acompanhe os pedidos recebidos e actualize o estado operacional.</p></div>
        <span className="directory-results-summary"><strong>{requests?.length ?? 0}</strong><span>pedidos recentes</span></span>
      </div>

      <div className="admin-request-list">
        {requests?.length ? requests.map((request) => {
          const service = Array.isArray(request.platform_services) ? request.platform_services[0] : request.platform_services;
          const business = Array.isArray(request.businesses) ? request.businesses[0] : request.businesses;
          return <article className="admin-request-card" key={request.id}>
            <div className="admin-request-head">
              <div><span className="dashboard-kicker">{service?.name || "Serviço MozEmpresas"}</span><h3>{business?.name || "Pedido individual"}</h3><small>{new Date(request.created_at).toLocaleString("pt-MZ")}</small></div>
              <span className="tag">{statusLabel.get(request.status as typeof statuses[number][0]) || request.status}</span>
            </div>
            <p>{request.notes || "Sem observações adicionais."}</p>
            <form action={async (formData) => { "use server"; const outcome = await updatePlatformServiceRequest(formData); redirect(`/dashboard/admin?result=${"error" in outcome ? "error" : "success"}&action=service`); }} className="admin-request-form">
              <input type="hidden" name="requestId" value={request.id} />
              <label><span>Estado</span><select name="status" defaultValue={request.status}>{statuses.map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label>
              <label><span>Valor proposto</span><input name="requestedPrice" type="number" min="0" step="0.01" defaultValue={request.requested_price ?? ""} placeholder="Sob consulta" /></label>
              <label className="wide"><span>Nota operacional</span><textarea name="notes" rows={2} defaultValue={request.notes ?? ""} /></label>
              <button className="btn primary" type="submit">Actualizar pedido</button>
            </form>
          </article>;
        }) : <div className="admin-request-empty"><strong>Nenhum pedido de serviço recebido.</strong><span>Quando uma empresa solicitar um add-on, o pedido aparecerá aqui.</span></div>}
      </div>
    </section>

    <section className="dashboard-section" style={{marginTop:18}}>
      <div className="dashboard-section-head"><div><span className="dashboard-kicker">Moderação</span><h2>Empresas recentes</h2><p>Controlo de publicação da presença empresarial.</p></div></div>
      <div className="admin-request-list">
        {adminBusinesses?.length ? adminBusinesses.map((business) => <article className="admin-request-card" key={business.id}>
          <div className="admin-request-head"><div><span className="dashboard-kicker">{business.location || "Localização não indicada"}</span><h3>{business.name}</h3><small>{new Date(business.created_at).toLocaleString("pt-MZ")}</small></div><span className="tag">{business.is_public ? "Pública" : "Privada"}</span></div>
          <form action={async (formData) => { "use server"; const outcome = await moderateBusiness(formData); redirect(`/dashboard/admin?result=${"error" in outcome ? "error" : "success"}&action=business`); }} className="admin-request-form">
            <input type="hidden" name="businessId" value={business.id} />
            <label><span>Visibilidade</span><select name="isPublic" defaultValue={business.is_public ? "true" : "false"}><option value="true">Publicada</option><option value="false">Privada</option></select></label>
            <button className="btn primary" type="submit">Actualizar</button>
          </form>
        </article>) : <div className="admin-request-empty"><strong>Nenhuma empresa encontrada.</strong></div>}
      </div>
    </section>

    <section className="dashboard-section" id="ofertas" style={{marginTop:18}}>
      <div className="dashboard-section-head"><div><span className="dashboard-kicker">Moderação</span><h2>Ofertas recentes</h2><p>Controlo do estado de produtos e serviços publicados.</p></div></div>
      <div className="admin-request-list">
        {adminListings?.length ? adminListings.map((listing) => {
          const business = Array.isArray(listing.businesses) ? listing.businesses[0] : listing.businesses;
          return <article className="admin-request-card" key={listing.id}>
            <div className="admin-request-head"><div><span className="dashboard-kicker">{listing.type === "PRODUCT" ? "Produto" : "Serviço"} · {business?.name || "Sem empresa"}</span><h3>{listing.title}</h3><small>{new Date(listing.created_at).toLocaleString("pt-MZ")}</small></div><span className="tag">{listing.status}</span></div>
            <form action={async (formData) => { "use server"; const outcome = await moderateListing(formData); redirect(`/dashboard/admin?result=${"error" in outcome ? "error" : "success"}&action=listing`); }} className="admin-request-form">
              <input type="hidden" name="listingId" value={listing.id} />
              <label><span>Estado</span><select name="status" defaultValue={listing.status}>{["DRAFT","PUBLISHED","PAUSED","SOLD_OUT","ARCHIVED"].map((value)=><option value={value} key={value}>{value}</option>)}</select></label>
              <button className="btn primary" type="submit">Actualizar</button>
            </form>
          </article>;
        }) : <div className="admin-request-empty"><strong>Nenhuma oferta encontrada.</strong></div>}
      </div>
    </section>

    <section className="card" style={{marginTop:18}}>
      <span className="eyebrow">Administração</span><h2 style={{marginTop:10}}>Áreas da plataforma</h2>
      <div className="grid" style={{marginTop:18}}>
        <a className="card" href="/dashboard/admin/usuarios"><strong>Utilizadores e acessos</strong><p style={{marginTop:6}}>Consultar perfis registados e localizar contas.</p></a>
        <a className="card" href="/dashboard/admin/empresas"><strong>Empresas</strong><p style={{marginTop:6}}>Pesquisar empresas, consultar contactos e gerir visibilidade.</p></a>
        <a className="card" href="/dashboard/admin/oportunidades"><strong>Oportunidades</strong><p style={{marginTop:6}}>Consultar publicações, tipos, estados e prazos de candidatura.</p></a>
        <a className="card" href="/dashboard/admin/publicidade"><strong>Publicidade e campanhas</strong><p style={{marginTop:6}}>Consultar campanhas empresariais e de parceiros, estados e indicadores de entrega.</p></a>
        <a className="card" href="/admin/parceiros"><strong>Acessos de parceiros</strong><p style={{marginTop:6}}>Criar acessos dedicados para organizações parceiras.</p></a>
        <a className="card" href="/dashboard/admin/suporte"><strong>Central de suporte</strong><p style={{marginTop:6}}>Filtrar atendimentos e responder a tickets.</p></a>
        <a className="card" href="/dashboard/admin/monetizacao"><strong>Monetização</strong><p style={{marginTop:6}}>Consultar planos, assinaturas e inventário publicitário.</p></a>
      </div>
    </section>
  </div></main>;
}
