export const dynamic = "force-dynamic";

import { getSuperAdminContext } from "@/lib/auth/super-admin";
import { createAdminClient } from "@/lib/security/rate-limit";

const WINDOW_DAYS = 30;
const SAMPLE_LIMIT = 3000;

function number(value: number | null) {
  return new Intl.NumberFormat("pt-MZ").format(value ?? 0);
}

function dateLabel(value: string) {
  return new Date(value).toLocaleDateString("pt-MZ", { timeZone: "Africa/Maputo", day: "2-digit", month: "short" });
}

export default async function AdminNotificationsPage() {
  const { authorized } = await getSuperAdminContext();
  if (!authorized) return null;

  const client = createAdminClient();
  if (!client) {
    return <main className="dashboard-main admin-workspace"><div className="dashboard-content"><section className="dashboard-section"><h1>Notificações</h1><div className="notice" role="alert">Os indicadores de notificações estão indisponíveis: o acesso de métricas administrativas não está configurado.</div></section></div></main>;
  }

  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const [
    { count: totalRecent, error: recentError },
    { count: unreadTotal, error: unreadError },
    { data: sample, count: sampleCount, error: sampleError },
  ] = await Promise.all([
    client.from("notifications").select("id", { count: "exact", head: true }).gte("created_at", since),
    client.from("notifications").select("id", { count: "exact", head: true }).is("read_at", null),
    client.from("notifications").select("type,created_at,read_at", { count: "exact" }).gte("created_at", since).order("created_at", { ascending: false }).limit(SAMPLE_LIMIT),
  ]);

  const errors = [recentError, unreadError, sampleError].some(Boolean);
  const typeCounts = new Map<string, { total: number; unread: number }>();
  const daily = new Map<string, number>();
  for (const row of sample ?? []) {
    const type = row.type || "Sem tipo";
    const stats = typeCounts.get(type) ?? { total: 0, unread: 0 };
    stats.total += 1;
    if (!row.read_at) stats.unread += 1;
    typeCounts.set(type, stats);
    const key = dateLabel(row.created_at);
    daily.set(key, (daily.get(key) ?? 0) + 1);
  }
  const typeRows = [...typeCounts.entries()].sort((a, b) => b[1].total - a[1].total);
  const dayRows = [...daily.entries()];

  return <main className="dashboard-main admin-workspace"><div className="dashboard-content">
    <section className="dashboard-section">
      <div className="dashboard-section-head"><div><span className="dashboard-kicker">Administração global · Sistema</span><h1>Notificações</h1><p>Visão agregada do volume, pendências de leitura e tipos de notificação. Esta página não expõe destinatários nem conteúdo individual.</p></div><a className="btn" href="/dashboard/admin">Voltar ao painel</a></div>
      {errors ? <div className="notice" role="alert">Uma ou mais consultas falharam. Os totais são ocultados e não devem ser interpretados como zero.</div> : null}
      <div className="admin-control-stats">
        <article className="admin-control-stat"><span className="admin-control-stat-label">Criadas · 30 dias</span><strong>{errors ? "—" : number(totalRecent)}</strong><span>Volume total no período</span></article>
        <article className="admin-control-stat"><span className="admin-control-stat-label">Por ler · global</span><strong>{errors ? "—" : number(unreadTotal)}</strong><span>Notificações sem read_at</span></article>
        <article className="admin-control-stat"><span className="admin-control-stat-label">Tipos activos</span><strong>{errors ? "—" : typeRows.length}</strong><span>Tipos observados na amostra de 30 dias</span></article>
      </div>
      {sampleCount !== null && sampleCount > SAMPLE_LIMIT ? <div className="notice">A classificação por tipo e tendência diária baseiam-se numa amostra limitada a {number(SAMPLE_LIMIT)} registos dos {number(sampleCount)} existentes. Os totais acima são consultas exactas.</div> : null}
    </section>
    <section className="dashboard-section">
      <div className="dashboard-section-head"><div><span className="dashboard-kicker">Distribuição</span><h2>Volume por tipo</h2><p>Contagens da amostra de notificações dos últimos 30 dias.</p></div></div>
      {errors ? <div className="notice" role="alert">Distribuição indisponível devido a erro de consulta.</div> : typeRows.length ? <div className="admin-request-list">{typeRows.map(([type,stats])=><article className="admin-request-card" key={type}><div className="admin-request-head"><h3>{type}</h3><span className="tag">{number(stats.total)} total</span></div><p>{number(stats.unread)} por ler · {number(stats.total-stats.unread)} lidas</p></article>)}</div> : <div className="admin-request-empty"><strong>Sem notificações no período.</strong></div>}
    </section>
    <section className="dashboard-section">
      <div className="dashboard-section-head"><div><span className="dashboard-kicker">Tendência</span><h2>Volume diário</h2><p>Registos agrupados por dia (amostra de 30 dias).</p></div></div>
      {errors ? <div className="notice">Tendência indisponível.</div> : dayRows.length ? <div className="admin-request-list">{dayRows.map(([day,count])=><article className="admin-request-card" key={day}><div className="admin-request-head"><h3>{day}</h3><strong>{number(count)}</strong></div></article>)}</div> : <div className="admin-request-empty"><strong>Sem actividade no período.</strong></div>}
    </section>
  </div></main>;
}
