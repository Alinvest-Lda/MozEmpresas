export const dynamic = "force-dynamic";

import Link from "next/link";
import { Input, Select } from "@/components/ui";
import { moderateBusinessPromotion, moderatePartnerCampaign, updateAdvertisingRequest, cancelBusinessPromotion, confirmBusinessPromotionMpesaPayment, issuePartnerAdPayment, cancelPartnerAdCampaign } from "@/lib/admin/advertising-actions";
import { updatePartnerAdCreditPrice } from "@/lib/admin/partner-billing-actions";
import styles from "./publicidade.module.css";

type Campaign = {
  id: string; title: string | null; headline: string | null; status: string | null;
  starts_at: string | null; ends_at: string | null; created_at: string | null; payment_method_preference?: string | null;
  surface?: string | null; placement?: string | null; slot?: string | null;
  price_mzn?: number | null; budget?: number | null; currency?: string | null; payment_method?: string | null; payment_reference?: string | null; paid_at?: string | null;
  impressions_count?: number | null; clicks_count?: number | null; target_url?: string | null;
  business?: { name?: string | null } | { name?: string | null }[] | null;
  payment?: { id: string; status: string; payment_method: string; payment_reference: string; amount_mzn: number }[] | null;
};
type AdvertisingRequest = {
  id: string; company_name: string; contact_name: string; email: string; phone: string | null;
  placement: string | null; package_name: string | null; status: string | null;
  starts_at: string | null; ends_at: string | null; created_at: string | null;
  payment_method?: string | null; payment_reference?: string | null; paid_amount_mzn?: number | null; paid_at?: string | null;
};
const promotionStatuses = ["PENDING", "ACTIVE", "PAUSED", "EXPIRED"];
const partnerStatuses = ["DRAFT", "REQUESTED", "APPROVED", "ACTIVE", "PAUSED", "ENDED", "REJECTED", "CANCELLED"];
function partnerNextStatuses(status: string | null, paymentStatus?: string | null, endsAt?: string | null) {
  if (status === "REQUESTED") return ["APPROVED", "REJECTED"];
  if (status === "APPROVED") return !paymentStatus || paymentStatus === "FAILED" ? ["REJECTED"] : [];
  if (status === "ACTIVE") return ["PAUSED", ...(endsAt && new Date(endsAt).getTime() <= Date.now() ? ["ENDED"] : [])];
  if (status === "PAUSED") return [...(paymentStatus === "PAID" ? ["ACTIVE"] : []), ...(endsAt && new Date(endsAt).getTime() <= Date.now() ? ["ENDED"] : [])];
  return [];
}
const requestStatuses = ["NEW", "CONTACTED", "PROPOSAL", "AWAITING_PAYMENT", "PAID", "APPROVED", "REJECTED", "CANCELLED"];
const statusLabels: Record<string, string> = {
  PENDING: "Pendente", REQUESTED: "Solicitada", UNDER_REVIEW: "Em análise", NEW: "Novo pedido", ENDED: "Encerrada",
  ACTIVE: "Activa", RUNNING: "Em execução", PUBLISHED: "Publicada", PAUSED: "Pausada",
  EXPIRED: "Expirada", CANCELLED: "Cancelada", CONTACTED: "Contactado", PROPOSAL: "Proposta enviada", DRAFT: "Rascunho",
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

type SearchParams = Promise<{ q?: string; origem?: string; estado?: string; prazo?: string; page?: string; result?: string; refund?: string; refundType?: string; reference?: string; method?: string }>;
export default async function AdminAdvertisingPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = searchParams ? await searchParams : {};
  const q = (params.q ?? "").trim().slice(0, 100);
  const origin = ["empresarial", "parceiro", "pedido"].includes(params.origem ?? "") ? params.origem ?? "" : "";
  const status = [...new Set([...promotionStatuses, ...partnerStatuses, ...requestStatuses])].includes((params.estado ?? "").toUpperCase()) ? (params.estado ?? "").toUpperCase() : "";
  const deadline = ["expirado", "proximo", "futuro", "sem-prazo"].includes(params.prazo ?? "") ? params.prazo ?? "" : "";
  const pageNumber = Math.max(0, Math.min(999, Number.isInteger(Number(params.page)) ? Number(params.page) : 0));
  const pageStart = pageNumber * 100;
  const result = params.result ?? "";
  const now = new Date();
  const nowIso = now.toISOString();
  const { supabase, authorized } = await (await import("@/lib/auth/super-admin")).getSuperAdminContext();
  if (!authorized) return <main className={`dashboard-main admin-workspace ${styles.page}`}><div className={`dashboard-content ${styles.content}`}><div className="notice">Acesso reservado ao Super Admin.</div></div></main>;

  const queueNow=new Date();
  const queueNowIso=queueNow.toISOString();
  const queueFutureIso=new Date(queueNow.getTime()+7*24*60*60*1000).toISOString();
  const safeQueueSearch=q;
  const applyQueueFilters=(initial:any,fields:string[] )=>{
    let query=initial;
    if(safeQueueSearch) query=query.or(fields.map(field=>field+".ilike.%"+safeQueueSearch+"%").join(","));
    if(status) query=query.eq("status",status);
    if(deadline==="expirado") query=query.lt("ends_at",queueNowIso);
    else if(deadline==="proximo") query=query.gte("ends_at",queueNowIso).lte("ends_at",queueFutureIso);
    else if(deadline==="futuro") query=query.gt("ends_at",queueFutureIso);
    else if(deadline==="sem-prazo") query=query.is("ends_at",null);
    return query;
  };
  const businessQueueQuery=applyQueueFilters(
    supabase.from("business_promotions").select("id,title,headline,status,starts_at,ends_at,created_at,placement,slot,budget,currency,price_mzn,payment_method,payment_reference,paid_at,impressions_count,clicks_count,target_url,business:business_id(name)",{count:"exact"}).order("created_at",{ascending:false}),
    ["title","headline","target_url","placement"]
  ).range(pageStart,pageStart+99);
  const partnerQueueQuery=applyQueueFilters(
    supabase.from("partner_ad_campaigns").select("id,title,headline,status,starts_at,ends_at,created_at,surface,slot,price_mzn,payment_method_preference,impressions_count,clicks_count,target_url,payment:partner_ad_payment_orders(id,status,payment_method,payment_reference,amount_mzn)",{count:"exact"}).order("created_at",{ascending:false}),
    ["title","headline","target_url","surface"]
  ).range(pageStart,pageStart+99);
  const requestQueueQuery=applyQueueFilters(
    supabase.from("advertising_requests").select("id,company_name,contact_name,email,phone,placement,package_name,status,starts_at,ends_at,created_at,payment_method,payment_reference,paid_amount_mzn,paid_at",{count:"exact"}).order("created_at",{ascending:false}),
    ["company_name","contact_name","email","phone","package_name","placement"]
  ).range(pageStart,pageStart+99);

  const [
    { data: businessCampaigns, error: businessError, count: businessTotalCount },
    { data: partnerCampaigns, error: partnerError, count: partnerTotalCount },
    { data: requests, error: requestError, count: requestTotalCount },
    { count: impressionEvents, error: impressionEventsError }, { count: clickEvents, error: clickEventsError },
    { data: partnerProducts, error: partnerProductsError },
  ] = await Promise.all([
    businessQueueQuery,
    partnerQueueQuery,
    requestQueueQuery,
    supabase.from("ad_delivery_events").select("id", { count: "exact", head: true }).eq("event_type", "IMPRESSION"),
    supabase.from("ad_delivery_events").select("id", { count: "exact", head: true }).eq("event_type", "CLICK"),
    supabase.from("partner_ad_products").select("id,name,price_mzn,credit_price,active").order("name").limit(100),
  ]);

  const allBusiness = (businessCampaigns ?? []) as Campaign[];
  const allPartner = (partnerCampaigns ?? []) as Campaign[];
  const allRequests = (requests ?? []) as AdvertisingRequest[];
  const activeQueueCounts = origin==="empresarial" ? [businessTotalCount]
    : origin==="parceiro" ? [partnerTotalCount]
    : origin==="pedido" ? [requestTotalCount]
    : [businessTotalCount,partnerTotalCount,requestTotalCount];
  const totalRecords = activeQueueCounts.some(value=>value===null) ? null : activeQueueCounts.reduce((sum,value)=>sum+(value??0),0);
  const hasMore = (origin===""||origin==="empresarial") && businessTotalCount!==null&&pageStart+100<businessTotalCount
    || (origin===""||origin==="parceiro") && partnerTotalCount!==null&&pageStart+100<partnerTotalCount
    || (origin===""||origin==="pedido") && requestTotalCount!==null&&pageStart+100<requestTotalCount;
  const pageHref = (nextPage:number) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (origin) query.set("origem", origin);
    if (status) query.set("estado", status);
    if (deadline) query.set("prazo", deadline);
    if (nextPage > 0) query.set("page", String(nextPage));
    return "/dashboard/admin/publicidade" + (query.size ? "?" + query.toString() : "");
  };
  const partnerCampaignIds = allPartner.map((campaign) => campaign.id);
  const administrativeAdIds = [...allBusiness.map((campaign) => campaign.id), ...allRequests.map((request) => request.id)];
  const { data: deliveryMetrics, error: deliveryMetricsError } = await supabase.rpc("admin_advertising_delivery_metrics_f377", {
    p_business_campaign_ids: allBusiness.map((campaign) => campaign.id),
    p_partner_campaign_ids: allPartner.map((campaign) => campaign.id),
  });
  const deliveryMetricsByCampaign = new Map<string,{impressions:number;clicks:number}>(
    (deliveryMetrics ?? []).map((row:any)=>[row.campaign_id,{
      impressions:Number(row.impressions_count??0),
      clicks:Number(row.clicks_count??0),
    }] as [string,{impressions:number;clicks:number}])
  );
  const withDeliveryMetrics = (campaign:Campaign):Campaign => {
    if(deliveryMetricsError) return {...campaign,impressions_count:null,clicks_count:null};
    const metrics=deliveryMetricsByCampaign.get(campaign.id);
    return {...campaign,impressions_count:metrics?.impressions??0,clicks_count:metrics?.clicks??0};
  };
  const [{ data: partnerStatusEvents, error: partnerStatusEventsError }, { data: advertisingAdminEvents, error: advertisingAdminEventsError }] = await Promise.all([
    partnerCampaignIds.length
      ? supabase.from("partner_ad_campaign_status_events").select("id,campaign_id,old_status,new_status,event_type,action_reason,created_at").in("campaign_id", partnerCampaignIds).order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    administrativeAdIds.length
      ? supabase.from("advertising_admin_events").select("id,entity_type,entity_id,old_status,new_status,action_reason,created_at").in("entity_id", administrativeAdIds).order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);
  const eventsByCampaign = new Map<string, any[]>();
  for (const event of partnerStatusEvents ?? []) {
    const list = eventsByCampaign.get(event.campaign_id) ?? [];
    list.push(event);
    eventsByCampaign.set(event.campaign_id, list);
  }
  const eventsByAdvertisingEntity = new Map<string, any[]>();
  for (const event of advertisingAdminEvents ?? []) {
    const list = eventsByAdvertisingEntity.get(event.entity_id) ?? [];
    list.push(event);
    eventsByAdvertisingEntity.set(event.entity_id, list);
  }
  const campaigns = [
    ...allBusiness.map((raw) => { const c=withDeliveryMetrics(raw); return ({ ...c, origin: "Empresarial", originKey: "empresarial", position: c.placement || "Não definido", advertiser: businessName(c), price: c.price_mzn == null && c.budget == null ? "Sem orçamento indicado" : fmtNumber(c.price_mzn ?? c.budget) + " MZN", table: "business", allowed: promotionStatuses }); }),
    ...allPartner.map((raw) => { const c=withDeliveryMetrics(raw); return ({ ...c, origin: "Parceiro", originKey: "parceiro", position: c.surface || "Não definido", advertiser: "Conta parceira", price: c.price_mzn == null ? "Preço não indicado" : fmtNumber(c.price_mzn) + " MZN", table: "partner", allowed: partnerNextStatuses(c.status, c.payment?.[0]?.status, c.ends_at) }); }),
  ].sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
  const matchesQuery = (value: string) => !q || value.toLocaleLowerCase("pt").includes(q.toLocaleLowerCase("pt"));
  const filteredCampaigns = campaigns.filter((c) => {
    if (origin && origin !== c.originKey) return false;
    if (status && c.status !== status) return false;
    if (!matchesQuery([c.title, c.headline, c.advertiser, c.origin, c.position].join(" "))) return false;
    const end = c.ends_at ? new Date(c.ends_at).getTime() : NaN;
    if (deadline === "sem-prazo" && c.ends_at) return false;
    if (deadline === "expirado" && !(Number.isFinite(end) && end < now.getTime())) return false;
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
  const totalImpressions = businessError || partnerError || deliveryMetricsError ? null : filteredCampaigns.reduce((sum, c) => sum + Number(c.impressions_count ?? 0), 0);
  const totalClicks = businessError || partnerError || deliveryMetricsError ? null : filteredCampaigns.reduce((sum, c) => sum + Number(c.clicks_count ?? 0), 0);
  const pendingCount = allBusiness.filter(c => c.status === "PENDING").length + allPartner.filter(c => ["REQUESTED", "PENDING", "UNDER_REVIEW"].includes(c.status ?? "")).length + allRequests.filter(r => ["NEW", "CONTACTED", "PROPOSAL", "AWAITING_PAYMENT"].includes(r.status ?? "")).length;
  const error = businessError || partnerError || requestError || impressionEventsError || clickEventsError || partnerProductsError || partnerStatusEventsError || advertisingAdminEventsError || deliveryMetricsError;

  return <main className={`dashboard-main admin-workspace ${styles.page}`}><div className={`dashboard-content ${styles.content}`}>
    <header className={styles.hero}>
      <div className={styles.heroCopy}><span className={styles.eyebrow}>Administração global</span><h1>Publicidade e campanhas</h1><p>Revise pedidos, modere campanhas e acompanhe prazos e desempenho num único espaço operacional.</p></div>
      <div className={styles.heroSummary}><span className={styles.summaryLabel}>A aguardar atenção</span><strong>{error ? "—" : pendingCount}</strong><span className={styles.summaryCaption}>{error ? "Indicador indisponível" : "Página " + (pageNumber + 1) + " · " + (totalRecords===null?"total indisponível":totalRecords+" registos filtrados")}</span><div className={styles.summaryRule}/><span className={styles.summaryFoot}>{totalRecords===null?"Total indisponível.":totalRecords+" registos filtrados no total."} A fila apresenta até 100 registos por origem em cada página.</span></div>
      <span className={styles.heroDecoration} aria-hidden="true">↗</span>
    </header>
    {result ? <div className={`${styles.resultNotice} ${result === "error" ? styles.resultError : ""}`} role={result === "error" ? "alert" : "status"}>{result === "request-settlement-evidence-required" ? "Para marcar o pedido como Pago, indique o meio, a referência e o valor efectivamente recebido." : result === "request-settlement-evidence-unexpected" ? "Os dados de liquidação só devem ser enviados ao marcar o pedido como Pago." : result === "business-payment-confirmed" ? "Liquidação M-Pesa confirmada e registada. A campanha continua pendente de activação administrativa." : result === "business-payment-invalid" ? "Introduza uma referência e um valor de pagamento válidos." : result === "PROMOTION_NOT_AWAITING_MPESA_SETTLEMENT" ? "A campanha não está pendente de liquidação M-Pesa." : result === "BUSINESS_AD_PAYMENT_AMOUNT_MISMATCH" ? "O valor recebido não corresponde ao preço da campanha." : result === "business-payment-error" ? "Não foi possível confirmar a liquidação M-Pesa." : result === "success" ? "Estado actualizado com sucesso." : result === "invalid-transition" || result === "ADMIN_PARTNER_CAMPAIGN_STATUS_TRANSITION_INVALID" ? "A transição de estado solicitada não é permitida." : result === "payment-not-settled" || result === "CAMPAIGN_PAYMENT_NOT_SETTLED" ? "A campanha só pode ser activada ou retomada após liquidação confirmada." : result === "campaign-window-closed" ? "O período contratado já terminou; esta campanha não pode ser activada." : result === "CAMPAIGN_PAYMENT_STILL_PENDING" ? "Existe uma cobrança pendente. Não é possível rejeitar ou encerrar este pedido enquanto o pagamento estiver em processamento." : result === "CAMPAIGN_END_DATE_NOT_REACHED" ? "A data final da campanha ainda não foi atingida." : result === "payment-issued" ? "Cobrança emitida. Referência: " + (params.reference ?? "") + (params.method === "CREDITS" ? " · Créditos debitados e campanha activada." : " · Aguarda confirmação M-Pesa.") : result === "PARTNER_CREDIT_WALLET_NOT_LINKED" ? "Esta conta de parceiro ainda não está associada a uma empresa com carteira de créditos. Utilize M-Pesa ou configure a associação empresarial." : result === "INSUFFICIENT_CREDITS" ? "Saldo de créditos insuficiente para esta campanha." : result === "CAMPAIGN_PAYMENT_ALREADY_ISSUED" ? "Já existe uma cobrança activa para esta campanha." : result === "payment-error" ? "Não foi possível emitir a cobrança da campanha." : result === "partner-cancel-success" ? (params.refundType === "BANK_TRANSFER_REFUND" ? "Campanha cancelada. Estorno bancário registado: " + (params.reference ?? "") : params.refundType === "MPESA_REFUND" ? "Campanha cancelada. Reembolso M-Pesa registado: " + (params.reference ?? "") : "Campanha de parceiro cancelada. Créditos devolvidos: " + (params.refund ?? "0")) : result === "MPESA_REFUND_REFERENCE_REQUIRED" || result === "EXTERNAL_REFUND_REFERENCE_REQUIRED" ? "Introduza a referência do reembolso externo já executado fora da plataforma." : result === "INVALID_EXTERNAL_REFUND_REFERENCE" ? "A referência de estorno não pode ser igual à referência do pagamento original." : result === "CAMPAIGN_NOT_SETTLED" ? "Só é possível estornar campanhas efectivamente pagas." : result === "CAMPAIGN_ALREADY_REFUNDED" ? "Esta campanha já foi estornada." : result === "CANCELLATION_NOT_ALLOWED" ? "Só é possível cancelar campanhas futuras ainda não iniciadas." : result === "partner-cancel-error" ? "Não foi possível cancelar/estornar a campanha." : result === "credit-price-saved" ? "Preço em créditos actualizado." : result === "credit-price-invalid" ? "Indique um preço em créditos inteiro e superior a zero, ou deixe vazio para desactivar." : result === "credit-price-error" ? "Não foi possível actualizar o preço em créditos." : result === "PARTNER_AD_CREDIT_PRICE_NOT_CONFIGURED" ? "Este formato ainda não tem preço em créditos configurado." : result === "FIXED_PRODUCT_PRICE_CANNOT_BE_OVERRIDDEN" ? "O preço deste formato é fixo no catálogo e não pode ser alterado na cobrança." : result === "cancel-success" ? (params.refundType === "MPESA_REFUND" ? "Campanha cancelada. Reembolso M-Pesa registado: " + (params.reference ?? "") : "Campanha cancelada. Créditos devolvidos: " + (params.refund ?? "0")) : result === "mpesa-refund-required" ? "Campanha M-Pesa liquidada: o reembolso externo deve ser executado e registado antes do cancelamento." : result === "mpesa-refund-invalid" ? "A referência de reembolso M-Pesa é inválida ou já foi utilizada." : result === "cancel-not-allowed" ? "Cancelamento não permitido: campanha já iniciada, expirada ou num estado não elegível." : "Não foi possível actualizar o estado. Confirme permissões e elegibilidade."}</div> : null}
    {error ? <div className={styles.resultNotice + " " + styles.resultError} role="alert">Uma ou mais consultas falharam. As contagens agregadas são ocultadas; as listas podem estar incompletas, pelo que um estado vazio não é conclusivo.</div> : null}
    <section className={styles.metrics} aria-label="Resumo do módulo">
      <article className={styles.metric}><span>Campanhas empresariais</span><strong>{error ? "—" : businessTotalCount??allBusiness.length}</strong><small>Registos filtrados · até 100 nesta página</small></article>
      <article className={styles.metric}><span>Campanhas de parceiros</span><strong>{error ? "—" : partnerTotalCount??allPartner.length}</strong><small>Registos filtrados · até 100 nesta página</small></article>
      <article className={styles.metric}><span>Pedidos de publicidade</span><strong>{error ? "—" : requestTotalCount??allRequests.length}</strong><small>Registos filtrados · até 100 nesta página</small></article>
      <article className={styles.metric}><span>Impressões / cliques</span><strong>{error ? "—" : fmtNumber(totalImpressions) + " / " + fmtNumber(totalClicks)}</strong><small>{error ? "CTR indisponível" : "CTR na selecção filtrada: " + ctr(totalClicks, totalImpressions)}</small></article>
    </section>
    {error ? null : <p className={styles.dataNote}>Eventos registados na plataforma: {fmtNumber(impressionEvents)} impressões e {fmtNumber(clickEvents)} cliques. São contagens separadas dos contadores por campanha.</p>}
    <section className={styles.section}>
      <div className={styles.sectionHead}><div><span className={styles.sectionKicker}>Catálogo comercial</span><h2>Preços de publicidade para parceiros</h2><p>O preço em créditos é independente do preço directo em MZN, seguindo a mesma lógica de preços diferenciados já usada nos produtos publicitários empresariais. Não se presume equivalência de 1 MZN por crédito.</p></div></div>
      {partnerProductsError ? <div className={styles.resultNotice + " " + styles.resultError}>Não foi possível carregar o catálogo de espaços publicitários.</div> : <div className={styles.campaignList}>
        {(partnerProducts??[]).map((product:any)=><article className={styles.campaignCard} key={product.id}>
          <div className={styles.campaignTop}><div className={styles.campaignMain}><span className={styles.campaignKicker}>Produto Parceiro · {product.active?"Activo":"Inactivo"}</span><h3>{product.name}</h3></div><span className={styles.status}>{product.price_mzn==null?"Preço sob proposta":fmtNumber(product.price_mzn)+" MZN"}</span></div>
          <form action={updatePartnerAdCreditPrice} className={styles.moderationForm}>
            <input type="hidden" name="product_id" value={product.id}/>
            <label><span>Preço em créditos</span><Input name="credit_price" type="number" min={1} step={1} defaultValue={product.credit_price??""} placeholder="Não configurado"/></label>
            <button className="btn primary" type="submit">Guardar preço</button>
          </form>
          <small>Deixe vazio para impedir pagamentos deste formato por créditos. O pagamento M-Pesa continua disponível.</small>
        </article>)}
        {!partnerProducts?.length ? <div className={styles.emptyState}>Não existem produtos de publicidade para parceiros.</div> : null}
      </div>}
    </section>
    <section className={styles.section}>
      <div className={styles.sectionHead}><div><span className={styles.sectionKicker}>Gestão operacional</span><h2>Fila de publicidade</h2><p>Pesquise anunciantes, filtre por origem, estado e prazo e actualize os estados permitidos em cada fluxo.</p></div><span className={styles.resultsSummary}><strong>{filteredCampaigns.length + filteredRequests.length}</strong><span>resultados</span></span></div>
      <form className={styles.filters} method="get">
        <label className={styles.searchField}><span>Pesquisar</span><Input name="q" defaultValue={q} maxLength={100} placeholder="Campanha, empresa ou contacto"/></label>
        <label><span>Origem</span><Select name="origem" defaultValue={origin}><option value="">Todas as origens</option><option value="empresarial">Campanhas empresariais</option><option value="parceiro">Campanhas de parceiros</option><option value="pedido">Pedidos recebidos</option></Select></label>
        <label><span>Estado</span><Select name="estado" defaultValue={status}><option value="">Todos os estados</option>{Object.entries(statusLabels).map(([value, text])=><option key={value} value={value}>{text}</option>)}</Select></label>
        <label><span>Prazo</span><Select name="prazo" defaultValue={deadline}><option value="">Todos os prazos</option><option value="proximo">Termina nos próximos 7 dias</option><option value="expirado">Prazo ultrapassado</option><option value="futuro">Termina depois de 7 dias</option><option value="sem-prazo">Sem prazo definido</option></Select></label>
        <div className={styles.filterActions}><button className="btn primary" type="submit">Aplicar filtros</button>{q || origin || status || deadline ? <Link className="btn" href="/dashboard/admin/publicidade">Limpar</Link> : null}</div>
      </form>
      <div className={styles.tableMeta}><span>Campanhas: <strong>{filteredCampaigns.length}</strong> · Pedidos: <strong>{filteredRequests.length}</strong></span><span>Página {pageNumber + 1} · até 100 registos por origem</span></div>
      <div className={styles.filterActions} aria-label="Paginação da fila publicitária">
        {pageNumber > 0 ? <Link className="btn" href={pageHref(pageNumber - 1)}>← Página anterior</Link> : null}
        {hasMore ? <Link className="btn primary" href={pageHref(pageNumber + 1)}>Página seguinte →</Link> : null}
      </div>
      <div className={styles.campaignList}>
        {filteredCampaigns.map((c) => <article className={styles.campaignCard} key={c.table + c.id}>
          <div className={styles.campaignTop}><div className={styles.campaignMain}><span className={styles.campaignKicker}>{c.origin} · {c.position}{c.slot ? " · " + c.slot : ""}</span><h3>{c.headline || c.title || "Campanha sem título"}</h3><p>{c.advertiser} · Registada {fmtDate(c.created_at)}</p></div><span className={styles.status}>{label(c.status)}</span></div>
          <div className={styles.campaignMeta}><span><small>Início</small><strong>{fmtDate(c.starts_at)}</strong></span><span><small>Fim</small><strong>{fmtDate(c.ends_at)}</strong></span><span><small>Impressões</small><strong>{c.impressions_count===null?"—":fmtNumber(c.impressions_count)}</strong></span><span><small>Cliques / CTR</small><strong>{c.clicks_count===null||c.impressions_count===null?"—":fmtNumber(c.clicks_count)+" · "+ctr(c.clicks_count,c.impressions_count)}</strong></span><span><small>Preço / orçamento</small><strong>{c.price}</strong></span></div>
          {c.table === "partner" ? <details className={styles.campaignHistory}><summary>Histórico ({(eventsByCampaign.get(c.id) ?? []).length})</summary><ol>{(eventsByCampaign.get(c.id) ?? []).map((event: any) => <li key={event.id}><strong>{event.event_type === "CREATED" ? "Pedido criado" : "Estado actualizado"}</strong><span>{event.old_status ? label(event.old_status) + " → " : ""}{label(event.new_status)}</span><small>{new Date(event.created_at).toLocaleString("pt-MZ")}</small></li>)}</ol></details> : null}
          {c.table === "partner" ? (() => {
            const payment = c.payment?.[0];
            return <>
              {payment ? <div className={styles.destination}><strong>Cobrança anterior: {label(payment.status)}</strong><p>{payment.payment_method} · {fmtNumber(payment.amount_mzn)} MZN · Referência {payment.payment_reference}</p></div> : null}
              {(!payment || payment.status === "FAILED") && ["REQUESTED","APPROVED"].includes(c.status ?? "") ? <form action={issuePartnerAdPayment} className={styles.moderationForm}>
                  <input type="hidden" name="id" value={c.id}/>
                  <label><span>Preço acordado (MZN)</span><Input name="price_mzn" type="number" min={1} step="0.01" defaultValue={c.price_mzn ?? ""} placeholder="Obrigatório se o formato tiver preço sob proposta"/></label>
                  <label><span>Forma de pagamento</span><Select name="payment_method" defaultValue={c.payment_method_preference || "MPESA"}><option value="MPESA">M-Pesa (aguarda confirmação)</option><option value="CREDITS">Créditos (debita e activa)</option></Select></label>
                  <button className="btn primary" type="submit">{payment?.status === "FAILED" ? "Reemitir cobrança" : "Emitir cobrança"}</button>
                  <small>Por créditos, a conta Parceiro precisa de associação empresarial e saldo suficiente. Por M-Pesa, a campanha só activa após confirmação do operador.</small>
                </form> : null}
            </>;
          })() : null}
          {c.table === "partner" && c.payment?.[0]?.status === "PAID" && c.starts_at && ["APPROVED","ACTIVE","PAUSED"].includes(c.status ?? "") && (new Date(c.starts_at).getTime() > now.getTime() || (c.status==="APPROVED" && c.ends_at && new Date(c.ends_at).getTime() <= now.getTime())) ? <form action={cancelPartnerAdCampaign} className={styles.cancelForm}>
            <input type="hidden" name="id" value={c.id}/>
            <label><span>Motivo do cancelamento</span><Input name="reason" minLength={8} maxLength={1000} required placeholder="Motivo (mín. 8 caracteres)"/></label>
            {["MPESA","BANK_TRANSFER"].includes(c.payment?.[0]?.payment_method ?? "") ? <label><span>Referência do reembolso {c.payment?.[0]?.payment_method === "BANK_TRANSFER" ? "bancário" : "M-Pesa"}</span><Input name="external_refund_reference" minLength={4} maxLength={160} required placeholder="Referência da transferência de reembolso"/></label> : null}
            <button className="btn" type="submit">Cancelar campanha e estornar</button>
            <small>Créditos são devolvidos automaticamente. Para M-Pesa ou transferência bancária, execute o reembolso externamente e registe a referência antes de cancelar.</small>
          </form> : null}
          {c.table === "business" && c.payment_method === "MPESA" && c.paid_at ? <div className={styles.destination}><strong>Liquidação M-Pesa confirmada</strong><p>{fmtNumber(c.price_mzn)} MZN · Referência {c.payment_reference||"não indicada"} · {fmtDate(c.paid_at)}</p></div> : null}
          {c.table === "business" && c.status === "PENDING" && c.payment_method === "MPESA" && !c.paid_at ? <form action={confirmBusinessPromotionMpesaPayment} className={styles.moderationForm}>
            <input type="hidden" name="id" value={c.id}/>
            <label><span>Referência M-Pesa confirmada</span><Input name="payment_reference" minLength={4} maxLength={160} required placeholder="Referência da transacção recebida"/></label>
            <label><span>Valor recebido (MZN)</span><Input name="amount_mzn" type="number" min={0.01} step="0.01" required defaultValue={c.price_mzn??c.budget??""}/></label>
            <label><span>Notas de verificação (opcional)</span><Input name="notes" maxLength={500} placeholder="Conferido no extracto/portal do operador"/></label>
            <button className="btn primary" type="submit">Confirmar liquidação M-Pesa</button>
            <small>Confirme apenas depois de verificar a transacção no canal do operador. A liquidação não activa automaticamente a campanha.</small>
          </form> : null}
          {c.table === "business" && ["PENDING","ACTIVE"].includes(c.status ?? "") && c.starts_at && (new Date(c.starts_at).getTime() > now.getTime() || (c.status==="PENDING" && c.ends_at && new Date(c.ends_at).getTime() <= now.getTime())) ? <form action={cancelBusinessPromotion} className={styles.cancelForm}><input type="hidden" name="id" value={c.id}/><label><span>Motivo do cancelamento</span><Input name="reason" minLength={8} maxLength={500} required placeholder="Motivo (mín. 8 caracteres)"/></label>{c.payment_method==="MPESA"&&c.paid_at?<label><span>Referência do reembolso M-Pesa já executado</span><Input name="external_refund_reference" minLength={4} maxLength={160} required placeholder="Referência da transacção de reembolso"/></label>:null}<button className="btn" type="submit">Cancelar campanha e estornar créditos</button><small>Créditos são estornados automaticamente. Se a campanha M-Pesa já foi liquidada, execute o reembolso externamente e registe a referência antes de cancelar.</small></form> : null}
        {c.target_url ? <p className={styles.destination}>Destino: <a href={c.target_url} target="_blank" rel="noreferrer">{c.target_url}</a></p> : null}
          {c.allowed.length ? <form action={c.table === "business" ? moderateBusinessPromotion : moderatePartnerCampaign} className={styles.moderationForm}>
            <input type="hidden" name="id" value={c.id}/>
            <label><span>Actualizar estado</span><Select name="status" defaultValue={c.status ?? ""}>{c.allowed.map(s=><option key={s} value={s}>{label(s)}</option>)}</Select></label>
            <label><span>Justificação obrigatória</span><Input name="reason" minLength={8} maxLength={500} required placeholder="Motivo da decisão (mín. 8 caracteres)"/></label>
            <button className="btn primary" type="submit">Guardar estado</button>
          </form> : null}
          {c.table === "business" ? <details className={styles.history}><summary>Histórico de decisões · {(eventsByAdvertisingEntity.get(c.id) ?? []).length}</summary>{(eventsByAdvertisingEntity.get(c.id) ?? []).map((event:any)=><p key={event.id}>{event.old_status} → {event.new_status} · {fmtDate(event.created_at)}<br/>Justificação: {event.action_reason}</p>)}</details> : <details className={styles.history}><summary>Histórico de decisões · {(eventsByCampaign.get(c.id) ?? []).length}</summary>{(eventsByCampaign.get(c.id) ?? []).map((event:any)=><p key={event.id}>{event.old_status || "—"} → {event.new_status} · {fmtDate(event.created_at)}<br/>Justificação: {event.action_reason || "Registo anterior sem justificação capturada."}</p>)}</details>}
        </article>)}
        {filteredRequests.map((r) => <article className={styles.campaignCard} key={"request-" + r.id}>
          <div className={styles.campaignTop}><div className={styles.campaignMain}><span className={styles.campaignKicker}>Pedido de publicidade · {r.placement || "Posição não indicada"}</span><h3>{r.company_name}</h3><p>{r.contact_name} · {r.email}{r.phone ? " · " + r.phone : ""}</p></div><span className={styles.status}>{label(r.status)}</span></div>
          <div className={styles.campaignMeta}><span><small>Pacote</small><strong>{r.package_name || "Não indicado"}</strong></span><span><small>Início solicitado</small><strong>{fmtDate(r.starts_at)}</strong></span><span><small>Fim solicitado</small><strong>{fmtDate(r.ends_at)}</strong></span><span><small>Recebido</small><strong>{fmtDate(r.created_at)}</strong></span>{r.paid_at?<span><small>Liquidação registada</small><strong>{fmtDate(r.paid_at)} · {fmtNumber(r.paid_amount_mzn)} MZN</strong></span>:null}</div>
          {r.payment_reference?<p className={styles.destination}>Pagamento: {r.payment_method||"—"} · Referência {r.payment_reference}</p>:null}
          <form action={updateAdvertisingRequest} className={styles.moderationForm}>
            <input type="hidden" name="id" value={r.id}/>
            <label><span>Estado comercial</span><Select name="status" defaultValue={r.status ?? "NEW"}>{requestStatuses.map(s=><option key={s} value={s}>{label(s)}</option>)}</Select></label>
            <label><span>Forma de pagamento (obrigatória para marcar Pago)</span><Select name="payment_method" defaultValue={r.payment_method||"MPESA"}><option value="MPESA">M-Pesa</option><option value="BANK_TRANSFER">Transferência bancária</option><option value="CASH">Numerário</option><option value="OTHER">Outro meio</option></Select></label>
            <label><span>Referência do pagamento (mín. 4 caracteres)</span><Input name="payment_reference" minLength={4} maxLength={160} defaultValue={r.payment_reference||""} placeholder="Referência comprovativa"/></label>
            <label><span>Valor liquidado (MZN)</span><Input name="paid_amount_mzn" type="number" min={0.01} step="0.01" defaultValue={r.paid_amount_mzn??""} placeholder="Valor efectivamente recebido"/></label>
            <label><span>Justificação obrigatória</span><Input name="reason" minLength={8} maxLength={500} required placeholder="Motivo da decisão (mín. 8 caracteres)"/></label>
            <button className="btn primary" type="submit">Actualizar pedido</button>
            <small>O estado Pago exige referência, valor e meio de pagamento. Depois de Pago, só é permitida a aprovação; não se apaga a evidência de liquidação.</small>
          </form>
          <details className={styles.history}><summary>Histórico de decisões · {(eventsByAdvertisingEntity.get(r.id) ?? []).length}</summary>{(eventsByAdvertisingEntity.get(r.id) ?? []).map((event:any)=><p key={event.id}>{event.old_status} → {event.new_status} · {fmtDate(event.created_at)}<br/>Justificação: {event.action_reason}</p>)}</details>
        </article>)}
        {!error && !filteredCampaigns.length && !filteredRequests.length ? <div className={styles.emptyState}><strong>Nenhum registo corresponde aos filtros.</strong><span>Altere a pesquisa ou limpe os filtros para consultar outras campanhas e pedidos.</span></div> : null}
      </div>
    </section>
  </div></main>;
}
