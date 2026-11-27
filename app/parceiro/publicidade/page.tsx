export const dynamic="force-dynamic";
import Link from "next/link";
import { requirePartnerAccount } from "@/lib/auth/access";
import { PartnerPage,PartnerSection,PartnerMetric,PartnerEmpty } from "@/components/partner-workspace";

const statusLabel=(status:string)=>{
  const map:Record<string,string>={DRAFT:"Rascunho",ACTIVE:"Activa",PAUSED:"Pausada",REQUESTED:"Solicitada",APPROVED:"Aprovada",REJECTED:"Rejeitada",ENDED:"Encerrada",CANCELLED:"Cancelada"};
  return map[status]||status||"—";
};

export default async function PartnerAds(){
  const {supabase:s}=await requirePartnerAccount();
  const [{data:products,error:productsError},{data:campaigns,error:campaignsError},{data:campaignMetrics,error:metricsError},{data:paymentOrders,error:paymentsError}]=await Promise.all([
    s.rpc("partner_ad_products_list"),
    s.rpc("partner_ad_campaigns_list"),
    s.rpc("partner_ad_campaign_metrics"),
    campaigns?.length
      ? s.from("partner_ad_payment_orders").select("campaign_id,status,payment_method,payment_reference,amount_mzn,credits_charged,confirmed_at").in("campaign_id",campaigns.map((campaign:any)=>campaign.id)).order("created_at",{ascending:false})
      : Promise.resolve({data:[],error:null})
  ]);
  const metricsByCampaign=new Map<string,{impressions:number;clicks:number}>((campaignMetrics??[]).map((x:any)=>[x.campaign_id,{impressions:Number(x.impressions??0),clicks:Number(x.clicks??0)}] as [string,{impressions:number;clicks:number}]));
  const paymentsByCampaign=new Map<string,any>();(paymentOrders??[]).forEach((x:any)=>{if(!paymentsByCampaign.has(x.campaign_id))paymentsByCampaign.set(x.campaign_id,x)});
  const measuredCampaigns=(campaigns??[]).map((x:any)=>({...x,payment:paymentsError?undefined:(paymentsByCampaign.get(x.id)||null),impressions:metricsError?null:(metricsByCampaign.get(x.id)?.impressions??0),clicks:metricsError?null:(metricsByCampaign.get(x.id)?.clicks??0)}));
  const campaignIds=measuredCampaigns.map((x:any)=>x.id);
  const {data:statusEvents,error:statusEventsError}=campaignIds.length?await s.from("partner_ad_campaign_status_events").select("id,campaign_id,old_status,new_status,event_type,action_reason,created_at").in("campaign_id",campaignIds).order("created_at",{ascending:false}):{data:[]};
  const eventsByCampaign=new Map<string,any[]>();
  (statusEvents??[]).forEach((event:any)=>{const list=eventsByCampaign.get(event.campaign_id)||[];list.push(event);eventsByCampaign.set(event.campaign_id,list)});
  const active=campaignsError?null:(campaigns??[]).filter((x:any)=>x.status==="ACTIVE").length;
  const pending=campaignsError?null:(campaigns??[]).filter((x:any)=>["REQUESTED","APPROVED"].includes(x.status)).length;
  const impressions=metricsError?null:measuredCampaigns.reduce((sum:number,x:any)=>sum+x.impressions,0);
  const clicks=metricsError?null:measuredCampaigns.reduce((sum:number,x:any)=>sum+x.clicks,0);
  const investment=paymentsError?null:measuredCampaigns.reduce((sum:number,x:any)=>sum+(x.payment?.status==="PAID"?Number(x.payment.amount_mzn??0):0),0);
  const ctr=impressions!==null&&clicks!==null&&impressions>0?clicks/impressions*100:null;
  const money=(value:number)=>value.toLocaleString("pt-MZ",{maximumFractionDigits:2})+" MZN";

  const loadErrors=[productsError&&"catálogo",campaignsError&&"campanhas",metricsError&&"métricas",paymentsError&&"pagamentos",statusEventsError&&"histórico"].filter(Boolean);
  return <PartnerPage
    eyebrow="Posicionar · Exposição"
    title="Publicidade e campanhas"
    description="Transforme uma publicação, marca, produto, serviço ou oportunidade em presença visível dentro do ecossistema MozEmpresas."
    action={{href:"#espacos",label:"Ver espaços"}}
  >
    {loadErrors.length>0&&<div className="notice" role="alert">Consultas incompletas ({loadErrors.join(", ")}). Valores indisponíveis não significam zero.</div>}
    <section className="partner-metrics-grid">
      <PartnerMetric label="Espaços disponíveis" value={productsError?"—":products?.length??0} detail="Formatos actualmente activos" featured/>
      <PartnerMetric label="Campanhas activas" value={active??"—"} detail="Em execução ou publicadas"/>
      <PartnerMetric label="Em análise" value={pending??"—"} detail="Pedidos aguardam seguimento"/>
      <PartnerMetric label="Campanhas" value={campaignsError?"—":campaigns?.length??0} detail="Registo da sua entidade"/>
    </section>

    <PartnerSection
      eyebrow="Como posicionar"
      title="Escolha primeiro o resultado pretendido"
      description="O formato deve servir o objectivo da campanha. A exposição é contratada separadamente da publicação de oportunidades."
    >
      <div className="partner-strategy-grid">
        <article><span>01 · DAR VISIBILIDADE</span><h3>Levar uma oferta à frente do público</h3><p>Use espaços de maior atenção para uma marca, produto, serviço ou mensagem institucional.</p></article>
        <article><span>02 · PROMOVER ACTIVIDADE</span><h3>Acelerar uma oportunidade publicada</h3><p>Dê destaque a uma oportunidade para aumentar a sua descoberta por visitantes e utilizadores registados.</p></article>
        <article><span>03 · DOMINAR UM CONTEXTO</span><h3>Associar a entidade a uma categoria</h3><p>Use patrocínios e posicionamentos contextuais quando quer construir presença recorrente num determinado espaço.</p></article>
      </div>
    </PartnerSection>

    <PartnerSection
      eyebrow="Escolha"
      title="Espaços disponíveis"
      description="Cada formato apresenta preço, duração e capacidade. O pedido passa pela equipa MozEmpresas antes da activação."
    >
      <div id="espacos" className="partner-product-grid">
        {(products??[]).map((x:any)=><article className="partner-product-card" key={x.id}>
          <div><span>{x.placement||"POSICIONAMENTO"}</span><h3>{x.name}</h3></div>
          <p>{x.description||"Formato de exposição disponível mediante solicitação."}</p>
          <div className="partner-product-meta">
            <strong>{x.price_mzn!=null?Number(x.price_mzn).toLocaleString("pt-MZ")+" MZN":"Proposta personalizada"}</strong>
            <small>{x.duration_days?x.duration_days+" dias":"Prazo personalizado"} · capacidade {x.capacity??"—"}</small>{x.credit_price!=null?<small>{x.credit_price.toLocaleString("pt-MZ")} créditos · {x.credit_payment_available?"disponível nesta conta":"indisponível nesta conta"}</small>:<small>Pagamento por créditos ainda não configurado</small>}
          </div>
          <Link href={"/parceiro/publicidade/pedido?produto="+encodeURIComponent(x.id)} className="btn">Solicitar este espaço</Link>
        </article>)}
      </div>
      {!productsError&&!products?.length&&<PartnerEmpty title="Nenhum espaço disponível" text="Os formatos serão apresentados aqui quando estiverem activos."/>}
    </PartnerSection>

    <PartnerSection
      eyebrow="Desempenho e investimento"
      title="Análise das campanhas"
      description="Acompanhe investimento contratado, exposição e interacções registadas. O retorno financeiro só será calculado quando a plataforma registar conversões atribuíveis."
    >
      <div className="partner-metrics-grid">
        <PartnerMetric label="Investimento liquidado" value={investment===null?"—":money(investment)} detail="Pagamentos efectivamente confirmados"/>
        <PartnerMetric label="Impressões" value={impressions===null?"—":impressions.toLocaleString("pt-MZ")} detail="Exibições contabilizadas"/>
        <PartnerMetric label="Cliques" value={clicks===null?"—":clicks.toLocaleString("pt-MZ")} detail="Interacções contabilizadas"/>
        <PartnerMetric label="CTR" value={ctr===null?"—":ctr.toLocaleString("pt-MZ",{maximumFractionDigits:2})+"%"} detail="Cliques ÷ impressões" featured/>
      </div>
      <div className="partner-empty"><strong>ROI financeiro ainda não disponível</strong><p>O sistema regista exposição e cliques, mas não tem ainda conversões comerciais atribuídas para calcular vendas, receita incremental ou retorno real do investimento. Não confunda CTR com ROI.</p></div>
    </PartnerSection>

    <PartnerSection
      eyebrow="Acompanhamento"
      title="Campanhas da entidade"
      description="Consulte o estado e os indicadores de cada campanha. Os números apresentados provêm dos registos da plataforma."
    >
      {measuredCampaigns.length
        ? <div className="partner-record-list">{measuredCampaigns.map((x:any)=><div key={x.id}>
            <div><strong>{x.title||"Campanha sem título"}</strong><span>{x.product_name||"Espaço publicitário"} · {statusLabel(x.status)}</span><span>{x.impressions===null?"—":x.impressions.toLocaleString("pt-MZ")} impressões · {x.clicks===null?"—":x.clicks.toLocaleString("pt-MZ")} cliques · CTR {x.impressions!==null&&x.clicks!==null&&x.impressions>0?(x.clicks/x.impressions*100).toLocaleString("pt-MZ",{maximumFractionDigits:2})+"%":"—"}</span></div>
            <div><b>{x.price_mzn!=null?money(Number(x.price_mzn)):"Em análise"}</b>{x.payment===undefined?<small>Estado do pagamento indisponível</small>:x.payment?<small>Pagamento: {x.payment.status==="PAID"?"Liquidado":x.payment.status==="PENDING"?"A aguardar M-Pesa":x.payment.status==="FAILED"?"Falhado":"Estornado"} · {x.payment.payment_method} · {x.payment.payment_reference}</small>:<small>Sem cobrança emitida</small>}</div>
            <details className="partner-ad-status-history"><summary>Histórico {statusEventsError?"(indisponível)":"("+ (eventsByCampaign.get(x.id)??[]).length +")"}</summary>{statusEventsError?<p>Não foi possível carregar o histórico de decisões.</p>:<ol>{(eventsByCampaign.get(x.id)??[]).map((event:any)=><li key={event.id}><strong>{event.event_type==="CREATED"?"Pedido criado":"Estado actualizado"}</strong><span>{event.old_status?statusLabel(event.old_status)+" → ":""}{statusLabel(event.new_status)}</span><small>{event.action_reason||"Sem justificação registada"} · {new Date(event.created_at).toLocaleString("pt-MZ")}</small></li>)}</ol>}</details>
          </div>)}</div>
        : campaignsError ? <PartnerEmpty title="Campanhas indisponíveis" text="Não foi possível consultar as campanhas desta entidade. Actualize a página mais tarde."/> : <PartnerEmpty title="Ainda sem campanhas" text="Escolha um espaço acima para iniciar uma proposta de exposição." href="#espacos" label="Ver espaços"/>
      }
    </PartnerSection>

    <PartnerSection
      eyebrow="Próximo passo"
      title="Publicidade não substitui a actividade"
      description="A lógica comercial do Partner Workspace separa publicação e exposição: primeiro define o que a organização quer comunicar; depois decide onde faz sentido promovê-lo."
    >
      <div className="partner-command-grid">
        <article className="partner-command-feature">
          <span className="partner-kicker">PUBLICAR</span>
          <strong>Tem uma oportunidade para o mercado?</strong>
          <p>Publique financiamento, programas, bolsas/prémios, parcerias ou manifestações de interesse e, se necessário, peça destaque depois.</p>
          <div><Link href="/parceiro/oportunidades/nova" className="partner-primary-action">Nova publicação →</Link><Link href="/parceiro/oportunidades" className="partner-command-link">Gerir publicações →</Link></div>
        </article>
        <article className="partner-command-action">
          <span>DECISÃO</span><strong>Precisa de saber quem procura, onde está a procura ou como está posicionada?</strong><small>INTELIGÊNCIA · DADOS</small><Link href="/parceiro/inteligencia">Ver inteligência e mercado →</Link>
        </article>
      </div>
    </PartnerSection>
    <style>{`.partner-ad-status-history{margin-top:8px;font-size:12px}.partner-ad-status-history summary{cursor:pointer;font-weight:700}.partner-ad-status-history ol{display:grid;gap:5px;margin:8px 0;padding-left:18px}.partner-ad-status-history li{display:grid;gap:2px}.partner-ad-status-history li small{opacity:.7}`}</style>
  </PartnerPage>
}
