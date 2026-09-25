"use client";

import { FormEvent, useState } from "react";

export function ContactForm() {
  const [sent,setSent]=useState(false);
  function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form=new FormData(event.currentTarget);
    const name=String(form.get("name")||"").trim();
    const email=String(form.get("email")||"").trim();
    const subject=String(form.get("subject")||"Contacto pelo MozEmpresas").trim();
    const message=String(form.get("message")||"").trim();
    const body=[`Nome: ${name}`,`Email: ${email}`,`Telefone: ${String(form.get("phone")||"").trim()}`,"",message].join("\n");
    window.location.href=`mailto:info@mozempresas.co.mz?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  }
  return <form className="contact-form" onSubmit={submit}>
    <div className="contact-form-heading"><span className="eyebrow">Mensagem directa</span><h2>Como podemos ajudar?</h2><p>Preencha os dados abaixo. Ao enviar, será aberto o seu programa de email com a mensagem pronta para revisão.</p></div>
    <div className="form-grid">
      <label><span>Nome completo *</span><input name="name" required placeholder="O seu nome" /></label>
      <label><span>Email *</span><input type="email" name="email" required placeholder="nome@empresa.co.mz" /></label>
      <label><span>Telefone</span><input name="phone" placeholder="+258 8x xxx xxxx" /></label>
      <label><span>Assunto *</span><select name="subject" defaultValue="Dúvida geral"><option>Dúvida geral</option><option>Registo de empresa</option><option>Publicidade</option><option>Parcerias</option><option>Suporte</option><option>Sugestão</option></select></label>
      <label className="form-full"><span>Mensagem *</span><textarea name="message" required rows={6} placeholder="Escreva a sua mensagem..." /></label>
    </div>
    <div className="contact-form-footer"><span>Os seus dados são utilizados apenas para responder ao pedido.</span><button className="btn primary" type="submit">Enviar mensagem <b>→</b></button></div>
    {sent&&<p className="form-note" role="status">A mensagem foi preparada no seu programa de email. Reveja-a e confirme o envio.</p>}
  </form>