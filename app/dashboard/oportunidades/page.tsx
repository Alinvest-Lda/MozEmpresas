export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const labels: Record<string, string> = {
  CALL: "Chamadas",
  FUNDING: "Financiamentos",
  PARTNERSHIP: "Parcerias",
  TRAINING: "Capacitações",
  EVENT: "Eventos",
};

const icons: Record<string, string> = {
  CALL: "↗",
  FUNDING: "◈",
  PARTNERSHIP: "⌘",
  TRAINING: "◇",
  EVENT: "◷",
};

const applicationLabels: Record<string, string> = {
  SUBMITTED: "Submetida",
  REVIEWING: "Em análise",
  SHORTLISTED: "Seleccionada",
  ACCEPTED: "Aceite",
  REJECTED: "Não seleccionada",
  WITHDRAWN: "Retirada",
};

function dateLabel(value: string | null) {
  if (!value) return "Sem prazo indicado";
  return new Date(value).toLocaleDateString("pt-MZ", { day: "2-digit", month: "short", year: "numeric" });
}

function daysUntil(value: string | null) {
  if (!value) return null;
  return Math.ceil((new Date(value).getTime() - Date.now()) / 86400000);
}

type Opportunity = {
  id: string;
  title: string;
  slug: string;
  type: string;
  description: string;
  organization: string | null;
  location: string | null;
  closes_at: string | null;
  created_at: string;
};

type Application = {
  id: string;
  opportunity_id: string;
  status: string;
  cover_note: string | null;
  submitted_at: string | null;
};

