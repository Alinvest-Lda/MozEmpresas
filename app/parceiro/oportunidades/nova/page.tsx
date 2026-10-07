"use client";
import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const types = [
  ["FUNDING", "Financiamento", "Linhas de crédito, fundos, grants ou outros apoios financeiros."],
  ["PROGRAM", "Programa / Candidatura", "Programas com inscrições, candidaturas ou selecção de participantes."],
  ["AWARD_SCHOLARSHIP", "Bolsa / Prémio", "Bolsas, prémios, fellowships ou competições com benefício atribuído."],
  ["PARTNERSHIP", "Parceria / Cooperação", "Procura de entidades para colaboração, implementação ou cooperação."],
  ["EXPRESSION_OF_INTEREST", "Manifestação de Interesse", "Convite para entidades apresentarem interesse numa iniciativa específica."],
] as const;

function slug(v:string){return v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")+"-"+Date.now().toString(36)}

export default function NewPartnerOpportunity(){
  const r=useRouter();
  const [pending,setPending]=useState(false),[error,setError]=useState(""),[type,setType]=useState("FUNDING");

  async function submit(ev:FormEvent<HTMLFormElement>){
    ev.preventDefault(); setPending(true); setError("");
    const f=new FormData(ev.currentTarget); const s=createClient();
    const {data:{user}}=await s.auth.getUser();
    if(!user){setError("Sessão expirada.");setPending(false);return}
    const {data:account}=await s.rpc("current_partner_account_id");
    if(!account){setError("Conta de parceiro não identificada.");setPending(false);return}
    const title=String(f.get("title")||"");
    const {error}=await s.from("opportunities").insert({
      owner_id:user.id,partner_account_id:account,title,slug:slug(title),
      type:String(f.get("type")||"FUNDING"),status:"PUBLISHED",
      description:String(f.get("description")||""),organization:String(f.get("organization")||""),
      location:String(f.get("location")||"")||null,
      opens_at:f.get("opens_at")?new Date(String(f.get("opens_at"))).toISOString():null,
      closes_at:f.get("closes_at")?new Date(String(f.get("closes_at"))).toISOString():null,
      requirements:String(f.get("requirements")||"")||null
    });
    if(error)setError(error.message);else r.push("/parceiro/oportunidades");
    setPending(false);
  }

  const selected=types.find(([v])=>v===type)||types[0];

  return <main className="dashboard-main partner-workspace"><div className="dashboard-content">
    <header className="partner-page-hero">
      <div>
        <span className="dashboard-kicker">Actividade · Nova publicação</span>
        <h1>Publicar uma oportunidade</h1>
        <p>Publique algo que a sua organização disponibiliza ao público através de candidatura, participação, benefício ou cooperação.</p>
      </div>
    </header>

    <div className="opportunity-publisher-layout">
      <form className="partner-form-card opportunity-publisher-form" onSubmit={submit}>
        <div className="publisher-step"><span>01</span><div><strong>Defina a oportunidade</strong><small>Escolha a natureza correcta. Se for um concurso, produto, serviço ou evento, use o módulo correspondente.</small></div></div>

        <label>Título<input name="title" required placeholder="Ex.: Linha de financiamento para jovens agricultores"/></label>

        <fieldset className="opportunity-type-picker">
          <legend>Tipo de oportunidade</legend>
          <div className="opportunity-type-grid">
            {types.map(([v,l,d])=><label key={v} className={"opportunity-type-option "+(type===v?"selected":"")}>
              <input type="radio" name="type" value={v} checked={type===v} onChange={()=>setType(v)}/>
              <span><strong>{l}</strong><small>{d}</small></span>
            </label>)}
          </div>
        </fieldset>

        <div className="publisher-guidance"><strong>{selected[1]}</strong><span>{selected[2]}</span></div>

        <div className="publisher-step"><span>02</span><div><strong>Apresente a oportunidade</strong><small>Explique o que é, quem pode participar e o que a entidade espera receber.</small></div></div>
        <label>Entidade publicadora<input name="organization" placeholder="Ex.: BCI" required/></label>
        <label>Descrição<textarea name="description" rows={7} required placeholder="Explique a oportunidade, finalidade, público elegível, benefício e como participar."/></label>
        <div className="partner-form-two">
          <label>Localização<input name="location" placeholder="Moçambique / Maputo / Nacional"/></label>
          <label>Requisitos<textarea name="requirements" rows={4} placeholder="Critérios de elegibilidade, documentos ou condições."/></label>
        </div>

        <div className="publisher-step"><span>03</span><div><strong>Defina o período</strong><small>Datas ajudam o público a distinguir oportunidades abertas, futuras e encerradas.</small></div></div>
        <div className="partner-form-two">
          <label>Abre em<input name="opens_at" type="datetime-local"/></label>
          <label>Encerra em<input name="closes_at" type="datetime-local"/></label>
        </div>

        {error&&<p className="partner-form-error">{error}</p>}
        <div className="publisher-form-actions"><button className="btn primary" disabled={pending}>{pending?"A publicar…":"Publicar no MozEmpresas →"}</button><button type="button" className="btn" onClick={()=>r.push("/parceiro/oportunidades")}>Cancelar</button></div>
      </form>

      <aside className="opportunity-publisher-aside">
        <div className="publisher-aside-card"><span className="dashboard-kicker">Regra editorial</span><h2>Uma oportunidade deve pedir uma acção ao público.</h2><p>O público deve conseguir perceber o que está a ser disponibilizado, quem pode participar, quais são as condições e qual é o próximo passo.</p></div>
        <div className="publisher-aside-card publisher-exclusion"><strong>Não publique aqui</strong><ul><li>Produtos ou serviços comerciais</li><li>Concursos de contratação</li><li>Publicidade ou campanhas</li><li>Eventos isolados</li></ul><small>Esses conteúdos têm espaços próprios no MozEmpresas.</small></div>
      </aside>
    </div>
  </div>
  <style>{`
    .opportunity-publisher-layout{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:22px;align-items:start}
    .opportunity-publisher-form{max-width:none}
    .publisher-step{display:flex;gap:13px;align-items:flex-start;padding:4px 0 18px;border-bottom:1px solid #dfe6e3;margin-bottom:18px}
    .publisher-step>span{width:32px;height:32px;border-radius:9px;background:#e8f1ef;color:#0b6b63;display:grid;place-items:center;font-size:11px;font-weight:900}
    .publisher-step div{display:grid;gap:3px}.publisher-step strong{font-size:14px}.publisher-step small{color:#6d7976;line-height:1.45}
    .opportunity-type-picker{border:0;padding:0;margin:0 0 17px}.opportunity-type-picker legend{font-size:13px;font-weight:800;margin-bottom:9px}
    .opportunity-type-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
    .opportunity-type-option{display:flex;gap:10px;align-items:flex-start;border:1px solid #d7e1de;border-radius:12px;padding:13px;background:#fff;cursor:pointer;transition:.15s}
    .opportunity-type-option:hover{border-color:#9bbab4}.opportunity-type-option.selected{border-color:#0b6b63;background:#f0f7f5;box-shadow:0 0 0 2px #dcefeb}
    .opportunity-type-option input{margin-top:3px;accent-color:#0b6b63}.opportunity-type-option span{display:grid;gap:4px}.opportunity-type-option strong{font-size:13px}.opportunity-type-option small{font-size:11px;line-height:1.4;color:#6d7976}
    .publisher-guidance{display:flex;gap:9px;align-items:center;background:#142c29;color:#fff;border-radius:12px;padding:13px 15px;margin:0 0 22px}.publisher-guidance strong{font-size:12px}.publisher-guidance span{font-size:11px;color:#bfd0cc}
    .publisher-form-actions{display:flex;gap:9px;flex-direction:row-reverse;justify-content:flex-start;margin-top:6px}
    .opportunity-publisher-aside{display:grid;gap:12px;position:sticky;top:25px}.publisher-aside-card{background:#fff;border:1px solid #dbe3e0;border-radius:15px;padding:19px}.publisher-aside-card h2{font-size:20px;line-height:1.15;letter-spacing:-.03em;margin:10px 0 8px}.publisher-aside-card p{font-size:12px;line-height:1.55;color:#65716e;margin:0}.publisher-exclusion{background:#f7faf9}.publisher-exclusion strong{font-size:12px}.publisher-exclusion ul{padding-left:18px;margin:10px 0;color:#596864;font-size:12px;line-height:1.8}.publisher-exclusion small{color:#7b8784}
    @media(max-width:900px){.opportunity-publisher-layout{grid-template-columns:1fr}.opportunity-publisher-aside{position:static}.opportunity-type-grid{grid-template-columns:1fr 1fr}}
    @media(max-width:560px){.opportunity-type-grid{grid-template-columns:1fr}.publisher-form-actions{flex-direction:column}.publisher-form-actions .btn{width:100%}}
  `}</style>
  </main>
}
