import Link from "next/link";
export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { getManagedBusinessIds } from "@/lib/businesses/permissions";
import { CreditPurchaseForm } from "@/components/credit-purchase-form";

const purchaseStatusLabels: Record<string, string> = {
  REQUESTED: "Por validar",
  PAYMENT_PENDING: "A aguardar pagamento",
  PAID: "Pago",
  APPROVED: "Aprovado",
  PENDING: "Pendente",
  REJECTED: "Recusado",
  CANCELLED: "Cancelado",
};

const transactionTypeLabels: Record<string, string> = {
  PURCHASE: "Compra de créditos",
  CONSUMPTION: "Utilização de créditos",
  ADJUSTMENT: "Ajuste de saldo",
  REFUND: "Estorno",
};

function money(value: number | string | null | undefined) {
  return value == null
    ? "—"
    : `${Number(value).toLocaleString("pt-MZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MZN`;
}

function dateTime(value: string) {
  return new Date(value).toLocaleString("pt-MZ", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Maputo",
  });
}

function getFlash(params: { success?: string; error?: string }) {
  if (params.success === "purchase") {
    return { kind: "success", message: "Pedido de compra registado. O saldo só será actualizado depois da confirmação do pagamento." };
  }

  const errors: Record<string, string> = {
    purchase: "Não foi possível registar o pedido. Verifique os dados e tente novamente.",
    pending: "Esta empresa já tem um pedido de compra em análise ou à espera de pagamento. Aguarde a conclusão antes de iniciar outro pedido.",
    forbidden: "Não tem permissão para solicitar créditos para esta empresa.",
    proof: "O comprovativo é obrigatório na transferência bancária e deve ser PDF, JPG, PNG ou WEBP, até 10 MB.",
    cleanup: "O pedido não foi concluído e não foi possível remover o ficheiro temporário. Contacte o suporte antes de repetir o envio.",
  };

  return params.error
    ? { kind: "error", message: errors[params.error] || "Ocorreu um erro ao processar o pedido de compra." }
    : null;
}

