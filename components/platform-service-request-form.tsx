"use client";

import { useActionState } from "react";
import { requestPlatformService } from "@/lib/services/actions";

type Business = { id: string; name: string };

type State = { success?: boolean; error?: string };

const initialState: State = {};

export function PlatformServiceRequestForm({
  serviceId,
  businesses,
}: {
  serviceId: string;
  businesses: Business[];
}) {
  const [state, action, pending] = useActionState<State, FormData>(
    async (_previous, formData) => {
      return (await requestPlatformService(formData)) as State;
    },
    initialState,
  );

  if (state.success) {
    return (
      <div className="service-request-success" role="status">
        <span className="service-success-icon">✓</span>
        <div>
          <strong>Pedido recebido.</strong>
          <p>
            A sua solicitação foi registada. Pode acompanhar a evolução em
            <a href="/dashboard/servicos"> Serviços MozEmpresas</a> e nas suas notificações.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="service-request-form">
      <input type="hidden" name="serviceId" value={serviceId} />

      <div className="service-form-heading">
        <span className="dashboard-kicker">Solicitar este serviço</span>
        <h3>Vamos perceber o que precisa.</h3>
        <p>
          Envie o contexto essencial. A equipa MozEmpresas analisa o pedido e,
          quando necessário, entra em contacto para definir o escopo e a proposta.
        </p>
      </div>

      {businesses.length > 0 ? (
        <label>
          <span>Empresa</span>
          <select name="businessId" defaultValue={businesses[0].id}>
            {businesses.map((business) => (
              <option value={business.id} key={business.id}>
                {business.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label>
        <span>O que pretende alcançar?</span>
        <textarea
          name="notes"
          rows={6}
          placeholder="Indique o objectivo, contexto, localização, prazo ou requisitos que já conhece."
          required
        />
      </label>

      {state.error ? <p className="service-form-error">{state.error}</p> : null}

      <div className="service-form-submit">
        <div>
          <strong>Sem compromisso imediato.</strong>
          <span>O pedido será analisado antes de qualquer cobrança.</span>
        </div>
        <button className="btn primary" type="submit" disabled={pending}>
          {pending ? "A enviar…" : "Enviar pedido →"}
        </button>
      </div>
    </form>
  );
}
