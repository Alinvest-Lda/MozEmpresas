import { getSuperAdminContext } from "@/lib/auth/super-admin";
import styles from "./admin-analytics.module.css";

const DAY_MS = 24 * 60 * 60 * 1000;
const dateKey = (date: Date) => date.toISOString().slice(0, 10);

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-MZ").format(value);
}

export default async function AdminAnalytics() {
  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) return null;

  const now = new Date();
  const since = new Date(now.getTime() - 29 * DAY_MS);
  const sinceIso = since.toISOString();
  const [
    { count: totalBusinesses },
    { count: totalUsers },
    { count: totalListings },
    { count: totalRequests },
    { count: newBusinesses },
    { count: newUsers },
    { count: newListings },
    { count: newRequests },
    { data: businessActivity },
    { data: userActivity },
    { data: listingActivity },
    { data: requestActivity },
    { count: publishedListings },
    { count: completedRequests },
  ] = await Promise.all([
    supabase.from("businesses").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("listings").select("id", { count: "exact", head: true }),
    supabase.from("service_requests").select("id", { count: "exact", head: true }),
    supabase.from("businesses").select("id", { count: "exact", head: true }).gte("created_at", sinceIso),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", sinceIso),
    supabase.from("listings").select("id", { count: "exact", head: true }).gte("created_at", sinceIso),
    supabase.from("service_requests").select("id", { count: "exact", head: true }).gte("created_at", sinceIso),
    supabase.from("businesses").select("created_at").gte("created_at", sinceIso).order("created_at", { ascending: true }).limit(1500),
    supabase.from("profiles").select("created_at").gte("created_at", sinceIso).order("created_at", { ascending: true }).limit(1500),
    supabase.from("listings").select("created_at").gte("created_at", sinceIso).order("created_at", { ascending: true }).limit(1500),
    supabase.from("service_requests").select("created_at").gte("created_at", sinceIso).order("created_at", { ascending: true }).limit(1500),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "PUBLISHED"),
    supabase.from("service_requests").select("id", { count: "exact", head: true }).eq("status", "COMPLETED"),
  ]);

  const days = Array.from({ length: 14 }, (_, index) => {
    const day = new Date(now);
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - (13 - index));
    return { key: dateKey(day), label: day.toLocaleDateString("pt-MZ", { day: "2-digit", month: "short" }), businesses: 0, users: 0, listings: 0, requests: 0 };
  });
  const dayMap = new Map(days.map((day) => [day.key, day]));
  const addActivity = (rows: { created_at: string }[] | null, key: "businesses" | "users" | "listings" | "requests") => {
    for (const row of rows ?? []) {
      const bucket = dayMap.get(dateKey(new Date(row.created_at)));
      if (bucket) bucket[key] += 1;
    }
  };
  addActivity(businessActivity, "businesses");
  addActivity(userActivity, "users");
  addActivity(listingActivity, "listings");
  addActivity(requestActivity, "requests");

  const maxActivity = Math.max(1, ...days.map((day) => day.businesses + day.users + day.listings + day.requests));
  const listingPublicationRate = totalListings ? Math.round(((publishedListings ?? 0) / totalListings) * 100) : 0;
  const requestCompletionRate = totalRequests ? Math.round(((completedRequests ?? 0) / totalRequests) * 100) : 0;

  const metrics = [
    { label: "Empresas registadas", total: totalBusinesses ?? 0, period: newBusinesses ?? 0, hint: "novas nos últimos 30 dias", symbol: "EM", tone: "teal", href: "/dashboard/admin/empresas" },
    { label: "Utilizadores", total: totalUsers ?? 0, period: newUsers ?? 0, hint: "novos nos últimos 30 dias", symbol: "US", tone: "blue", href: "/dashboard/admin/usuarios" },
    { label: "Ofertas no marketplace", total: totalListings ?? 0, period: newListings ?? 0, hint: "criadas nos últimos 30 dias", symbol: "OF", tone: "violet", href: "#ofertas" },
    { label: "Pedidos de serviço", total: totalRequests ?? 0, period: newRequests ?? 0, hint: "recebidos nos últimos 30 dias", symbol: "PS", tone: "orange", href: "#pedidos-servico" },
  ] as const;

  return (
    <section className={styles.analytics} aria-label="Painel analítico de gestão">
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>VISÃO EXECUTIVA · SUPER ADMIN</span>
          <h1>Visão geral da plataforma</h1>
          <p>Indicadores para acompanhar crescimento, actividade e pontos que exigem decisão.</p>
        </div>
        <div className={styles.period}><span className={styles.liveDot} /> Últimos 30 dias <small>Dados do último carregamento</small></div>
      </header>

      <div className={styles.metrics}>
        {metrics.map((metric) => (
          <a className={styles.metric} href={metric.href} key={metric.label}>
            <div className={styles.metricTop}><span>{metric.label}</span><span className={`${styles.metricIcon} ${styles[metric.tone]}`}>{metric.symbol}</span></div>
            <strong>{formatNumber(metric.total)}</strong>
            <div className={styles.metricBottom}><b>+{formatNumber(metric.period)}</b><span>{metric.hint}</span></div>
          </a>
        ))}
      </div>

      <div className={styles.insightsGrid}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div><span className={styles.eyebrow}>ACTIVIDADE RECENTE</span><h2>Movimento da plataforma</h2><p>Registos diários nos últimos 14 dias.</p></div>
            <span className={styles.chartBadge}>14 dias</span>
          </div>
          <div className={styles.chartLegend}>
            <span><i className={styles.legendUsers} /> Utilizadores</span>
            <span><i className={styles.legendBusinesses} /> Empresas</span>
            <span><i className={styles.legendListings} /> Ofertas</span>
            <span><i className={styles.legendRequests} /> Pedidos</span>
          </div>
          <div className={styles.chart} role="img" aria-label="Gráfico de barras da actividade diária por utilizadores, empresas, ofertas e pedidos">
            {days.map((day) => {
              const total = day.businesses + day.users + day.listings + day.requests;
              const userHeight = (day.users / maxActivity) * 100;
              const businessHeight = (day.businesses / maxActivity) * 100;
              const listingHeight = (day.listings / maxActivity) * 100;
              const requestHeight = (day.requests / maxActivity) * 100;
              return <div className={styles.barColumn} key={day.key} title={`${day.label}: ${total} registos`}>
                <div className={styles.barTrack}>
                  <span className={styles.barUsers} style={{ height: `${userHeight}%` }} />
                  <span className={styles.barBusinesses} style={{ height: `${businessHeight}%` }} />
                  <span className={styles.barListings} style={{ height: `${listingHeight}%` }} />
                  <span className={styles.barRequests} style={{ height: `${requestHeight}%` }} />
                </div>
                <small>{day.label}</small>
              </div>;
            })}
          </div>
          <p className={styles.chartFootnote}>O gráfico mostra novos registos por dia; não representa utilizadores activos nem visitas.</p>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div><span className={styles.eyebrow}>QUALIDADE DA PLATAFORMA</span><h2>Indicadores de desempenho</h2><p>Proporções que ajudam a avaliar a qualidade do inventário e o ciclo de serviço.</p></div>
          </div>
          <div className={styles.rateBlock}>
            <div className={styles.rateHead}><span><strong>Publicação do marketplace</strong><small>Percentagem das ofertas que estão publicadas</small></span><b>{formatNumber(listingPublicationRate)}%</b></div>
            <div className={styles.progress}><span className={styles.progressPublished} style={{ width: `${listingPublicationRate}%` }} /></div>
            <small className={styles.rateContext}>{formatNumber(publishedListings ?? 0)} publicadas de {formatNumber(totalListings ?? 0)} ofertas registadas</small>
          </div>
          <div className={styles.rateBlock}>
            <div className={styles.rateHead}><span><strong>Conclusão de pedidos</strong><small>Percentagem dos pedidos marcados como concluídos</small></span><b>{formatNumber(requestCompletionRate)}%</b></div>
            <div className={styles.progress}><span className={styles.progressCompleted} style={{ width: `${requestCompletionRate}%` }} /></div>
            <small className={styles.rateContext}>{formatNumber(completedRequests ?? 0)} concluídos de {formatNumber(totalRequests ?? 0)} pedidos registados</small>
          </div>
          <div className={styles.rateInsight}><span className={styles.noteIcon}>i</span><span><strong>Como interpretar</strong><small>Estes rácios usam os totais actualmente registados. Não representam uma taxa de conversão comercial nem uma avaliação de qualidade do serviço.</small></span></div>
          <a className={styles.viewAll} href="/dashboard/admin/monetizacao">Explorar monetização e inventário <span aria-hidden="true">→</span></a>
        </section>
      </div>

      <div className={styles.bottomNote}>
        <div><span className={styles.noteIcon}>i</span><span><strong>Leitura de gestão</strong><small>Os números apresentados são agregados directamente da base de dados. A variação de 30 dias indica novos registos, não crescimento percentual.</small></span></div>
        <a href="/dashboard/admin/publicidade">Ver publicidade e campanhas <span aria-hidden="true">→</span></a>
      </div>
    </section>
  );
}
