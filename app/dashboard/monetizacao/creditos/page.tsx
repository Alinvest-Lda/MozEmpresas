export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function money(v:number|string|null|undefined){return v==null?"—":Number(v).toLocaleString("pt-MZ")+" MZN";}

export default async function CreditosPage(){
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return null;
  const [{data:owned},{data:members},{data:packages}]=await Promise.all([
    supabase.from("businesses").select("id,name").eq("owner_id",user.id).order("name"),
    supabase.from("business_members").select("business_id").eq("user_id",user.id).in("role",["owner","admin","operator"]),
    supabase.from("credit_packages").select("id,code,name,credit_volume,price_mzn,active").eq("active",true).order("credit_volume"),
  ]);
  const ids=[...new Set((members??[]).map(x=>x.business_id))];
  const {data:managed}=ids.length?await supabase.from("businesses").select("id,name").in("id",ids).order("name") : {data:[] as {id:string;name:string}[]};
  const businesses=[...(owned??[]),...(managed??[]).filter(b=>!(owned??[]).some(o=>o.id===b.id))];
  const {data:wallets}=businesses.length?await supabase.from("business_credit_wallets").select("id,business_id,balance_credits").in("business_id",businesses.map(b=>b.id)):{data:[] as {business_id:string;balance_credits:number}[]};
  const walletMap=new Map((wallets??[]).map(w=>[w.business_id,w.balance_credits]));
  const walletIds=(wallets??[]).map(w=>w.id);
  const {data:transactions}=walletIds.length?await supabase.from("credit_transactions").select("id,wallet_id,type,credits,amount_mzn,description,created_at").in("wallet_id",walletIds).order("created_at",{ascending:false}).limit(20):{data:[] as any[]};
  return <main className="dashboard-main"><div className="dashboard-content">
    <header className="dashboard-topbar"><div><span className="dashboard-kicker">Conta · Créditos</span><h1>Créditos</h1><p>Um recurso transversal do MozEmpresas. Os créditos podem ser utilizados em funcionalidades elegíveis da plataforma, incluindo publicidade.</p></div><Link className="btn" href="/dashboard/publicidade">Ir para Publicidade →</Link></header>
    <section className="dashboard-section" style={{marginTop:18}}><div className="dashboard-section-head"><div><span className="dashboard-kicker">Saldos</span><h2>Contas de créditos</h2><p className="muted">O saldo é mantido por empresa para permitir controlo e utilização no ecossistema.</p></div></div>
      {businesses.length?<div className="grid" style={{gridTemplateColumns:"repeat(3,minmax(0,1fr))"}}>{businesses.map(b=><div className="card" key={b.id}><span className="dashboard-kicker">{b.name}</span><h2 style={{margin:"6px 0"}}>{(walletMap.get(b.id)??0).toLocaleString("pt-MZ")} cr</h2><p className="muted">Saldo disponível</p></div>)}</div>:<div className="card"><strong>Associe uma empresa primeiro.</strong><p className="muted">É necessário representar uma empresa para ter uma conta de créditos.</p><Link className="btn primary" href="/dashboard/empresas">Gerir empresa →</Link></div>}
    </section>
    <section className="dashboard-section" style={{marginTop:18}}><div className="dashboard-section-head"><div><span className="dashboard-kicker">Pacotes</span><h2>Opções de carregamento</h2><p className="muted">Os pacotes definem volume e preço. A activação do pagamento deve ser ligada ao meio de pagamento da plataforma antes da disponibilização comercial.</p></div></div>
      <div className="grid" style={{gridTemplateColumns:"repeat(3,minmax(0,1fr))"}}>{(packages??[]).map(p=><div className="card" key={p.id}><strong>{p.name}</strong><h3 style={{margin:"8px 0"}}>{p.credit_volume.toLocaleString("pt-MZ")} créditos</h3><p className="muted">{money(p.price_mzn)} · { (Number(p.price_mzn)/p.credit_volume).toLocaleString("pt-MZ",{minimumFractionDigits:2,maximumFractionDigits:2}) } MZN/crédito</p><span className="muted">Pacote disponível no catálogo</span></div>)}</div>
    </section>
    <section className="dashboard-section" style={{marginTop:18}}><div className="dashboard-section-head"><div><span className="dashboard-kicker">Histórico</span><h2>Movimentos recentes</h2></div></div>
      {(transactions??[]).length?(transactions??[]).map(t=><div key={t.id} style={{display:"flex",justifyContent:"space-between",gap:16,padding:"12px 0",borderTop:"1px solid #eee"}}><div><strong>{t.type}</strong><div className="muted">{t.description||"Movimento de créditos"} · {new Date(t.created_at).toLocaleString("pt-MZ")}</div></div><strong>{t.credits>0?"+":""}{t.credits.toLocaleString("pt-MZ")} cr</strong></div>):<p className="muted">Ainda não existem movimentos de créditos.</p>}
    </section>
  </div></main>;
}
