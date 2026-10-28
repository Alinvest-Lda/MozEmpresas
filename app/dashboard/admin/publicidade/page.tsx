export const dynamic = "force-dynamic";

import Link from "next/link";
import { moderateBusinessPromotion, moderatePartnerCampaign, updateAdvertisingRequest } from "@/lib/admin/advertising-actions";
import styles from "./publicidade.module.css";

type Campaign = {
  id: string; title: string | null; headline: string | null; status: string | null;
  starts_at: string | null; ends_at: string | null; created_at: string | null;
  surface?: string | null; placement?: string | null; slot?: string | null;
  price_mzn?: number | null; budget?: number | null; currency?: string | null;
  impressions_count?: number | null; clicks_count?: number | null; target_url?: string | null;
  business?: { name?: string | null } | { name?: string | null }[] | null;
};
type AdvertisingRequest = {
  id: string; company_name: string; contact_name: string; email: string; phone: string | null;
  placement: string | null; package_name: string | null; status: string | null;
  starts_at: string | null; ends_at: string | null; created_at: string | null;
};
const promotionStatuses = ["PENDING", "ACTIVE", "PAUSED", "EXPIRED", "CANCELLED"];
const partnerStatuses = ["REQUESTED", "PENDING", "UNDER_REVIEW", "ACTIVE", "RUNNING", "PUBLISHED"];
const requestStatuses = ["NEW", "CONTACTED", "PROPOSAL", "AWAITING_PAYMENT", "PAID", "APPROVED", "REJECTED", "CANCELLED"];
const statusLabels: Record<string, string> = {
  PENDING: "Pendente", REQUESTED: "Solicitada", UNDER_REVIEW: "Em análise", NEW: "Novo pedido",
  ACTIVE: "Activa", RUNNING: "Em execução", PUBLISHED: "Publicada", PAUSED: "Pausada",
  EXPIRED: "Expirada", CANCELLED: "Cancelada", CONTACTED: "Contactado", PROPOSAL: "Proposta enviada",
  AWAITING_PAYMENT: "Aguarda pagamento", PAID: "Pago", APPROVED: "Aprovado", REJECTED: "Rejeitado",
};
function fmtDate(value: string | null) {
  if (!value) return "Não definido";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Não definido" : date.toLocaleDateString("pt-MZ", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtNumber(value: number | null | undefined) { return Number(value ?? 0).toLocaleString("pt-MZ"); }
function ctr(clicks: number | null | undefined, impressions: number | null | undefined) {
  const shown = Number(impressions ?? 0);
  return shown > 0 ? ((Number(clicks ?? 0) / shown) * 100).toLocaleString("pt-MZ", { maximumFractionDigits: 2 }) + "%" : "—";
}
function businessName(campaign: Campaign) {
  const value = campaign.business;
  return Array.isArray(value) ? value[0]?.name || "Empresa não identificada" : value?.name || "Empresa não identificada";
}
function label(status: string | null) { return status ? (statusLabels[status] || status) : "Sem estado"; }

type SearchParams = Promise<{ q?: string; origem?: string; estado?: string; prazo?: string; result?: string }>;
export default async function AdminAdvertisingPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = searchParams ? await searchParams : {};
  const q = (params.q ?? "").trim().slice(0, 100);
  const origin = ["empresarial", "parceiro", "pedido"].includes(params.origem ?? "") ? params.origem ?? "" : "";
  const status = [...new Set([...promotionStatuses, ...partnerStatuses, ...requestStatuses])].includes((params.estado ?? "").toUpperCase()) ? (params.estado ?? "").toUpperCase() : "";
  const deadline = ["expirado", "proximo", "futuro", "sem-prazo"].includes(params.prazo ?? "") ? params.prazo ?? "" : "";
  const result = params.result === "success" || params.result === "error" ? params.result : "";
  const now = new Date();
  const nowIso = now.toISOString();
  const soonIso = new Date(now.getTime() + 7 * 86400000).toISOString();
  const { supabase, authorized } = await (await import("@/lib/auth/super-admin")).getSuperAdminContext();
  if (!authorized) return <main className={`dashboard-main admin-workspace ${styles.page}`}><div className={`dashboard-content ${styles.content}`}><div className="notice">Acesso reservado ao Super Admin.</div></div></main>;

  const [
    { data: businessCampaigns, error: businessError },
    { data: partnerCampaigns, error: partnerError },
    { data: requests, error: requestError },
    { count: impressionEvents }, { count: clickEvents },
  ] = await Promise.all([
    supabase.from("business_promotions").select("id,title,headline,status,starts_at,ends_at,created_at,placement,slot,budget,currency,impressions_count,clicks_count,target_url,business:business_id(name)").order("created_at", { ascending: false }).limit(100),
    supabase.from("partner_ad_campaigns").select("id,title,headline,status,starts_at,ends_at,created_at,surface,slot,price_mzn,impressions_count,clicks_count,target_url").order("created_at", { ascending: false }).limit(100),
    supabase.from("advertising_requests").select("id,company_name,contact_name,email,phone,placement,package_name,status,starts_at,ends_at,created_at").order("created_at", { ascending: false }).limit(100),
    supabase.from("ad_delivery_events").select("id", { count: "exact", head: true }).eq("event_type", "IMPRESSION"),
    supabase.from("ad_delivery_events").select("id", { count: "exact", head: true }).eq("event_type", "CLICK"),
  ]);

  const allBusiness = (businessCampaigns ?? []) as Campaign[];
  const allPartner = (partnerCampaigns ?? []) as Campaign[];
  const allRequests = (requests ?? []) as AdvertisingRequest[];
  const campaigns = [
    ...allBusiness.map((c) => ({ ...c, origin: "Empresarial", originKey: "empresarial", position: c.placement || "Não definido", advertiser: businessName(c), price: c.budget == null ? "Sem orçamento indicado" : fmtNumber(c.budget) + " " + (c.currency || ""), table: "business", allowed: promotionStatuses })),
    ...allPartner.map((c) => ({ ...c, origin: "Parceiro", originKey: "parceiro", position: c.surface || "Não definido", advertiser: "Conta parceira", price: c.price_mzn == null ? "Preço não indicado" : fmtNumber(c.price_mzn) + " MZN", table: "partner", allowed: partnerStatuses })),
  ].sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
  const matchesQuery = (value: string) => !q || value.toLocaleLowerCase("pt").includes(q.toLocaleLowerCase("pt"));
  const filteredCampaigns = campaigns.filter((c) => {
    if (origin && origin !== c.originKey) return false;
    if (status && c.status !== status) return false;
    if (!matchesQuery([c.title, c.headline, c.advertiser, c.origin, c.position].join(" "))) return false;
    const end = c.ends_at ? new Date(c.ends_at).getTime() : NaN;
    if (deadline === "sem-prazo" && c.ends_at) return false;
    if (deadline === "expirado" && !(c.status === "ACTIVE" && Number.isFinite(end) && end < now.getTime())) return false;
    if (deadline === "proximo" && !(Number.isFinite(end) && end >= now.getTime() && end <= now.getTime() + 7 * 86400000)) return false;
    if (deadline === "futuro" && !(Number.isFinite(end) && end > now.getTime() + 7 * 86400000)) return false;
    return true;
  });
  const filteredRequests = allRequests.filter((r) => {
    if (origin && origin !== "pedido") return false;
    if (status && r.status !== status) return false;
    if (!matchesQuery([r.company_name, r.contact_name, r.email, r.package_name, r.placement].join(" "))) return false;
    const end = r.ends_at ? new Date(r.ends_at).getTime() : NaN;
    if (deadline === "sem-prazo" && r.ends_at) return false;
    if (deadline === "expirado" && !(Number.isFinite(end) && end < now.getTime())) return false;
    if (deadline === "proximo" && !(Number.isFinite(end) && end >= now.getTime() && end <= now.getTime() + 7 * 86400000)) return false;
    if (deadline === "futuro" && !(Number.isFinite(end) && end > now.getTime() + 7 * 86400000)) return false;
    return true;
  });
  const totalImpressions = filteredCampaigns.reduce((sum, c) => sum + Number(c.impressions_count ?? 0), 0);
  const totalClicks = filteredCampaigns.reduce((sum, c) => sum + Number(c.clicks_count ?? 0), 0);
  const pendingCount = allBusiness.filter(c => c.status === "PENDING").length + allPartner.filter(c => ["REQUESTED", "PENDING", "UNDER_REVIEW"].includes(c.status ?? "")).length + allRequests.filter(r => ["NEW", "CONTACTED", "PROPOSAL", "AWAITING_PAYMENT"].includes(r.status ?? "")).length;
  const error = businessError || partnerError || requestError;

  return <main className={`dashboard-main admin-workspace ${styles.page}`}><div className={`dashboard-content ${styles.content}`}>
    <header className={styles.hero}>
      <div className={styles.heroCopy}><span className={styles.eyebrow}>Administração global</span><h1>Publicidade e campanhas</h1><p>Revise pedidos, modere campanhas e acompanhe prazos e desempenho num único espaço operacional.</p></div>
      <div className={styles.heroSummary}><span className={styles.summaryLabel}>A aguardar atenção</span><strong>{pendingCount}</strong><span className={styles.summaryCaption}>Pedidos e campanhas por rever</span><div className={styles.summaryRule}/><span className={styles.summaryFoot}>Até 100 registos por origem em cada consulta.</span></div>
      <span className={styles.heroDecoration} aria-hidden="true">↗</span>
    </header>
    {result ? <div className={`${styles.resultNotice} ${result === "error" ? styles.resultError : ""}`} role={result === "error" ? "alert" : "status"}>{result === "success" ? "Estado actualizado com sucesso." : "Não foi possível actualizar o estado. Confirme as permissões e o estado permitido para este registo."}</div> : null}
    <section className={styles.metrics} aria-label="Resumo do módulo">
      <article className={styles.metric}><span>Campanhas empresariais</span><strong>{allBusiness.length}</strong><small>Até 100 registos carregados</small></article>
      <article className={styles.metric}><span>Campanhas de parceiros</span><strong>{allPartner.length}</strong><small>Até 100 registos carregados</small></article>
      <article className={styles.metric}><span>Pedidos de publicidade</span><strong>{allRequests.length}</strong><small>Solicitações comerciais recebidas</small></article>
      <article className={styles.metric}><span>Impressões / cliques</span><strong>{fmtNumber(totalImpressions)} / {fmtNumber(totalClicks)}</strong><small>CTR na selecção filtrada: {ctr(totalClicks, totalImpressions)}</small></article>
    </section>
    <p className={styles.dataNote}>Eventos registados na plataforma: {fmtNumber(impressionEvents)} impressões e {fmtNumber(clickEvents)} cliques. São contagens separadas dos contadores por campanha.</p>
    {error ? <div className={styles.resultNotice + " " + styles.resultError} role="alert">Uma ou mais consultas não foram concluídas. Os registos que não carregaram podem estar ocultos; confirme as permissões e a estrutura da base de dados.</div> : null}
    <section className={styles.section}>
      <div className={styles.sectionHead}><div><span className={styles.sectionKicker}>Gestão operacional</span><h2>Fila de publicidade</h2><p>Pesquise anunciantes, filtre por origem, estado e prazo e actualize os estados permitidos em cada fluxo.</p></div><span className={styles.resultsSummary}><strong>{filteredCampaigns.length + filteredRequests.length}</strong><span>resultados</span></span></div>
      <form className={styles.filters} method="get">
        <label className={styles.searchField}><span>Pesquisar</span><input name="q" defaultValue={q} maxLength={100} placeholder="Campanha, empresa ou contacto"/></label>
        <label><span>Origem</span><select name="origem" defaultValue={origin}><option value="">Todas as origens</option><option value="empresarial">Campanhas empresariais</option><option value="parceiro">Campanhas de parceiros</option><option value="pedido">Pedidos recebidos</option></select></label>
        <label><span>Estado</span><select name="estado" defaultValue={status}><option value="">Todos os estados</option>{Object.entries(statusLabels).map(([value, text])=><option key={value} value={value}>{text}</option>)}</select></label>
        <label><span>Prazo</span><select name="prazo" defaultValue={deadline}><option value="">Todos os prazos</option><option value="proximo">Termina nos próximos 7 dias</option><option value="expirado">Prazo ultrapassado</option><option value="futuro">Termina depois de 7 dias</option><option value="sem-prazo">Sem prazo definido</option></select></label>
        <div className={styles.filterActions}><button className="btn primary" type="submit">Aplicar filtros</button>{q || origin || status || deadline ? <Link className="btn" href="/dashboard/admin/publicidade">Limpar</Link> : null}</div>
      </form>
      <div className={styles.tableMeta}><span>Campanhas: <strong>{filteredCampaigns.length}</strong> · Pedidos: <strong>{filteredRequests.length}</strong></span><span>Máximo de 100 registos por origem</span></div>
      <div className={styles.campaignList}>
        {filteredCampaigns.map((c) => <article className={styles.campaignCard} key={c.table + c.id}>
          <div className={styles.campaignTop}><div className={styles.campaignMain}><span className={styles.campaignKicker}>{c.origin} · {c.position}{c.slot ? " · " + c.slot : ""}</span><h3>{c.headline || c.title || "Campanha sem título"}</h3><p>{c.advertiser} · Registada {fmtDate(c.created_at)}</p></div><span className={styles.status}>{label(c.status)}</span></div>
          <div className={styles.campaignMeta}><span><small>Início</small><strong>{fmtDate(c.starts_at)}</strong></span><span><small>Fim</small><strong>{fmtDate(c.ends_at)}</strong></span><span><small>Impressões</small><strong>{fmtNumber(c.impressions_count)}</strong></span><span><small>Cliques / CTR</small><strong>{fmtNumber(c.clicks_count)} · {ctr(c.clicks_count,c.impressions_count)}</strong></span><span><small>Preço / orçamento</small><strong>{c.price}</strong></span></div>
          {c.target_url ? <p className={styles.destination}>Destino: <a href={c.target_url} target="_blank" rel="noreferrer">{c.target_url}</a></p> : null}
          <form action={c.table === "business" ? moderateBusinessPromotion : moderatePartnerCampaign} className={styles.moderationForm}>
            <input type="hidden" name="id" value={c.id}/>
            <label><span>Actualizar estado</span><select name="status" defaultValue={c.status ?? ""}>{c.allowed.map(s=><option key={s} value={s}>{label(s)}</option>)}</select></label>
            <button className="btn primary" type="submit">Guardar estado</button>
          </form>
        </article>)}
        {filteredRequests.map((r) => <article className={styles.campaignCard} key={"request-" + r.id}>
          <div className={styles.campaignTop}><div className={styles.campaignMain}><span className={styles.campaignKicker}>Pedido de publicidade · {r.placement || "Posição não indicada"}</span><h3>{r.company_name}</h3><p>{r.contact_name} · {r.email}{r.phone ? " · " + r.phone : ""}</p></div><span className={styles.status}>{label(r.status)}</span></div>
          <div className={styles.campaignMeta}><span><small>Pacote</small><strong>{r.package_name || "Não indicado"}</strong></span><span><small>Início solicitado</small><strong>{fmtDate(r.starts_at)}</strong></span><span><small>Fim solicitado</small><strong>{fmtDate(r.ends_at)}</strong></span><span><small>Recebido</small><strong>{fmtDate(r.created_at)}</strong></span></div>
          <form action={updateAdvertisingRequest} className={styles.moderationForm}>
            <input type="hidden" name="id" value={r.id}/>
            <label><span>Estado comercial</span><select name="status" defaultValue={r.status ?? "NEW"}>{requestStatuses.map(s=><option key={s} value={s}>{label(s)}</option>)}</select></label>
            <button className="btn primary" type="submit">Actualizar pedido</button>
          </form>
        </article>)}
        {!filteredCampaigns.length && !filteredRequests.length ? <div className={styles.emptyState}><strong>Nenhum registo corresponde aos filtros.</strong><span>Altere a pesquisa ou limpe os filtros para consultar outras campanhas e pedidos.</span></div> : null}
      </div>
    </section>
  </div></main>;
}
