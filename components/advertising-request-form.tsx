"use client";

import { useState } from "react";

const surfaces=[["HOME","Página inicial"],["DIRECTORY","Directório"],["MARKETPLACE","Produtos e serviços"],["OPPORTUNITIES","Oportunidades"]] as const;
const slots=[["HERO","Hero / topo"],["BILLBOARD","Billboard / faixa"],["FEATURED","Destaque contextual"],["INFEED","Dentro do conteúdo"]] as const;
const creative=[["BANNER","Banner"],["NATIVE","Conteúdo nativo"],["CARD","Cartão patrocinado"],["TEXT","Texto patrocinado"]] as const;

export function AdvertisingRequestForm(){
 const[sent,setSent]=useState(false),[pending,setPending]=useState(false),[error,setError]=useState("");
 async function submit(formData:FormData){setPending(true);setError("");const response=await fetch("/api/publicidade",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(Object.fromEntries(formData.entries()))});const result=await response.json();setPending(false);if(!response.ok){setError(result.error||"Não foi possível enviar o pedido.");return}setSent(true)}
 if(sent)return <div className="notice"><strong>Pedido recebido.</strong><br/>A equipa comercial confirmará o espaço, formato, período e materiais antes da activação.</div>;
 return <form action={submit} className="auth-card" style={{maxWidth:760}}>
  <div className="toolbar"><div className="field" style={{flex:1}}><label>Empresa</label><input name="companyName" required/></div><div className="field" style={{flex:1}}><label>Pessoa de contacto</label><input name="contactName" required/></div></div>
  <div className="toolbar"><div className="field" style={{flex:1}}><label>Email</label><input name="email" type="email" required/></div><div className="field" style={{flex:1}}><label>Telefone</label><input name="phone"/></div></div>
  <div className="toolbar"><div className="field" style={{flex:1}}><label>Onde quer aparecer?</label><select name="surface" defaultValue="DIRECTORY">{surfaces.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></div><div className="field" style={{flex:1}}><label>Posição</label><select name="slot" defaultValue="BILLBOARD">{slots.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></div></div>
  <div className="toolbar"><div className="field" style={{flex:1}}><label>Formato</label><select name="creativeType" defaultValue="BANNER">{creative.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select></div><div className="field" style={{flex:1}}><label>Nome da campanha</label><input name="packageName" required placeholder="Ex.: Campanha institucional"/></div></div>
  <div className="toolbar"><div className="field" style={{flex:1}}><label>Início</label><input name="startsAt" type="date"/></div><div className="field" style={{flex:1}}><label>Fim</label><input name="endsAt" type="date"/></div></div>
  <div className="field"><label>Título da peça <small>(opcional)</small></label><input name="headline" maxLength={160}/></div>
  <div className="field"><label>Mensagem / conteúdo</label><textarea name="body" rows={4} maxLength={3000} placeholder="Mensagem principal, público pretendido e contexto."/></div><div className="field"><label>Observações comerciais <small>(opcional)</small></label><textarea name="message" rows={3} maxLength={3000} placeholder="Datas, orçamento indicativo ou requisitos especiais."/></div>
  <div className="toolbar"><div className="field" style={{flex:1}}><label>Imagem / criativo URL <small>(opcional)</small></label><input name="imageUrl" type="url" placeholder="https://..."/></div><div className="field" style={{flex:1}}><label>Destino / URL <small>(opcional)</small></label><input name="targetUrl" type="url" placeholder="https://..."/></div></div>
  <div className="toolbar"><div className="field" style={{flex:1}}><label>Texto do botão <small>(opcional)</small></label><input name="ctaLabel" maxLength={40} placeholder="Saber mais"/></div><div className="field" style={{flex:1}}><label>Texto alternativo da imagem</label><input name="altText" maxLength={180}/></div></div>
  {error&&<p role="alert" className="notice">{error}</p>}<button className="btn primary" disabled={pending}>{pending?"A enviar...":"Solicitar proposta comercial →"}</button>
 </form>;
}