"use client";

import { FormEvent, useState } from "react";

export function ContactForm() {
  const [state, setState] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending");
    setError("");
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      const response = await fetch("/api/contactos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || "Não foi possível enviar a mensagem.");
      }
      event.currentTarget.reset();
      setState("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar a mensagem.");
      setState("error");
    }
  }

  return (
    <form id="contact-form" className="contact-form" onSubmit={submit}>
      <div className="contact-form-heading">
        <span className="eyebrow">Enviar uma mensagem</span>
        <h2>Fale connosco.</h2>
        <p>Preencha o formulário e envie o seu pedido directamente para a equipa do MozEmpresas.</p>
      </div>
      <div className="form-grid">
        <label><span>Nome completo *</span><input name="name" required placeholder="O seu nome" /></label>
        <label><span>Email *</span><input type="email" name="email" required placeholder="nome@empresa.co.mz" /></label>
        <label><span>Telefone</span><input name="phone" placeholder="+258 8x xxx xxxx" /></label>
        <label><span>Assunto *</span><select name="subject" required defaultValue=""><option value="" disabled>Seleccione o assunto</option><option>Dúvida geral</option><option>Registo de empresa</option><option>Publicidade</option><option>Parcerias</option><option>Suporte</option><option>Sugestão</option></select></label>
        <label className="form-full"><span>Mensagem *</span><textarea name="message" required rows={6} placeholder="Escreva a sua mensagem..." /></label>
      </div>
      <div className="contact-form-footer">
        <span>Ao enviar, a sua mensagem fica registada para tratamento pela equipa.</span>
        <button className="btn primary" type="submit" disabled={state === "sending"}>{state === "sending" ? "A enviar..." : "Enviar mensagem"} <b>→</b></button>
      </div>
      {state === "success" && <p className="form-note" role="status">Mensagem enviada com sucesso. A equipa do MozEmpresas recebeu o seu pedido.</p>}
      {state === "error" && <p className="form-note form-error" role="alert">{error}</p>}
    </form>
  );
}