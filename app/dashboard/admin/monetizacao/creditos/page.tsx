export const dynamic = "force-dynamic";

import { getSuperAdminContext } from "@/lib/auth/super-admin";
import { randomUUID } from "node:crypto";
import styles from "./creditos.module.css";
import { decideCreditPurchase, adjustCreditWallet } from "@/lib/credit-purchases/admin-actions";

const money = (value: number | string | null) => value == null ? "—" : `${Number(value).toLocaleString("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MZN`;
const dateTime = (value: string) => new Date(value).toLocaleString("pt-MZ", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Maputo" });
const statusLabel: Record<string, string> = { REQUESTED: "Por validar", PAYMENT_PENDING: "A aguardar pagamento", PENDING: "Pendente", APPROVED: "Aprovado", REJECTED: "Recusado", PAID: "Pago", CANCELLED: "Cancelado" };

export default async function AdminCreditsPage({ searchParams }: { searchParams: Promise<{ decision?: string; adjustment?: string; from?: string; to?: string }> }) {
  const params = await searchParams;
  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) return null;

  const todayMaputo = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Maputo" }).format(new Date());
  const defaultReportFrom = todayMaputo.slice(0, 7) + "-01";
  const reportFrom = /^\d{4}-\d{2}-\d{2}$/.test(params.from || "") ? params.from! : defaultReportFrom;
  const reportTo = /^\d{4}-\d{2}-\d{2}$/.test(params.to || "") ? params.to! : todayMaputo;
  const { data: financialReportData, error: financialReportError } = await supabase.rpc("admin_credit_financial_report", {
    p_from: reportFrom,
    p_to: reportTo,
  });
  const financialReport = financialReportData as {
    wallets?: { wallet_count: number; current_balance: number; ledger_balance: number; mismatch_count: number };
    reconciliation?: { mismatch_count: number; mismatches: Array<{ wallet_id: string; business_id: string; business_name: string; balance_credits: number; ledger_balance: number; difference: number; transaction_count: number }> };
    purchases?: { purchase_count: number; received_mzn: number; credits_sold: number };
    pending?: { request_count: number; amount_mzn: number; credits: number };
    ledger_movements?: Array<{ type: string; reference_type: string; transaction_count: number; credits_delta: number; amount_mzn: number }>;
    callbacks?: { event_count: number; needs_review: number; processed: number; repeated_deliveries: number };
  } | null;

  const [
    { data: packages, error: packagesError },
    { data: requests, error: requestsError },
    { data: wallets, error: walletsError },
  ] = await Promise.all([
    supabase.from("credit_packages").select("id,code,name,credit_volume,price_mzn,active").order("credit_volume"),
    supabase.from("credit_purchase_requests").select("id,business_id,credits,amount_mzn,payment_method,status,created_at,proof_path,notes,payment_reference,provider_transaction_id,payment_confirmed_at").order("created_at", { ascending: false }).limit(50),
    supabase.from("business_credit_wallets").select("id,business_id,balance_credits").order("balance_credits", { ascending: false }).limit(100),
  ]);

  const packageRows = packages ?? [];
  const requestRows = requests ?? [];
  const walletRows = wallets ?? [];
  const walletIds = walletRows.map((wallet) => wallet.id);
  const { data: transactions, error: transactionsError } = walletIds.length
    ? await supabase.from("credit_transactions").select("id,wallet_id,type,credits,amount_mzn,description,created_at").in("wallet_id", walletIds).order("created_at", { ascending: false }).limit(20)
    : { data: [], error: null };
  const transactionRows = transactions ?? [];
  const requestIds = requestRows.map((item) => item.id);
  const { data: paymentEvents, error: paymentEventsError } = requestIds.length
    ? await supabase.from("credit_payment_events")
      .select("id,request_id,provider,provider_transaction_id,payment_reference,amount_mzn,currency,event_type,processed_at")
      .in("request_id", requestIds)
      .order("processed_at", { ascending: false })
    : { data: [], error: null };
  const paymentEventRows = paymentEvents ?? [];
  const { data: callbackEvents, error: callbackEventsError } = await supabase
    .from("credit_payment_callback_events")
    .select("id,provider_transaction_id,payment_reference,amount_mzn,currency,callback_status,processing_status,processing_error_code,request_id,delivery_count,first_received_at,last_received_at,processed_at")
    .order("last_received_at", { ascending: false })
    .limit(100);
  const callbackRows = callbackEvents ?? [];
  const { data: adjustmentEvents, error: adjustmentEventsError } = await supabase
    .from("credit_wallet_adjustment_events")
    .select("id,wallet_id,business_id,actor_user_id,delta_credits,reason,balance_before,balance_after,transaction_id,created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  const adjustmentRows = adjustmentEvents ?? [];
  const callbackStatusCounts = callbackRows.reduce<Record<string, number>>((counts, event) => {
    counts[event.processing_status] = (counts[event.processing_status] || 0) + 1;
    return counts;
  }, {});
  const eventsByRequest = new Map<string, typeof paymentEventRows>();
  for (const event of paymentEventRows) {
    eventsByRequest.set(event.request_id, [...(eventsByRequest.get(event.request_id) ?? []), event]);
  }
  const businessIds = [...new Set([...requestRows.map((item) => item.business_id), ...walletRows.map((item) => item.business_id), ...adjustmentRows.map((item) => item.business_id)])];
  const { data: businesses, error: businessesError } = businessIds.length
    ? await supabase.from("businesses").select("id,name").in("id", businessIds)
    : { data: [], error: null };
  const businessNames = new Map((businesses ?? []).map((item) => [item.id, item.name]));
  const recentTransactions = transactionRows;
  const statusCounts = requestRows.reduce<Record<string, number>>((counts, item) => {
    const status = String(item.status || "UNKNOWN").toUpperCase();
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
  const pendingRequests = requestRows.filter((item) => ["REQUESTED", "PAYMENT_PENDING", "PENDING"].includes(String(item.status).toUpperCase()));
  const pendingCount = pendingRequests.length;
  const pendingAmount = pendingRequests.reduce((sum, item) => sum + Number(item.amount_mzn || 0), 0);
  const pendingCredits = pendingRequests.reduce((sum, item) => sum + Number(item.credits || 0), 0);
  const totalBalance = walletRows.reduce((sum, wallet) => sum + Number(wallet.balance_credits || 0), 0);
  const paidRequests = requestRows.filter((item) => String(item.status).toUpperCase() === "PAID");
  const paidAmount = paidRequests.reduce((sum, item) => sum + Number(item.amount_mzn || 0), 0);
  const reconciliationIssues = requestRows.filter((item) => {
    const events = eventsByRequest.get(item.id) ?? [];
    if (String(item.status).toUpperCase() === "PAID" && item.payment_method === "MPESA") {
      return !item.provider_transaction_id || events.length !== 1 ||
        (events[0] && (events[0].payment_reference !== item.payment_reference ||
          Number(events[0].amount_mzn) !== Number(item.amount_mzn)));
    }
    return events.length > 0 && String(item.status).toUpperCase() !== "PAID";
  });
  const queryErrors = [packagesError, requestsError, walletsError, transactionsError, businessesError, paymentEventsError, callbackEventsError, adjustmentEventsError].filter(Boolean).length;

  return (
    <main className={`dashboard-main admin-workspace ${styles.page}`}>
      <div className={`dashboard-content ${styles.content}`}>
        <header className={styles.header}>
          <div><span className={styles.eyebrow}>Monetização · Gestão de créditos</span><h1>Créditos da plataforma</h1><p>Consulta dos pacotes comerciais, pedidos de compra, saldos empresariais e movimentos registados.</p></div>
          <a className={styles.backLink} href="/dashboard/admin/monetizacao">Voltar à monetização</a>
        </header>

        {queryErrors > 0 ? <div className={styles.notice} role="status">Algumas consultas não puderam ser concluídas. Os dados apresentados podem estar incompletos.</div> : null}
        {params.adjustment ? <div className={styles.notice} role="status">{({
          success: "Ajuste registado no ledger e no saldo da carteira.",
          invalid: "Indique um valor inteiro diferente de zero e uma justificação entre 10 e 500 caracteres.",
          insufficient: "O ajuste não pode deixar o saldo da carteira negativo.",
          missing: "A carteira indicada não foi encontrada.",
          conflict: "A chave de idempotência já foi utilizada com dados diferentes.",
          forbidden: "Não tem autorização para ajustar carteiras.",
          failed: "Não foi possível registar o ajuste. Nenhum saldo deve ser considerado alterado.",
        } as Record<string, string>)[params.adjustment] || "Operação de ajuste concluída."}</div> : null}
        {params.decision ? <div className={styles.notice} role="status">{({
          success: "Decisão registada. Os saldos e movimentos foram actualizados.",
          final: "Este pedido já foi concluído e não pode ser alterado.",
          missing: "O pedido indicado não foi encontrado.",
          forbidden: "Não tem autorização para executar esta operação.",
          invalid: "Os dados da decisão são inválidos.",
          failed: "Não foi possível concluir a decisão. Verifique o estado do pedido e tente novamente.",
        } as Record<string, string>)[params.decision] || "Operação concluída."}</div> : null}

        <section className={styles.metrics} aria-label="Indicadores de créditos">
          <article><span>Pacotes activos</span><strong>{packageRows.filter((item) => item.active).length}</strong><small>{packageRows.length} no catálogo</small></article>
          <article><span>Pedidos por validar</span><strong>{pendingCount}</strong><small>Nos últimos 50 pedidos carregados</small></article>
          <article><span>Valor em análise</span><strong>{money(pendingAmount)}</strong><small>{pendingCredits.toLocaleString("pt-MZ")} créditos · pedidos pendentes</small></article>
          <article><span>Carteiras empresariais</span><strong>{walletRows.length}</strong><small>Até 100 carteiras carregadas · saldo agregado {totalBalance.toLocaleString("pt-MZ")} cr</small></article>
          <article><span>Pagamentos confirmados</span><strong>{money(paidAmount)}</strong><small>{paidRequests.length} pedidos pagos · últimos 50 pedidos</small></article>
          <article><span>Callbacks por tratar</span><strong>{(callbackStatusCounts.RETRY || 0) + (callbackStatusCounts.REJECTED || 0)}</strong><small>{callbackRows.length} eventos recentes · máximo 100</small></article>
        </section>

        <section className={styles.panel} aria-labelledby="financial-report-title">
          <div className={styles.panelHeading}>
            <div><span className={styles.kicker}>00 · Relatório consolidado</span><h2 id="financial-report-title">Reconciliação do ledger e indicadores financeiros</h2><p>Valores completos calculados na base de dados, sem limitar a análise aos últimos registos apresentados nas listas.</p></div>
            <span className={styles.counter}>{reportFrom} → {reportTo}</span>
          </div>
          <form method="get" className={styles.reportFilters}>
            <label>De <input type="date" name="from" value={reportFrom} required /></label>
            <label>Até <input type="date" name="to" value={reportTo} required /></label>
            <button className={styles.approveButton} type="submit">Actualizar relatório</button>
          </form>
          {financialReportError || !financialReport ? <div className={styles.empty}><strong>Relatório indisponível.</strong><p>Verifique o intervalo (máximo 366 dias) e as permissões de acesso. Os restantes módulos continuam disponíveis.</p></div> : <>
            <div className={styles.reportMetrics}>
              <article><span>Carteiras</span><strong>{Number(financialReport.wallets?.wallet_count || 0).toLocaleString("pt-MZ")}</strong><small>Saldo total: {Number(financialReport.wallets?.current_balance || 0).toLocaleString("pt-MZ")} cr</small></article>
              <article><span>Créditos no ledger</span><strong>{Number(financialReport.wallets?.ledger_balance || 0).toLocaleString("pt-MZ")}</strong><small>Diferença: {(Number(financialReport.wallets?.current_balance || 0) - Number(financialReport.wallets?.ledger_balance || 0)).toLocaleString("pt-MZ")} cr</small></article>
              <article><span>Compras pagas</span><strong>{money(financialReport.purchases?.received_mzn ?? 0)}</strong><small>{Number(financialReport.purchases?.purchase_count || 0)} compras · {Number(financialReport.purchases?.credits_sold || 0).toLocaleString("pt-MZ")} cr vendidos</small></article>
              <article><span>Pedidos em aberto</span><strong>{Number(financialReport.pending?.request_count || 0)}</strong><small>{money(financialReport.pending?.amount_mzn ?? 0)} · {Number(financialReport.pending?.credits || 0).toLocaleString("pt-MZ")} cr</small></article>
              <article><span>Divergências de saldo</span><strong>{Number(financialReport.reconciliation?.mismatch_count || 0)}</strong><small>Carteiras com saldo diferente do ledger</small></article>
              <article><span>Callbacks a rever</span><strong>{Number(financialReport.callbacks?.needs_review || 0)}</strong><small>{Number(financialReport.callbacks?.event_count || 0)} eventos · {Number(financialReport.callbacks?.repeated_deliveries || 0)} repetições</small></article>
            </div>
            <div className={styles.reportColumns}>
              <div className={styles.reportBlock}>
                <h3>Reconciliação por carteira</h3>
                {financialReport.reconciliation?.mismatches?.length ? financialReport.reconciliation.mismatches.map((item) => <div className={styles.reportRow} key={item.wallet_id}><div><strong>{item.business_name}</strong><small>Saldo {item.balance_credits.toLocaleString("pt-MZ")} cr · Ledger {item.ledger_balance.toLocaleString("pt-MZ")} cr</small></div><strong className={styles.negative}>{item.difference > 0 ? "+" : ""}{item.difference.toLocaleString("pt-MZ")} cr</strong></div>) : <p className={styles.reportEmpty}>Não foram detectadas divergências entre carteiras e ledger.</p>}
              </div>
              <div className={styles.reportBlock}>
                <h3>Movimentos por natureza</h3>
                {financialReport.ledger_movements?.length ? financialReport.ledger_movements.map((item) => <div className={styles.reportRow} key={item.type + item.reference_type}><div><strong>{item.type}</strong><small>{item.reference_type} · {item.transaction_count} movimentos</small></div><strong className={item.credits_delta >= 0 ? styles.positive : styles.negative}>{item.credits_delta > 0 ? "+" : ""}{item.credits_delta.toLocaleString("pt-MZ")} cr</strong></div>) : <p className={styles.reportEmpty}>Sem movimentos no período seleccionado.</p>}
              </div>
            </div>
            <p className={styles.readOnlyNote}>O saldo de cada carteira é comparado com a soma histórica de todos os movimentos. Compras pagas são reportadas separadamente dos consumos de créditos; o valor MZN dos movimentos não representa receita líquida contabilística.</p>
          </>}
        </section>

        <section className={styles.panel} aria-labelledby="requests-title">
          <div className={styles.panelHeading}><div><span className={styles.kicker}>01 · Operações</span><h2 id="requests-title">Pedidos de compra</h2><p>Pedidos mais recentes submetidos pelas empresas.</p></div><span className={styles.counter}>{requestRows.length} registos · máximo 50</span></div>
          {requestRows.length ? <div className={styles.statusSummary} aria-label="Distribuição dos estados dos pedidos">{[["REQUESTED", "Por validar"], ["PAYMENT_PENDING", "A aguardar pagamento"], ["PENDING", "Pendente"], ["APPROVED", "Aprovado"], ["PAID", "Pago"], ["REJECTED", "Recusado"], ["CANCELLED", "Cancelado"]].filter(([status]) => (statusCounts[status] || 0) > 0).map(([status, label]) => <span key={status}>{label}<strong>{statusCounts[status]}</strong></span>)}</div> : null}
          {requestRows.length ? <div className={styles.list}>{requestRows.map((request) => {
            const status = String(request.status || "").toUpperCase();
            const pending = ["REQUESTED", "PAYMENT_PENDING", "PENDING"].includes(status);
            return <article className={styles.row} key={request.id}>
              <div className={styles.primary}><strong>{businessNames.get(request.business_id) || "Empresa não identificada"}</strong><span>{Number(request.credits).toLocaleString("pt-MZ")} créditos · {money(request.amount_mzn)}</span><small>{dateTime(request.created_at)} · {request.payment_method || "Método não indicado"} · Ref. {request.payment_reference || "não atribuída"}{request.provider_transaction_id ? " · Transacção " + request.provider_transaction_id : ""}{request.payment_confirmed_at ? " · Confirmado " + dateTime(request.payment_confirmed_at) : ""} · {request.proof_path ? <a href={`/api/admin/credit-purchases/${request.id}/proof`} target="_blank" rel="noopener noreferrer">Consultar comprovativo</a> : "Sem comprovativo"}</small>{request.notes ? <small>Nota: {request.notes}</small> : null}</div>
              <span className={`${styles.status} ${pending ? styles.pending : status === "APPROVED" || status === "PAID" ? styles.approved : styles.neutral}`}>{statusLabel[status] || status || "Sem estado"}</span>
              {["REQUESTED", "PAYMENT_PENDING"].includes(status) ? <div className={styles.decisionArea}>
                <form action={decideCreditPurchase} className={styles.decisionForm}>
                  <input type="hidden" name="request_id" value={request.id} />
                  <input type="hidden" name="decision" value="APPROVE" />
                  <input className={styles.decisionNotes} name="notes" maxLength={2000} placeholder="Nota interna (opcional)" aria-label="Nota interna para aprovação" />
                  <button className={styles.approveButton} type="submit">Confirmar pagamento e creditar</button>
                </form>
                <form action={decideCreditPurchase} className={styles.decisionForm}>
                  <input type="hidden" name="request_id" value={request.id} />
                  <input type="hidden" name="decision" value="REJECT" />
                  <input className={styles.decisionNotes} name="notes" maxLength={2000} placeholder="Motivo da recusa (opcional)" aria-label="Motivo da recusa" />
                  <button className={styles.rejectButton} type="submit">Recusar pedido</button>
                </form>
              </div> : null}
            </article>;
          })}</div> : <div className={styles.empty}><strong>Sem pedidos de compra.</strong><p>Os novos pedidos submetidos pelas empresas serão apresentados aqui.</p></div>}
          <p className={styles.readOnlyNote}>As decisões são processadas no servidor através de uma operação transaccional e auditável. Confirme o recebimento fora da plataforma antes de aprovar manualmente um pedido sem confirmação automática do operador.</p>
        </section>

        <section className={styles.panel} aria-labelledby="reconciliation-title">
          <div className={styles.panelHeading}><div><span className={styles.kicker}>02 · Controlo financeiro</span><h2 id="reconciliation-title">Reconciliação de pagamentos</h2><p>Verificação cruzada entre pedidos, referências e eventos confirmados pelo callback.</p></div><span className={styles.counter}>{paymentEventRows.length} eventos · {reconciliationIssues.length} alertas</span></div>
          {reconciliationIssues.length ? <div className={styles.list}>{reconciliationIssues.map((item) => <article className={styles.row} key={item.id}>
            <div className={styles.primary}><strong>{businessNames.get(item.business_id) || "Empresa não identificada"}</strong><span>{item.payment_reference || "Sem referência"} · {money(item.amount_mzn)}</span><small>{String(item.status).toUpperCase() === "PAID" ? "Pedido marcado como pago, mas o registo do evento não coincide ou está ausente." : "Existe evento de pagamento associado a um pedido que não está marcado como pago."}</small></div>
            <span className={styles.status + " " + styles.pending}>Verificar</span>
          </article>)}</div> : <div className={styles.empty}><strong>Sem divergências detectadas.</strong><p>Nos pedidos carregados, os eventos e estados não apresentam inconsistências identificáveis.</p></div>}
          <p className={styles.readOnlyNote}>A reconciliação cobre os últimos 50 pedidos. O callback actual regista apenas confirmações; pagamentos recusados, expirados ou falhados fora do callback não são visíveis nesta tabela.</p>
        </section>

        <section className={styles.panel} aria-labelledby="callback-audit-title">
          <div className={styles.panelHeading}><div><span className={styles.kicker}>03 · Auditoria do operador</span><h2 id="callback-audit-title">Eventos de pagamento recebidos</h2><p>Callbacks autenticados, incluindo entregas repetidas e eventos que exigem análise.</p></div><span className={styles.counter}>{callbackRows.length} eventos · máximo 100</span></div>
          <div className={styles.statusSummary}>{["RECEIVED","PROCESSED","IGNORED","REJECTED","RETRY"].filter((status) => (callbackStatusCounts[status] || 0) > 0).map((status) => <span key={status}>{status}<strong>{callbackStatusCounts[status]}</strong></span>)}</div>
          {callbackRows.length ? <div className={styles.list}>{callbackRows.map((event) => <article className={styles.row} key={event.id}>
            <div className={styles.primary}><strong>{event.payment_reference} · {money(event.amount_mzn)}</strong><span>{event.provider_transaction_id} · {event.callback_status}</span><small>{dateTime(event.last_received_at)} · {event.delivery_count} entrega(s){event.processed_at ? " · Processado " + dateTime(event.processed_at) : ""}</small>{event.processing_error_code ? <small>Ocorrência: {event.processing_error_code}</small> : null}</div>
            <span className={styles.status + " " + (["REJECTED","RETRY"].includes(event.processing_status) ? styles.pending : event.processing_status === "PROCESSED" ? styles.approved : styles.neutral)}>{event.processing_status}</span>
          </article>)}</div> : <div className={styles.empty}><strong>Sem callbacks registados.</strong><p>Os eventos autenticados recebidos do gateway serão apresentados aqui.</p></div>}
          <p className={styles.readOnlyNote}>São guardados apenas metadados necessários à auditoria. O corpo original, assinatura e segredo do callback não são persistidos. Eventos REJECTED e RETRY exigem análise operacional.</p>
        </section>
        <section className={styles.panel} aria-labelledby="packages-title">
          <div className={styles.panelHeading}><div><span className={styles.kicker}>04 · Catálogo</span><h2 id="packages-title">Pacotes de créditos</h2><p>Volumes e preços actualmente configurados.</p></div><span className={styles.counter}>{packageRows.length} pacotes</span></div>
          {packageRows.length ? <div className={styles.packageGrid}>{packageRows.map((item) => <article className={styles.package} key={item.id}>
            <div><span className={styles.code}>{item.code}</span><span className={`${styles.status} ${item.active ? styles.approved : styles.neutral}`}>{item.active ? "Activo" : "Inactivo"}</span></div>
            <h3>{item.name}</h3><strong>{Number(item.credit_volume).toLocaleString("pt-MZ")} créditos</strong><span>{money(item.price_mzn)}</span>
            <small>{Number(item.credit_volume) > 0 ? `${(Number(item.price_mzn) / Number(item.credit_volume)).toLocaleString("pt-MZ", { maximumFractionDigits: 4 })} MZN por crédito` : "Conversão indisponível"}</small>
          </article>)}</div> : <div className={styles.empty}><strong>Catálogo vazio.</strong><p>{packagesError ? "Não foi possível consultar os pacotes." : "Ainda não existem pacotes configurados."}</p></div>}
        </section>

        <section className={styles.panel} aria-labelledby="wallets-title">
          <div className={styles.panelHeading}><div><span className={styles.kicker}>05 · Saldos</span><h2 id="wallets-title">Carteiras empresariais</h2><p>Saldos por empresa, ordenados pelo volume disponível.</p></div><span className={styles.counter}>{walletRows.length} carteiras · máximo 100</span></div>
          {walletRows.length ? <div className={styles.list}>{walletRows.map((wallet) => <article className={styles.row} key={wallet.id}>
            <div className={styles.primary}><strong>{businessNames.get(wallet.business_id) || "Empresa não identificada"}</strong><small>Carteira empresarial</small></div>
            <div className={styles.decisionArea}>
              <strong className={styles.balance}>{Number(wallet.balance_credits || 0).toLocaleString("pt-MZ")} cr</strong>
              <form action={adjustCreditWallet} className={styles.decisionForm}>
                <input type="hidden" name="wallet_id" value={wallet.id} />
                <input type="hidden" name="idempotency_key" value={randomUUID()} />
                <input className={styles.decisionNotes} name="delta_credits" type="number" step="1" min="-1000000" max="1000000" placeholder="+/- créditos" aria-label="Variação de créditos" required />
                <input className={styles.decisionNotes} name="reason" minLength={10} maxLength={500} placeholder="Justificação obrigatória" aria-label="Justificação do ajuste" required />
                <button className={styles.approveButton} type="submit">Registar ajuste</button>
              </form>
            </div>
          </article>)}</div> : <div className={styles.empty}><strong>Sem carteiras para apresentar.</strong><p>As carteiras empresariais serão listadas quando existirem.</p></div>}
        </section>

        <section className={styles.panel} aria-labelledby="adjustments-title">
          <div className={styles.panelHeading}><div><span className={styles.kicker}>06 · Correcções auditáveis</span><h2 id="adjustments-title">Ajustes de carteiras</h2><p>Correcções positivas ou negativas registadas no ledger, sem apagar movimentos anteriores.</p></div><span className={styles.counter}>{adjustmentRows.length} registos · máximo 50</span></div>
          {adjustmentRows.length ? <div className={styles.list}>{adjustmentRows.map((event) => <article className={styles.row} key={event.id}>
            <div className={styles.primary}><strong>{businessNames.get(event.business_id) || "Empresa não identificada"}</strong><span>{event.reason}</span><small>{dateTime(event.created_at)} · Saldo {Number(event.balance_before).toLocaleString("pt-MZ")} → {Number(event.balance_after).toLocaleString("pt-MZ")} · {event.transaction_id ? "Movimento registado" : "Movimento sem referência"}</small></div>
            <strong className={Number(event.delta_credits) >= 0 ? styles.positive : styles.negative}>{Number(event.delta_credits) > 0 ? "+" : ""}{Number(event.delta_credits).toLocaleString("pt-MZ")} cr</strong>
          </article>)}</div> : <div className={styles.empty}><strong>Sem ajustes registados.</strong><p>As correcções administrativas serão apresentadas neste histórico.</p></div>}
          <p className={styles.readOnlyNote}>Cada ajuste exige justificação, validação Super Admin, bloqueio da carteira, chave de idempotência e registo simultâneo no saldo e no ledger. Não permite saldo negativo.</p>
        </section>
        <section className={styles.panel} aria-labelledby="transactions-title">
          <div className={styles.panelHeading}><div><span className={styles.kicker}>07 · Rastreabilidade</span><h2 id="transactions-title">Movimentos recentes</h2><p>Últimos movimentos das carteiras empresariais listadas.</p></div><span className={styles.counter}>{recentTransactions.length} movimentos · máximo 20</span></div>
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