export default async function CreditosPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const businessIds = await getManagedBusinessIds(supabase, user.id);
  const [{ data: businessRows }, { data: packages }] = await Promise.all([
    businessIds.length
      ? supabase.from("businesses").select("id,name").in("id", businessIds).order("name")
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    supabase.from("credit_packages")
      .select("id,code,name,credit_volume,price_mzn,active")
      .eq("active", true)
      .order("credit_volume"),
  ]);

  const businesses = businessRows ?? [];
  const { data: wallets } = businesses.length
    ? await supabase.from("business_credit_wallets")
      .select("id,business_id,balance_credits")
      .in("business_id", businesses.map((business) => business.id))
    : { data: [] as { id: string; business_id: string; balance_credits: number }[] };

  const walletMap = new Map((wallets ?? []).map((wallet) => [wallet.business_id, wallet.balance_credits]));
  const walletIds = (wallets ?? []).map((wallet) => wallet.id);

  const { data: transactions } = walletIds.length
    ? await supabase.from("credit_transactions")
      .select("id,wallet_id,type,credits,amount_mzn,description,created_at")
      .in("wallet_id", walletIds)
      .order("created_at", { ascending: false })
      .limit(20)
    : {
      data: [] as {
        id: string;
        wallet_id: string;
        type: string;
        credits: number;
        amount_mzn: number | null;
        description: string | null;
        created_at: string;
      }[],
    };

  const { data: purchaseRequests } = businesses.length
    ? await supabase.from("credit_purchase_requests")
      .select("id,business_id,credits,amount_mzn,payment_method,payment_reference,status,created_at")
      .in("business_id", businesses.map((business) => business.id))
      .order("created_at", { ascending: false })
      .limit(8)
    : { data: [] };

  const flash = getFlash(params);

  return (
    <main className="dashboard-main">
      <div className="dashboard-content">
        {flash ? (
          <div
            className={flash.kind === "success" ? "account-success" : undefined}
            role={flash.kind === "success" ? "status" : "alert"}
            style={flash.kind === "error" ? {
              marginBottom: 16,
              padding: 14,
              border: "1px solid var(--danger-border, #e5b8b8)",
              borderRadius: 12,
              background: "var(--danger-soft, #fff6f6)",
              color: "var(--danger-text, #8b2929)",
            } : { marginBottom: 16 }}
          >
            {flash.message}
          </div>
        ) : null}

        <header className="dashboard-topbar">
          <div>
            <span className="dashboard-kicker">Conta · Créditos</span>
            <h1>Créditos</h1>
            <p>Um recurso transversal do MozEmpresas. Use créditos em funcionalidades elegíveis, incluindo publicidade.</p>
          </div>
        </header>

        <section className="dashboard-section credit-state-section" style={{ marginTop: 18 }}>
          <div className="dashboard-section-head">
            <div>
              <span className="dashboard-kicker">Estado actual</span>
              <h2>Contas de créditos</h2>
              <p className="muted">Cada empresa tem o seu próprio saldo.</p>
            </div>
          </div>
          {businesses.length ? (
            <div className="grid credit-wallet-grid">
              {businesses.map((business) => (
                <div className="card" key={business.id}>
                  <span className="dashboard-kicker">{business.name}</span>
                  <h2 style={{ margin: "6px 0" }}>
                    {(walletMap.get(business.id) ?? 0).toLocaleString("pt-MZ")} cr
                  </h2>
                  <p className="muted">Saldo disponível</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="card">
              <strong>Associe uma empresa primeiro.</strong>
              <p className="muted">É necessário representar uma empresa para comprar créditos.</p>
              <Link className="btn primary" href="/dashboard/empresas">Gerir empresa →</Link>
            </div>
          )}
        </section>

        <section className="dashboard-section credit-primary-section" style={{ marginTop: 18 }}>
          <div className="dashboard-section-head">
            <div>
              <span className="dashboard-kicker">Próxima acção</span>
              <h2>Escolha um pacote</h2>
              <p className="muted">Seleccione a empresa, o pacote e a forma de pagamento.</p>
            </div>
          </div>
          {businesses.length ? (
            packages?.length
              ? <CreditPurchaseForm businesses={businesses} packages={packages} />
              : <div className="card"><strong>Não existem pacotes disponíveis.</strong><p className="muted">O catálogo de créditos não tem pacotes activos neste momento.</p></div>
          ) : null}
        </section>

        <section className="dashboard-section credit-history-section" style={{ marginTop: 18 }}>
          <div className="dashboard-section-head">
            <div>
              <span className="dashboard-kicker">Acompanhamento</span>
              <h2>Compras recentes</h2>
            </div>
          </div>
          {(purchaseRequests ?? []).length ? (purchaseRequests ?? []).map((request: {
            id: string;
            business_id: string;
            credits: number;
            amount_mzn: number;
            payment_method: string | null;
            payment_reference: string | null;
            status: string;
            created_at: string;
          }) => (
            <div key={request.id} className="credit-request-row">
              <div>
                <strong>{businesses.find((business) => business.id === request.business_id)?.name || "Empresa"} · {request.credits.toLocaleString("pt-MZ")} créditos</strong>
                <small>{money(request.amount_mzn)} · {request.payment_method || "Pagamento"} · {dateTime(request.created_at)}</small>
                {request.payment_reference ? <div className="credit-payment-reference"><strong>Referência de pagamento: {request.payment_reference}</strong><span>Indique exactamente esta referência ao efectuar o pagamento e guarde o comprovativo. O saldo só será creditado após confirmação.</span></div> : null}
                {request.payment_method === "MPESA" && request.status === "PAYMENT_PENDING" ? <small>O pedido está registado e aguarda confirmação do pagamento. A referência identifica este pedido; não representa, por si só, confirmação de transferência.</small> : null}
                {request.payment_method === "BANK_TRANSFER" && ["REQUESTED","PAYMENT_PENDING","PENDING"].includes(request.status) ? <small>Confirmação da transferência bancária dentro de 24 horas após o pedido: até {dateTime(new Date(new Date(request.created_at).getTime()+24*60*60*1000).toISOString())}. Após esse prazo, a aprovação é bloqueada e será necessário novo pedido.</small> : null}
              </div>
              <span>{purchaseStatusLabels[request.status] || request.status}</span>
            </div>
          )) : <p className="muted">Ainda não existem pedidos de compra.</p>}
        </section>

        <section className="dashboard-section" style={{ marginTop: 18 }}>
          <div className="dashboard-section-head">
            <div>
              <span className="dashboard-kicker">Histórico</span>
              <h2>Movimentos recentes</h2>
            </div>
          </div>
          {(transactions ?? []).length ? (transactions ?? []).map((transaction) => (
            <div key={transaction.id} className="credit-request-row">
              <div>
                <strong>{transactionTypeLabels[transaction.type] || transaction.type}</strong>
                <small>{transaction.description || "Movimento de créditos"} · {dateTime(transaction.created_at)}</small>
              </div>
              <strong>
                {transaction.credits > 0 ? "+" : ""}
                {transaction.credits.toLocaleString("pt-MZ")} cr
              </strong>
            </div>
          )) : <p className="muted">Ainda não existem movimentos de créditos.</p>}
        </section>
      </div>
    </main>
  );
}
