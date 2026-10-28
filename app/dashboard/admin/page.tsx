export const dynamic = "force-dynamic";

import { updatePlatformServiceRequest } from "@/lib/services/actions";
import AdminAnalytics from "./admin-analytics";
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

type SearchParams = Promise<{ result?: string; action?: string; alerta?: string }>;

export default async function AdminPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = await searchParams;
  const result = params?.result === "success" || params?.result === "error" ? params.result : "";
  const action = ["business", "listing", "service"].includes(params?.action ?? "") ? params?.action ?? "" : "";
  const staleOnly = params?.alerta === "sem-actualizacao";
  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) return null;

  const now = new Date();
  const nowIso = now.toISOString();
  const staleCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  let serviceRequestsQuery = supabase.from("service_requests").select("id,status,requested_price,currency,notes,created_at,updated_at,requester_user_id,requester_business_id,platform_services(name),businesses:requester_business_id(name)").order("created_at", { ascending: false }).limit(30);
  if (staleOnly) serviceRequestsQuery = serviceRequestsQuery.in("status", ["REQUESTED", "UNDER_REVIEW", "QUOTED", "ACCEPTED", "IN_PROGRESS"]).lt("updated_at", staleCutoff);
  const [
    { count: businesses },
    { count: users },
    { count: listings },
    { count: opportunities },
    { data: requests },
    { count: newRequests },
    { count: reviewRequests },
    { count: acceptedRequests },
    { count: inProgressRequests },
    { count: expiredOpportunities },
    { count: pendingBusinessCampaigns },
    { count: pendingPartnerCampaigns },
    { count: expiredBusinessCampaigns },
    { count: expiredPartnerCampaigns },
    { count: staleServiceRequests },
  ] = await Promise.all([
    supabase.from("businesses").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("listings").select("id", { count: "exact", head: true }),
    supabase.from("opportunities").select("id", { count: "exact", head: true }),
    serviceRequestsQuery,
    supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("status", "REQUESTED"),
    supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("status", "UNDER_REVIEW"),
    supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("status", "ACCEPTED"),
    supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("status", "IN_PROGRESS"),
    supabase.from("opportunities").select("id", { count: "exact", head: true }).eq("status", "PUBLISHED").lt("closes_at", nowIso),
    supabase.from("business_promotions").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
    supabase.from("partner_ad_campaigns").select("id", { count: "exact", head: true }).eq("status", "REQUESTED"),
    supabase.from("business_promotions").select("id", { count: "exact", head: true }).eq("status", "ACTIVE").lt("ends_at", nowIso),
    supabase.from("partner_ad_campaigns").select("id", { count: "exact", head: true }).eq("status", "ACTIVE").lt("ends_at", nowIso),
    supabase.from("service_requests").select("id", { count: "exact", head: true }).in("status", ["REQUESTED", "UNDER_REVIEW", "QUOTED", "ACCEPTED", "IN_PROGRESS"]).lt("updated_at", staleCutoff),
  ]);

  const statusLabel = new Map(statuses);
  const requestPriority = new Map(statuses.map(([value], index) => [value, index]));
  const prioritizedRequests = [...(requests ?? [])].sort((a, b) =>
    (requestPriority.get(a.status as typeof statuses[number][0]) ?? 99) -
    (requestPriority.get(b.status as typeof statuses[number][0]) ?? 99) ||
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return <main className="dashboard-main admin-workspace"><div className="dashboard-content">
    <AdminAnalytics />
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
          <span className="admin-control-stat-label">Pedidos aceites</span><strong>{acceptedRequests ?? 0}</strong><span>Pedidos aceites e ainda não concluídos</span><b>Acompanhar pedidos <span aria-hidden="true">→</span></b>
        </a>
        <a className="admin-control-stat" href="#ofertas">
          <span className="admin-control-stat-label">Oportunidades expiradas</span><strong>{expiredOpportunities ?? 0}</strong><span>Publicações com prazo de encerramento ultrapassado</span><b>Rever prazos <span aria-hidden="true">→</span></b>
        </a>
        <a className="admin-control-stat" href="#pedidos-servico">
          <span className="admin-control-stat-label">Pedidos em execução</span><strong>{inProgressRequests ?? 0}</strong><span>Pedidos com trabalho operacional iniciado</span><b>Acompanhar pedidos <span aria-hidden="true">→</span></b>
        </a>
      </div>

    </section>

    <section className="dashboard-section admin-alert-center" aria-label="Alertas operacionais">
      <div className="dashboard-section-head"><div><span className="dashboard-kicker">Atenção preventiva</span><h2>Alertas que exigem acompanhamento</h2><p>Os alertas são calculados a partir dos prazos e estados registados. Pedidos sem actualização há mais de 7 dias são destacados para revisão.</p></div></div>
      <div className="admin-alert-grid">
        <a className="admin-alert-card admin-alert-critical" href="/dashboard/admin/oportunidades?prazo=expirado">
          <span className="admin-alert-topline"><span>Oportunidades expiradas</span><span className="admin-alert-mark">Prazo</span></span>
          <strong>{expiredOpportunities ?? 0}</strong><span>Publicadas com data de encerramento anterior a hoje.</span><b>Ver oportunidades <span aria-hidden="true">→</span></b>
        </a>
        <a className="admin-alert-card" href="/dashboard/admin/publicidade?alerta=pendentes">
          <span className="admin-alert-topline"><span>Campanhas por analisar</span><span className="admin-alert-mark">Decisão</span></span>
          <strong>{(pendingBusinessCampaigns ?? 0) + (pendingPartnerCampaigns ?? 0)}</strong><span>{pendingBusinessCampaigns ?? 0} empresariais pendentes · {pendingPartnerCampaigns ?? 0} de parceiros solicitadas.</span><b>Rever campanhas <span aria-hidden="true">→</span></b>
        </a>
        <a className="admin-alert-card admin-alert-critical" href="/dashboard/admin/publicidade?alerta=expiradas">
          <span className="admin-alert-topline"><span>Campanhas activas fora do prazo</span><span className="admin-alert-mark">Prazo</span></span>
          <strong>{(expiredBusinessCampaigns ?? 0) + (expiredPartnerCampaigns ?? 0)}</strong><span>Campanhas ainda marcadas como activas, mas com data final ultrapassada.</span><b>Ver campanhas <span aria-hidden="true">→</span></b>
        </a>
        <a className="admin-alert-card" href="/dashboard/admin?alerta=sem-actualizacao#pedidos-servico">
          <span className="admin-alert-topline"><span>Pedidos sem actualização</span><span className="admin-alert-mark">7+ dias</span></span>
          <strong>{staleServiceRequests ?? 0}</strong><span>Pedidos não concluídos nem cancelados, sem actualização há mais de 7 dias.</span><b>Rever pedidos <span aria-hidden="true">→</span></b>
        </a>
      </div>
    </section>

    {result ? <div className="notice" role={result === "error" ? "alert" : "status"} style={{ marginBottom: 16 }}>
      {result === "success"
        ? action === "business" ? "Visibilidade da empresa actualizada." : action === "listing" ? "Estado da oferta actualizado." : "Pedido de serviço actualizado."
        : action === "business" ? "Não foi possível actualizar a empresa. Verifique os dados e as permissões." : action === "listing" ? "Não foi possível actualizar a oferta. Verifique os dados e as permissões." : "Não foi possível actualizar o pedido. Verifique os dados e as permissões."}
    </div> : null}

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
      {staleOnly ? <p className="notice" style={{marginBottom:14}}>Filtro activo: pedidos não concluídos nem cancelados, sem actualização há mais de 7 dias. <a href="/dashboard/admin#pedidos-servico">Ver todos os pedidos</a></p> : null}
      <div className="dashboard-section-head">
        <div><span className="dashboard-kicker">Operação prioritária</span><h2>Pedidos de serviços MozEmpresas</h2><p>Acompanhe os pedidos recebidos e actualize o estado operacional.</p></div>
        <span className="directory-results-summary"><strong>{requests?.length ?? 0}</strong><span>pedidos recentes</span></span>
      </div>

      <div className="admin-request-list">
        {prioritizedRequests.length ? prioritizedRequests.map((request) => {
          const service = Array.isArray(request.platform_services) ? request.platform_services[0] : request.platform_services;
          const business = Array.isArray(request.businesses) ? request.businesses[0] : request.businesses;
          return <article className="admin-request-card" key={request.id}>
            <div className="admin-request-head">
              <div><span className="dashboard-kicker">{service?.name || "Serviço MozEmpresas"}</span><h3>{business?.name || "Pedido individual"}</h3><small>{new Date(request.created_at).toLocaleString("pt-MZ")}</small></div>
              <span className="tag">{statusLabel.get(request.status as typeof statuses[number][0]) || request.status}</span>
            </div>
            <div className="admin-request-meta" style={{display:"flex",flexWrap:"wrap",gap:"8px 16px",marginTop:10}}>
              <span>Valor proposto: <strong>{request.requested_price != null ? `${request.currency || "MZN"} ${Number(request.requested_price).toLocaleString("pt-MZ")}` : "Por definir"}</strong></span>
              <span>Última actualização: {new Date(request.updated_at || request.created_at).toLocaleDateString("pt-MZ")}</span>
            </div>
            <p>{request.notes || "Sem observações adicionais."}</p>
            <form action={async (formData) => { "use server"; const outcome = await updatePlatformServiceRequest(formData); redirect(`/dashboard/admin?result=${"error" in outcome ? "error" : "success"}&action=service`); }} className="admin-request-form">
              <input type="hidden" name="requestId" value={request.id} />
              <label><span>Estado</span><select name="status" defaultValue={request.status}>{statuses.map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label>
              <label><span>Valor proposto</span><input name="requestedPrice" type="number" min="0" step="0.01" defaultValue={request.requested_price ?? ""} placeholder="Sob consulta" /></label>
              <p className="muted wide">A descrição enviada pelo solicitante é preservada durante as actualizações de estado e orçamento.</p>
              <button className="btn primary" type="submit">Actualizar pedido</button>
            </form>
          </article>;
        }) : <div className="admin-request-empty"><strong>Nenhum pedido de serviço recebido.</strong><span>Quando uma empresa solicitar um add-on, o pedido aparecerá aqui.</span></div>}
      </div>
    </section>

    <section className="dashboard-section admin-inventory-hub">
      <div className="dashboard-section-head"><div><span className="dashboard-kicker">Gestão sem limites de amostra</span><h2>Gerir o ecossistema completo</h2><p>Aceda aos módulos completos para pesquisar e gerir registos, sem depender de uma lista dos mais recentes.</p></div></div>
      <div className="dashboard-action-grid">
        <a className="dashboard-action-card" href="/dashboard/admin/empresas"><span className="dashboard-action-icon">EM</span><span><strong>Directório empresarial</strong><small>Consultar e gerir empresas registadas no directório completo.</small></span></a>
        <a className="dashboard-action-card" href="/dashboard/admin/ofertas"><span className="dashboard-action-icon">OF</span><span><strong>Gestão de ofertas</strong><small>Pesquisar ofertas e actualizar o estado de publicação.</small></span></a>
        <a className="dashboard-action-card" href="/dashboard/admin/oportunidades"><span className="dashboard-action-icon">OP</span><span><strong>Oportunidades</strong><small>Gerir publicações e acompanhar prazos.</small></span></a>
        <a className="dashboard-action-card" href="/dashboard/admin/monetizacao"><span className="dashboard-action-icon">MO</span><span><strong>Monetização</strong><small>Consultar planos, assinaturas e inventário publicitário.</small></span></a>
      </div>
    </section>

    <section className="dashboard-section admin-advanced-areas">
      <div className="dashboard-section-head"><div><span className="dashboard-kicker">Gestão especializada</span><h2>Outras áreas de controlo</h2><p>Ferramentas administrativas que não precisam de ocupar o primeiro nível de atenção.</p></div></div>
      <div className="dashboard-action-grid">
        <a className="dashboard-action-card" href="/dashboard/admin/usuarios"><span className="dashboard-action-icon">05</span><span><strong>Utilizadores e acessos</strong><small>Consultar perfis e localizar contas.</small></span></a>
        <a className="dashboard-action-card" href="/dashboard/admin/publicidade"><span className="dashboard-action-icon">06</span><span><strong>Publicidade e campanhas</strong><small>Ver campanhas e indicadores de entrega.</small></span></a>
        <a className="dashboard-action-card" href="/admin/parceiros"><span className="dashboard-action-icon">07</span><span><strong>Acessos de parceiros</strong><small>Gerir acessos de organizações parceiras.</small></span></a>
        <a className="dashboard-action-card" href="/dashboard/admin/monetizacao"><span className="dashboard-action-icon">08</span><span><strong>Monetização</strong><small>Consultar planos, assinaturas e inventário publicitário.</small></span></a>
      </div>
    </section>
  </div></main>;
}
