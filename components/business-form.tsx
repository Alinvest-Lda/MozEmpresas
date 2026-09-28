"use client";

import { useActionState } from "react";
import type { BusinessState } from "@/lib/businesses/actions";

type Category = { id: string; name: string; slug: string };

export function BusinessForm({
  action,
  categories = [],
}: {
  action: (state: BusinessState, formData: FormData) => Promise<BusinessState>;
  categories?: Category[];
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="business-form business-onboarding-form">
      <div className="business-form-intro">
        <span className="dashboard-kicker">Passo 1 · Identidade</span>
        <h3>Comece pela presença da sua empresa</h3>
        <p>Registe os dados essenciais agora. Depois poderá completar o portfólio e as ofertas sem repetir o processo.</p>
      </div>

      <div className="business-form-step">
        <span className="business-step-label">Passo 1 · Identidade</span>
        <div className="field">
          <label htmlFor="name">Nome da empresa</label>
          <input id="name" name="name" required maxLength={160} placeholder="Ex.: Empresa ABC, Lda." />
        </div>
      </div>

      <div className="business-form-step">
        <span className="business-step-label">Passo 2 · Descoberta</span>
        <div className="toolbar">
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="categoryId">Actividade principal</label>
            <select id="categoryId" name="categoryId" defaultValue="">
              <option value="">Seleccionar actividade</option>
              {categories.map((category) => (
                <option value={category.id} key={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="location">Localização</label>
            <input id="location" name="location" placeholder="Maputo, Moçambique" maxLength={160} />
          </div>
        </div>
      </div>

      <div className="business-form-step">
        <span className="business-step-label">Passo 3 · Contacto e publicação</span>
        <div className="field">
          <label htmlFor="description">Apresentação da empresa</label>
          <textarea id="description" name="description" rows={5} maxLength={5000} placeholder="Explique brevemente o que a empresa faz, para quem trabalha e quais produtos ou serviços disponibiliza." />
        </div>

        <div className="toolbar">
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="phone">Telefone</label>
            <input id="phone" name="phone" placeholder="+258 ..." maxLength={40} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="email">Email empresarial</label>
            <input id="email" name="email" type="email" placeholder="empresa@dominio.co.mz" />
          </div>
        </div>

        <div className="field">
          <label htmlFor="website">Website</label>
          <input id="website" name="website" type="url" placeholder="https://..." />
        </div>

        <div className="field">
          <label htmlFor="isPublic">Publicação</label>
          <select id="isPublic" name="isPublic" defaultValue="true">
            <option value="true">Publicar agora — aparecer no directório</option>
            <option value="false">Guardar privado — completar antes de publicar</option>
          </select>
        </div>
      </div>

      <div className="business-publish-note">
        <strong>Depois do registo</strong>
        <br />
        Nome, actividade, descrição, localização e contactos que fornecer. Pode começar público e depois completar o perfil com produtos e serviços.
        <span>Será encaminhado para a gestão do perfil, onde poderá completar a apresentação e adicionar imagens do portfólio.</span>
      </div>

      {state.error && <p role="alert" className="notice">{state.error}</p>}
      <button className="btn primary" disabled={pending}>{pending ? "A criar..." : "Criar perfil da empresa"}</button>
    </form>
  );
}
