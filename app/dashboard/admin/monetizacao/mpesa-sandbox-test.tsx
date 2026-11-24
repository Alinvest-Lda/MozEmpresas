"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import styles from "./mpesa-sandbox-test.module.css";

type TestResult = {
  result?: string;
  message?: string;
  error?: string;
  test?: {
    msisdn?: string;
    amount_mzn?: number;
    third_party_reference?: string;
    conversation_id?: string | null;
    response_code?: string | null;
    response_description?: string | null;
    transaction_status?: string;
    status?: string;
  };
};

export default function MpesaSandboxTestPanel() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);
  const [notice, setNotice] = useState("");
  const [attempted, setAttempted] = useState(false);

  async function invoke(method: "GET" | "POST") {
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke("mpesa-sandbox-test", {
      method,
      headers: { "x-client-info": "mozempresas-admin-mpesa-sandbox" },
    });
    return { data: data as TestResult | null, error };
  }

  async function sendTest() {
    if (busy || attempted) return;
    if (!window.confirm("Confirmar o envio de um pedido M-Pesa Sandbox de 500 MZN para 258842553641? Esta acção irá gerar uma única tentativa e não deve ser repetida.")) return;
    setBusy(true);
    setNotice("");
    setResult(null);
    try {
      const existing = await invoke("GET");
      if (!existing.error && existing.data?.test) {
        setResult(existing.data);
        setAttempted(true);
        setNotice("Já existe uma tentativa registada. Não foi enviado outro pedido.");
        return;
      }
      const status = (existing.error as { context?: Response } | null)?.context?.status;
      if (status !== 404) {
        throw new Error(status === 401 || status === 403
          ? "Sessão sem autorização de Super Administrador. Entre novamente com a conta autorizada."
          : "Não foi possível verificar o registo anterior. Por segurança, nenhum novo pedido foi enviado.");
      }

      setAttempted(true);
      const sent = await invoke("POST");
      if (sent.data) setResult(sent.data);
      if (sent.error) {
        const httpStatus = (sent.error as { context?: Response }).context?.status;
        if (httpStatus === 409) {
          setNotice("O registo indica que o teste já foi reservado ou tentado. Não repita o pedido; consulte o estado.");
        } else {
          setNotice("A resposta do pedido não foi conclusiva. Não volte a enviar; consulte o estado da transacção.");
        }
      } else {
        setNotice(sent.data?.result === "request_accepted_by_gateway"
          ? "O gateway aceitou o pedido. Isto ainda não comprova que o pagamento foi concluído."
          : "Resposta recebida do gateway. Verifique o código e a descrição antes de qualquer conclusão.");
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível executar o teste.");
    } finally {
      setBusy(false);
    }
  }

  async function queryStatus() {
    if (busy) return;
    setBusy(true);
    setNotice("");
    try {
      const response = await invoke("GET");
      if (response.data) {
        setResult(response.data);
        setAttempted(true);
        setNotice("Consulta concluída. O estado apresentado é o devolvido pelo gateway M-Pesa.");
      } else {
        setNotice(response.error?.message || "Não foi possível consultar o estado.");
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Falha na consulta do estado.");
    } finally {
      setBusy(false);
    }
  }

  const test = result?.test;
  return (
    <section className={styles.panel} aria-labelledby="mpesa-sandbox-title">
      <div className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Integração de pagamentos · Sandbox</span>
          <h2 id="mpesa-sandbox-title">Teste controlado M-Pesa</h2>
          <p>Pedido único de 500 MZN para o número de teste autorizado. A execução usa a sessão autenticada do Super Administrador e as credenciais guardadas nos Secrets do Supabase.</p>
        </div>
        <span className={styles.environment}>SANDBOX</span>
      </div>
      <div className={styles.details}>
        <div><span>MSISDN de teste</span><strong>258 842 553 641</strong></div>
        <div><span>Valor</span><strong>500,00 MZN</strong></div>
        <div><span>Shortcode</span><strong>902809</strong></div>
        <div><span>Gateway</span><strong>api.sandbox.vm.co.mz</strong></div>
      </div>
      <div className={styles.actions}>
        <button type="button" onClick={sendTest} disabled={busy || attempted} className={styles.primary}>
          {busy ? "A processar…" : attempted ? "Tentativa já registada" : "Enviar pedido de teste"}
        </button>
        <button type="button" onClick={queryStatus} disabled={busy} className={styles.secondary}>
          Consultar estado
        </button>
      </div>
      {notice ? <p className={styles.notice} role="status">{notice}</p> : null}
      {test ? <dl className={styles.result}>
        <div><dt>Resultado</dt><dd>{result?.result || test.status || "Resposta recebida"}</dd></div>
        <div><dt>Referência</dt><dd>{test.third_party_reference || "—"}</dd></div>
        <div><dt>Código M-Pesa</dt><dd>{test.response_code || "—"}</dd></div>
        <div><dt>Descrição</dt><dd>{test.response_description || result?.message || "—"}</dd></div>
        {test.transaction_status ? <div><dt>Estado da transacção</dt><dd>{test.transaction_status}</dd></div> : null}
        {test.conversation_id ? <div><dt>Conversation ID</dt><dd>{test.conversation_id}</dd></div> : null}
      </dl> : null}
      <p className={styles.warning}>A aceitação do pedido pelo gateway não equivale a pagamento confirmado. Não reenviar em caso de timeout ou resultado incerto; consultar primeiro o estado.</p>
    </section>
  );
}
