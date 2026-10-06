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

  const actions = [
    { href: "/parceiro/oportunidades", label: "Publicar oportunidade", text: "Apresente uma necessidade, chamada ou oportunidade à rede MozEmpresas.", tag: "OPORTUNIDADES" },
    { href: "/parceiro/publicidade", label: "Activar exposição", text: "Conheça os espaços premium e solicite uma campanha exclusiva.", tag: "CRESCIMENTO" },
    { href: "/parceiro/inteligencia", label: "Explorar inteligência", text: "Consulte informação e sinais de mercado relevantes para a sua relação com a plataforma.", tag: "INTELIGÊNCIA" },
  ];

  return (
    <main className="dashboard-main workspace-dashboard">
      <div className="dashboard-content">
        <header className="workspace-hero">
          <div className="workspace-hero-copy">
            <span className="dashboard-kicker">Área de parceiro</span>
            <h1>{name}</h1>
            <p>Um espaço dedicado à relação entre a sua entidade e a MozEmpresas — oportunidades, exposição, serviços e inteligência num só lugar.</p>
          </div>
          <div className="workspace-hero-context">
            <span>Conta parceira</span>
            <strong>Activa</strong>
            <small>Uma entidade · {members?.length ?? 0} gestor(es) autorizado(s)</small>
            <Link href="/parceiro/conta" className="text-link">Ver conta e gestores →</Link>
          </div>
        </header>

        <section className="workspace-metrics" aria-label="Resumo da relação">
          <article className="workspace-metric workspace-metric-featured"><span>Relação com a MozEmpresas</span><strong>Em actividade</strong><small>O espaço está preparado para publicar, promover e acompanhar a sua relação com a plataforma.</small></article>
          <article className="workspace-metric"><span>Oportunidades</span><strong>{opportunities?.length ?? 0}</strong><small>Publicadas pela entidade</small></article>
          <article className="workspace-metric"><span>Serviços em curso</span><strong>{pending}</strong><small>Pedidos em acompanhamento</small></article>
          <article className="workspace-metric"><span>Serviços concluídos</span><strong>{completed}</strong><small>Registados na conta</small></article>
        </section>

        <div className="workspace-primary-grid">
          <section className="workspace-panel">
            <div className="workspace-panel-head"><div><span className="dashboard-kicker">Centro de acção</span><h2>O que pretende fazer?</h2><p>As funções centrais da sua relação com o ecossistema MozEmpresas.</p></div></div>
            <div className="workspace-action-list">
              {actions.map((action, index) => (
                <Link href={action.href} className="workspace-action-row" key={action.href}>
                  <span className="workspace-action-index">0{index + 1}</span>
                  <div><small>{action.tag}</small><strong>{action.label}</strong><p>{action.text}</p></div>
                  <b>→</b>
                </Link>
              ))}
            </div>
          </section>

          <section className="workspace-panel workspace-activity-panel">
            <div className="workspace-panel-head"><div><span className="dashboard-kicker">Actividade</span><h2>Oportunidades recentes</h2></div><Link href="/parceiro/oportunidades" className="text-link">Ver todas →</Link></div>
            {opportunities?.length ? (
              <div className="workspace-activity-list">
                {opportunities.slice(0, 4).map((item) => (
                  <Link href={"/oportunidades/" + item.slug} key={item.id}>
                    <span>{item.type || "Oportunidade"} · {dateLabel(item.closes_at)}</span>
                    <strong>{item.title}</strong>
                    <small>{item.organization || name} · {item.location || "Localização não indicada"}</small>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="workspace-empty"><strong>Ainda sem actividade publicada</strong><p>A primeira oportunidade pode ser criada directamente a partir daqui.</p><Link href="/parceiro/oportunidades" className="btn primary">Publicar oportunidade</Link></div>
            )}
          </section>
        </div>

        <div className="workspace-secondary-grid">
          <section className="workspace-panel">
            <div className="workspace-panel-head"><div><span className="dashboard-kicker">Acompanhamento</span><h2>A sua relação, em contexto</h2></div></div>
            <div className="workspace-context-grid">
              <Link href="/parceiro/publicidade"><strong>Publicidade e exposição</strong><span>Espaços premium exclusivos e alcance direccionado.</span><b>→</b></Link>
              <Link href="/parceiro/servicos"><strong>Serviços e exclusividades</strong><span>Serviços disponíveis e benefícios associados à conta.</span><b>→</b></Link>
              <Link href="/parceiro/inteligencia"><strong>Mercado e insights</strong><span>Informação para compreender oportunidades e contexto.</span><b>→</b></Link>
              <Link href="/parceiro/resultados"><strong>Desempenho e histórico</strong><span>Registo factual das actividades da parceria.</span><b>→</b></Link>
            </div>
          </section>
          <section className="workspace-panel workspace-next-panel">
            <div className="workspace-panel-head"><div><span className="dashboard-kicker">Conta</span><h2>Gestão do acesso</h2></div></div>
            <p>Esta conta representa uma única entidade parceira. Os gestores autorizados trabalham sobre o mesmo espaço e os mesmos dados.</p>
            <Link href="/parceiro/conta#gestores" className="btn secondary">Gerir gestores</Link>
          </section>
        </div>
      </div>
    </main>
  );
}