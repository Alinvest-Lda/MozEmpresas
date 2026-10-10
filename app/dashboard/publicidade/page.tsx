export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { purchaseAdCredits, requestAdMpesaPayment } from "@/lib/advertising/actions";
import { AdvertisingPurchaseForm } from "@/components/advertising-purchase-form";

const placement: Record<string, string> = { DIRECTORY:"Directório", MARKETPLACE:"Marketplace", HOME:"Página inicial" };

function money(value: number | string | null | undefined) {
  return value == null ? "—" : Number(value).toLocaleString("pt-MZ") + " MZN";
}

export default async function PublicidadePage({ searchParams }: { searchParams: Promise<{success?:string;error?:string}> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data:{user} } = await supabase.auth.getUser();
  if (!user) return null;

  const [{data:owned},{data:members},{data:products},{data:promotions},{data:categories},{data:campaignMetrics}] = await Promise.all([
    supabase.from("businesses").select("id,name").eq("owner_id",user.id).order("name"),
    supabase.from("business_members").select("business_id").eq("user_id",user.id).in("role",["owner","admin","operator"]),
    supabase.from("ad_products").select("id,name,placement,description,duration_days,direct_price_mzn,credit_price,capacity,access_type,audience_level").eq("active",true).order("placement").order("duration_days"),
    supabase.from("business_promotions").select("id,title,placement,status,starts_at,ends_at,payment_method,price_mzn,credits_charged,businesses:business_id(name)").order("created_at",{ascending:false}).limit(100),
    supabase.from("business_categories").select("name").order("name"),
    supabase.rpc("business_ad_campaign_metrics"),
  ]);
  const ids=[...new Set((members??[]).map(x=>x.business_id))];
  const {data:managed}=ids.length ? await supabase.from("businesses").select("id,name").in("id",ids).order("name") : {data:[] as {id:string;name:string}[]};
  const businesses=[...(owned??[]),...(managed??[]).filter(b=>!(owned??[]).some(o=>o.id===b.id))];
  const {data:wallets}=businesses.length ? await supabase.from("business_credit_wallets").select("business_id,balance_credits").in("business_id",businesses.map(b=>b.id)) : {data:[] as {business_id:string;balance_credits:number}[]};
  const walletMap=Object.fromEntries((wallets??[]).map(w=>[w.business_id,w.balance_credits]));
  const paidProducts=(products??[]).filter(p=>p.access_type!=="FREE");
  const metricsByCampaign=new Map((campaignMetrics??[]).map((x:any)=>[x.campaign_id,{impressions:Number(x.impressions??0),clicks:Number(x.clicks??0)}]));
  const campaignImpressions=(promotions??[]).reduce((sum,p)=>sum+(metricsByCampaign.get(p.id)?.impressions??0),0);
  const campaignClicks=(promotions??[]).reduce((sum,p)=>sum+(metricsByCampaign.get(p.id)?.clicks??0),0);
  const campaignInvestment=(promotions??[]).reduce((sum,p)=>sum+Number(p.price_mzn??0),0);
  const campaignCtr=campaignImpressions>0?campaignClicks/campaignImpressions*100:0;

  const flash=params.success==="credits"?"Publicidade activada e créditos debitados.":params.success==="mpesa"?"Pedido M-Pesa criado e aguarda confirmação.":params.error==="credits"?"Créditos insuficientes.":params.error==="availability"?"O espaço está ocupado nesse período.":params.error?"Não foi possível concluir a operação.":"";

  return <main className="dashboard-main"><div className="dashboard-content">
    {flash && <div className="card" style={{marginBottom:18}}><strong>{flash}</strong></div>}
    <header className="dashboard-topbar">
      <div><span className="dashboard-kicker">Trabalho · Publicidade</span><h1>Publicidade</h1><p>Visibilidade adicional nos espaços publicitários limitados do MozEmpresas. A presença normal no Directório e no Marketplace continua gratuita.</p></div>

    </header>

    <section className="dashboard-section" style={{marginTop:18}}>
      <div className="dashboard-section-head"><div><span className="dashboard-kicker">Como funciona</span><h2>Presença e publicidade são coisas diferentes</h2><p className="muted">A presença normal é a base gratuita do ecossistema. Publicidade é uma compra opcional para obter exposição adicional.</p></div></div>
      <div className="grid" style={{gridTemplateColumns:"repeat(2,minmax(0,1fr))"}}>
        <div className="card"><span className="dashboard-kicker">Gratuito</span><h3>Presença orgânica</h3><p className="muted">Empresa no Directório e produtos/serviços no Marketplace, sem compra de publicidade.</p></div>
        <div className="card"><span className="dashboard-kicker">Opcional</span><h3>Publicidade</h3><p className="muted">Espaços limitados para dar maior destaque a uma empresa, oferta ou campanha.</p></div>
      </div>
    </section>

    <section className="dashboard-section" style={{marginTop:18}}>
      <div className="dashboard-section-head"><div><span className="dashboard-kicker">Preçário simplificado</span><h2>Escolha no formulário</h2><p className="muted">Não é necessário comparar dezenas de linhas. O espaço e a duração estão agrupados num único selector e o sistema calcula o valor final.</p></div></div>
      <AdvertisingPurchaseForm businesses={businesses} products={paidProducts} categories={categories??[]} wallets={walletMap} creditAction={purchaseAdCredits} mpesaAction={requestAdMpesaPayment}/>
      <div className="card" style={{marginTop:12}}><strong>Segmentação</strong><p className="muted" style={{margin:"4px 0 0"}}>Localização +10% · actividade/categoria +10%. A segmentação altera o preço do mesmo espaço; não cria novos banners.</p></div>
    </section>

    <section className="dashboard-section" style={{marginTop:18}}>
      <div className="dashboard-section-head"><div><span className="dashboard-kicker">Desempenho e investimento</span><h2>Análise das campanhas</h2><p className="muted">Indicadores agregados das campanhas visíveis no histórico (até 100 registos recentes).</p></div></div>
      <div className="grid advertising-performance-grid" style={{gridTemplateColumns:"repeat(4,minmax(0,1fr))"}}>
        <div className="card"><span className="dashboard-kicker">Investimento registado</span><h3>{money(campaignInvestment)}</h3><p className="muted">Soma dos valores em MZN registados; campanhas pagas em créditos sem valor monetário não são convertidas.</p></div>
        <div className="card"><span className="dashboard-kicker">Impressões</span><h3>{campaignImpressions.toLocaleString("pt-MZ")}</h3><p className="muted">Exibições registadas</p></div>
        <div className="card"><span className="dashboard-kicker">Cliques</span><h3>{campaignClicks.toLocaleString("pt-MZ")}</h3><p className="muted">Interacções registadas</p></div>
        <div className="card"><span className="dashboard-kicker">CTR</span><h3>{campaignImpressions>0?campaignCtr.toLocaleString("pt-MZ",{maximumFractionDigits:2})+"%":"—"}</h3><p className="muted">Cliques ÷ impressões</p></div>
      </div>
      <div className="card" style={{marginTop:12}}><strong>ROI financeiro ainda não mensurável</strong><p className="muted" style={{margin:"4px 0 0"}}>A plataforma regista exposição e cliques, mas ainda não atribui vendas ou receita às campanhas. O CTR mede interacção, não retorno financeiro. Para calcular ROI real será necessário registar conversões e o valor gerado.</p></div>
    </section>

    <section className="dashboard-section" style={{marginTop:18}}>
      <div className="dashboard-section-head"><div><span className="dashboard-kicker">Campanhas</span><h2>Histórico publicitário</h2><p className="muted">Aqui ficam apenas campanhas publicitárias. Os Serviços MozEmpresas têm espaço próprio.</p></div><Link href="/dashboard/servicos" className="text-link">Ver Serviços MozEmpresas →</Link></div>
      {(promotions??[]).length ? (promotions??[]).map(p=>{const b=Array.isArray(p.businesses)?p.businesses[0]:p.businesses;const m=metricsByCampaign.get(p.id)??{impressions:0,clicks:0};return <div key={p.id} style={{display:"flex",justifyContent:"space-between",gap:16,padding:"14px 0",borderTop:"1px solid #eee"}}><div><strong>{p.title}</strong><div className="muted">{b?.name||"Empresa"} · {placement[p.placement]||p.placement} · {p.payment_method==="CREDITS"?String(p.credits_charged??0)+" créditos":money(p.price_mzn)}</div><div className="muted">{m.impressions.toLocaleString("pt-MZ")} impressões · {m.clicks.toLocaleString("pt-MZ")} cliques · CTR {m.impressions>0?(m.clicks/m.impressions*100).toLocaleString("pt-MZ",{maximumFractionDigits:2})+"%":"—"}</div></div><span>{p.status}</span></div>}) : <p className="muted">Ainda não existem campanhas publicitárias.</p>}
    </section>
  </div></main>;
}
