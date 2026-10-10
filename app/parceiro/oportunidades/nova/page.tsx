"use client";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PartnerPage } from "@/components/partner-workspace";

const types = [
  ["FUNDING", "Financiamento", "Linhas de crédito, fundos, grants ou outros apoios financeiros."],
  ["PROGRAM", "Desenvolvimento empresarial", "Programas para empresas existentes crescerem, modernizarem-se ou melhorarem a sua capacidade."],
  ["YOUTH_INITIATIVE", "Iniciativa juvenil", "Programas e iniciativas dirigidas especificamente a jovens, empreendedorismo e desenvolvimento juvenil."],
  ["TRAINING", "Formação e capacitação", "Programas de formação, capacitação profissional, bolsas de formação ou desenvolvimento de competências."],
  ["ENTREPRENEUR_SUPPORT", "Apoio a empreendedores", "Incubação, aceleração e programas de apoio a empreendedores, startups e negócios em desenvolvimento."],
  ["EXPORT_INTERNATIONAL", "Exportação e internacionalização", "Apoio à exportação, acesso a mercados externos e internacionalização de empresas e produtos."],
] as const;

function slug(v:string){return v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")+"-"+Date.now().toString(36)}

export default function NewPartnerOpportunity(){
  const r=useRouter();
  const [pending,setPending]=useState(false),[error,setError]=useState(""),[type,setType]=useState("FUNDING"),[record,setRecord]=useState<any>(null),[editId,setEditId]=useState<string|null>(null),[loading,setLoading]=useState(true);
  useEffect(()=>{let active=true;const id=new URLSearchParams(window.location.search).get("editar");setEditId(id);if(!id){setLoading(false);return()=>{active=false}};(async()=>{const s=createClient();const{data:{user}}=await s.auth.getUser();if(!user){if(active){setError("Sessão expirada.");setLoading(false)}return}const{data,error}=await s.from("opportunities").select("id,title,type,status,description,organization,location,opens_at,closes_at,requirements").eq("id",id).eq("owner_id",user.id).maybeSingle();if(active){if(error||!data)setError("Não foi possível carregar a publicação.");else{setRecord(data);setType(data.type||"FUNDING")}setLoading(false)}})();return()=>{active=false}},[]);

  async function submit(ev:FormEvent<HTMLFormElement>){
    ev.preventDefault();setPending(true);setError("");
    const f=new FormData(ev.currentTarget),submitter=(ev.nativeEvent as SubmitEvent).submitter as HTMLButtonElement|null;
    const status=submitter?.value==="DRAFT"?"DRAFT":"PUBLISHED";
    const title=String(f.get("title")||"").trim(),description=String(f.get("description")||"").trim(),organization=String(f.get("organization")||"").trim();
    const opens=String(f.get("opens_at")||""),closes=String(f.get("closes_at")||"");
    if(!title||!description||!organization){setError("Preencha o título, a descrição e a entidade publicadora.");setPending(false);return}
    if(opens&&closes&&new Date(closes).getTime()<new Date(opens).getTime()){setError("A data de encerramento não pode anteceder a abertura.");setPending(false);return}
    const s=createClient(),{data:{user}}=await s.auth.getUser();
    if(!user){setError("Sessão expirada.");setPending(false);return}
    const payload={title,type:String(f.get("type")||"FUNDING"),status,description,organization,location:String(f.get("location")||"").trim()||null,opens_at:opens?new Date(opens).toISOString():null,closes_at:closes?new Date(closes).toISOString():null,requirements:String(f.get("requirements")||"").trim()||null};
    if(editId){const{error}=await s.from("opportunities").update(payload).eq("id",editId).eq("owner_id",user.id);if(error){setError("Não foi possível guardar: "+error.message);setPending(false);return}}
    else{const{data:account,error:accountError}=await s.rpc("current_partner_account_id");if(accountError||!account){setError("Conta de parceiro não identificada.");setPending(false);return}const slug=title.toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")+"-"+crypto.randomUUID().slice(0,8);const{error}=await s.from("opportunities").insert({...payload,owner_id:user.id,partner_account_id:account,slug});if(error){setError("Não foi possível publicar: "+error.message);setPending(false);return}}
    r.push("/parceiro/oportunidades");r.refresh();setPending(false);
  }

  const selected=types.find(([v])=>v===type)||types[0];

  return <PartnerPage eyebrow={editId?"Actividade · Editar publicação":"Actividade · Nova publicação"} title={editId?"Editar publicação":"Nova publicação"} description="Prepare uma oportunidade clara, valide as datas e escolha entre guardar um rascunho ou publicar." action={{href:"/parceiro/oportunidades",label:"Voltar às publicações"}}>
    {loading?<div className="partner-form-card">A carregar publicação…</div>:<div className="opportunity-publisher-layout">
      <form className="partner-form-card opportunity-publisher-form" onSubmit={submit}><div className="partner-form-head"><span className="partner-kicker">Publicar</span><h2>Informação da oportunidade</h2><p>Os campos essenciais ajudam o público a perceber rapidamente se deve participar e qual é o próximo passo.</p></div>
        <div className="publisher-step"><span>01</span><div><strong>Defina a oportunidade</strong><small>Este espaço destina-se a financiamento, programas, capacitação, apoio empresarial e internacionalização.</small></div></div>

        <label>Título<input name="title" required defaultValue={record?.title||""} placeholder="Ex.: Linha de financiamento para jovens agricultores"/></label>

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
        <label>Entidade publicadora<input name="organization" required defaultValue={record?.organization||""} placeholder="Ex.: BCI" required/></label>
        <label>Descrição<textarea name="description" rows={7} required defaultValue={record?.description||""} placeholder="Explique a oportunidade, finalidade, público elegível, benefício e como participar."/></label>
        <div className="partner-form-two">
          <label>Localização<input name="location" defaultValue={record?.location||""} placeholder="Moçambique / Maputo / Nacional"/></label>
          <label>Requisitos<textarea name="requirements" rows={4} defaultValue={record?.requirements||""} placeholder="Critérios de elegibilidade, documentos ou condições."/></label>
        </div>

        <div className="publisher-step"><span>03</span><div><strong>Defina o período</strong><small>Datas ajudam o público a distinguir oportunidades abertas, futuras e encerradas.</small></div></div>
        <div className="partner-form-two">
          <label>Abre em<input name="opens_at" type="datetime-local" defaultValue={record?.opens_at?new Date(new Date(record.opens_at).getTime()-new Date(record.opens_at).getTimezoneOffset()*60000).toISOString().slice(0,16):""}/></label>
          <label>Encerra em<input name="closes_at" type="datetime-local" defaultValue={record?.closes_at?new Date(new Date(record.closes_at).getTime()-new Date(record.closes_at).getTimezoneOffset()*60000).toISOString().slice(0,16):""}/></label>
        </div>

        {error&&<p className="partner-form-error">{error}</p>}
        <div className="publisher-form-actions"><button className="btn" type="submit" value="DRAFT" disabled={pending}>{pending?"A guardar…":"Guardar rascunho"}</button><button className="btn primary" type="submit" value="PUBLISHED" disabled={pending}>{pending?"A guardar…":record?.status==="PUBLISHED"?"Guardar e publicar →":"Publicar no MozEmpresas →"}</button><button type="button" className="btn" onClick={()=>r.push("/parceiro/oportunidades")}>Cancelar</button></div>
      </form>

      <aside className="opportunity-publisher-aside">
        <div className="publisher-aside-card"><span className="dashboard-kicker">Regra editorial</span><h2>Uma oportunidade deve pedir uma acção ao público.</h2><p>O público deve conseguir perceber o que está a ser disponibilizado, quem pode participar, quais são as condições e qual é o próximo passo.</p></div>
        <div className="publisher-aside-card publisher-exclusion"><strong>Não publique aqui</strong><ul><li>Produtos ou serviços comerciais</li><li>Concursos de contratação</li><li>Publicidade ou campanhas</li><li>Eventos isolados</li></ul><small>Esses conteúdos têm espaços próprios no MozEmpresas.</small></div>
      </aside>
    </div>}
  </PartnerPage>
}
