export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { purchaseAdCredits, requestAdMpesaPayment } from "@/lib/advertising/actions";
import { AdvertisingPurchaseForm } from "@/components/advertising-purchase-form";
import { isValidAdSurfaceSlot } from "@/lib/advertising/placements";

const placement: Record<string, string> = { DIRECTORY:"Directório", MARKETPLACE:"Marketplace", HOME:"Página inicial", OPPORTUNITIES:"Oportunidades" };

function money(value: number | string | null | undefined) {
  return value == null ? "—" : Number(value).toLocaleString("pt-MZ") + " MZN";
}
function campaignStatusLabel(p:{status:string|null;payment_method:string|null;paid_at:string|null;credits_charged?:number|null}) {
  if(p.status==="PENDING"&&p.payment_method==="MPESA") return p.paid_at?"Pagamento confirmado · aguarda activação":"A aguardar pagamento";
  if(p.status==="PENDING"&&p.payment_method==="CREDITS"&&Number(p.credits_charged??0)>0) return "Créditos debitados · aguarda activação";
  const labels:Record<string,string>={DRAFT:"Rascunho",PENDING:"Pendente",ACTIVE:"Activa",PAUSED:"Pausada",EXPIRED:"Expirada",CANCELLED:"Cancelada"};
  return labels[p.status||""]||p.status||"—";
}

