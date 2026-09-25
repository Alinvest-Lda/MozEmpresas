"use client";
import {useActionState} from "react";
import type {BusinessState} from "@/lib/businesses/actions";
export function BusinessForm({action}:{action:(state:BusinessState,formData:FormData)=>Promise<BusinessState>}){
 const[state,formAction,pending]=useActionState(action,{});
 return <form action={formAction} className="auth-card" style={{maxWidth:760}}>
  <div className="field"><label htmlFor="name">Nome da empresa</label><input id="name" name="name" required maxLength={160}/></div>
  <div className="field"><label htmlFor="description">Descrição</label><textarea id="description" name="description" rows={5} maxLength={5000}/></div>
  <div className="toolbar"><div className="field" style={{flex:1}}><label htmlFor="location">Localização</label><input id="location" name="location" placeholder="Maputo, Moçambique"/></div><div className="field" style={{flex:1}}><label htmlFor="phone">Telefone</label><input id="phone" name="phone"/></div></div>
  <div className="toolbar"><div className="field" style={{flex:1}}><label htmlFor="email">Email empresarial</label><input id="email" name="email" type="email"/></div><div className="field" style={{flex:1}}><label htmlFor="website">Website</label><input id="website" name="website" type="url" placeholder="https://..."/></div></div>
  <div className="field"><label htmlFor="isPublic">Visibilidade</label><select id="isPublic" name="isPublic" defaultValue="true"><option value="true">Pública — aparecer no diretório</option><option value="false">Privada — apenas para gestão</option></select></div>
  {state.error&&<p role="alert" className="notice">{state.error}</p>}<button className="btn primary" disabled={pending}>{pending?"A criar...":"Criar empresa"}</button>
 </form>
}