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
  ] = await Promise.all([
    supabase.from("platform_plans").select("id,code,name,description,monthly_price,currency,active").order("monthly_price"),
    supabase.from("business_promotions").select("id,title,placement,status,budget,currency,starts_at,ends_at,created_at,businesses:business_id(name)").order("created_at", { ascending: false }).limit(30),
    supabase.from("business_plan_subscriptions").select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
    supabase.from("ad_products").select("id,code,name,placement,slot,description,duration_days,direct_price_mzn,credit_price,capacity,active").order("placement").order("name"),
    supabase.from("partner_ad_products").select("id,code,name,placement,surface,slot,description,duration_days,price_mzn,capacity,active").order("surface").order("placement"),
    supabase.from("ad_delivery_events").select("id", { count: "exact", head: true }).eq("event_type", "IMPRESSION"),
    supabase.from("ad_delivery_events").select("id", { count: "exact", head: true }).eq("event_type", "CLICK"),
  ]);

  const planRows = plans ?? [];
  const businessProducts = businessAdProducts ?? [];
  const partnerProducts = partnerAdProducts ?? [];
  const promotionRows = promotions ?? [];
  const activePlans = planRows.filter(p => p.active).length;
  const activeProducts = [...businessProducts, ...partnerProducts].filter(p => p.active).length;
  const queryErrors = [plansError, promotionsError, subscriptionsError, businessProductsError, partnerProductsError, impressionsError, clicksError].filter(Boolean).length;

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
          <div className={styles.heroSummary}><span>Formatos activos</span><strong>{activeProducts}</strong><small>{products.length} formatos registados no catálogo</small></div>
          <span className={styles.heroMark} aria-hidden="true">M</span>
        </header>

        {queryErrors > 0 ? <div className={styles.dataNotice} role="status}><strong>Alguns indicadores podem estar incompletos.</strong> Não foi possível carregar {queryErrors} consulta(s). Os valores apresentados reflectem apenas os dados disponíveis.</div> : null}

        <section className={styles.metrics} aria-label="Indicadores de monetização">
          <article><span>Planos activos</span><strong>{activePlans}</strong><small>{planRows.length} planos no catálogo</small></article>
          <article><span>Assinaturas activas</span><strong>{subscriptions ?? "—"}</strong><small>Empresas com plano activo</small></article>
          <article><span>Promoções recentes</span><strong>{promotionRows.length}</strong><small>Máximo de 30 registos recentes</small></article>
          <article><span>Impressões</span><strong>{impressions == null ? "—" : impressions.toLocaleString("pt-MZ")}</strong><small>Eventos de exibição registados</small></article>
          <article><span>Cliques</span><strong>{clicks == null ? "—" : clicks.toLocaleString("pt-MZ")}</strong><small>Interacções registadas</small></article>
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
          <div className={styles.panelHead}><div><span className={styles.kicker}>02 · Inventário comercial</span><h2 id="inventory-title">Catálogo de espaços publicitários</h2><p>Produtos apresentados separadamente por experiência empresarial e de parceiros.</p></div><span className={styles.counter}>{products.length} formatos</span></div>
          <div className={styles.inventorySummary}>
            <article><span>Área empresarial</span><strong>{businessProducts.length}</strong><small>Produtos e espaços promocionais</small></article>
            <article><span>Área de parceiros</span><strong>{partnerProducts.length}</strong><small>Formatos contratáveis por parceiros</small></article>
            <article><span>Disponíveis</span><strong>{activeProducts}</strong><small>Produtos marcados como activos</small></article>
          </div>
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
        <p className={styles.footerNote}>Esta página é de consulta. A edição de preços, planos e produtos deve ser implementada com validação das regras comerciais e permissões correspondentes.</p>
      </div>
    </main>
  );
}
