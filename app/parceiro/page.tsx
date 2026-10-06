export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function dateLabel(value: string | null) {
  return value ? new Date(value).toLocaleDateString("pt-MZ", { day: "2-digit", month: "short" }) : "Sem prazo";
}

export default async function PartnerHome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: context }, { data: opportunities }, { data: requests }, { data: members }] = await Promise.all([
    supabase.rpc("partner_account_context"),
    supabase.from("opportunities").select("id,title,slug,type,organization,location,closes_at").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(6),
    supabase.from("service_requests").select("id,status,created_at").eq("requester_user_id", user.id).order("created_at", { ascending: false }).limit(6),
    supabase.rpc("partner_account_members_list"),
  ]);

  const pending = (requests ?? []).filter((x) => ["REQUESTED", "UNDER_REVIEW", "QUOTED"].includes(x.status)).length;
  const completed = (requests ?? []).filter((x) => x.status === "COMPLETED").length;
  const name = context?.[0]?.account_name || user.email?.split("@")[0] || "Parceiro";

  return (
    <main className="dashboard-main">
      <div className="dashboard-content">
        <header className="dashboard-topbar">
          <div className="dashboard-welcome">
            <span className="dashboard-kicker">Área de parceiro</span>
            <h1>{name}</h1>
            <p>Gerir a relação da sua entidade com a MozEmpresas: oportunidades, serviços e actividade.</p>
          </div>
          <div className="dashboard-actions">
            <Link href="/parceiro/oportunidades" className="btn primary">Minhas oportunidades</Link>
          </div>
        </header>

        <section className="dashboard-overview">
          <div className="dashboard-stat-grid">
            <div className="dashboard-stat"><small>Oportunidades publicadas</small><strong>{opportunities?.length ?? 0}</strong><span>Da sua entidade</span></div>
            <div className="dashboard-stat"><small>Gestores da conta</small><strong>{members?.length ?? 0}</strong><span>Acessos autorizados</span></div>
            <div className="dashboard-stat"><small>Serviços em curso</small><strong>{pending}</strong><span>Pedidos em acompanhamento</span></div>
            <div className="dashboard-stat"><small>Serviços concluídos</small><strong>{completed}</strong><span>Histórico da conta</span></div>
          </div>
        </section>

        <section className="dashboard-section responsive-priority">
          <div className="dashboard-section-head">
            <div>
              <span className="dashboard-kicker">Centro de trabalho</span>
              <h2>Actividade da sua parceria</h2>
              <p>O espaço do parceiro acompanha a relação entre a sua entidade e a MozEmpresas.</p>
            </div>
          </div>
          <div className="dashboard-action-grid">
            {[
              ["/parceiro/oportunidades", "Oportunidades", "Publicar e acompanhar oportunidades da sua entidade", "↗"],
              ["/parceiro/servicos", "Serviços", "Consultar serviços e estados da sua conta", "⌘"],
              ["/parceiro/resultados", "Actividade", "Consultar o histórico factual da parceria", "◈"],
              ["/parceiro/conta#gestores", "Gestores", "Gerir os acessos autorizados à mesma conta", "□"],
            ].map(([href, title, description, icon]) => (
              <Link href={href} className="dashboard-action-card" key={title}>
                <span className="dashboard-action-icon">{icon}</span>
                <div><strong>{title}</strong><small>{description}</small></div>
                <b>→</b>
              </Link>
            ))}
          </div>
        </section>

        <section className="dashboard-section">
          <div className="dashboard-section-head">
            <div><span className="dashboard-kicker">Publicação</span><h2>Oportunidades recentes</h2></div>
            <Link href="/parceiro/oportunidades" className="text-link">Ver todas →</Link>
          </div>
          {opportunities?.length ? (
            <div className="dashboard-list">
              {opportunities.map((x) => (
                <Link href={"/oportunidades/" + x.slug} key={x.id}>
                  <strong>{x.title}</strong>
                  <span>{x.organization || name} · {x.location || "Localização não indicada"} · {dateLabel(x.closes_at)}</span>
                  <b>→</b>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty"><div className="empty-icon">—</div><p>A sua entidade ainda não publicou oportunidades.</p><Link href="/parceiro/oportunidades" className="text-link">Publicar uma oportunidade →</Link></div>
          )}
        </section>
      </div>
    </main>
  );
}