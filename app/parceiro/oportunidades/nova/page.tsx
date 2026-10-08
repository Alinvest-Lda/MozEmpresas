"use client";
import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PartnerPage } from "@/components/partner-workspace";

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

  return <PartnerPage eyebrow="Actividade · Nova publicação" title="Publicar uma oportunidade" description="Publique algo que a sua organização disponibiliza ao público através de candidatura, participação, benefício ou cooperação." action={{href:"/parceiro/oportunidades",label:"Voltar às publicações"}}>
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
  </PartnerPage>
}
