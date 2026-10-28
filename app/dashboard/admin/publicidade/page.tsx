export const dynamic = "force-dynamic";

import { getSuperAdminContext } from "@/lib/auth/super-admin";
import styles from "./publicidade.module.css";

type Campaign = {
  id: string;
  title: string | null;
  headline: string | null;
  status: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string | null;
  surface?: string | null;
  placement?: string | null;
  slot?: string | null;
  price_mzn?: number | null;
  budget?: number | null;
  currency?: string | null;
  impressions_count?: number | null;
  clicks_count?: number | null;
  target_url?: string | null;
  business?: { name?: string | null } | { name?: string | null }[] | null;
};

function fmtDate(value: string | null) {
  if (!value) return "Não definido";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Não definido" : date.toLocaleDateString("pt-MZ");
}
function fmtNumber(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString("pt-MZ");
}
function ctr(clicks: number | null | undefined, impressions: number | null | undefined) {
  const shown = Number(impressions ?? 0);
  return shown > 0 ? ((Number(clicks ?? 0) / shown) * 100).toLocaleString("pt-MZ", { maximumFractionDigits: 2 }) + "%" : "—";
}
function businessName(campaign: Campaign) {
  const value = campaign.business;
  return Array.isArray(value) ? value[0]?.name || "Empresa não identificada" : value?.name || "Empresa não identificada";
}

type SearchParams = Promise<{ alerta?: string }>;

