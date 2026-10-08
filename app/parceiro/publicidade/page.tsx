export const dynamic="force-dynamic";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PartnerPage,PartnerSection,PartnerMetric,PartnerEmpty } from "@/components/partner-workspace";

const statusLabel=(status:string)=>{
  const map:Record<string,string>={ACTIVE:"Activa",RUNNING:"Em execução",PUBLISHED:"Publicada",REQUESTED:"Solicitada",PENDING:"Pendente",UNDER_REVIEW:"Em análise",COMPLETED:"Concluída",CLOSED:"Encerrada"};
  return map[status]||status||"—";
};

export default async function PartnerAds(){
  const s=await createClient();
  const [{data:products},{data:campaigns}]=await Promise.all([
    s.rpc("partner_ad_products_list"),
    s.rpc("partner_ad_campaigns_list")
  ]);
  const active=(campaigns??[]).filter((x:any)=>["ACTIVE","RUNNING","PUBLISHED"].includes(x.status)).length;
  const pending=(campaigns??[]).filter((x:any)=>["REQUESTED","PENDING","UNDER_REVIEW"].includes(x.status)).length;

  return <PartnerPage
    eyebrow="Posicionar · Exposição"
    title="Publicidade e campanhas"
    description="Transforme uma publicação, marca, produto, serviço ou oportunidade em presença visível dentro do ecossistema MozEmpresas."
    action={{href:"#espacos",label:"Ver espaços"}}
  >
    <section className="partner-metrics-grid">
      <PartnerMetric label="Espaços disponíveis" value={products?.length??0} detail="Formatos actualmente activos" featured/>
      <PartnerMetric label="Campanhas activas" value={active} detail="Em execução ou publicadas"/>
      <PartnerMetric label="Em análise" value={pending} detail="Pedidos aguardam seguimento"/>
      <PartnerMetric label="Campanhas" value={campaigns?.length??0} detail="Registo da sua entidade"/>
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
            <small>{x.duration_days?x.duration_days+" dias":"Prazo personalizado"} · capacidade {x.capacity??"—"}</small>
          </div>
          <Link href={"/parceiro/publicidade/pedido?produto="+encodeURIComponent(x.id)} className="btn">Solicitar este espaço</Link>
        </article>)}
      </div>
      {!products?.length&&<PartnerEmpty title="Nenhum espaço disponível" text="Os formatos serão apresentados aqui quando estiverem activos."/>}
    </PartnerSection>

    <PartnerSection
      eyebrow="Acompanhamento"
      title="Campanhas da entidade"
      description="Aqui acompanha os pedidos e campanhas registados. Métricas de alcance só devem aparecer quando existirem dados efectivamente medidos."
    >
      {campaigns?.length
        ? <div className="partner-record-list">{campaigns.map((x:any)=><div key={x.id}>
            <div><strong>{x.title||"Campanha sem título"}</strong><span>{x.product_name||"Espaço publicitário"} · {statusLabel(x.status)}</span></div>
            <b>{x.price_mzn!=null?Number(x.price_mzn).toLocaleString("pt-MZ")+" MZN":"Em análise"}</b>
          </div>)}</div>
        : <PartnerEmpty title="Ainda sem campanhas" text="Escolha um espaço acima para iniciar uma proposta de exposição." href="#espacos" label="Ver espaços"/>
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
          <span>DECISÃO</span><strong>Precisa de compreender o público antes de investir?</strong><small>INTELIGÊNCIA</small><Link href="/parceiro/inteligencia">Ver inteligência e mercado →</Link>
        </article>
      </div>
    </PartnerSection>
  </PartnerPage>
}
