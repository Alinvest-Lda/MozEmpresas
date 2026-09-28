export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/auth/actions";

const mainActions = [
  { href: "/marketplace", title: "Comprar", text: "Encontre produtos e serviços para a sua actividade.", icon: "↗" },
  { href: "/dashboard/servicos", title: "Serviços MozEmpresas", text: "Contrate serviços da própria plataforma quando precisar.", icon: "◆" },
  { href: "/marketplace", title: "Vender", text: "Publique produtos e serviços e seja encontrado.", icon: "◇" },
  { href: "/concursos", title: "Concursos", text: "Explore processos e, quando disponível, participe.", icon: "◈" },
  { href: "/oportunidades", title: "Oportunidades", text: "Descubra chamadas, parcerias e outras oportunidades.", icon: "⌘" },
  { href: "/dashboard/empresas", title: "Empresa", text: "Mantenha a presença pública e os dados da empresa.", icon: "□" },
  { href: "/dashboard/acessos", title: "Acessos", text: "Controle quem pode trabalhar em nome da empresa.", icon: "••" },
];

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: ownedBusinesses }, { data: memberships }, { data: listings }, { data: opportunities }, { data: platformMember }] = await Promise.all([
    supabase.from("profiles").select("full_name,location,website,bio").eq("id", user.id).maybeSingle(),
    supabase.from("businesses").select("id,name,slug,location,is_public").eq("owner_id", user.id).order("created_at", { ascending: false }),
    supabase.from("business_members").select("business_id,role").eq("user_id", user.id),
    supabase.from("listings").select("id").eq("owner_id", user.id),
    supabase.from("opportunities").select("id").eq("owner_id", user.id),
    supabase.from("platform_members").select("role,active").eq("user_id", user.id).maybeSingle(),
  ]);

  const memberBusinessIds = [...new Set((memberships ?? []).map((item) => item.business_id))];
  const { data: memberBusinesses } = memberBusinessIds.length
    ? await supabase.from("businesses").select("id,name,slug,location,is_public").in("id", memberBusinessIds)
    : { data: [] };
  const businesses = [...(ownedBusinesses ?? []), ...(memberBusinesses ?? []).filter((item) => !(ownedBusinesses ?? []).some((owned) => owned.id === item.id))];
  const name = profile?.full_name || user.email?.split("@")[0] || "Utilizador";
  const ownedBusinessIds = new Set((ownedBusinesses ?? []).map((item) => item.id));
  const platformAccess = platformMember?.active ? platformMember.role : null;

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <small>Área empresarial</small>
          <strong>MozEmpresas</strong>
        </div>

        <div className="dashboard-nav-group">
          <span>Principal</span>
          <Link className="dashboard-nav-link active" href="/dashboard"><i className="nav-dot" />Visão geral</Link>
          <Link className="dashboard-nav-link" href="/marketplace"><i className="nav-dot" />Comprar e vender</Link>
          <Link className="dashboard-nav-link" href="/concursos"><i className="nav-dot" />Concursos</Link>
          <Link className="dashboard-nav-link" href="/oportunidades"><i className="nav-dot" />Oportunidades</Link>
        </div>

        <div className="dashboard-nav-group">
          <span>Empresa</span>
          <Link className="dashboard-nav-link" href="/dashboard/empresas"><i className="nav-dot" />Presença da empresa</Link>
          <Link className="dashboard-nav-link" href="/dashboard/acessos"><i className="nav-dot" />Acessos e equipa</Link>
          <Link className="dashboard-nav-link" href="/empresas"><i className="nav-dot" />Directório</Link>
        </div>

        <div className="dashboard-nav-group">
          <span>Ecossistema</span>
          <Link className="dashboard-nav-link" href="/marketplace"><i className="nav-dot" />Recomendações</Link>
          <Link className="dashboard-nav-link" href="/dashboard/parceiros"><i className="nav-dot" />Parceiros</Link>
        </div>

        {platformAccess && (
          <div className="dashboard-nav-group">
            <span>Plataforma</span>
            <Link className="dashboard-nav-link" href="/dashboard/admin"><i className="nav-dot" />Administração · {platformAccess}</Link>
          </div>
        )}

        <div className="dashboard-user">
          <strong>{name}</strong>
          {user.email}
          <form action={signOut} style={{ marginTop: 11 }}>
            <button className="btn header-signout full" type="submit">Sair</button>
          </form>
        </div>
      </aside>

      <main className="dashboard-main">
        <div className="dashboard-content">
          <div className="dashboard-topbar">
            <div>
              <span className="dashboard-kicker">Área empresarial</span>
              <h1>Olá, {name}</h1>
              <p>O seu espaço de trabalho para gerir a empresa, encontrar negócio e participar no ecossistema MozEmpresas.</p>
            </div>
            <div className="dashboard-actions">
              <Link href="/dashboard/empresas" className="btn primary">Gerir empresa</Link>
              <Link href="/dashboard/servicos" className="btn">Serviços MozEmpresas</Link>
              <Link href="/marketplace" className="btn">Explorar mercado</Link>
            </div>
          </div>

          <div className="dashboard-stat-grid">
            <div className="dashboard-stat"><small>Empresas</small><strong>{businesses?.length ?? 0}</strong><span>Presenças que gere directamente</span></div>
            <div className="dashboard-stat"><small>Ofertas</small><strong>{listings?.length ?? 0}</strong><span>Produtos e serviços publicados</span></div>
            <div className="dashboard-stat"><small>Oportunidades</small><strong>{opportunities?.length ?? 0}</strong><span>Publicações da sua conta</span></div>
            <div className="dashboard-stat"><small>Empresas acessíveis</small><strong>{businesses.length}</strong><span>Empresas onde tem uma função activa</span></div>
          </div>

          <section className="dashboard-section">
            <div className="dashboard-section-head">
              <div>
                <span className="dashboard-kicker">Acções principais</span>
                <h2>O que pretende fazer?</h2>
                <p>As capacidades não estão presas a um único tipo de conta.</p>
              </div>
            </div>
            <div className="dashboard-action-grid">
              {mainActions.map((item) => (
                <Link href={item.href} className="dashboard-action-card" key={item.title}>
                  <span className="dashboard-action-icon">{item.icon}</span>
                  <div><strong>{item.title}</strong><small>{item.text}</small></div>
                </Link>
              ))}
            </div>
          </section>

          <div className="dashboard-lower-grid">
            <section className="dashboard-section">
              <div className="dashboard-section-head">
                <div>
                  <span className="dashboard-kicker">Presença</span>
                  <h2>As suas empresas</h2>
                </div>
                <Link href="/dashboard/empresas" className="text-link">Gerir →</Link>
              </div>
              {businesses?.length ? (
                <div className="dashboard-list">
                  {businesses.slice(0, 5).map((business) => (
                    <Link href={"/empresas/" + business.slug} key={business.id}>
                      <strong>{business.name}</strong>
                      <span>{business.location || "Localização por definir"} · {business.is_public ? "Pública" : "Privada"}</span>
                      <b>→</b>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="empty">
                  <div className="empty-icon">+</div>
                  <p>Ainda não tem uma empresa associada ao seu espaço. Crie a primeira presença para começar a publicar e participar.</p>
                  <Link href="/dashboard/empresas" className="btn primary">Criar empresa</Link>
                </div>
              )}
            </section>

            <section className="dashboard-section">
              <div className="dashboard-section-head">
                <div>
                  <span className="dashboard-kicker">Próximos passos</span>
                  <h2>Complete o espaço</h2>
                </div>
              </div>
              <div className="dashboard-checklist">
                <Link href="/dashboard/empresas"><em>01</em><div><strong>Completar empresa</strong><small>Dados, contacto e presença pública.</small></div><b>→</b></Link>
                <Link href="/marketplace"><em>02</em><div><strong>Publicar uma oferta</strong><small>Apresente um produto ou serviço.</small></div><b>→</b></Link>
                <Link href="/dashboard/acessos"><em>03</em><div><strong>Organizar acessos</strong><small>Defina quem trabalha pela empresa.</small></div><b>→</b></Link>
                <Link href="/oportunidades"><em>04</em><div><strong>Explorar oportunidades</strong><small>Descubra novas relações de negócio.</small></div><b>→</b></Link>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