export default async function AdminAdvertisingPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = await searchParams;
  const alertFilter = params?.alerta === "pendentes" || params?.alerta === "expiradas" ? params.alerta : "";
  const nowIso = new Date().toISOString();
  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) return <main className={`dashboard-main admin-workspace ${styles.page}`}><div className={`dashboard-content ${styles.content}`}><div className="notice">Acesso reservado ao Super Admin.</div></div></main>;

  const [
    { data: businessCampaigns, error: businessError },
    { data: partnerCampaigns, error: partnerError },
    { count: impressionEvents },
    { count: clickEvents },
  ] = await Promise.all([
    (() => {
      let query = supabase.from("business_promotions")
        .select("id,title,headline,status,starts_at,ends_at,created_at,placement,slot,budget,currency,impressions_count,clicks_count,target_url,business:business_id(name)");
      if (alertFilter === "pendentes") query = query.eq("status", "PENDING");
      if (alertFilter === "expiradas") query = query.eq("status", "ACTIVE").lt("ends_at", nowIso);
      return query.order("created_at", { ascending: false }).limit(100);
    })(),
    (() => {
      let query = supabase.from("partner_ad_campaigns")
        .select("id,title,headline,status,starts_at,ends_at,created_at,surface,slot,price_mzn,impressions_count,clicks_count,target_url");
      if (alertFilter === "pendentes") query = query.eq("status", "REQUESTED");
      if (alertFilter === "expiradas") query = query.eq("status", "ACTIVE").lt("ends_at", nowIso);
      return query.order("created_at", { ascending: false }).limit(100);
    })(),
    supabase.from("ad_delivery_events").select("id", { count: "exact", head: true }).eq("event_type", "IMPRESSION"),
    supabase.from("ad_delivery_events").select("id", { count: "exact", head: true }).eq("event_type", "CLICK"),
  ]);

  const businessRows = (businessCampaigns ?? []) as Campaign[];
  const partnerRows = (partnerCampaigns ?? []) as Campaign[];
  const campaigns = [
    ...businessRows.map((campaign) => ({ ...campaign, origin: "Empresarial", position: campaign.placement || "Não definido", advertiser: businessName(campaign), price: campaign.budget == null ? "Sem orçamento indicado" : Number(campaign.budget).toLocaleString("pt-MZ") + " " + (campaign.currency || "") })),
    ...partnerRows.map((campaign) => ({ ...campaign, origin: "Parceiro", position: campaign.surface || "Não definido", advertiser: "Campanha de parceiro", price: campaign.price_mzn == null ? "Preço não indicado" : Number(campaign.price_mzn).toLocaleString("pt-MZ") + " MZN" })),
  ].sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
  const statusCounts = campaigns.reduce<Record<string, number>>((acc, campaign) => {
    const status = campaign.status || "Sem estado";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  const totalImpressions = campaigns.reduce((sum, campaign) => sum + Number(campaign.impressions_count ?? 0), 0);
  const totalClicks = campaigns.reduce((sum, campaign) => sum + Number(campaign.clicks_count ?? 0), 0);

  return <main className="dashboard-main admin-workspace"><div className="dashboard-content">
    <header className={styles.hero}>
      <div className={styles.heroCopy}>
        <span className={styles.eyebrow}>Administração global</span>
        <h1>Publicidade e campanhas</h1>
        <p>{alertFilter === "pendentes" ? "A mostrar campanhas que aguardam análise: PENDING nas empresariais e REQUESTED nas de parceiros." : alertFilter === "expiradas" ? "A mostrar campanhas ainda ACTIVE cujo prazo final já passou." : "Acompanhe campanhas empresariais e de parceiros, valide prazos e consulte o desempenho registado."}</p>
        {alertFilter ? <p className={styles.heroNotice}>Filtro de alerta activo. <a href="/dashboard/admin/publicidade">Ver todas as campanhas</a></p> : null}
      </div>
      <div className={styles.heroSummary}>
        <span className={styles.summaryLabel}>Campanhas consultadas</span>
        <strong>{campaigns.length}</strong>
        <span className={styles.summaryCaption}>Até 100 por origem</span>
        <div className={styles.summaryRule} />
        <span className={styles.summaryFoot}>Empresariais e parceiros no mesmo painel de acompanhamento.</span>
      </div>
      <span className={styles.heroDecoration} aria-hidden="true">↗</span>
    </header>

    <div className={styles.metrics}>
      <article className={styles.metric}><span>Campanhas empresariais</span><strong>{businessRows.length}</strong><small>Promoções ligadas às empresas</small></article>
      <article className={styles.metric}><span>Campanhas de parceiros</span><strong>{partnerRows.length}</strong><small>Campanhas geridas no espaço de parceiros</small></article>
      <article className={styles.metric}><span>Impressões registadas</span><strong>{fmtNumber(totalImpressions)}</strong><small>Contadores agregados nas campanhas carregadas</small></article>
      <article className={styles.metric}><span>Cliques registados</span><strong>{fmtNumber(totalClicks)}</strong><small>CTR agregado: {ctr(totalClicks, totalImpressions)}</small></article>
    </div>
    <p className={styles.dataNote}>Eventos na plataforma: {fmtNumber(impressionEvents)} impressões e {fmtNumber(clickEvents)} cliques. Estes totais são eventos registados e não são somados aos contadores das campanhas, para evitar duplicar métricas.</p>

    {businessError || partnerError ? <div className="notice" style={{marginTop:16}}>Não foi possível carregar uma ou mais listas de campanhas. Verifique as permissões e as relações configuradas na base de dados antes de activar operações de moderação.</div> : null}

    <section className={styles.section} style={{marginTop:18}}>
      <div className={styles.sectionHead}><div><span className={styles.sectionKicker}>Monitorização</span><h2>Estados existentes</h2><p>Os estados são apresentados tal como estão gravados; não foram inferidas transições nem alterados registos.</p></div></div>
      <div className="grid">
        {Object.entries(statusCounts).sort(([a],[b])=>a.localeCompare(b)).map(([status,count])=><article className="card" key={status}><span className="muted">{status}</span><h2>{count}</h2><p>Campanhas neste estado.</p></article>)}
        {!Object.keys(statusCounts).length ? <div className="admin-request-empty"><strong>Sem campanhas registadas.</strong><span>Quando existirem campanhas, os estados serão apresentados aqui.</span></div> : null}
      </div>
    </section>

    <section className={styles.section} style={{marginTop:18}}>
      <div className={styles.sectionHead}><div><span className={styles.sectionKicker}>Fila de campanhas</span><h2>Campanhas recentes</h2><p>Até 100 campanhas por origem, ordenadas pelas mais recentes. A moderação será activada depois de validar os estados e regras operacionais.</p></div><span className={styles.resultsSummary}><strong>{campaigns.length}</strong><span>registos carregados</span></span></div>
      <div className="admin-directory-list">
        {campaigns.map((campaign) => <article className="admin-request-card" key={campaign.origin + "-" + campaign.id}>
          <div className="admin-request-head"><div><span className="dashboard-kicker">{campaign.origin} · {campaign.position}{campaign.slot ? " · " + campaign.slot : ""}</span><h3>{campaign.headline || campaign.title || "Campanha sem título"}</h3><small>{campaign.advertiser} · criada em {fmtDate(campaign.created_at)}</small></div><span className="tag">{campaign.status || "Sem estado"}</span></div>
          <div className="admin-request-meta"><span>Início: {fmtDate(campaign.starts_at)}</span><span>Fim: {fmtDate(campaign.ends_at)}</span><span>Impressões: {fmtNumber(campaign.impressions_count)}</span><span>Cliques: {fmtNumber(campaign.clicks_count)}</span><span>CTR: {ctr(campaign.clicks_count, campaign.impressions_count)}</span><span>{campaign.price}</span></div>
          {campaign.target_url ? <p>Destino: <a href={campaign.target_url} target="_blank" rel="noreferrer">{campaign.target_url}</a></p> : null}
        </article>)}
        {!campaigns.length ? <div className="admin-request-empty"><strong>Nenhuma campanha encontrada.</strong><span>As campanhas empresariais e de parceiros aparecerão nesta fila quando forem registadas.</span></div> : null}
      </div>
    </section>

    <div className={styles.moderationNote}><strong>Moderação transaccional ainda não activada.</strong><p>Os estados permitidos diferem entre campanhas empresariais e de parceiros. Antes de ligar acções de publicar, rejeitar ou suspender, é necessário confirmar os fluxos e as regras de cada origem. Nenhum registo é alterado nesta página.</p></div>
  </div></main>;
}
