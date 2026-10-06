export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getManagedBusinessIds } from "@/lib/businesses/permissions";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: ownedBusinesses }, { data: memberships }, { data: opportunities }] = await Promise.all([
    supabase.from("profiles").select("full_name,location,website,bio").eq("id", user.id).maybeSingle(),
    supabase.from("businesses").select("id,name,slug,location,is_public").eq("owner_id", user.id).is("archived_at", null).order("created_at", { ascending: false }),
    supabase.from("business_members").select("business_id,role").eq("user_id", user.id),
    supabase.from("opportunities").select("id").eq("owner_id", user.id),
  ]);

  const managedBusinessIds = await getManagedBusinessIds(supabase, user.id);
  const { data: listings } = managedBusinessIds.length ? await supabase.from("listings").select("id").in("business_id", managedBusinessIds) : { data: [] as { id: string }[] };
  const memberBusinessIds = [...new Set((memberships ?? []).map((item) => item.business_id))];
  const { data: memberBusinesses } = memberBusinessIds.length ? await supabase.from("businesses").select("id,name,slug,location,is_public").in("id", memberBusinessIds) : { data: [] };
  const businesses = [...(ownedBusinesses ?? []), ...(memberBusinesses ?? []).filter((item) => !(ownedBusinesses ?? []).some((owned) => owned.id === item.id))];
  const name = profile?.full_name || user.email?.split("@")[0] || "Utilizador";

  const actions = [
    { href: "/dashboard/empresas", label: businesses.length ? "Gerir presença empresarial" : "Criar presença empresarial", text: "Mantenha a informação pública e os contactos da sua empresa actualizados.", tag: "PRESENÇA" },
    { href: "/dashboard/marketplace", label: "Comprar e vender", text: "Explore ofertas, publique o que a sua empresa disponibiliza e desenvolva negócio.", tag: "MERCADO" },
    { href: "/oportunidades", label: "Encontrar oportunidades", text: "Acompanhe chamadas, parcerias e processos relevantes para a sua actividade.", tag: "OPORTUNIDADES" },
  ];

  return (
    <main className="dashboard-main workspace-dashboard">
      <div className="dashboard-content">
        <header className="workspace-hero">
          <div className="workspace-hero-copy"><span className="dashboard-kicker">Área empresarial</span><h1>Bom trabalho, {name}.</h1><p>O seu espaço para gerir presença, encontrar oportunidades e desenvolver relações comerciais no MozEmpresas.</p></div>
          <div className="workspace-hero-context"><span>Espaço empresarial</span><strong>{businesses.length ? "Activo" : "Por configurar"}</strong><small>{businesses.length} empresa(s) associada(s) à sua conta</small><Link href="/dashboard/conta" className="text-link">Ver a minha conta →</Link></div>
        </header>

        <section className="workspace-metrics" aria-label="Resumo da conta">
          <article className="workspace-metric workspace-metric-featured"><span>Presença no ecossistema</span><strong>{businesses.length ? "Em actividade" : "Comece agora"}</strong><small>{businesses.length ? "A sua conta já tem uma empresa associada." : "Associe a primeira empresa para começar a apresentar a sua actividade."}</small></article>
          <article className="workspace-metric"><span>Empresas</span><strong>{businesses.length}</strong><small>Que pode gerir ou representar</small></article>
          <article className="workspace-metric"><span>Ofertas</span><strong>{listings?.length ?? 0}</strong><small>Produtos e serviços associados</small></article>
          <article className="workspace-metric"><span>Oportunidades</span><strong>{opportunities?.length ?? 0}</strong><small>Publicadas pela sua conta</small></article>
        </section>

        <div className="workspace-primary-grid">
          <section className="workspace-panel"><div className="workspace-panel-head"><div><span className="dashboard-kicker">Centro de acção</span><h2>O que pretende fazer?</h2><p>As actividades que normalmente levam o utilizador a abrir o seu espaço empresarial.</p></div></div>
            <div className="workspace-action-list">{actions.map((action,index)=><Link href={action.href} className="workspace-action-row" key={action.href}><span className="workspace-action-index">0{index+1}</span><div><small>{action.tag}</small><strong>{action.label}</strong><p>{action.text}</p></div><b>→</b></Link>)}</div>
          </section>
          <section className="workspace-panel"><div className="workspace-panel-head"><div><span className="dashboard-kicker">Estrutura</span><h2>Empresas que representa</h2></div><Link href="/dashboard/empresas" className="text-link">Gerir →</Link></div>
            {businesses.length ? <div className="workspace-entity-list">{businesses.slice(0,4).map((business)=><Link href={"/empresas/"+business.slug} key={business.id}><span>{business.is_public?"Visível no directório":"Ainda não publicada"}</span><strong>{business.name}</strong><small>{business.location||"Localização por definir"}</small></Link>)}</div> : <div className="workspace-empty"><strong>A sua presença ainda não está configurada</strong><p>Associe a primeira empresa para começar a publicar e ser encontrada.</p><Link href="/dashboard/empresas" className="btn primary">Criar empresa</Link></div>}
          </section>
        </div>

        <div className="workspace-secondary-grid">
          <section className="workspace-panel"><div className="workspace-panel-head"><div><span className="dashboard-kicker">Descoberta</span><h2>Continue a partir daqui</h2></div></div>
            <div className="workspace-context-grid"><Link href="/oportunidades"><strong>Oportunidades</strong><span>Encontre processos e relações relevantes para a sua actividade.</span><b>→</b></Link><Link href="/concursos"><strong>Concursos</strong><span>Consulte concursos abertos e identifique processos de interesse.</span><b>→</b></Link><Link href="/empresas"><strong>Directório empresarial</strong><span>Pesquise empresas e potenciais parceiros.</span><b>→</b></Link><Link href="/dashboard/acessos"><strong>Acessos e equipa</strong><span>Defina quem pode actuar pela empresa.</span><b>→</b></Link></div>
          </section>
          <section className="workspace-panel workspace-next-panel"><div className="workspace-panel-head"><div><span className="dashboard-kicker">MozEmpresas</span><h2>Um espaço para agir</h2></div></div><p>O dashboard não deve ser um relatório de tudo o que existe no sistema. Deve mostrar o que mudou, o que importa e qual é o próximo passo.</p><Link href="/dashboard/servicos" className="btn secondary">Ver serviços da plataforma</Link></section>
        </div>
      </div>
    </main>
  );
}