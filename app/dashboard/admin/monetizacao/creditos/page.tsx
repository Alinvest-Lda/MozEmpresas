export const dynamic = "force-dynamic";

import { getSuperAdminContext } from "@/lib/auth/super-admin";
import styles from "./creditos.module.css";

const money = (value: number | string | null) => value == null ? "—" : `${Number(value).toLocaleString("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MZN`;
const dateTime = (value: string) => new Date(value).toLocaleString("pt-MZ", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Maputo" });
const statusLabel: Record<string, string> = { REQUESTED: "Por validar", PENDING: "Pendente", APPROVED: "Aprovado", REJECTED: "Recusado", PAID: "Pago", CANCELLED: "Cancelado" };

export default async function AdminCreditsPage() {
  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) return null;

  const [
    { data: packages, error: packagesError },
    { data: requests, error: requestsError },
    { data: wallets, error: walletsError },
    { data: transactions, error: transactionsError },
  ] = await Promise.all([
    supabase.from("credit_packages").select("id,code,name,credit_volume,price_mzn,active").order("credit_volume"),
    supabase.from("credit_purchase_requests").select("id,business_id,credits,amount_mzn,payment_method,status,created_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("business_credit_wallets").select("id,business_id,balance_credits").order("balance_credits", { ascending: false }).limit(100),
    supabase.from("credit_transactions").select("id,wallet_id,type,credits,amount_mzn,description,created_at").order("created_at", { ascending: false }).limit(30),
  ]);

  const packageRows = packages ?? [];
  const requestRows = requests ?? [];
  const walletRows = wallets ?? [];
  const transactionRows = transactions ?? [];
  const businessIds = [...new Set([...requestRows.map((item) => item.business_id), ...walletRows.map((item) => item.business_id)])];
  const { data: businesses, error: businessesError } = businessIds.length
    ? await supabase.from("businesses").select("id,name").in("id", businessIds)
    : { data: [], error: null };
  const businessNames = new Map((businesses ?? []).map((item) => [item.id, item.name]));
  const walletIds = new Set(walletRows.map((wallet) => wallet.id));
  const recentTransactions = transactionRows.filter((item) => walletIds.has(item.wallet_id)).slice(0, 20);
  const pendingCount = requestRows.filter((item) => ["REQUESTED", "PENDING"].includes(String(item.status).toUpperCase())).length;
  const totalBalance = walletRows.reduce((sum, wallet) => sum + Number(wallet.balance_credits || 0), 0);
  const queryErrors = [packagesError, requestsError, walletsError, transactionsError, businessesError].filter(Boolean).length;

  return (
    <main className={`dashboard-main admin-workspace ${styles.page}`}>
      <div className={`dashboard-content ${styles.content}`}>
        <header className={styles.header}>
          <div><span className={styles.eyebrow}>Monetização · Gestão de créditos</span><h1>Créditos da plataforma</h1><p>Consulta dos pacotes comerciais, pedidos de compra, saldos empresariais e movimentos registados.</p></div>
          <a className={styles.backLink} href="/dashboard/admin/monetizacao">Voltar à monetização</a>
        </header>

        {queryErrors > 0 ? <div className={styles.notice} role="status">Algumas consultas não puderam ser concluídas. Os dados apresentados podem estar incompletos.</div> : null}

        <section className={styles.metrics} aria-label="Indicadores de créditos">
          <article><span>Pacotes activos</span><strong>{packageRows.filter((item) => item.active).length}</strong><small>{packageRows.length} no catálogo</small></article>
          <article><span>Pedidos por validar</span><strong>{pendingCount}</strong><small>Nos últimos 50 pedidos carregados</small></article>
          <article><span>Carteiras empresariais</span><strong>{walletRows.length}</strong><small>Até 100 carteiras carregadas</small></article>
          <article><span>Saldo agregado</span><strong>{totalBalance.toLocaleString("pt-MZ")}</strong><small>Créditos nas carteiras carregadas</small></article>
        </section>

        <section className={styles.panel} aria-labelledby="requests-title">
          <div className={styles.panelHeading}><div><span className={styles.kicker}>01 · Operações</span><h2 id="requests-title">Pedidos de compra</h2><p>Pedidos mais recentes submetidos pelas empresas.</p></div><span className={styles.counter}>{requestRows.length} registos · máximo 50</span></div>
          {requestRows.length ? <div className={styles.list}>{requestRows.map((request) => {
            const status = String(request.status || "").toUpperCase();
            const pending = ["REQUESTED", "PENDING"].includes(status);
            return <article className={styles.row} key={request.id}>
              <div className={styles.primary}><strong>{businessNames.get(request.business_id) || "Empresa não identificada"}</strong><span>{Number(request.credits).toLocaleString("pt-MZ")} créditos · {money(request.amount_mzn)}</span><small>{dateTime(request.created_at)} · {request.payment_method || "Método não indicado"}</small></div>
              <span className={`${styles.status} ${pending ? styles.pending : status === "APPROVED" || status === "PAID" ? styles.approved : styles.neutral}`}>{statusLabel[status] || status || "Sem estado"}</span>
            </article>;
          })}</div> : <div className={styles.empty}><strong>Sem pedidos de compra.</strong><p>Os novos pedidos submetidos pelas empresas serão apresentados aqui.</p></div>}
          <p className={styles.readOnlyNote}>Esta vista é de consulta. A validação financeira e a atribuição de créditos não são executadas nesta página.</p>
        </section>

        <section className={styles.panel} aria-labelledby="packages-title">
          <div className={styles.panelHeading}><div><span className={styles.kicker}>02 · Catálogo</span><h2 id="packages-title">Pacotes de créditos</h2><p>Volumes e preços actualmente configurados.</p></div><span className={styles.counter}>{packageRows.length} pacotes</span></div>
          {packageRows.length ? <div className={styles.packageGrid}>{packageRows.map((item) => <article className={styles.package} key={item.id}>
            <div><span className={styles.code}>{item.code}</span><span className={`${styles.status} ${item.active ? styles.approved : styles.neutral}`}>{item.active ? "Activo" : "Inactivo"}</span></div>
            <h3>{item.name}</h3><strong>{Number(item.credit_volume).toLocaleString("pt-MZ")} créditos</strong><span>{money(item.price_mzn)}</span>
            <small>{Number(item.credit_volume) > 0 ? `${(Number(item.price_mzn) / Number(item.credit_volume)).toLocaleString("pt-MZ", { maximumFractionDigits: 4 })} MZN por crédito` : "Conversão indisponível"}</small>
          </article>)}</div> : <div className={styles.empty}><strong>Catálogo vazio.</strong><p>{packagesError ? "Não foi possível consultar os pacotes." : "Ainda não existem pacotes configurados."}</p></div>}
        </section>

        <section className={styles.panel} aria-labelledby="wallets-title">
          <div className={styles.panelHeading}><div><span className={styles.kicker}>03 · Saldos</span><h2 id="wallets-title">Carteiras empresariais</h2><p>Saldos por empresa, ordenados pelo volume disponível.</p></div><span className={styles.counter}>{walletRows.length} carteiras · máximo 100</span></div>
          {walletRows.length ? <div className={styles.list}>{walletRows.map((wallet) => <article className={styles.row} key={wallet.id}>
            <div className={styles.primary}><strong>{businessNames.get(wallet.business_id) || "Empresa não identificada"}</strong><small>Carteira empresarial</small></div>
            <strong className={styles.balance}>{Number(wallet.balance_credits || 0).toLocaleString("pt-MZ")} cr</strong>
          </article>)}</div> : <div className={styles.empty}><strong>Sem carteiras para apresentar.</strong><p>As carteiras empresariais serão listadas quando existirem.</p></div>}
        </section>

        <section className={styles.panel} aria-labelledby="transactions-title">
          <div className={styles.panelHeading}><div><span className={styles.kicker}>04 · Rastreabilidade</span><h2 id="transactions-title">Movimentos recentes</h2><p>Últimos movimentos registados no livro de créditos.</p></div><span className={styles.counter}>{recentTransactions.length} movimentos · máximo 20</span></div>
          {recentTransactions.length ? <div className={styles.list}>{recentTransactions.map((item) => {
            const wallet = walletRows.find((candidate) => candidate.id === item.wallet_id);
            const credits = Number(item.credits || 0);
            return <article className={styles.row} key={item.id}>
              <div className={styles.primary}><strong>{businessNames.get(wallet?.business_id || "") || "Empresa não identificada"}</strong><span>{item.description || item.type || "Movimento de créditos"}</span><small>{dateTime(item.created_at)} · {item.type}</small></div>
              <strong className={credits >= 0 ? styles.positive : styles.negative}>{credits > 0 ? "+" : ""}{credits.toLocaleString("pt-MZ")} cr</strong>
            </article>;
          })}</div> : <div className={styles.empty}><strong>Sem movimentos.</strong><p>Os movimentos de crédito registados serão apresentados aqui.</p></div>}
        </section>
      </div>
    </main>
  );
}
