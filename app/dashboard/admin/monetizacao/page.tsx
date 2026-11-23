export const dynamic = "force-dynamic";

import { getSuperAdminContext } from "@/lib/auth/super-admin";
import styles from "./monetizacao.module.css";

const statusLabels: Record<string, string> = { ACTIVE: "Activo", INACTIVE: "Inactivo", PENDING: "Pendente", RUNNING: "Em execução", PAUSED: "Em pausa", EXPIRED: "Expirado", CANCELLED: "Cancelado", APPROVED: "Aprovado" };
const formatMoney = (value: number | string | null, currency = "MZN") => value == null ? "Não definido" : `${Number(value).toLocaleString("pt-MZ", { maximumFractionDigits: 2 })} ${currency}`;
const formatDate = (value: string | null) => value ? new Date(value).toLocaleDateString("pt-MZ", { day: "2-digit", month: "short", year: "numeric" }) : "Sem data definida";

export default async function AdminMonetizationPage() {
  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) return null;

  const [
    { data: plans, error: plansError },
    { data: promotions, error: promotionsError },
    { count: subscriptions, error: subscriptionsError },
    { data: businessAdProducts, error: businessProductsError },
    { data: partnerAdProducts, error: partnerProductsError },
    { count: impressions, error: impressionsError },
    { count: clicks, error: clicksError },
    { data: financeOverview, error: financeOverviewError },
    { data: transversalReconciliation, error: transversalReconciliationError },
    { data: financialAudit, error: financialAuditError },
  ] = await Promise.all([
    supabase.from("platform_plans").select("id,code,name,description,monthly_price,currency,active").order("monthly_price"),
    supabase.from("business_promotions").select("id,title,placement,status,budget,currency,starts_at,ends_at,created_at,businesses:business_id(name)").order("created_at", { ascending: false }).limit(30),
    supabase.from("business_plan_subscriptions").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
    supabase.from("ad_products").select("id,code,name,placement,slot,description,duration_days,direct_price_mzn,credit_price,capacity,active").order("placement").order("name"),
    supabase.from("partner_ad_products").select("id,code,name,placement,surface,slot,description,duration_days,price_mzn,capacity,active").order("surface").order("placement"),
    supabase.from("ad_delivery_events").select("id", { count: "exact", head: true }).eq("event_type", "IMPRESSION"),
    supabase.from("ad_delivery_events").select("id", { count: "exact", head: true }).eq("event_type", "CLICK"),
    supabase.rpc("admin_financial_operations_overview"),
    supabase.rpc("admin_financial_reconciliation_f327"),
    supabase.rpc("admin_financial_audit_f328"),
  ]);

  const planRows = plans ?? [];
  const businessProducts = businessAdProducts ?? [];
  const partnerProducts = partnerAdProducts ?? [];
  const promotionRows = promotions ?? [];
  const activePlans = planRows.filter(p => p.active).length;
  const activeProducts = [...businessProducts, ...partnerProducts].filter(p => p.active).length;
  const queryErrors = [plansError, promotionsError, subscriptionsError, businessProductsError, partnerProductsError, impressionsError, clicksError, financeOverviewError, transversalReconciliationError, financialAuditError].filter(Boolean).length;
  type FinanceGroup = { status: string; method?: string; type?: string; payment_method?: string; count: number; amount_mzn?: number; credits?: number; budget_mzn?: number; credits_charged?: number };
  type FinanceOverview = {
    generated_at?: string;
    payments?: FinanceGroup[];
    documents?: FinanceGroup[];
    credit_purchases?: FinanceGroup[];
    promotions?: FinanceGroup[];
    wallets?: { wallet_count: number; wallet_balance: number; ledger_balance: number; mismatch_count: number };
    reconciliation?: { wallet_balance_mismatches: number; payment_document_mismatches: number; paid_credit_purchases_missing_ledger: number; service_orders_checked?: number; service_payment_issues: number; callbacks_needing_review: number };
    promotion_cancellations?: { cancellation_count: number; credits_refunded: number };
  };
  const finance = (financeOverview ?? null) as FinanceOverview | null;
  const financeMoney = (value?: number) => formatMoney(value ?? 0);
  type F328Issue = {record_id:string;module:string;issue_code:string;severity:string;summary:string;details:Record<string,unknown>;occurred_at:string|null};
  type F328Audit = {generated_at:string;total_issues:number;error_count:number;warning_count:number;issue_codes:Record<string,number>;sample_limit:number;issues:F328Issue[]};
  const audit328 = (financialAudit ?? null) as F328Audit | null;
  type F327 = {partner_ad_orders_checked:number;partner_ad_order_issues:number;partner_ad_issue_codes:Record<string,number>;partner_documents_checked:number;partner_document_issues:number;partner_document_issue_codes:Record<string,number>;bank_transfers_checked:number;bank_transfer_issues:number;bank_transfer_issue_codes:Record<string,number>;wallet_balance_mismatches:number};
  const f327 = (transversalReconciliation ?? null) as F327 | null;

  const products = [
    ...businessProducts.map(x => ({ id: x.id, experience: "Empresarial", surface: "Área empresarial", code: x.code, name: x.name, placement: x.placement, slot: x.slot, description: x.description, duration: x.duration_days, capacity: x.capacity, active: x.active, price: x.direct_price_mzn != null ? formatMoney(x.direct_price_mzn) : x.credit_price != null ? `${x.credit_price} créditos` : "Preço não definido" })),
    ...partnerProducts.map(x => ({ id: x.id, experience: "Parceiro", surface: x.surface, code: x.code, name: x.name, placement: x.placement, slot: x.slot, description: x.description, duration: x.duration_days, capacity: x.capacity, active: x.active, price: formatMoney(x.price_mzn) })),
  ];

  return (
    <main className={`dashboard-main admin-workspace ${styles.page}`}>
      <div className={`dashboard-content ${styles.content}`}>
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>Administração global</span>
            <h1>Central de monetização</h1>
            <p>Visão consolidada dos planos empresariais, assinaturas, inventário publicitário e actividade comercial da plataforma.</p>
          </div>
          <div className={styles.heroSummary}><span>Catálogo comercial</span><strong>{products.length}</strong><small>Formatos publicitários registados</small><div className={styles.summaryRule}/><span className={styles.summaryFoot}>Consulta de planos, inventário e actividade.</span><a className={styles.creditLink} href="/dashboard/admin/monetizacao/creditos">Gerir créditos <span aria-hidden="true">→</span></a><a className={styles.creditLink} href="/dashboard/admin/monetizacao/servicos">Reconciliar serviços <span aria-hidden="true">→</span></a></div>
          <span className={styles.heroMark} aria-hidden="true">M</span>
        </header>

        {queryErrors > 0 ? <div className={styles.dataNotice} role="status"><strong>Alguns indicadores podem estar incompletos.</strong> Não foi possível carregar {queryErrors} consulta(s). Os valores apresentados reflectem apenas os dados disponíveis.</div> : null}

        <section className={styles.metrics} aria-label="Indicadores de monetização">
          <article><span>Planos activos</span><strong>{activePlans}</strong><small>{planRows.length} planos no catálogo</small></article>
          <article><span>Assinaturas activas</span><strong>{subscriptions ?? "—"}</strong><small>Empresas com plano activo</small></article>
          <article><span>Promoções recentes</span><strong>{promotionRows.length}</strong><small>Máximo de 30 registos recentes</small></article>
          <article><span>Impressões</span><strong>{impressions == null ? "—" : impressions.toLocaleString("pt-MZ")}</strong><small>Eventos de exibição registados</small></article>
          <article><span>Cliques</span><strong>{clicks == null ? "—" : clicks.toLocaleString("pt-MZ")}</strong><small>Interacções registadas</small></article>
          <article><span>Produtos activos</span><strong>{activeProducts}</strong><small>Inventário empresarial e parceiro</small></article>
        </section>

        <section className={styles.panel} aria-labelledby="finance-reconciliation-title">
          <div className={styles.panelHead}><div><span className={styles.kicker}>00 · Controlo financeiro integrado</span><h2 id="finance-reconciliation-title">Reconciliação operacional</h2><p>Resumo conjunto de pagamentos, documentos, créditos, campanhas e serviços, calculado no PostgreSQL e protegido por autorização Super Admin.</p></div><span className={styles.counter}>{finance?.generated_at ? formatDate(finance.generated_at) : "Sem leitura"}</span></div>
          {financeOverviewError || !finance ? <div className={styles.empty}><strong>Reconciliação indisponível.</strong><p>Não foi possível obter o resumo financeiro. Os restantes módulos continuam disponíveis; não são apresentados valores presumidos.</p></div> : <>
            <div className={styles.metrics}>
              <article><span>Carteiras</span><strong>{finance.wallets?.wallet_count ?? 0}</strong><small>{Number(finance.wallets?.wallet_balance ?? 0).toLocaleString("pt-MZ")} créditos disponíveis</small></article>
              <article><span>Divergências de saldo</span><strong>{finance.reconciliation?.wallet_balance_mismatches ?? 0}</strong><small>Carteira versus ledger</small></article>
              <article><span>Pagamentos/documentos</span><strong>{finance.reconciliation?.payment_document_mismatches ?? 0}</strong><small>Estados incompatíveis</small></article>
              <article><span>Compras sem movimento</span><strong>{finance.reconciliation?.paid_credit_purchases_missing_ledger ?? 0}</strong><small>Compras pagas sem lançamento</small></article>
              <article><span>Serviços por rever</span><strong>{finance.reconciliation?.service_payment_issues ?? 0}</strong><small>{Number(finance.reconciliation?.service_orders_checked ?? 0).toLocaleString("pt-MZ")} ordens verificadas integralmente</small></article>
              <article><span>Callbacks por rever</span><strong>{finance.reconciliation?.callbacks_needing_review ?? 0}</strong><small>Eventos rejeitados ou em retry</small></article>
            </div>
            <div className={styles.productList}>
              <article className={styles.product}><div className={styles.productMain}><h3>Pagamentos</h3><p>Estado e método de cobrança</p>{(finance.payments ?? []).map((x,i)=><small key={x.status + (x.method ?? "") + i}>{x.status} · {x.method} · {x.count} · {financeMoney(x.amount_mzn)}</small>)}</div></article>
              <article className={styles.product}><div className={styles.productMain}><h3>Documentos financeiros</h3><p>Facturas, recibos e documentos de compra</p>{(finance.documents ?? []).map((x,i)=><small key={x.status + (x.type ?? "") + i}>{x.status} · {x.type} · {x.count} · {financeMoney(x.amount_mzn)}</small>)}</div></article>
              <article className={styles.product}><div className={styles.productMain}><h3>Compras de créditos</h3><p>Pedidos, pagamentos e créditos atribuídos</p>{(finance.credit_purchases ?? []).map(x=><small key={x.status}>{x.status} · {x.count} pedidos · {financeMoney(x.amount_mzn)} · {Number(x.credits ?? 0).toLocaleString("pt-MZ")} créditos</small>)}</div></article>
              <article className={styles.product}><div className={styles.productMain}><h3>Publicidade e estornos</h3><p>Campanhas por estado e método de pagamento</p>{(finance.promotions ?? []).map((x,i)=><small key={x.status + (x.payment_method ?? "") + i}>{x.status} · {x.payment_method} · {x.count} campanhas · {financeMoney(x.budget_mzn)} · {Number(x.credits_charged ?? 0).toLocaleString("pt-MZ")} créditos</small>)}<small>Cancelamentos: {finance.promotion_cancellations?.cancellation_count ?? 0} · Créditos devolvidos: {Number(finance.promotion_cancellations?.credits_refunded ?? 0).toLocaleString("pt-MZ")}</small></div></article>
            </div>
          </>}
        <section className={styles.panel} aria-labelledby="f327-title">
          <div className={styles.panelHead}><div><span className={styles.kicker}>01 · F3.27 reconciliação transversal</span><h2 id="f327-title">Integridade de parceiros, facturas e transferências</h2><p>Validação cruzada entre ordens publicitárias, pagamentos, documentos e estornos. Sem presumir correcções automáticas.</p></div></div>
          {transversalReconciliationError || !f327 ? <div className={styles.empty}><strong>Reconciliação transversal indisponível.</strong><p>O RPC F3.27 não retornou dados; não apresentamos números fictícios.</p></div> : <div className={styles.metrics}><article><span>Ordens de parceiros</span><strong>{f327.partner_ad_orders_checked}</strong><small>{f327.partner_ad_order_issues} divergências</small></article><article><span>Documentos parceiros</span><strong>{f327.partner_documents_checked}</strong><small>{f327.partner_document_issues} divergências</small></article><article><span>Transferências bancárias</span><strong>{f327.bank_transfers_checked}</strong><small>{f327.bank_transfer_issues} divergências</small></article><article><span>Carteiras</span><strong>{f327.wallet_balance_mismatches}</strong><small>Saldo versus ledger</small></article></div>}
        </section>
        </section>

        <section className={styles.panel} aria-labelledby="f328-title">
          <div className={styles.panelHead}><div><span className={styles.kicker}>02 · F3.28 auditoria de integridade</span><h2 id="f328-title">Divergências financeiras com detalhe de registo</h2><p>Auditoria de pagamentos, facturas, créditos, callbacks, serviços, estornos e saldo de carteiras. Não executa correcções automáticas.</p></div></div>
          {financialAuditError || !audit328 ? <div className={styles.empty}><strong>Auditoria detalhada indisponível.</strong><p>O RPC F3.28 não retornou dados; não apresentamos contagens presumidas.</p></div> : <><div className={styles.metrics}><article><span>Divergências totais</span><strong>{audit328.total_issues ?? 0}</strong><small>Registos identificados</small></article><article><span>Erros</span><strong>{audit328.error_count ?? 0}</strong><small>Requerem intervenção</small></article><article><span>Avisos</span><strong>{audit328.warning_count ?? 0}</strong><small>Requerem revisão</small></article><article><span>Linhas de detalhe</span><strong>{(audit328.issues ?? []).length}</strong><small>Máximo 100 amostras</small></article></div><div className={styles.auditCodes}>{Object.entries(audit328.issue_codes ?? {}).map(([code,count])=><div className={styles.auditCode} key={code}><strong>{code}</strong><span>{count}</span></div>)}</div><div className={styles.auditSamples}>{(audit328.issues ?? []).slice(0,25).map((issue,i)=><article className={styles.auditSample} key={issue.record_id+issue.issue_code+i}><div><span className={styles.auditModule}>{issue.module} · {issue.severity}</span><strong>{issue.issue_code}</strong><p>{issue.summary}</p><small>{issue.record_id} · {issue.occurred_at ? formatDate(issue.occurred_at) : "Sem data"}</small></div></article>)}</div></>}
        </section>
        <section className={styles.panel} aria-labelledby="plans-title">
          <div className={styles.panelHead}><div><span className={styles.kicker}>01 · Planos empresariais</span><h2 id="plans-title">Estrutura comercial</h2><p>Consulta dos preços e da disponibilidade configurados para cada plano.</p></div><span className={styles.counter}>{planRows.length} planos</span></div>
          {planRows.length ? <div className={styles.planGrid}>{planRows.map(plan => <article className={styles.planCard} key={plan.id}>
            <div className={styles.planTop}><span className={styles.code}>{plan.code}</span><span className={`${styles.state} ${plan.active ? styles.stateActive : styles.stateInactive}`}>{plan.active ? "Activo" : "Inactivo"}</span></div>
            <h3>{plan.name}</h3><p>{plan.description || "Sem descrição comercial."}</p>
            <div className={styles.planPrice}><strong>{formatMoney(plan.monthly_price, plan.currency || "MZN")}</strong><span>/ mês</span></div>
          </article>)}</div> : <div className={styles.empty}><strong>Não existem planos para apresentar.</strong><p>{plansError ? "A consulta dos planos falhou." : "O catálogo de planos está vazio."}</p></div>}
        </section>

        <section className={styles.panel} aria-labelledby="inventory-title">
          <div className={styles.panelHead}><div><span className={styles.kicker}>02 · Inventário comercial</span><h2 id="inventory-title">Catálogo de espaços publicitários</h2><p>Produtos separados por experiência empresarial e de parceiros.</p></div><span className={styles.counter}>{products.length} formatos</span></div>
          {products.length ? <div className={styles.productList}>{products.map(product => <article className={styles.product} key={product.experience + product.id}>
            <div className={styles.productMain}><div className={styles.productTags}><span>{product.experience}</span><span>{product.surface || "Área empresarial"}</span></div><h3>{product.name}</h3><p>{product.description || "Sem descrição."}</p><small>{product.code} · {product.placement || "Sem placement"} · {product.slot || "Slot não definido"}</small></div>
            <div className={styles.productDetails}><strong>{product.price}</strong><span>{product.duration ? `${product.duration} dias` : "Duração personalizada"}</span><span>Capacidade: {product.capacity ?? "Não definida"}</span><span className={`${styles.state} ${product.active ? styles.stateActive : styles.stateInactive}`}>{product.active ? "Activo" : "Inactivo"}</span></div>
          </article>)}</div> : <div className={styles.empty}><strong>Nenhum formato publicitário registado.</strong><p>{businessProductsError || partnerProductsError ? "Não foi possível carregar o inventário." : "O catálogo de produtos está vazio."}</p></div>}
        </section>

        <section className={styles.panel} aria-labelledby="promotions-title">
          <div className={styles.panelHead}><div><span className={styles.kicker}>03 · Actividade comercial</span><h2 id="promotions-title">Promoções empresariais recentes</h2><p>Resumo dos registos de promoção e respectivos períodos de execução.</p></div><span className={styles.counter}>{promotionRows.length} registos</span></div>
          {promotionRows.length ? <div className={styles.promotionList}>{promotionRows.map(p => {
            const business = Array.isArray(p.businesses) ? p.businesses[0] : p.businesses;
            const statusKey = String(p.status ?? "").toUpperCase();
            return <article className={styles.promotion} key={p.id}>
              <div className={styles.promotionMain}><span className={styles.placement}>{p.placement || "Placement não definido"}</span><h3>{p.title}</h3><p>{business?.name || "Empresa não identificada"}</p><small>{formatDate(p.starts_at)} — {formatDate(p.ends_at)}</small></div>
              <div className={styles.promotionAside}><span className={`${styles.state} ${["ACTIVE", "RUNNING", "APPROVED"].includes(statusKey) ? styles.stateActive : ["EXPIRED", "CANCELLED", "INACTIVE"].includes(statusKey) ? styles.stateInactive : styles.statePending}`}>{statusLabels[statusKey] || statusKey || "Sem estado"}</span><strong>{formatMoney(p.budget, p.currency || "MZN")}</strong><small>Orçamento registado</small></div>
            </article>;
          })}</div> : <div className={styles.empty}><strong>Nenhuma promoção registada.</strong><p>{promotionsError ? "Não foi possível carregar as promoções." : "Quando existirem campanhas empresariais, serão listadas aqui."}</p></div>}
        </section>
      </div>
    </main>
  );
}
