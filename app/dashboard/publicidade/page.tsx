export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { purchaseAdCredits, requestAdDirectPayment } from "@/lib/advertising/actions";

const placement: Record<string,string> = { DIRECTORY:"Directório", MARKETPLACE:"Marketplace", HOME:"Home" };

export default async function PublicidadePage({ searchParams }: { searchParams: Promise<{success?:string;error?:string}> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{data:owned},{data:members},{data:products},{data:promotions}] = await Promise.all([
    supabase.from("businesses").select("id,name").eq("owner_id",user.id).order("name"),
    supabase.from("business_members").select("business_id").eq("user_id",user.id).in("role",["owner","admin","operator"]),
    supabase.from("ad_products").select("id,name,placement,description,duration_days,direct_price_mzn,credit_price,capacity").eq("active",true).order("placement").order("duration_days"),
    supabase.from("business_promotions").select("id,title,placement,status,starts_at,ends_at,payment_method,price_mzn,credits_charged,businesses:business_id(name)").order("created_at",{ascending:false}).limit(20)
  ]);
  const ids=[...new Set((members??[]).map(x=>x.business_id))];
  const {data:managed}=ids.length?await supabase.from("businesses").select("id,name").in("id",ids).order("name"):{data:[] as {id:string;name:string}[]};
  const businesses=[...(owned??[]),...(managed??[]).filter(b=>!(owned??[]).some(o=>o.id===b.id))];
  const {data:wallets}=businesses.length?await supabase.from("business_credit_wallets").select("business_id,balance_credits").in("business_id",businesses.map(b=>b.id)):{data:[] as {business_id:string;balance_credits:number}[]};
  const wallet=new Map((wallets??[]).map(w=>[w.business_id,w.balance_credits]));
  const flash=params.success==="credits"?"Publicidade activada e créditos debitados.":params.success==="direct"?"Pedido de pagamento directo criado e aguarda confirmação.":params.error==="credits"?"Créditos insuficientes. Recarregue a conta.":params.error==="availability"?"O espaço está ocupado nesse período. Escolha outra data.":params.error?"Não foi possível concluir a compra. Verifique os dados.":"";

  return <main className="dashboard-main"><div className="dashboard-content">
    {flash&&<div className="card" style={{marginBottom:18}}><strong>{flash}</strong></div>}
    <header className="page-header"><span className="eyebrow">Self-service</span><h1>Publicidade e espaços</h1><p className="muted">Escolha o espaço, a duração e a forma de pagamento. A plataforma valida automaticamente a disponibilidade.</p></header>

    <section className="dashboard-section" style={{marginTop:18}}>
      <div className="dashboard-section-head"><div><span className="dashboard-kicker">Tabela comercial</span><h2>Preços normais e em créditos</h2><p>Os créditos são saldo pré-pago. A tabela mostra o preço directo e o consumo em créditos.</p></div><Link className="btn" href="/dashboard/monetizacao/creditos">Recarregar créditos →</Link></div>
      {(["DIRECTORY","MARKETPLACE","HOME"] as const).map(p=><div key={p} style={{marginTop:20}}><h3>{placement[p]}</h3><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr><th style={{textAlign:"left",padding:10}}>Produto</th><th>Dias</th><th>Preço normal</th><th>Créditos</th><th>Posições</th></tr></thead><tbody>{(products??[]).filter(x=>x.placement===p).map(x=><tr key={x.id} style={{borderTop:"1px solid #eee"}}><td style={{padding:10}}><strong>{x.name}</strong><br/><small>{x.description}</small></td><td>{x.duration_days}</td><td>{Number(x.direct_price_mzn).toLocaleString("pt-MZ")} MZN</td><td><strong>{x.credit_price.toLocaleString("pt-MZ")} cr</strong></td><td>{x.capacity}</td></tr>)}</tbody></table></div></div>)}
    </section>

    <section className="dashboard-section" style={{marginTop:18}}>
      <div className="dashboard-section-head"><div><span className="dashboard-kicker">Compra</span><h2>Activar uma campanha</h2><p>Para pagamento em créditos, o débito é atómico e só acontece se houver saldo e disponibilidade.</p></div></div>
      {businesses.length?<div className="grid" style={{gridTemplateColumns:"minmax(0,1fr) minmax(320px,.7fr)"}}>
        <div className="card"><form action={purchaseAdCredits} style={{display:"grid",gap:12}}>
          <label>Empresa<select name="business_id" required defaultValue={businesses[0].id}>{businesses.map(b=><option value={b.id} key={b.id}>{b.name} — {wallet.get(b.id)??0} créditos</option>)}</select></label>
          <label>Produto<select name="ad_product_id" required>{(products??[]).map(p=><option value={p.id} key={p.id}>{p.name} — {Number(p.direct_price_mzn).toLocaleString("pt-MZ")} MZN / {p.credit_price} cr</option>)}</select></label>
          <label>Oferta associada (opcional)<input name="listing_id" placeholder="ID da oferta" /></label>
          <label>Nome da campanha<input name="title" placeholder="Ex.: Campanha institucional" /></label>
          <label>Data de início<input name="starts_at" type="datetime-local" required /></label>
          <button className="btn primary" type="submit">Comprar com créditos →</button>
        </form>
        <form action={requestAdDirectPayment} style={{display:"grid",gap:12,marginTop:18,paddingTop:18,borderTop:"1px solid #eee"}}>
          <input type="hidden" name="business_id" value={businesses[0].id}/><input type="hidden" name="ad_product_id" value={(products??[])[0]?.id??""}/>
          <label>Produto para pagamento directo<select name="ad_product_id">{(products??[]).map(p=><option value={p.id} key={p.id}>{p.name} — {Number(p.direct_price_mzn).toLocaleString("pt-MZ")} MZN</option>)}</select></label>
          <label>Data de início<input name="starts_at" type="datetime-local" required /></label>
          <label>Nome da campanha<input name="title" placeholder="Ex.: Campanha institucional" /></label>
          <button className="btn" type="submit">Registar pagamento directo →</button>
          <small className="muted">O pedido fica PENDENTE até a confirmação do pagamento. A activação automática do gateway pode ser ligada depois.</small>
        </form></div>
        <aside className="card"><span className="dashboard-kicker">Saldo</span><h3>Créditos das empresas</h3>{businesses.map(b=><div key={b.id} style={{padding:"12px 0",borderBottom:"1px solid #eee"}}><strong>{b.name}</strong><div className="muted">{wallet.get(b.id)??0} créditos</div></div>)}<Link href="/dashboard/monetizacao/creditos" className="btn" style={{marginTop:14}}>Comprar créditos</Link></aside>
      </div>:<div className="card"><strong>Associe uma empresa primeiro.</strong><p className="muted">É necessário representar uma empresa para comprar publicidade.</p><Link href="/dashboard/empresas" className="btn primary">Gerir empresas</Link></div>}
    </section>

    <section className="dashboard-section" style={{marginTop:18}}><div className="dashboard-section-head"><div><span className="dashboard-kicker">Histórico</span><h2>As suas campanhas</h2></div></div>{(promotions??[]).length?(promotions??[]).map(p=>{const b=Array.isArray(p.businesses)?p.businesses[0]:p.businesses;return <div key={p.id} style={{display:"flex",justifyContent:"space-between",gap:16,padding:"14px 0",borderTop:"1px solid #eee"}}><div><strong>{p.title}</strong><div className="muted">{b?.name||"Empresa"} · {placement[p.placement]||p.placement} · {p.payment_method==="CREDITS"?String(p.credits_charged??0)+" créditos":String(p.price_mzn??0)+" MZN"}</div></div><span>{p.status}</span></div>}) : <p className="muted">Ainda não existem campanhas.</p>}</section>
  </div></main>;
}
