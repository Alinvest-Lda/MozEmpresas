"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { purchasePlatformService } from "@/lib/services/checkout-actions";
import { requestPlatformService } from "@/lib/services/actions";

type Business = { id: string; name: string };
type State = { success?: boolean; error?: string; orderId?: string; pending?: boolean; requested?: boolean };

export function PlatformServiceRequestForm({
  serviceId,
  businesses,
  price,
  billing,
  defaultTermDays,
  savedMsisdn,
}: {
  serviceId: string;
  businesses: Business[];
  price: number | string | null;
  billing: string | null;
  defaultTermDays: number | null;
  savedMsisdn: string;
}) {
  const [purchaseKey, setPurchaseKey] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CREDITS");
  useEffect(() => { setPurchaseKey(crypto.randomUUID()); }, []);
  const [state, action, pending] = useActionState<State, FormData>(
    async (_, formData) => {
      if (price == null) {
        const result = await requestPlatformService(formData);
        return { ...result, requested: "success" in result && result.success === true };
      }
      return await purchasePlatformService(formData);
    },
    {},
  );

  const periodLabel =
    billing === "MONTHLY" ? "1 mês · renovável" :
    billing === "ANNUAL" ? "1 ano · renovável" :
    defaultTermDays ? defaultTermDays + " dias para execução" : "Prazo definido na contratação";

  if (state.success) {
    return (
      <div className="service-request-success" role="status">
        <span className="service-success-icon">✓</span>
        <div>
          <strong>{state.requested ? "Pedido de serviço recebido." : state.pending ? "Pedido de pagamento M-Pesa pendente." : "Serviço contratado."}</strong>
          <p>
            {state.requested
              ? "A equipa MozEmpresas irá analisar a necessidade e actualizar o estado do pedido no seu espaço."
              : state.pending
                ? "O pedido foi enviado à M-Pesa e aguarda confirmação. Não repita o pagamento; consulte a gestão financeira para acompanhar o estado."
                : "O serviço, prazo e valor foram registados na gestão financeira."}{" "}
            {!state.requested && <Link href="/dashboard/financeiro">Ver gestão financeira</Link>}
          </p>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="service-request-form">
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="purchaseKey" value={purchaseKey} />\n      <input type="hidden" name="purchaseKey" value={purchaseKey} />

      <div className="service-form-heading">
        <span className="dashboard-kicker">Contratar este serviço</span>
        <h3>{price == null ? "Solicitar análise do serviço" : "Activação self-service"}</h3>
        <p>{price == null ? "Descreva o que precisa. A equipa analisará o escopo e poderá propor condições de execução." : "Escolha a empresa, confirme o período e pague com créditos ou M-Pesa."}</p>
      </div>

      {businesses.length ? (
        <label>
          <span>Empresa</span>
          <select name="businessId" defaultValue={businesses[0].id}>
            {businesses.map((business) => (
              <option value={business.id} key={business.id}>{business.name}</option>
            ))}
          </select>
        </label>
      ) : (
        <p className="service-form-error">Associe uma empresa antes de contratar.</p>
      )}

      {price == null ? (
        <label>
          <span>Descreva a necessidade</span>
          <textarea name="notes" rows={4} maxLength={2000} placeholder="Contexto, objectivo, âmbito e prazo pretendido" />
        </label>
      ) : null}

      {price != null ? <div className="service-checkout-price">
        <div>
          <span>Valor</span>
          <strong>{price == null ? "Indisponível" : Number(price).toLocaleString("pt-MZ") + " MZN"}</strong>
        </div>
        <div>
          <span>Prazo / período</span>
          <strong>{periodLabel}</strong>
        </div>
      </div> : null}

      {price != null ? <label>
        <span>Forma de pagamento</span>
        <select name="paymentMethod" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
          <option value="CREDITS">Créditos</option>
          <option value="MPESA">M-Pesa</option>
        </select>
      </label> : null}

      {price != null && paymentMethod === "MPESA" ? <label>\n        <span>Número M-Pesa para efectuar o pagamento</span>\n        <input name="customerMsisdn" inputMode="numeric" autoComplete="tel" maxLength={12} defaultValue={savedMsisdn} placeholder="258841234567" required pattern="2588[2-9][0-9]{7}" title="Use o formato 258XXXXXXXXX" />\n        <small>O pedido de pagamento será enviado para este número. Pode alterar o número guardado na sua conta.</small>\n      </label> : null}\n\n      {state.error ? <p className="service-form-error">{state.error}</p> : null}

      <div className="service-form-submit">
        <div>
          <strong>{price == null ? "Pedido sujeito a análise" : billing === "MONTHLY" || billing === "ANNUAL" ? "Serviço recorrente" : "Serviço com prazo definido"}</strong>
          <span>
            {price == null
              ? "O envio não confirma contratação nem pagamento."
              : billing === "MONTHLY" || billing === "ANNUAL"
                ? "O período termina na data indicada e pode ser renovado."
                : "A execução fica vinculada ao prazo apresentado."}
          </span>
        </div>
        <button className="btn primary" type="submit" disabled={pending || !businesses.length || (price != null && Number(price) <= 0) || (price != null && purchaseKey === "")}>
          {pending ? "A processar…" : price == null ? "Enviar pedido →" : "Contratar agora →"}
        </button>
      </div>
    </form>
  );
}
