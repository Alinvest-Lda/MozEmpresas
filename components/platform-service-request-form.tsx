"use client";

import { useActionState } from "react";
import Link from "next/link";
import { purchasePlatformService } from "@/lib/services/checkout-actions";

type Business = { id: string; name: string };
type State = { success?: boolean; error?: string; orderId?: string; pending?: boolean };

export function PlatformServiceRequestForm({
  serviceId,
  businesses,
  price,
  billing,
  defaultTermDays,
}: {
  serviceId: string;
  businesses: Business[];
  price: number | string | null;
  billing: string | null;
  defaultTermDays: number | null;
}) {
  const [state, action, pending] = useActionState<State, FormData>(
    async (_, formData) => await purchasePlatformService(formData),
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
          <strong>{state.pending ? "Contratação M-Pesa registada." : "Serviço contratado."}</strong>
          <p>
            {state.pending
              ? "O período começa após a confirmação do pagamento. A contratação e o prazo já ficaram registados."
              : "O serviço, prazo e valor foram registados na gestão financeira."}{" "}
            <Link href="/dashboard/financeiro">Ver gestão financeira</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="service-request-form">
      <input type="hidden" name="serviceId" value={serviceId} />

      <div className="service-form-heading">
        <span className="dashboard-kicker">Contratar este serviço</span>
        <h3>Activação self-service</h3>
        <p>Escolha a empresa, confirme o período e pague com créditos ou M-Pesa.</p>
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

      <div className="service-checkout-price">
        <div>
          <span>Valor</span>
          <strong>{price == null ? "Indisponível" : Number(price).toLocaleString("pt-MZ") + " MZN"}</strong>
        </div>
        <div>
          <span>Prazo / período</span>
          <strong>{periodLabel}</strong>
        </div>
      </div>

      <label>
        <span>Forma de pagamento</span>
        <select name="paymentMethod" defaultValue="CREDITS">
          <option value="CREDITS">Créditos</option>
          <option value="MPESA">M-Pesa</option>
        </select>
      </label>

      {state.error ? <p className="service-form-error">{state.error}</p> : null}

      <div className="service-form-submit">
        <div>
          <strong>{billing === "MONTHLY" || billing === "ANNUAL" ? "Serviço recorrente" : "Serviço com prazo definido"}</strong>
          <span>
            {billing === "MONTHLY" || billing === "ANNUAL"
              ? "O período termina na data indicada e pode ser renovado."
              : "A execução fica vinculada ao prazo apresentado."}
          </span>
        </div>
        <button className="btn primary" type="submit" disabled={pending || !businesses.length || price == null}>
          {pending ? "A processar…" : "Contratar agora →"}
        </button>
      </div>
    </form>
  );
}
