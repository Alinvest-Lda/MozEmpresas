export const dynamic = "force-dynamic";

import Link from "next/link";
import { getSuperAdminContext } from "@/lib/auth/super-admin";
import styles from "../creditos/creditos.module.css";
import { adminCancelPlatformServiceOrder } from "@/lib/services/checkout-actions";

type ServicePaymentRow = {
  order_id: string;
  business_id: string;
  business_name: string;
  service_name: string;
  requester_user_id: string;
  amount_mzn: number | string;
  currency: string;
  payment_method: string;
  order_status: string;
  payment_id: string | null;
  payment_status: string | null;
  payment_reference: string | null;
  provider_transaction_id: string | null;
  payment_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  event_history: Array<{ id: string; previous_status: string | null; new_status: string; event_source: string; created_at: string }>;
  reconciliation_issue: string | null;
};

const money = (value: number | string, currency = "MZN") =>
  `${Number(value).toLocaleString("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
const dateTime = (value: string | null) => value
  ? new Date(value).toLocaleString("pt-MZ", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Maputo" })
  : "—";
const label = (value: string | null) => value ? value.replaceAll("_", " ").toLocaleLowerCase("pt-MZ").replace(/^./, c => c.toLocaleUpperCase("pt-MZ")) : "—";

export default async function AdminServiceReconciliationPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; ocorrencias?: string; resultado?: string }>;
}) {
  const params = await searchParams;
  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) return null;

  const { data, error } = await supabase.rpc("admin_service_payment_reconciliation", { p_limit: 500 });
  const rows = (Array.isArray(data) ? data : []) as ServicePaymentRow[];
  const reconciliationUnavailable = Boolean(error);
  const orderIds = rows.map(row => row.order_id);
  const { data: adjustmentRows, error: adjustmentError } = orderIds.length
    ? await supabase.from("platform_service_adjustments")
        .select("order_id,adjustment_type,amount_mzn,credits,currency,external_refund_reference,reason,created_at")
        .in("order_id", orderIds)
    : { data: [] };
  const adjustmentByOrder = new Map((adjustmentRows ?? []).map(item => [item.order_id, item]));
  const onlyIssues = params.ocorrencias === "1";
  const selectedStatus = params.estado || "ALL";
  const filtered = rows.filter(row =>
    (!onlyIssues || Boolean(row.reconciliation_issue)) &&
    (selectedStatus === "ALL" || row.order_status === selectedStatus)
  );
  const issueCount = reconciliationUnavailable ? null : rows.filter(row => row.reconciliation_issue).length;
  const paidCount = reconciliationUnavailable ? null : rows.filter(row => ["PAID", "PROCESSING", "COMPLETED"].includes(row.order_status)).length;
  const pendingCount = reconciliationUnavailable ? null : rows.filter(row => row.order_status === "PENDING_PAYMENT").length;
  const failedCount = reconciliationUnavailable ? null : rows.filter(row => ["FAILED", "CANCELLED"].includes(row.order_status)).length;

  return (
    <main className="dashboard-main admin-workspace">
      <div className="dashboard-content">
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>Monetização · Serviços</span>
            <h1>Reconciliação de pagamentos</h1>
            <p>Ordens de serviço, pagamentos M-Pesa, estados comerciais e histórico de transições numa única vista.</p>
          </div>
          <Link className={styles.backLink} href="/dashboard/admin/monetizacao">Voltar à monetização</Link>
        </header>

        {params.resultado === "success" ? <div className={styles.notice}>Ajustamento concluído e registado no histórico financeiro.</div> : null}
        {params.resultado && params.resultado !== "success" ? <div className={styles.notice} role="alert">A operação não foi concluída ({label(params.resultado)}). Confirme as condições da ordem e os dados do reembolso.</div> : null}
        {error ? <div className={styles.notice} role="alert">Não foi possível carregar a reconciliação. Verifique a função de administração e tente novamente.</div> : null}
        {adjustmentError ? <div className={styles.notice} role="alert">O histórico de ajustamentos não foi carregado. Os pagamentos estão visíveis, mas os dados de reembolso/ajustamento podem estar incompletos.</div> : null}

        <section className={styles.metrics} aria-label="Indicadores de contratação">
          <article><span>Ordens analisadas</span><strong>{reconciliationUnavailable ? "—" : rows.length}</strong><small>Máximo de 500 registos recentes</small></article>
          <article><span>Pagas / activas</span><strong>{paidCount ?? "—"}</strong><small>Serviços com pagamento confirmado</small></article>
          <article><span>A aguardar pagamento</span><strong>{pendingCount ?? "—"}</strong><small>Ordens pendentes</small></article>
          <article><span>Falhadas / canceladas</span><strong>{failedCount ?? "—"}</strong><small>Sem activação</small></article>
          <article><span>Exigem análise</span><strong>{issueCount ?? "—"}</strong><small>Inconsistências detectadas</small></article>
          <article><span>Valor das ordens</span><strong>{reconciliationUnavailable ? "—" : money(rows.reduce((sum,row)=>sum+Number(row.amount_mzn||0),0))}</strong><small>Valor bruto do conjunto carregado</small></article>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeading}>
            <div><span className={styles.kicker}>01 · Controlo operacional</span><h2>Ordens e pagamentos</h2><p>Vista de consulta; esta fase não permite alterar ou estornar pagamentos.</p></div>
            <span className={styles.counter}>{filtered.length} registos</span>
          </div>
          <form className={styles.reportFilters} method="get">
            <label>Estado da ordem
              <select name="estado" defaultValue={selectedStatus}>
                <option value="ALL">Todos</option>
                <option value="PENDING_PAYMENT">A aguardar pagamento</option>
                <option value="PAID">Pago</option>
                <option value="PROCESSING">Em processamento</option>
                <option value="COMPLETED">Concluído</option>
                <option value="FAILED">Falhado</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
            </label>
            <label className={styles.inlineCheck}><input type="checkbox" name="ocorrencias" value="1" defaultChecked={onlyIssues}/> Apenas ocorrências</label>
            <button className={styles.approveButton} type="submit">Aplicar filtros</button>
            <Link className={styles.backLink} href="/dashboard/admin/monetizacao/servicos">Limpar</Link>
          </form>
          {filtered.length ? <div className={styles.list}>
            {filtered.map(row => <article className={styles.row} key={row.order_id}>
              <div className={styles.primary}>
                <strong>{row.service_name} · {row.business_name}</strong>
                <span>{money(row.amount_mzn,row.currency)} · Ordem {row.order_id.slice(0,8)}</span>
                <small>Ordem: {label(row.order_status)} · Pagamento: {label(row.payment_status)} · {dateTime(row.created_at)}</small>
                <small>Referência: {row.payment_reference || "—"} · Transacção: {row.provider_transaction_id || "—"}</small>
                <small>Confirmado: {dateTime(row.payment_confirmed_at)}</small>
                {row.reconciliation_issue ? <span className={styles.status + " " + styles.pending}>Ocorrência: {label(row.reconciliation_issue)}</span> : null}
                {adjustmentByOrder.has(row.order_id) ? (() => {
                  const adjustment = adjustmentByOrder.get(row.order_id)!;
                  return <div className={styles.eventHistory}>
                    <strong>Ajustamento: {label(adjustment.adjustment_type)}</strong>
                    <small>{adjustment.credits > 0 ? adjustment.credits + " créditos devolvidos" : money(adjustment.amount_mzn, adjustment.currency)} · {dateTime(adjustment.created_at)}</small>
                    {adjustment.external_refund_reference ? <small>Referência de reembolso: {adjustment.external_refund_reference}</small> : null}
                    <small>Motivo: {adjustment.reason}</small>
                  </div>;
                })() : null}
                {row.event_history?.length ? <div className={styles.eventHistory}>
                  <strong>Histórico de estados</strong>
                  {row.event_history.map(event => <small key={event.id}>{event.previous_status ? label(event.previous_status) + " → " : "Criada como "}{label(event.new_status)} · {label(event.event_source)} · {dateTime(event.created_at)}</small>)}
                </div> : null}
                {["PENDING_PAYMENT","PAID","PROCESSING"].includes(row.order_status) ? <details className={styles.adjustmentForm}>
                  <summary>Cancelar / estornar ordem</summary>
                  <form action={adminCancelPlatformServiceOrder}>
                    <input type="hidden" name="orderId" value={row.order_id}/>
                    {row.payment_method === "MPESA" && ["PAID","PROCESSING"].includes(row.order_status) ? <label>Referência do reembolso M-Pesa já efectuado<input name="refundReference" minLength={4} maxLength={160} required placeholder="Referência emitida pelo operador"/></label> : null}
                    <label>Motivo do ajustamento<textarea name="reason" minLength={8} maxLength={1000} required placeholder="Explique o motivo e a autorização do cancelamento"/></label>
                    <button className={styles.rejectButton} type="submit">Confirmar cancelamento</button>
                    <small>Para pagamentos M-Pesa confirmados, o reembolso tem de ser realizado no operador antes desta confirmação. A plataforma apenas regista a referência e reconcilia os estados.</small>
                  </form>
                </details> : null}
              </div>
              <span className={styles.status + " " + (row.reconciliation_issue ? styles.pending : ["PAID","PROCESSING","COMPLETED"].includes(row.order_status) ? styles.approved : styles.neutral)}>{label(row.order_status)}</span>
            </article>)}
          </div> : <div className={styles.empty}><strong>Não existem ordens para estes filtros.</strong><p>{error ? "A consulta falhou." : "As novas contratações aparecerão nesta área."}</p></div>}
          <p className={styles.readOnlyNote}>As ocorrências identificam pagamentos em falta, diferenças de montante/moeda e divergências entre o estado da ordem e o pagamento. Não são efectuadas alterações automáticas aos registos.</p>
        </section>
      </div>
    </main>
  );
}
