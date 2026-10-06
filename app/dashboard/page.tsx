export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getManagedBusinessIds } from "@/lib/businesses/permissions";

type Business = { id:string; name:string; slug:string; location:string|null; is_public:boolean };
type Activity = { label:string; title:string; meta:string; href:string };
type Action = { label:string; title:string; text:string; href:string };

export default async function Dashboard() {
  const supabase = await createClient();
  const { data:{ user } } = await supabase.auth.getUser();

  let name = "Administrador";
  let businesses: Business[] = [];
  let listings:{id:string; title:string; business_id:string|null; status:string|null}[] = [];
  let orderCount = 0;
  let activeOrders = 0;
  let unread = 0;

  if (user) {
    const [{data:profile},{data:owned},{data:memberships},{count:notificationCount}] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id",user.id).maybeSingle(),
      supabase.from("businesses").select("id,name,slug,location,is_public").eq("owner_id",user.id).is("archived_at",null).order("created_at",{ascending:false}),
      supabase.from("business_members").select("business_id,role").eq("user_id",user.id),
      supabase.from("notifications").select("id",{count:"exact",head:true}).eq("user_id",user.id).is("read_at",null),
    ]);
    name=profile?.full_name||user.email?.split("@")[0]||"Utilizador";
    const ownedBusinesses=(owned??[]) as Business[];
    const memberIds=[...new Set((memberships??[]).map(x=>x.business_id))];
    const {data:memberBusinesses}=memberIds.length?await supabase.from("businesses").select("id,name,slug,location,is_public").in("id",memberIds):{data:[]};
    businesses=[...ownedBusinesses,...((memberBusinesses??[]) as Business[]).filter(b=>!ownedBusinesses.some(o=>o.id===b.id))];

    const ids=await getManagedBusinessIds(supabase,user.id);
    if(ids.length){
      const [{data:ls},{count:orders},{count:active}] = await Promise.all([
        supabase.from("listings").select("id,title,business_id,status").in("business_id",ids).order("created_at",{ascending:false}).limit(20),
        supabase.from("commerce_orders").select("id",{count:"exact",head:true}).eq("buyer_user_id",user.id),
        supabase.from("commerce_orders").select("id",{count:"exact",head:true}).eq("buyer_user_id",user.id).in("status",["INTERESTED","CONTACTED","NEGOTIATING","AGREED"]),
      ]);
      listings=ls??[]; orderCount=orders??0; activeOrders=active??0;
    }
    unread=notificationCount??0;
  } else {
    // Public visual preview: synthetic data only.
    businesses=[
      {id:"preview-1",name:"Empresa de Demonstração",slug:"empresa-demonstracao",location:"Maputo",is_public:true},
      {id:"preview-2",name:"Empresa em Configuração",slug:"empresa-configuracao",location:"Maputo",is_public:false},
    ];
    listings=[
      {id:"p1",title:"Consultoria e Serviços Empresariais",business_id:"preview-1",status:"PUBLISHED"},
      {id:"p2",title:"Formação Profissional",business_id:"preview-1",status:"PUBLISHED"},
      {id:"p3",title:"Serviços Administrativos",business_id:"preview-1",status:"PUBLISHED"},
    ];
    orderCount=8; activeOrders=3; unread=2;
  }

  const publicBusinesses=businesses.filter(b=>b.is_public);
  const needingAttention=businesses.filter(b=>!b.is_public);
  const publishedListings=listings.filter(x=>x.status==="PUBLISHED"||x.status===null);
  const presencePercent=businesses.length?Math.round(publicBusinesses.length/businesses.length*100):0;
  const activityCount=publishedListings.length+orderCount;
  const attentionCount=needingAttention.length+unread;
  const nextAction:Action=!businesses.length
    ? {label:"01",title:"Crie a primeira presença empresarial",text:"Registe a empresa que pretende representar e comece a construir uma presença encontrável.",href:"/dashboard/empresas"}
    : needingAttention.length
      ? {label:"01",title:"Complete a presença empresarial",text:`${needingAttention.length} empresa(s) ainda precisam de revisão antes de ficarem visíveis no directório.`,href:"/dashboard/empresas"}
      : !publishedListings.length
        ? {label:"01",title:"Apresente produtos e serviços",text:"Uma presença sem ofertas explica quem é a empresa; uma presença com ofertas mostra o que pode fazer.",href:"/dashboard/marketplace"}
        : activeOrders
          ? {label:"01",title:"Acompanhe as negociações em curso",text:`${activeOrders} actividade(s) comercial(is) ainda estão em aberto. Veja o que exige seguimento.`,href:"/dashboard/marketplace?tab=negociacoes"}
          : {label:"01",title:"Procure novas oportunidades comerciais",text:"A sua presença está activa. O próximo ganho de valor vem de encontrar empresas, ofertas e relações relevantes.",href:"/dashboard/marketplace"};

  const actions:Action[]=[
    ...(needingAttention.length?[{label:"Atenção",title:`Rever ${needingAttention.length} presença(s) empresarial(is)`,text:"Perfis não publicados não aparecem como presença activa no directório.",href:"/dashboard/empresas"}]:[]),
    ...(!publishedListings.length?[{label:"Actividade",title:"Adicionar produtos ou serviços",text:"Transforme a presença empresarial em uma oferta concreta para o mercado.",href:"/dashboard/marketplace"}]:[]),
    ...(activeOrders?[{label:"Mercado",title:`Acompanhar ${activeOrders} negociação(ões)`,text:"Há actividade comercial aberta que pode exigir resposta ou seguimento.",href:"/dashboard/marketplace?tab=negociacoes"}]:[]),
    ...(unread?[{label:"Conta",title:`${unread} notificação(ões) por consultar`,text:"Reveja os avisos recentes antes de continuar a operar.",href:"/dashboard/notificacoes"}]:[]),
  ].slice(0,4);

  const activity:Activity[]=[
    ...publishedListings.slice(0,3).map(x=>({label:"Oferta",title:x.title||"Oferta publicada",meta:"Produto ou serviço disponível no mercado",href:"/dashboard/marketplace?tab=vender"})),
    ...businesses.slice(0,2).map(b=>({label:b.is_public?"Presença activa":"Revisão",title:b.name,meta:b.is_public?"Perfil visível no directório":"Perfil ainda não publicado",href:"/dashboard/empresas"})),
  ].slice(0,5);

  return <main className="dashboard-main workspace-dashboard">
    <div className="dashboard-content">
      <header className="workspace-hero">
        <div className="workspace-hero-copy">
          <span className="dashboard-kicker">Área empresarial · Visão geral</span>
          <h1>Bom trabalho, {name}.</h1>
          <p>Veja em segundos o estado da sua presença, o que mudou, o que exige atenção e onde faz sentido actuar agora.</p>
        </div>
        <div className="workspace-hero-context">
          <span>Estado da operação</span>
          <strong>{businesses.length?"Operacional":"Por configurar"}</strong>
          <small>{businesses.length? `${publicBusinesses.length} de ${businesses.length} empresa(s) com presença pública`:"Ainda não existe uma empresa associada à conta."}</small>
          <Link href="/dashboard/empresas" className="text-link">Gerir presença →</Link>
        </div>
      </header>

      <section className="workspace-metrics" aria-label="Indicadores principais">
        <article className="workspace-metric workspace-metric-featured"><span>Presença</span><strong>{presencePercent}%</strong><small>{publicBusinesses.length}/{businesses.length} empresa(s) publicada(s)</small></article>
        <article className="workspace-metric"><span>Ofertas</span><strong>{publishedListings.length}</strong><small>Produtos e serviços disponíveis</small></article>
        <article className="workspace-metric"><span>Actividade</span><strong>{activityCount}</strong><small>Ofertas + actividade comercial registada</small></article>
        <article className="workspace-metric"><span>Atenção</span><strong>{attentionCount}</strong><small>{attentionCount?"Itens que merecem revisão":"Sem alertas detectados"}</small></article>
      </section>

      <div className="workspace-primary-grid">
        <section className="workspace-panel">
          <div className="workspace-panel-head"><div><span className="dashboard-kicker">Centro de decisão</span><h2>O que merece atenção agora</h2><p>Não são funcionalidades. São sinais para ajudar a decidir o próximo movimento.</p></div></div>
          <div className="workspace-action-list">
            <Link href={nextAction.href} className="workspace-action-row"><span className="workspace-action-index">{nextAction.label}</span><div><small>PRÓXIMA ACÇÃO</small><strong>{nextAction.title}</strong><p>{nextAction.text}</p></div><b>→</b></Link>
            {actions.map((a,i)=><Link href={a.href} className="workspace-action-row" key={a.title}><span className="workspace-action-index">{String(i+2).padStart(2,"0")}</span><div><small>{a.label.toUpperCase()}</small><strong>{a.title}</strong><p>{a.text}</p></div><b>→</b></Link>)}
            {!actions.length&&<div className="workspace-empty"><strong>A operação está estável.</strong><p>Continue a acompanhar o mercado e a qualidade da presença empresarial.</p></div>}
          </div>
        </section>

        <section className="workspace-panel workspace-next-panel">
          <div className="workspace-panel-head"><div><span className="dashboard-kicker">Leitura executiva</span><h2>Estado actual</h2></div></div>
          <div className="workspace-readout-list">
            <div><span>Presença empresarial</span><strong>{presencePercent>=100?"Consolidada":presencePercent>0?"Parcial":"Inexistente"}</strong><small>{publicBusinesses.length} perfil(is) público(s)</small></div>
            <div><span>Capacidade comercial</span><strong>{publishedListings.length?"Apresentada":"Por apresentar"}</strong><small>{publishedListings.length} oferta(s) publicável(is)</small></div>
            <div><span>Mercado</span><strong>{activeOrders?"Em movimento":"Disponível"}</strong><small>{activeOrders?activeOrders+" negociação(ões) em aberto":"Sem negociação em aberto detectada"}</small></div>
            <div><span>Comunicações</span><strong>{unread?"Por consultar":"Em dia"}</strong><small>{unread} notificação(ões) não lida(s)</small></div>
          </div>
        </section>
      </div>

      <div className="workspace-secondary-grid">
        <section className="workspace-panel">
          <div className="workspace-panel-head"><div><span className="dashboard-kicker">Actividade recente</span><h2>O que aconteceu</h2><p>Uma leitura curta da actividade disponível na conta.</p></div><Link href="/dashboard/marketplace" className="text-link">Ver mercado →</Link></div>
          {activity.length?<div className="workspace-activity-list">{activity.map(a=><Link href={a.href} key={a.label+a.title}><span>{a.label}</span><strong>{a.title}</strong><small>{a.meta}</small></Link>)}</div>:<div className="workspace-empty"><strong>Ainda não há actividade suficiente.</strong><p>Comece por completar a presença ou publicar uma oferta.</p></div>}
        </section>
        <section className="workspace-panel">
          <div className="workspace-panel-head"><div><span className="dashboard-kicker">Presença</span><h2>Empresas</h2></div><Link href="/dashboard/empresas" className="text-link">Gerir →</Link></div>
          {businesses.length?<div className="workspace-entity-list">{businesses.slice(0,4).map(b=><Link href={"/empresas/"+b.slug} key={b.id}><span>{b.is_public?"VISÍVEL NO DIRECTÓRIO":"POR PUBLICAR"}</span><strong>{b.name}</strong><small>{b.location||"Localização por definir"}</small></Link>)}</div>:<div className="workspace-empty"><strong>Comece pela sua empresa.</strong><p>Crie uma presença empresarial para activar o restante ecossistema.</p><Link href="/dashboard/empresas?view=criar" className="btn primary">Criar empresa</Link></div>}
        </section>
      </div>

      <section className="workspace-panel">
        <div className="workspace-panel-head"><div><span className="dashboard-kicker">Navegação orientada à decisão</span><h2>Onde agir</h2><p>Entre directamente no contexto que corresponde à decisão que pretende tomar.</p></div></div>
        <div className="workspace-context-grid">
          <Link href="/dashboard/empresas"><strong>Quero melhorar a presença</strong><span>Empresas, perfis, publicação e informação institucional.</span><b>→</b></Link>
          <Link href="/dashboard/marketplace?tab=vender"><strong>Quero vender</strong><span>Publique produtos e serviços e acompanhe interesse comercial.</span><b>→</b></Link>
          <Link href="/dashboard/marketplace?tab=comprar"><strong>Quero comprar</strong><span>Descubra ofertas e registe interesses para iniciar relações.</span><b>→</b></Link>
          <Link href="/dashboard/monetizacao"><strong>Quero perceber o investimento</strong><span>Analise publicidade, créditos, serviços e histórico comercial.</span><b>→</b></Link>
        </div>
      </section>
    </div>
  </main>;
}
