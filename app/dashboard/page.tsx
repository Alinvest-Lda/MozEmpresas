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

  const [{ data: profile }, { data: ownedBusinesses }, { data: memberships }] = await Promise.all([
    supabase.from("profiles").select("full_name,location,website,bio").eq("id", user.id).maybeSingle(),
    supabase.from("businesses").select("id,name,slug,location,is_public").eq("owner_id", user.id).is("archived_at", null).order("created_at", { ascending: false }),
    supabase.from("business_members").select("business_id,role").eq("user_id", user.id),
  ]);

  const managedBusinessIds = await getManagedBusinessIds(supabase, user.id);
  const { data: listings } = managedBusinessIds.length
    ? await supabase.from("listings").select("id").in("business_id", managedBusinessIds)
    : { data: [] as { id: string }[] };

  const memberBusinessIds = [...new Set((memberships ?? []).map((item) => item.business_id))];
  const { data: memberBusinesses } = memberBusinessIds.length
    ? await supabase.from("businesses").select("id,name,slug,location,is_public").in("id", memberBusinessIds)
    : { data: [] };

  const businesses = [
    ...(ownedBusinesses ?? []),
    ...(memberBusinesses ?? []).filter((item) => !(ownedBusinesses ?? []).some((owned) => owned.id === item.id)),
  ];

  const name = profile?.full_name || user.email?.split("@")[0] || "Utilizador";
  const publicBusinesses = businesses.filter((business) => business.is_public);
  const businessesNeedingAttention = businesses.filter((business) => !business.is_public);
  const attentionCount = businessesNeedingAttention.length;
  const hasPresence = businesses.length > 0;
  const hasListings = (listings?.length ?? 0) > 0;

  const nextAction = !hasPresence
    ? { title: "Crie a primeira presença empresarial", text: "Registe a empresa que pretende representar e torne a sua actividade encontrável no directório.", href: "/dashboard/empresas", label: "Configurar empresa" }
    : attentionCount > 0
      ? { title: "Complete a presença empresarial", text: `${attentionCount} empresa(s) ainda não estão publicadas no directório.`, href: "/dashboard/empresas", label: "Rever presença" }
      : !hasListings
        ? { title: "Apresente o que a empresa oferece", text: "Adicione produtos e serviços para transformar presença em descoberta comercial.", href: "/dashboard/marketplace", label: "Adicionar oferta" }
        : { title: "Explore o mercado", text: "A sua presença está activa. Veja ofertas e actividade comercial relevante para a sua empresa.", href: "/dashboard/marketplace", label: "Ir para o mercado" };

  return (
    <main className="dashboard-main workspace-dashboard">
      <div className="dashboard-content">
        <header className="workspace-hero">
          <div className="workspace-hero-copy">
            <span className="dashboard-kicker">Área empresarial</span>
            <h1>Bom trabalho, {name}.</h1>
            <p>Uma visão rápida do que está activo, do que merece atenção e do próximo passo para a sua empresa.</p>
          </div>
          <div className="workspace-hero-context">
            <span>Estado da conta</span>
            <strong>{hasPresence ? "Activo" : "Por configurar"}</strong>
            <small>{businesses.length} empresa(s) associada(s) à sua conta</small>
            <Link href="/dashboard/conta" className="text-link">Ver a minha conta →</Link>
          </div>
        </header>

        <section className="workspace-metrics" aria-label="Resumo executivo">
          <article className="workspace-metric workspace-metric-featured"><span>Presença</span><strong>{publicBusinesses.length}/{businesses.length}</strong><small>{hasPresence ? "empresa(s) publicadas no directório" : "nenhuma empresa associada"}</small></article>
          <article className="workspace-metric"><span>Ofertas</span><strong>{listings?.length ?? 0}</strong><small>Produtos e serviços activos</small></article>
          <article className="workspace-metric"><span>Empresas</span><strong>{businesses.length}</strong><small>Que pode gerir ou representar</small></article>
          <article className="workspace-metric"><span>Atenção</span><strong>{attentionCount}</strong><small>{attentionCount ? "presença(s) por rever" : "sem pendências de publicação"}</small></article>
        </section>

        <div className="workspace-primary-grid">
          <section className="workspace-panel">
            <div className="workspace-panel-head"><div><span className="dashboard-kicker">Resumo executivo</span><h2>O que merece a sua atenção</h2><p>Indicadores simples para decidir onde actuar sem transformar a abertura da conta num relatório.</p></div></div>
            <div className="workspace-context-grid">
              <div><small>Presença empresarial</small><strong>{publicBusinesses.length ? "Activa" : hasPresence ? "Por publicar" : "Por configurar"}</strong><span>{hasPresence ? `${publicBusinesses.length} de ${businesses.length} empresa(s) visíveis` : "Ainda não existe uma presença empresarial."}</span></div>
              <div><small>Actividade comercial</small><strong>{hasListings ? "Em actividade" : "Ainda limitada"}</strong><span>{hasListings ? `${listings?.length ?? 0} oferta(s) disponíveis` : "Ainda não existem ofertas associadas."}</span></div>
              <div><small>Pendências</small><strong>{attentionCount ? `${attentionCount} a rever` : "Tudo em ordem"}</strong><span>{attentionCount ? "Há empresas ainda não publicadas." : "Não há uma pendência de publicação detectada."}</span></div>
              <div><small>Mercado</small><strong>Disponível</strong><span>Explore compras, vendas e negociações a partir do seu espaço.</span></div>
            </div>
          </section>

          <section className="workspace-panel workspace-next-panel">
            <div className="workspace-panel-head"><div><span className="dashboard-kicker">Recomendação</span><h2>Próximo passo</h2></div></div>
            <div className="workspace-recommendation"><strong>{nextAction.title}</strong><p>{nextAction.text}</p><Link href={nextAction.href} className="btn primary">{nextAction.label}</Link></div>
          </section>
        </div>

        <div className="workspace-secondary-grid">
          <section className="workspace-panel">
            <div className="workspace-panel-head"><div><span className="dashboard-kicker">Atenção necessária</span><h2>{attentionCount ? "Há itens para rever" : "Tudo em ordem"}</h2></div><Link href="/dashboard/empresas" className="text-link">Gerir →</Link></div>
            {attentionCount ? (
              <div className="workspace-entity-list">{businessesNeedingAttention.slice(0, 4).map((business) => <Link href="/dashboard/empresas" key={business.id}><span>Por publicar</span><strong>{business.name}</strong><small>{business.location || "Localização por definir"} · Rever presença</small></Link>)}</div>
            ) : (
              <div className="workspace-empty"><strong>Nenhuma pendência de publicação detectada.</strong><p>Continue a acompanhar a presença e a actividade comercial da sua empresa.</p></div>
            )}
          </section>

          <section className="workspace-panel">
            <div className="workspace-panel-head"><div><span className="dashboard-kicker">As suas empresas</span><h2>Presença empresarial</h2></div><Link href="/dashboard/empresas" className="text-link">Gerir →</Link></div>
            {businesses.length ? (
              <div className="workspace-entity-list">{businesses.slice(0, 4).map((business) => <Link href={"/empresas/" + business.slug} key={business.id}><span>{business.is_public ? "Visível no directório" : "Ainda não publicada"}</span><strong>{business.name}</strong><small>{business.location || "Localização por definir"}</small></Link>)}</div>
            ) : (
              <div className="workspace-empty"><strong>A sua presença ainda não está configurada.</strong><p>Associe a primeira empresa para começar a publicar e ser encontrada.</p><Link href="/dashboard/empresas" className="btn primary">Criar empresa</Link></div>
            )}
          </section>
        </div>

        <section className="workspace-panel">
          <div className="workspace-panel-head"><div><span className="dashboard-kicker">Descoberta</span><h2>Onde pode agir agora</h2><p>Os módulos executam; a dashboard apenas encaminha para a actividade que pode gerar valor.</p></div></div>
          <div className="workspace-context-grid">
            <Link href="/dashboard/marketplace"><strong>Mercado</strong><span>Comprar, vender e acompanhar negociações.</span><b>→</b></Link>
            <Link href="/empresas"><strong>Directório empresarial</strong><span>Pesquise empresas e potenciais parceiros.</span><b>→</b></Link>
            <Link href="/dashboard/acessos"><strong>Acessos e equipa</strong><span>Defina quem pode actuar pela empresa.</span><b>→</b></Link>
            <Link href="/dashboard/monetizacao"><strong>Inteligência comercial</strong><span>Veja investimento, actividade e histórico comercial.</span><b>→</b></Link>
          </div>
        </section>
      </div>
    </main>
  );
}
