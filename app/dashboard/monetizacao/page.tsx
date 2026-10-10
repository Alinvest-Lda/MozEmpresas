export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getManagedBusinessIds } from "@/lib/businesses/permissions";
import styles from "./monetizacao.module.css";

const money=(n:number)=>n.toLocaleString("pt-MZ",{minimumFractionDigits:2,maximumFractionDigits:2})+" MZN";
const cr=(n:number)=>n.toLocaleString("pt-MZ")+" cr";
const day=(v:string)=>new Date(v).toLocaleDateString("pt-MZ",{day:"2-digit",month:"short"});

export default async function MonetizacaoPage({searchParams}:{searchParams:Promise<{period?:string}>}){
 const supabase=await createClient();
 const {data:{user}}=await supabase.auth.getUser(); if(!user) redirect("/login");
 const p=await searchParams; const period=p.period==="90"||p.period==="all"?p.period:"30";
 const ids=await getManagedBusinessIds(supabase,user.id);
 const since=period==="all"?null:new Date(Date.now()-Number(period)*86400000).toISOString();
 const [b,w,ad,svc,cp,pay,ev,metricResult]=await Promise.all([
  ids.length?supabase.from("businesses").select("id,name").in("id",ids).order("name"):Promise.resolve({data:[]}),
  ids.length?supabase.from("business_credit_wallets").select("business_id,balance_credits").in("business_id",ids):Promise.resolve({data:[]}),
  ids.length?supabase.from("business_promotions").select("id,business_id,title,status,price_mzn,credits_charged,created_at,ends_at").in("business_id",ids).order("created_at",{ascending:false}).limit(100):Promise.resolve({data:[]}),
  ids.length?supabase.from("platform_service_orders").select("id,business_id,status,amount_mzn,credits_charged,created_at").in("business_id",ids).order("created_at",{ascending:false}).limit(100):Promise.resolve({data:[]}),
  ids.length?supabase.from("credit_purchase_requests").select("id,business_id,status,amount_mzn,credits,created_at").in("business_id",ids).order("created_at",{ascending:false}).limit(100):Promise.resolve({data:[]}),
  ids.length?supabase.from("financial_payments").select("id,business_id,amount_mzn,status,created_at").in("business_id",ids).order("created_at",{ascending:false}).limit(100):Promise.resolve({data:[]}),
  ids.length?supabase.from("recommendation_events").select("id,business_id,event_type,created_at").in("business_id",ids).order("created_at",{ascending:false}).limit(100):Promise.resolve({data:[]}),
  ids.length?supabase.rpc("business_ad_campaign_metrics"):Promise.resolve({data:[]})
 ]);
 const businesses=b.data??[], wallets=w.data??[];
 const campaignMetrics=(metricResult.data??[]) as {campaign_id:string;impressions:number;clicks:number}[];
 const campaignImpressions=campaignMetrics.reduce((s,x)=>s+Number(x.impressions??0),0);
 const campaignClicks=campaignMetrics.reduce((s,x)=>s+Number(x.clicks??0),0);
 const campaignCtr=campaignImpressions>0?campaignClicks/campaignImpressions*100:0;
 const ads=(ad.data??[]).filter(x=>!since||x.created_at>=since), services=(svc.data??[]).filter(x=>!since||x.created_at>=since), purchases=(cp.data??[]).filter(x=>!since||x.created_at>=since), payments=(pay.data??[]).filter(x=>!since||x.created_at>=since), events=(ev.data??[]).filter(x=>!since||x.created_at>=since);
 const balance=wallets.reduce((s,x)=>s+Number(x.balance_credits??0),0);
 const adSpend=ads.filter(x=>x.status!=="CANCELLED").reduce((s,x)=>s+Number(x.price_mzn??0),0);
 const svcSpend=services.filter(x=>!["CANCELLED","FAILED"].includes(x.status)).reduce((s,x)=>s+Number(x.amount_mzn??0),0);
 const paidSpend=purchases.filter(x=>x.status==="PAID").reduce((s,x)=>s+Number(x.amount_mzn??0),0);
 const confirmed=payments.filter(x=>x.status==="CONFIRMED").reduce((s,x)=>s+Number(x.amount_mzn??0),0);
 const consumed=ads.reduce((s,x)=>s+Number(x.credits_charged??0),0)+services.reduce((s,x)=>s+Number(x.credits_charged??0),0);
 const active=ads.filter(x=>x.status==="ACTIVE"&&(!x.ends_at||new Date(x.ends_at)>=new Date())).length;
 const pendingPurchases=purchases.filter(x=>["REQUESTED","PAYMENT_PENDING"].includes(x.status)).length;
 const pendingServices=services.filter(x=>["PENDING_PAYMENT","PROCESSING"].includes(x.status)).length;
 const eventCount=events.length;
 const names=new Map(businesses.map(x=>[x.id,x.name]));
 const activity=[...ads.map(x=>({id:"a"+x.id,title:x.title||"Campanha publicitária",meta:"Publicidade · "+(names.get(x.business_id)||"Empresa"),value:x.price_mzn?money(Number(x.price_mzn)):cr(Number(x.credits_charged??0)),date:x.created_at})),...services.map(x=>({id:"s"+x.id,title:"Serviço MozEmpresas",meta:(names.get(x.business_id)||"Empresa")+" · "+x.status.replaceAll("_"," ").toLowerCase(),value:x.amount_mzn?money(Number(x.amount_mzn)):cr(Number(x.credits_charged??0)),date:x.created_at})),...purchases.filter(x=>x.status==="PAID").map(x=>({id:"c"+x.id,title:"Créditos adquiridos",meta:names.get(x.business_id)||"Empresa",value:cr(Number(x.credits??0)),date:x.created_at}))].sort((a,z)=>+new Date(z.date)-+new Date(a.date)).slice(0,6);
 const recommendations=[];
 if(balance>0&&active===0) recommendations.push(["Aproveitar saldo disponível","Há "+cr(balance)+" sem campanha activa. Se visibilidade for a prioridade, avalie uma nova utilização.","attention"]);
 if(active>0) recommendations.push(["Acompanhar antes de aumentar","Há "+active+" campanha(s) activa(s). Primeiro compare o resultado antes de aumentar o investimento.","good"]);
 if(pendingPurchases>0) recommendations.push(["Não duplicar uma compra pendente",pendingPurchases+" pedido(s) de créditos aguardam processamento.","attention"]);
 if(pendingServices>0) recommendations.push(["Aguardar execução",pendingServices+" serviço(s) estão pendentes ou em processamento.","neutral"]);
 if(!recommendations.length) recommendations.push(["Construir histórico comercial","Ainda não existem sinais suficientes para recomendar uma nova alocação. Continue a registar actividade.","neutral"]);
 return <main className="dashboard-main"><div className="dashboard-content">
  <header className={styles.hero}><div><span className="dashboard-kicker">Conta · Inteligência comercial</span><h1>Monetização</h1><p>Transforme a actividade da sua presença no MozEmpresas em decisões sobre onde investir, quando esperar e o que optimizar.</p></div><div className={styles.period}><span>Período</span><div><Link href="?period=30" className={period==="30"?styles.active:""}>30 dias</Link><Link href="?period=90" className={period==="90"?styles.active:""}>90 dias</Link><Link href="?period=all" className={period==="all"?styles.active:""}>Tudo</Link></div></div></header>
  <section className={styles.metrics}><article><span>Investimento comercial</span><strong>{money(adSpend+svcSpend)}</strong><small>publicidade + serviços registados</small></article><article><span>Saldo disponível</span><strong>{cr(balance)}</strong><small>carteiras das empresas sob gestão</small></article><article><span>Créditos consumidos</span><strong>{cr(consumed)}</strong><small>publicidade + serviços</small></article><article><span>Pagamentos confirmados</span><strong>{money(confirmed)}</strong><small>registos financeiros no período</small></article></section>
  <section className={styles.grid}><article className={styles.card}><span className="dashboard-kicker">Desempenho publicitário</span><h2>Exposição e interacção</h2><ul className={styles.state}><li><strong>{campaignImpressions.toLocaleString("pt-MZ")}</strong><span>impressões registadas</span></li><li><strong>{campaignClicks.toLocaleString("pt-MZ")}</strong><span>cliques registados</span></li><li><strong>{campaignImpressions>0?campaignCtr.toLocaleString("pt-MZ",{maximumFractionDigits:2})+"%":"—"}</strong><span>CTR · cliques ÷ impressões</span></li></ul><p>Indicadores acumulados das campanhas associadas às empresas sob a sua gestão. A plataforma ainda não regista conversões atribuídas para calcular ROI financeiro.</p><Link href="/dashboard/publicidade" className="btn primary">Analisar campanhas →</Link></article>
  <article className={styles.card}><span className="dashboard-kicker">Estado comercial</span><h2>O que merece atenção agora</h2><ul className={styles.state}><li><strong>{active}</strong><span>campanhas activas</span></li><li><strong>{pendingPurchases}</strong><span>compras de créditos pendentes</span></li><li><strong>{pendingServices}</strong><span>serviços em curso</span></li><li><strong>{purchases.filter(x=>x.status==="PAID").reduce((s,x)=>s+Number(x.credits??0),0)}</strong><span>créditos adquiridos</span></li></ul></article></section>
  <section className={styles.section}><div className="dashboard-section-head"><div><span className="dashboard-kicker">Próxima decisão</span><h2>Onde vale a pena agir</h2><p>Recomendações baseadas apenas em dados verificáveis.</p></div></div><div className={styles.recs}>{recommendations.map((r,i)=><article className={styles[r[2] as "good"|"attention"|"neutral"]} key={String(r[0])}><b>0{i+1}</b><div><strong>{r[0]}</strong><p>{r[1]}</p></div></article>)}</div></section>
  <section className={styles.section}><div className="dashboard-section-head"><div><span className="dashboard-kicker">Alocação</span><h2>Onde está a sair o investimento</h2><p>Leitura comercial sem duplicar os módulos de origem.</p></div></div><div className={styles.alloc}><article><span>Publicidade</span><strong>{money(adSpend)}</strong><small>{ads.length} registo(s) · {cr(ads.reduce((s,x)=>s+Number(x.credits_charged??0),0))}</small></article><article><span>Serviços</span><strong>{money(svcSpend)}</strong><small>{services.length} contratação(ões) · {cr(services.reduce((s,x)=>s+Number(x.credits_charged??0),0))}</small></article><article><span>Saldo adquirido</span><strong>{money(paidSpend)}</strong><small>compras de créditos marcadas como pagas</small></article></div></section>
  <section className={styles.section}><div className="dashboard-section-head"><div><span className="dashboard-kicker">Histórico de decisão</span><h2>Últimas movimentações relevantes</h2></div></div>{activity.length?activity.map(x=><div className={styles.row} key={x.id}><div><strong>{x.title}</strong><small>{x.meta} · {day(x.date)}</small></div><strong>{x.value}</strong></div>):<p className="muted">Ainda não há movimentações no período seleccionado.</p>}</section>
  <div className={styles.footerNote}>Para gerir créditos, publicidade, serviços ou gestão financeira, use os módulos próprios no menu. Esta página existe para ajudar a decidir, não para repetir esses módulos.</div>
 </div></main>;
}