export default async function PublicidadePage({ searchParams }: { searchParams: Promise<{success?:string;error?:string}> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data:{user} } = await supabase.auth.getUser();
  if (!user) return null;

  const [{data:owned,error:ownedError},{data:members,error:membersError},{data:products,error:productsError},{data:categories,error:categoriesError},{data:campaignMetrics,error:campaignMetricsError}] = await Promise.all([
    supabase.from("businesses").select("id,name").eq("owner_id",user.id).is("archived_at",null).order("name"),
    supabase.from("business_members").select("business_id").eq("user_id",user.id).in("role",["owner","admin","operator"]),
    supabase.from("ad_products").select("id,name,placement,slot,description,duration_days,direct_price_mzn,credit_price,capacity,access_type,audience_level").eq("active",true).order("placement").order("duration_days"),
    supabase.from("business_categories").select("name").order("name"),
    supabase.rpc("business_ad_campaign_metrics"),
  ]);
  const ids=[...new Set((members??[]).map(x=>x.business_id))];
  const {data:managed,error:managedError}=ids.length ? await supabase.from("businesses").select("id,name").in("id",ids).is("archived_at",null).order("name") : {data:[] as {id:string;name:string}[],error:null};
  const businesses=[...(owned??[]),...(managed??[]).filter(b=>!(owned??[]).some(o=>o.id===b.id))];
  const businessIds=businesses.map((business)=>business.id);
  const {data:promotions,error:promotionsError}=businessIds.length
    ? await supabase.from("business_promotions").select("id,title,placement,status,starts_at,ends_at,payment_method,payment_reference,paid_at,price_mzn,credits_charged,business_id,businesses:business_id(name)").in("business_id",businessIds).order("created_at",{ascending:false}).limit(100)
    : {data:[] as {id:string;title:string|null;placement:string;status:string;starts_at:string;ends_at:string|null;payment_method:string|null;price_mzn:number|null;credits_charged:number|null;business_id:string;businesses:{name:string}|{name:string}[]|null}[],error:null};
  const {data:wallets,error:walletsError}=businesses.length ? await supabase.from("business_credit_wallets").select("business_id,balance_credits").in("business_id",businesses.map(b=>b.id)) : {data:[] as {business_id:string;balance_credits:number}[],error:null};
  const walletMap=Object.fromEntries((wallets??[]).map(w=>[w.business_id,w.balance_credits]));
  const paidProducts=(products??[]).filter(p=>p.access_type==="PAID" && isValidAdSurfaceSlot(p.placement,p.slot) && Number.isFinite(Number(p.direct_price_mzn)) && Number(p.direct_price_mzn)>0 && Number.isInteger(Number(p.duration_days)) && Number(p.duration_days)>0 && Number.isInteger(Number(p.capacity)) && Number(p.capacity)>0 && Number.isFinite(Number(p.credit_price)) && Number(p.credit_price)>=0);
  const metricsByCampaign=new Map<string,{impressions:number;clicks:number}>((campaignMetrics??[]).map((x:any)=>[x.campaign_id,{impressions:Number(x.impressions??0),clicks:Number(x.clicks??0)}] as [string,{impressions:number;clicks:number}]));
  const businessScopeIncomplete=Boolean(ownedError||membersError||managedError);
  const campaignImpressions=businessScopeIncomplete||campaignMetricsError||promotionsError?null:(promotions??[]).reduce((sum,p)=>sum+(metricsByCampaign.get(p.id)?.impressions??0),0);
  const campaignClicks=businessScopeIncomplete||campaignMetricsError||promotionsError?null:(promotions??[]).reduce((sum,p)=>sum+(metricsByCampaign.get(p.id)?.clicks??0),0);
  const campaignInvestment=businessScopeIncomplete||promotionsError?null:(promotions??[]).reduce((sum,p)=>sum+(["MPESA","DIRECT"].includes(p.payment_method??"")&&Boolean(p.paid_at)?Number(p.price_mzn??0):0),0);
  const campaignCtr=campaignImpressions!==null&&campaignClicks!==null&&campaignImpressions>0?campaignClicks/campaignImpressions*100:null;
  const loadErrors=[ownedError,membersError,managedError,productsError,categoriesError,campaignMetricsError,promotionsError,walletsError].filter(Boolean);

  const flash=params.success==="credits"?"Publicidade activada e créditos debitados.":params.success==="mpesa"?"Pedido M-Pesa criado e aguarda confirmação.":params.error==="credits"?"Créditos insuficientes.":params.error==="availability"?"O espaço está ocupado nesse período.":params.error==="setup"?"O pedido M-Pesa ainda não está disponível: a reserva segura aguarda activação da migração necessária. Pode usar créditos ou tentar mais tarde.":params.error?"Não foi possível concluir a operação.":"";

  return <main className="dashboard-main"><div className="dashboard-content">
    {flash && <div className="card" style={{marginBottom:18}}><strong>{flash}</strong></div>}
    {loadErrors.length>0&&<div className="notice" role="alert">Não foi possível carregar integralmente os dados de publicidade. As listas ou indicadores afectados são apresentados como indisponíveis; um resultado vazio não confirma ausência de registos.</div>}
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
      {productsError||categoriesError||ownedError||membersError||managedError||walletsError ? <div className="notice" role="alert">O formulário não pode ser apresentado com segurança porque falhou o carregamento do catálogo, das empresas, das categorias ou das carteiras. Actualize a página ou tente mais tarde.</div> : <AdvertisingPurchaseForm businesses={businesses} products={paidProducts} categories={categories??[]} wallets={walletMap} creditAction={purchaseAdCredits} mpesaAction={requestAdMpesaPayment}/>}
      <div className="card" style={{marginTop:12}}><strong>Segmentação</strong><p className="muted" style={{margin:"4px 0 0"}}>Localização +10% · actividade/categoria +10%. A segmentação altera o preço do mesmo espaço; não cria novos banners.</p></div>
    </section>

    <section className="dashboard-section" style={{marginTop:18}}>
      <div className="dashboard-section-head"><div><span className="dashboard-kicker">Desempenho e investimento</span><h2>Análise das campanhas</h2><p className="muted">Indicadores agregados das campanhas visíveis no histórico (até 100 registos recentes).</p></div></div>
      <div className="grid advertising-performance-grid" style={{gridTemplateColumns:"repeat(4,minmax(0,1fr))"}}>
        <div className="card"><span className="dashboard-kicker">Investimento registado</span><h3>{campaignInvestment===null?"—":money(campaignInvestment)}</h3><p className="muted">Soma apenas pagamentos M-Pesa/directos com liquidação confirmada; compras por créditos não são convertidas para MZN.</p></div>
        <div className="card"><span className="dashboard-kicker">Impressões</span><h3>{campaignImpressions===null?"—":campaignImpressions.toLocaleString("pt-MZ")}</h3><p className="muted">Exibições registadas</p></div>
        <div className="card"><span className="dashboard-kicker">Cliques</span><h3>{campaignClicks===null?"—":campaignClicks.toLocaleString("pt-MZ")}</h3><p className="muted">Interacções registadas</p></div>
        <div className="card"><span className="dashboard-kicker">CTR</span><h3>{campaignCtr===null?"—":campaignCtr.toLocaleString("pt-MZ",{maximumFractionDigits:2})+"%"}</h3><p className="muted">Cliques ÷ impressões</p></div>
      </div>
      <div className="card" style={{marginTop:12}}><strong>ROI financeiro ainda não mensurável</strong><p className="muted" style={{margin:"4px 0 0"}}>A plataforma regista exposição e cliques, mas ainda não atribui vendas ou receita às campanhas. O CTR mede interacção, não retorno financeiro. Para calcular ROI real será necessário registar conversões e o valor gerado.</p></div>
    </section>

    <section className="dashboard-section" style={{marginTop:18}}>
      <div className="dashboard-section-head"><div><span className="dashboard-kicker">Campanhas</span><h2>Histórico publicitário</h2><p className="muted">Aqui ficam apenas campanhas publicitárias. Os Serviços MozEmpresas têm espaço próprio.</p></div><Link href="/dashboard/servicos" className="text-link">Ver Serviços MozEmpresas →</Link></div>
      {businessScopeIncomplete||promotionsError ? <div className="notice" role="alert">O histórico não está disponível integralmente porque falhou uma consulta de empresas ou campanhas.</div> : (promotions??[]).length ? (promotions??[]).map(p=>{const b=Array.isArray(p.businesses)?p.businesses[0]:p.businesses;const m=metricsByCampaign.get(p.id);return <div key={p.id} style={{display:"flex",justifyContent:"space-between",gap:16,padding:"14px 0",borderTop:"1px solid #eee"}}><div><strong>{p.title}</strong><div className="muted">{b?.name||"Empresa"} · {placement[p.placement]||p.placement} · {p.payment_method==="CREDITS"?String(p.credits_charged??0)+" créditos":money(p.price_mzn)}{p.payment_method==="MPESA"?(p.paid_at?" · M-Pesa confirmado · "+(p.payment_reference||"referência registada"):" · A aguardar confirmação M-Pesa"):""}</div><div className="muted">{campaignMetricsError?"Métricas indisponíveis":`${(m?.impressions??0).toLocaleString("pt-MZ")} impressões · ${(m?.clicks??0).toLocaleString("pt-MZ")} cliques · CTR ${(m?.impressions??0)>0?((m?.clicks??0)/(m?.impressions??1)*100).toLocaleString("pt-MZ",{maximumFractionDigits:2})+"%":"—"}`}</div></div><span>{campaignStatusLabel(p)}</span></div>}) : <p className="muted">Ainda não existem campanhas publicitárias.</p>}
    </section>
  </div></main>;
}
