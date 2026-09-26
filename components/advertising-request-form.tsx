"use client";

import { useState } from "react";

const placements = [
  ["DIRECTORY_BILLBOARD","Billboard do directório"],
  ["DIRECTORY_FEATURED","Empresa em destaque"],
  ["DIRECTORY_SIDEBAR","Publicidade lateral"],
  ["DIRECTORY_INFEED","Publicidade entre resultados"],
];

export function AdvertisingRequestForm() {
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(formData: FormData) {
    setPending(true);
    setError("");
    const response = await fetch("/api/publicidade", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(formData.entries())),
    });
    const result = await response.json();
    setPending(false);
    if (!response.ok) {
      setError(result.error || "Não foi possível enviar o pedido.");
      return;
    }
    setSent(true);
  }

  if (sent) return <div className="notice"><strong>Pedido recebido.</strong><br />A equipa comercial poderá contactar os dados indicados para confirmar a posição, período, materiais e condições da campanha.</div>;

  return (
    <form action={submit} className="auth-card" style={{ maxWidth: 760 }}>
      <div className="toolbar">
        <div className="field" style={{ flex: 1 }}><label htmlFor="companyName">Empresa</label><input id="companyName" name="companyName" required /></div>
        <div className="field" style={{ flex: 1 }}><label htmlFor="contactName">Pessoa de contacto</label><input id="contactName" name="contactName" required /></div>
      </div>
      <div className="toolbar">
        <div className="field" style={{ flex: 1 }}><label htmlFor="email">Email</label><input id="email" name="email" type="email" required /></div>
        <div className="field" style={{ flex: 1 }}><label htmlFor="phone">Telefone</label><input id="phone" name="phone" /></div>
      </div>
      <div className="field"><label htmlFor="placement">Posição pretendida</label><select id="placement" name="placement" defaultValue="DIRECTORY_BILLBOARD">{placements.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></div>
      <div className="field"><label htmlFor="packageName">Pacote / objectivo</label><input id="packageName" name="packageName" required placeholder="Ex.: campanha de 30 dias" /></div>
      <div className="toolbar">
        <div className="field" style={{ flex: 1 }}><label htmlFor="startsAt">Data de início</label><input id="startsAt" name="startsAt" type="date" /></div>
        <div className="field" style={{ flex: 1 }}><label htmlFor="endsAt">Data de fim</label><input id="endsAt" name="endsAt" type="date" /></div>
      </div>
      <div className="field"><label htmlFor="message">Objectivo / observações</label><textarea id="message" name="message" rows={4} placeholder="Campanha, produto, serviço, evento ou público que pretende alcançar." /></div>
      {error && <p role="alert" className="notice">{error}</p>}
      <button className="btn primary" disabled={pending}>{pending ? "A enviar..." : "Solicitar proposta comercial →"}</button>
    </form>
  );
}