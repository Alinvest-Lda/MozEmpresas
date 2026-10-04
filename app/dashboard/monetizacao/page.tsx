export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getManagedBusinessIds } from "@/lib/businesses/permissions";

function money(value: number | string | null | undefined) {
  return value == null ? "—" : Number(value).toLocaleString("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " MZN";
}

export default async function MonetizacaoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const businessIds = await getManagedBusinessIds(supabase, user.id);
  const [{ data: businesses }, { data: wallets }, { data: promotions }, { data: serviceOrders }, { data: creditRequests }] = await Promise.all([
    businessIds.length ? supabase.from("businesses").select("id,name").in("id", businessIds).order("name") : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    businessIds.length ? supabase.from("business_credit_wallets").select("business_id,balance_credits").in("business_id", businessIds) : Promise.resolve({ data: [] as { business_id: string; balance_credits: number }[] }),
    businessIds.length ? supabase.from("business_promotions").select("id,status,price_mzn,credits_charged,created_at").in("business_id", businessIds).order("created_at", { ascending: false }).limit(8) : Promise.resolve({ data: [] }),
    businessIds.length ? supabase.from("platform_service_orders").select("id,status,amount_mzn,created_at").in("business_id", businessIds).order("created_at", { ascending: false }).limit(8) : Promise.resolve({ data: [] }),
    businessIds.length ? supabase.from("credit_purchase_requests").select("id,status,amount_mzn,credits,created_at").in("business_id", businessIds).order("created_at", { ascending: false }).limit(8) : Promise.resolve({ data: [] }),
  ]);

  const balance = (wallets ?? []).reduce((sum, item) => sum + Number(item.balance_credits), 0);
  const activePromotions = (promotions ?? []).filter(item => item.status === "ACTIVE" || item.status === "PENDING").length;
  const pendingPurchases = (creditRequests ?? []).filter(item => item.status === "REQUESTED" || item.status === "PENDING").length;
  const recentActivity = [
    ...(promotions ?? []).map(item => ({ id: "p-" + item.id, label: "Publicidade", status: item.status, value: item.credits_charged ? item.credits_charged.toLocaleString("pt-MZ") + " créditos" : money(item.price_mzn), date: item.created_at })),
    ...(serviceOrders ?? []).map(item => ({ id: "s-" + item.id, label: "Serviço MozEmpresas", status: item.status, value: money(item.amount_mzn), date: item.created_at })),
    ...(creditRequests ?? []).map(item => ({ id: "c-" + item.id, label: "Compra de créditos", status: item.status, value: item.credits.toLocaleString("pt-MZ") + " créditos", date: item.created_at })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);

  return (
    <main className="dashboard-main">
      <div className="dashboard-content">
        <header className="dashboard-topbar monetization-hero">
          <div>
            <span className="dashboard-kicker">Conta · Monetização</span>
            <h1>Monetização</h1>
            <p>Um único centro para controlar créditos, publicidade e serviços pagos das empresas que representa.</p>
          </div>
          <div className="monetization-hero-actions">
            <Link href="/dashboard/monetizacao/creditos" className="btn primary">Comprar créditos →</Link>
            <Link href="/dashboard/publicidade" className="btn">Criar campanha</Link>
          </div>
        </header>

        <section className="monetization-state responsive-state-block">
          <article><span>Saldo total</span><strong>{balance.toLocaleString("pt-MZ")} cr</strong><small>somatório das carteiras das empresas sob gestão</small></article>
          <article><span>Publicidade activa</span><strong>{activePromotions}</strong><small>campanhas activas ou pendentes</small></article>
          <article><span>Pedidos de créditos</span><strong>{pendingPurchases}</strong><small>aguardam processamento</small></article>
          <article><span>Empresas</span><strong>{businesses?.length ?? 0}</strong><small>com representação autorizada</small></article>
        </section>

        <section className="monetization-module-grid">
          <Link href="/dashboard/monetizacao/creditos" className="monetization-module-card">
            <span className="dashboard-kicker">01 · Pré-pago</span>
            <h2>Créditos</h2>
            <p>Compre saldo, acompanhe pedidos e consulte todos os movimentos das carteiras empresariais.</p>
            <strong>Gerir créditos →</strong>
          </Link>
          <Link href="/dashboard/publicidade" className="monetization-module-card">
            <span className="dashboard-kicker">02 · Visibilidade</span>
            <h2>Publicidade</h2>
            <p>Escolha espaço, duração e audiência. O preço é calculado antes da activação da campanha.</p>
            <strong>Gerir publicidade →</strong>
          </Link>
          <Link href="/dashboard/servicos" className="monetization-module-card">
            <span className="dashboard-kicker">03 · Serviços</span>
            <h2>Serviços MozEmpresas</h2>
            <p>Contrate serviços da plataforma e acompanhe prazo, estado, valor e recorrência.</p>
            <strong>Ver serviços →</strong>
          </Link>
          <Link href="/dashboard/financeiro" className="monetization-module-card">
            <span className="dashboard-kicker">04 · Controlo</span>
            <h2>Gestão financeira</h2>
            <p>Veja pagamentos, documentos, compras e movimentos financeiros relacionados com a utilização da plataforma.</p>
            <strong>Ver gestão financeira →</strong>
          </Link>
        </section>

        <section className="dashboard-section monetization-activity">
          <div className="dashboard-section-head">
            <div><span className="dashboard-kicker">Acompanhamento</span><h2>Actividade recente</h2><p>Os movimentos mais recentes de monetização das suas empresas.</p></div>
          </div>
          {recentActivity.length ? recentActivity.map(item => (
            <div className="monetization-activity-row" key={item.id}>
              <div><strong>{item.label}</strong><small>{new Date(item.date).toLocaleString("pt-MZ")}</small></div>
              <div><strong>{item.value}</strong><span>{item.status}</span></div>
            </div>
          )) : <p className="muted">Ainda não existem movimentos de monetização.</p>}
        </section>
      </div>
    </main>
  );
}
