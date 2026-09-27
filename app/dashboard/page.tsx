export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/auth/actions";

const modules = [
  { href: "/marketplace", label: "Comprar", text: "Encontre produtos e serviços de outras empresas.", icon: "↗" },
  { href: "/marketplace", label: "Vender", text: "Publique produtos e serviços e seja encontrado.", icon: "◇" },
  { href: "/concursos", label: "Concursos", text: "Descubra processos e participe quando fizer sentido.", icon: "◈" },
  { href: "/oportunidades", label: "Oportunidades", text: "Encontre chamadas, parcerias, financiamento e eventos.", icon: "⌘" },
  { href: "/dashboard/empresas", label: "Empresa", text: "Construa e mantenha a sua presença pública.", icon: "□" },
  { href: "/repositorio", label: "Recursos", text: "Consulte documentos, guias, modelos e publicações.", icon: "▤" },
];

export default async function Dashboard() {
  try {
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    const userId = claimsData?.claims?.sub;
    if (!userId) redirect("/login");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const [
      { data: profile },
      { data: businesses },
      { data: memberships },
      { data: listings },
      { data: opportunities },
      { data: opportunityApplications },
      { data: contests },
      { data: contestApplications },
      { data: platformMember },
    ] = await Promise.all([
      supabase.from("profiles").select("full_name,location,website,bio").eq("id", user.id).maybeSingle(),
      supabase.from("businesses").select("id,name,slug,location,is_public").eq("owner_id", user.id).order("created_at", { ascending: false }),
      supabase.from("business_members").select("business_id,role").eq("user_id", user.id),
      supabase.from("listings").select("id").eq("owner_id", user.id),
      supabase.from("opportunities").select("id").eq("owner_id", user.id),
      supabase.from("opportunity_applications").select("id").eq("applicant_id", user.id),
      supabase.from("contests").select("id").eq("owner_id", user.id),
      supabase.from("contest_applications").select("id").eq("applicant_id", user.id),
      supabase.from("platform_members").select("role,active").eq("user_id", user.id).maybeSingle(),
    ]);

    const name = profile?.full_name || user.email || "Utilizador";
    const ownedBusinessIds = new Set((businesses ?? []).map((item) => item.id));
    const memberCount = (memberships ?? []).filter((item) => !ownedBusinessIds.has(item.business_id)).length;
    const totalParticipations = (opportunityApplications?.length ?? 0) + (contestApplications?.length ?? 0);
    const platformAccess = platformMember?.active ? platformMember.role : null;

    return (
      <div className="dashboard">
        <aside className="sidebar">
          <strong>Área de gestão</strong>
          <div style={{ marginTop: 18 }}>
            <Link href="/dashboard">Visão geral</Link>
            <Link href="/dashboard/empresas">Empresa</Link>
            <Link href="/marketplace">Comprar e vender</Link>
            <Link href="/concursos">Concursos</Link>
            <Link href="/oportunidades">Oportunidades</Link>
            <Link href="/repositorio">Recursos</Link>
            <Link href="/empresas">Directório</Link>
          </div>
          {platformAccess && (
            <Link href="/dashboard" className="muted" style={{ display: "block", marginTop: 18, fontSize: 13 }}>
              Administração · {platformAccess}
            </Link>
          )}
          <form action={signOut} style={{ marginTop: 24 }}>
            <button className="btn full">Sair</button>
          </form>
        </aside>

        <section className="dash-main">
          <div className="dashboard-top">
            <div>
              <span className="eyebrow">Painel da empresa</span>
              <h1>Olá, {name}</h1>
              <p className="muted">Um único painel para gerir a sua presença e participar em todo o ecossistema MozEmpresas.</p>
            </div>
            <Link href="/dashboard/empresas" className="btn primary">Gerir empresa</Link>
          </div>

          <div className="metric-grid">
            <div className="metric"><span className="muted">Empresas</span><strong>{businesses?.length ?? 0}</strong><small>Perfis próprios · {memberCount} associação(ões)</small></div>
            <div className="metric"><span className="muted">Ofertas</span><strong>{listings?.length ?? 0}</strong><small>Produtos e serviços publicados</small></div>
            <div className="metric"><span className="muted">Publicações</span><strong>{(opportunities?.length ?? 0) + (contests?.length ?? 0)}</strong><small>Oportunidades e concursos</small></div>
            <div className="metric"><span className="muted">Participações</span><strong>{totalParticipations}</strong><small>Respostas e candidaturas</small></div>
          </div>

          <section className="card" style={{ marginBottom: 22 }}>
            <span className="eyebrow">O ecossistema trabalha nos dois sentidos</span>
            <h2 style={{ marginTop: 12 }}>Compre. Venda. Participe. Crie relações.</h2>
            <p className="muted" style={{ maxWidth: 820 }}>
              A sua conta não o prende a um único papel. Pode procurar soluções, apresentar ofertas, publicar necessidades, participar em processos e desenvolver parceiros conforme a actividade da sua empresa.
            </p>
            <div className="dashboard-module-grid" style={{ marginTop: 22 }}>
              {modules.map((module) => (
                <Link href={module.href} className="dashboard-module-card" key={module.label}>
                  <span className="dashboard-module-icon">{module.icon}</span>
                  <div><strong>{module.label}</strong><small>{module.text}</small></div>
                  <b>→</b>
                </Link>
              ))}
            </div>
          </section>

          <div className="dashboard-grid">
            <section className="card">
              <span className="eyebrow">Presença empresarial</span>
              <h2 style={{ marginTop: 12 }}>As suas empresas</h2>
              {businesses?.length ? (
                <div className="dashboard-list">
                  {businesses.slice(0, 5).map((business) => (
                    <Link href={"/empresas/" + business.slug} key={business.id}>
                      <strong>{business.name}</strong>
                      <span>{business.location || "Sem localização"} · {business.is_public ? "Público" : "Privado"}</span>
                      <b>→</b>
                    </Link>
                  ))}
                </div>
              ) : (
                <>
                  <p className="muted">Comece por criar a empresa que irá representar a sua actividade no ecossistema.</p>
                  <Link href="/dashboard/empresas" className="btn primary">Criar empresa</Link>
                </>
              )}
            </section>

            <section className="card">
              <span className="eyebrow">Recomendado para si</span>
              <h2 style={{ marginTop: 12 }}>Próximas acções</h2>
              <div className="next-steps">
                <Link href="/dashboard/empresas"><span>01</span><div><strong>Completar a presença</strong><small>Melhore o perfil público da sua empresa.</small></div>→</Link>
                <Link href="/marketplace"><span>02</span><div><strong>Descobrir o mercado</strong><small>Procure fornecedores e soluções ou publique uma oferta.</small></div>→</Link>
                <Link href="/oportunidades"><span>03</span><div><strong>Encontrar oportunidades</strong><small>Explore oportunidades que podem gerar novas relações.</small></div>→</Link>
              </div>
            </section>
          </div>
        </section>
      </div>
    );
  } catch {
    return (
      <main className="page">
        <div className="container">
          <section className="card" style={{ maxWidth: 760, margin: "80px auto" }}>
            <span className="eyebrow">Área de gestão</span>
            <h1>O painel está temporariamente indisponível.</h1>
            <p className="muted">A ligação ao serviço de autenticação ou dados não está disponível neste momento. As páginas públicas do portal continuam acessíveis.</p>
            <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
              <Link href="/" className="btn primary">Voltar ao início</Link>
              <Link href="/contactos" className="btn">Contactar suporte</Link>
            </div>
          </section>
        </div>
      </main>
    );
  }
}
