export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getManagedBusinessIds } from "@/lib/businesses/permissions";
const workActions = [
  { href: "/dashboard/marketplace", title: "Comprar e vender", text: "Encontre ofertas, publique o que a sua empresa disponibiliza e desenvolva negócio.", icon: "↗" },
  { href: "/dashboard/empresas", title: "Gerir empresa", text: "Actualize a presença, contactos e informação pública da sua empresa.", icon: "□" },
  { href: "/oportunidades", title: "Encontrar oportunidades", text: "Acompanhe oportunidades e responda às que fazem sentido para a sua actividade.", icon: "⌘" },
  { href: "/concursos", title: "Concursos", text: "Consulte concursos abertos e veja os processos relevantes para a sua empresa.", icon: "◈" },
];

const quickLinks = [
  ["/oportunidades", "Oportunidades", "Descobrir chamadas, parcerias e processos relevantes"],
  ["/dashboard/acessos", "Acessos e equipa", "Definir quem pode actuar pela empresa"],
  ["/dashboard/servicos", "Serviços MozEmpresas", "Contratar apoio e serviços da plataforma"],
  ["/empresas", "Directório", "Pesquisar empresas e potenciais parceiros"],
] as const;

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
  const { data: listings } = managedBusinessIds.length
    ? await supabase.from("listings").select("id").in("business_id", managedBusinessIds)
    : { data: [] as { id: string }[] };

  const memberBusinessIds = [...new Set((memberships ?? []).map((item) => item.business_id))];
  const { data: memberBusinesses } = memberBusinessIds.length
    ? await supabase.from("businesses").select("id,name,slug,location,is_public").in("id", memberBusinessIds)
    : { data: [] };

  const businesses = [...(ownedBusinesses ?? []), ...(memberBusinesses ?? []).filter((item) => !(ownedBusinesses ?? []).some((owned) => owned.id === item.id))];
  const name = profile?.full_name || user.email?.split("@")[0] || "Utilizador";
  const teamAccessCount = memberships?.length ?? 0;

  return (
    <main className="dashboard-main">
        <div className="dashboard-content">
          <header className="dashboard-topbar">
            <div className="dashboard-welcome">
              <span className="dashboard-kicker">Área empresarial</span>
              <h1>Bom trabalho, {name}.</h1>
              <p>Encontre oportunidades, desenvolva relações comerciais e mantenha a presença da sua empresa organizada num só espaço.</p>
            </div>
            <div className="dashboard-actions">
              <Link href={businesses.length ? "/dashboard/empresas" : "/dashboard/empresas"} className="btn primary">
                {businesses.length ? "Gerir presença" : "Criar empresa"}
              </Link>
            </div>
          </header>

          <section className="dashboard-overview">
            <div className="dashboard-stat-grid">
              <div className="dashboard-stat"><small>Empresas no espaço</small><strong>{businesses.length}</strong><span>Empresas que pode gerir ou representar</span></div>
              <div className="dashboard-stat"><small>Ofertas publicadas</small><strong>{listings?.length ?? 0}</strong><span>Produtos e serviços associados à sua conta</span></div>
              <div className="dashboard-stat"><small>Oportunidades publicadas</small><strong>{opportunities?.length ?? 0}</strong><span>Oportunidades criadas por si</span></div>
              <div className="dashboard-stat"><small>Acessos de equipa</small><strong>{teamAccessCount}</strong><span>Associações de trabalho activas</span></div>
            </div>
          </section>

          <section className="dashboard-section dashboard-work-section responsive-priority">
            <div className="dashboard-section-head">
              <div>
                <span className="dashboard-kicker">Centro de trabalho</span>
                <h2>O que precisa de fazer hoje?</h2>
                <p>Aceda directamente às actividades que geram valor para a sua empresa.</p>
              </div>
            </div>
            <div className="dashboard-action-grid">
              {workActions.map((item) => (
                <Link href={item.href} className="dashboard-action-card" key={item.title}>
                  <span className="dashboard-action-icon">{item.icon}</span>
                  <div><strong>{item.title}</strong><small>{item.text}</small></div>
                  <b>→</b>
                </Link>
              ))}
            </div>
          </section>

          <div className="dashboard-lower-grid">
            <section className="dashboard-section">
              <div className="dashboard-section-head">
                <div>
                  <span className="dashboard-kicker">Portefólio empresarial</span>
                  <h2>Empresas que representa</h2>
                </div>
                <Link href="/dashboard/empresas" className="text-link">Ver gestão →</Link>
              </div>
              {businesses.length ? (
                <div className="dashboard-list">
                  {businesses.slice(0, 5).map((business) => (
                    <Link href={"/empresas/" + business.slug} key={business.id}>
                      <strong>{business.name}</strong>
                      <span>{business.location || "Localização por definir"} · {business.is_public ? "Visível no directório" : "Ainda não publicada"}</span>
                      <b>→</b>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="empty">
                  <div className="empty-icon">+</div>
                  <p>Associe a primeira empresa para começar a apresentar a sua actividade, publicar ofertas e estabelecer relações.</p>
                  <Link href="/dashboard/empresas" className="btn primary">Criar empresa</Link>
                </div>
              )}
            </section>

            <section className="dashboard-section">
              <div className="dashboard-section-head">
                <div>
                  <span className="dashboard-kicker">Acesso rápido</span>
                  <h2>Outras ferramentas</h2>
                </div>
              </div>
              <div className="dashboard-quick-links">
                {quickLinks.map(([href, title, text]) => (
                  <Link href={href} key={title}>
                    <div><strong>{title}</strong><small>{text}</small></div><b>→</b>
                  </Link>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
  );
}