export default async function OpportunitiesWorkspace() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login?next=/dashboard/oportunidades");

  const [
    { data: applications },
    { data: ownedOpportunities },
    { data: recentOpportunities },
  ] = await Promise.all([
    supabase.from("opportunity_applications").select("id,opportunity_id,status,cover_note,submitted_at").eq("applicant_user_id", userId).order("submitted_at", { ascending: false }).limit(30),
    supabase.from("opportunities").select("id,title,slug,type,description,organization,location,closes_at,created_at").eq("owner_id", userId).order("created_at", { ascending: false }).limit(20),
    supabase.from("opportunities").select("id,title,slug,type,description,organization,location,closes_at,created_at").eq("status", "PUBLISHED").order("created_at", { ascending: false }).limit(6),
  ]);

  const appRows = (applications ?? []) as Application[];
  const ownRows = (ownedOpportunities ?? []) as Opportunity[];
  const recentRows = (recentOpportunities ?? []) as Opportunity[];
  const applicationIds = [...new Set(appRows.map((item) => item.opportunity_id))];

  const { data: appliedOpportunities } = applicationIds.length
    ? await supabase.from("opportunities").select("id,title,slug,type,description,organization,location,closes_at,created_at").in("id", applicationIds)
    : { data: [] as Opportunity[] };

  const appliedMap = new Map((appliedOpportunities ?? []).map((item) => [item.id, item as Opportunity]));
  const activeApplications = appRows.filter((item) => !["REJECTED", "WITHDRAWN"].includes(item.status));
  const closingSoon = recentRows.filter((item) => {
    const days = daysUntil(item.closes_at);
    return days !== null && days >= 0 && days <= 7;
  });

  return (
    <main className="dashboard-main opportunities-hub">
      <style>{`
        .opportunities-hub .dashboard-content{max-width:1480px}
        .opportunities-hub .opp-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:32px;padding:8px 0 30px}
        .opportunities-hub .opp-hero h1{font-size:clamp(30px,3vw,44px);letter-spacing:-.035em;margin:6px 0 10px}
        .opportunities-hub .opp-hero p{max-width:760px;margin:0;color:var(--muted);font-size:15px;line-height:1.7}
        .opportunities-hub .opp-actions{display:flex;gap:10px;flex-wrap:wrap}
        .opportunities-hub .opp-nav{display:flex;gap:6px;border-bottom:1px solid var(--line);margin-bottom:26px}
        .opportunities-hub .opp-nav a{padding:13px 18px;border-radius:10px 10px 0 0;color:#69717c;font-weight:700;font-size:14px}
        .opportunities-hub .opp-nav a.active{color:var(--brand);background:var(--brand-soft);box-shadow:inset 0 -2px 0 var(--brand)}
        .opportunities-hub .opp-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:24px}
        .opportunities-hub .opp-kpi{background:#fff;border:1px solid var(--line);border-radius:16px;padding:20px;min-height:120px}
        .opportunities-hub .opp-kpi small{display:block;color:#707986;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}
        .opportunities-hub .opp-kpi strong{display:block;font-size:30px;letter-spacing:-.03em;margin:12px 0 5px}
        .opportunities-hub .opp-kpi span{color:#7b8490;font-size:12px}
        .opportunities-hub .opp-grid{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(300px,.7fr);gap:18px}
        .opportunities-hub .opp-panel{background:#fff;border:1px solid var(--line);border-radius:18px;padding:24px}
        .opportunities-hub .opp-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;margin-bottom:20px}
        .opportunities-hub .opp-head h2{margin:3px 0 5px;font-size:20px;letter-spacing:-.02em}
        .opportunities-hub .opp-head p{margin:0;color:#7b8490;font-size:13px;line-height:1.55}
        .opportunities-hub .opp-eyebrow{font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#727b87}
        .opportunities-hub .opp-list{display:grid;gap:10px}
        .opportunities-hub .opp-card{display:grid;grid-template-columns:48px minmax(0,1fr) auto;gap:14px;align-items:start;border:1px solid #e4e7ea;border-radius:14px;padding:16px;text-decoration:none;color:inherit}
        .opportunities-hub .opp-card:hover{border-color:#a9c5c0;background:#fafcfb}
        .opportunities-hub .opp-icon{width:42px;height:42px;border-radius:12px;background:var(--brand-soft);color:var(--brand);display:grid;place-items:center;font-weight:900}
        .opportunities-hub .opp-card strong{display:block;font-size:14px}.opportunities-hub .opp-card p{margin:5px 0 0;color:#737d88;font-size:12px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .opportunities-hub .opp-meta{display:flex;gap:9px;flex-wrap:wrap;margin-top:8px;color:#7b8490;font-size:11px}
        .opportunities-hub .opp-deadline{text-align:right;white-space:nowrap;font-size:11px;color:#707986}.opportunities-hub .opp-deadline b{display:block;color:#343b44;margin-bottom:4px}
        .opportunities-hub .opp-status{display:inline-flex;border-radius:999px;padding:5px 9px;background:#edf5ff;color:#2364a0;font-size:11px;font-weight:800}
        .opportunities-hub .opp-status.success{background:#edf8f1;color:#28734a}.opportunities-hub .opp-status.warn{background:#fff5df;color:#98650c}.opportunities-hub .opp-status.muted{background:#f0f1f2;color:#707780}
        .opportunities-hub .opp-side-actions{display:grid;gap:9px}
        .opportunities-hub .opp-side-action{display:flex;align-items:center;gap:12px;padding:14px;border:1px solid #e4e7ea;border-radius:13px}
        .opportunities-hub .opp-side-action:hover{background:#fafcfb}
        .opportunities-hub .opp-side-action strong{display:block;font-size:13px}.opportunities-hub .opp-side-action span{display:block;color:#7b8490;font-size:11px;margin-top:3px}
        .opportunities-hub .opp-empty{border:1px dashed #d8dde2;border-radius:14px;padding:28px;text-align:center;color:#747e89}
        .opportunities-hub .opp-empty strong{display:block;color:#303741;margin-bottom:5px}.opportunities-hub .opp-empty p{font-size:13px;margin:0 0 14px}
        @media(max-width:1050px){.opportunities-hub .opp-grid{grid-template-columns:1fr}.opportunities-hub .opp-kpis{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:720px){.opportunities-hub .opp-hero{display:block}.opportunities-hub .opp-actions{margin-top:18px}.opportunities-hub .opp-kpis{grid-template-columns:1fr}.opportunities-hub .opp-nav{overflow-x:auto}.opportunities-hub .opp-nav a{white-space:nowrap}.opportunities-hub .opp-panel{padding:18px}.opportunities-hub .opp-card{grid-template-columns:40px minmax(0,1fr)}.opportunities-hub .opp-deadline{grid-column:2;text-align:left}}
      `}</style>

      <div className="dashboard-content">
        <header className="opp-hero">
          <div>
            <span className="opp-eyebrow">Área de oportunidades</span>
            <h1>Encontre oportunidades para avançar.</h1>
            <p>Tenha num só espaço as oportunidades que pode explorar, as respostas que já enviou e as oportunidades publicadas pela sua organização.</p>
          </div>
          <div className="opp-actions">
            <Link href="/oportunidades" className="btn">Explorar todas</Link>
            <Link href="/publicar-oportunidade" className="btn primary">Publicar oportunidade →</Link>
          </div>
        </header>

        <nav className="opp-nav" aria-label="Centro de oportunidades">
          <a href="#visao-geral" className="active">Visão geral</a>
          <a href="#participacoes">As minhas participações</a>
          <a href="#publicadas">Publicadas</a>
        </nav>

        <section className="opp-kpis" aria-label="Resumo de oportunidades">
          <div className="opp-kpi"><small>Participações activas</small><strong>{activeApplications.length}</strong><span>Respostas ainda em acompanhamento</span></div>
          <div className="opp-kpi"><small>A terminar em 7 dias</small><strong>{closingSoon.length}</strong><span>Oportunidades que exigem atenção</span></div>
          <div className="opp-kpi"><small>Total de respostas</small><strong>{appRows.length}</strong><span>Participações submetidas pela conta</span></div>
          <div className="opp-kpi"><small>Publicadas por si</small><strong>{ownRows.length}</strong><span>Oportunidades associadas à sua conta</span></div>
        </section>

        <section id="visao-geral" className="opp-grid">
          <div className="opp-panel">
            <div className="opp-head">
              <div><span className="opp-eyebrow">Descoberta</span><h2>Oportunidades que pode explorar</h2><p>Veja as publicações mais recentes e abra cada uma para consultar condições e responder.</p></div>
              <Link href="/oportunidades" className="text-link">Ver todas →</Link>
            </div>
            {recentRows.length ? (
              <div className="opp-list">
                {recentRows.slice(0,5).map((item) => {
                  const days=daysUntil(item.closes_at);
                  return <Link href={"/oportunidades/"+item.slug} className="opp-card" key={item.id}>
                    <span className="opp-icon">{icons[item.type] || "◇"}</span>
                    <div><strong>{item.title}</strong><p>{item.description}</p><div className="opp-meta"><span>{labels[item.type] || item.type}</span><span>{item.organization || "Organização"}</span><span>{item.location || "Moçambique"}</span></div></div>
                    <div className="opp-deadline"><b>{days !== null && days >= 0 && days <= 7 ? "Prazo próximo" : "Prazo"}</b>{dateLabel(item.closes_at)}</div>
                  </Link>;
                })}
              </div>
            ) : <div className="opp-empty"><strong>Ainda não há oportunidades publicadas.</strong><p>Quando novas oportunidades forem disponibilizadas, aparecerão aqui.</p></div>}
          </div>

          <aside className="opp-panel">
            <div className="opp-head"><div><span className="opp-eyebrow">Atalhos</span><h2>Continue a partir daqui</h2><p>Acções rápidas para não perder o próximo passo.</p></div></div>
            <div className="opp-side-actions">
              <Link href="/oportunidades?deadline=7" className="opp-side-action"><span>⌛</span><div><strong>Ver prazos próximos</strong><span>Oportunidades que terminam em breve</span></div><b>→</b></Link>
              <Link href="/oportunidades?type=FUNDING" className="opp-side-action"><span>◈</span><div><strong>Procurar financiamentos</strong><span>Capital, subvenções e linhas de apoio</span></div><b>→</b></Link>
              <Link href="/oportunidades?type=PARTNERSHIP" className="opp-side-action"><span>⌘</span><div><strong>Encontrar parceiros</strong><span>Colaborações e alianças estratégicas</span></div><b>→</b></Link>
            </div>
          </aside>
        </section>

        <section id="participacoes" className="opp-panel" style={{marginTop:18}}>
          <div className="opp-head">
            <div><span className="opp-eyebrow">As minhas participações</span><h2>Respostas que já enviou</h2><p>Use esta área para acompanhar o estado das oportunidades em que já demonstrou interesse.</p></div>
            <Link href="/oportunidades" className="text-link">Encontrar mais →</Link>
          </div>
          {appRows.length ? <div className="opp-list">{appRows.map((app) => {
            const item=appliedMap.get(app.opportunity_id);
            if(!item) return null;
            const status=app.status || "SUBMITTED";
            const statusClass=status === "ACCEPTED" ? "success" : status === "SHORTLISTED" || status === "REVIEWING" ? "warn" : status === "REJECTED" || status === "WITHDRAWN" ? "muted" : "";
            return <Link href={"/oportunidades/"+item.slug} className="opp-card" key={app.id}>
              <span className="opp-icon">{icons[item.type] || "◇"}</span>
              <div><strong>{item.title}</strong><p>{item.organization || "Organização"} · {item.location || "Moçambique"}</p><div className="opp-meta"><span className={"opp-status "+statusClass}>{applicationLabels[status] || status}</span><span>Enviada {dateLabel(app.submitted_at)}</span></div></div>
              <div className="opp-deadline"><b>Prazo</b>{dateLabel(item.closes_at)}</div>
            </Link>;
          })}</div> : <div className="opp-empty"><strong>Ainda não respondeu a nenhuma oportunidade.</strong><p>Explore as publicações disponíveis e, quando encontrar uma oportunidade adequada, envie a sua resposta directamente na página.</p><Link href="/oportunidades" className="btn primary">Explorar oportunidades</Link></div>}
        </section>

        <section id="publicadas" className="opp-panel" style={{marginTop:18}}>
          <div className="opp-head">
            <div><span className="opp-eyebrow">Publicadas pela sua conta</span><h2>Oportunidades da sua organização</h2><p>Tenha uma visão rápida das oportunidades que a sua conta criou.</p></div>
            <Link href="/publicar-oportunidade" className="btn primary">Publicar nova →</Link>
          </div>
          {ownRows.length ? <div className="opp-list">{ownRows.map((item) => <Link href={"/oportunidades/"+item.slug} className="opp-card" key={item.id}><span className="opp-icon">{icons[item.type] || "◇"}</span><div><strong>{item.title}</strong><p>{item.description}</p><div className="opp-meta"><span>{labels[item.type] || item.type}</span><span>{item.location || "Moçambique"}</span></div></div><div className="opp-deadline"><b>Prazo</b>{dateLabel(item.closes_at)}</div></Link>)}</div> : <div className="opp-empty"><strong>A sua conta ainda não publicou oportunidades.</strong><p>Se representa uma organização, pode solicitar a publicação de uma chamada, financiamento, parceria, capacitação ou evento.</p><Link href="/publicar-oportunidade" className="btn primary">Ver publicação de oportunidade</Link></div>}
        </section>

        <section className="opp-panel" style={{marginTop:18,background:"linear-gradient(135deg,#e8efed,#f7faf9)"}}>
          <span className="opp-eyebrow">Organização da pesquisa</span>
          <h2 style={{margin:"6px 0 7px"}}>Guarde o seu processo de procura.</h2>
          <p style={{maxWidth:720,color:"var(--muted)",lineHeight:1.6,margin:0}}>O workspace já concentra as suas participações e prazos. A próxima camada pode acrescentar favoritos e alertas personalizados por categoria, localização e tipo de oportunidade.</p>
        </section>
      </div>
    </main>
  );
}
