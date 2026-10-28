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
  const since = new Date(now.getTime() - 13 * DAY_MS);
  const sinceIso = since.toISOString();
  const [
    { count: totalBusinesses },
    { count: totalUsers },
    { count: totalListings },
    { count: totalRequests },
    { data: businessActivity },
    { data: userActivity },
    { data: listingActivity },
    { data: requestActivity },
  ] = await Promise.all([
    supabase.from("businesses").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("listings").select("id", { count: "exact", head: true }),
    supabase.from("service_requests").select("id", { count: "exact", head: true }),
    supabase.from("businesses").select("created_at").gte("created_at", sinceIso).order("created_at", { ascending: true }).limit(1500),
    supabase.from("profiles").select("created_at").gte("created_at", sinceIso).order("created_at", { ascending: true }).limit(1500),
    supabase.from("listings").select("created_at").gte("created_at", sinceIso).order("created_at", { ascending: true }).limit(1500),
    supabase.from("service_requests").select("created_at").gte("created_at", sinceIso).order("created_at", { ascending: true }).limit(1500),
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

  const metrics = [
    { label: "Empresas registadas", total: totalBusinesses ?? 0, hint: "total na plataforma", symbol: "EM", tone: "teal", href: "/dashboard/admin/empresas" },
    { label: "Utilizadores", total: totalUsers ?? 0, hint: "total na plataforma", symbol: "US", tone: "blue", href: "/dashboard/admin/usuarios" },
    { label: "Ofertas no marketplace", total: totalListings ?? 0, hint: "total no inventário", symbol: "OF", tone: "violet", href: "/dashboard/admin/ofertas" },
    { label: "Pedidos de serviço", total: totalRequests ?? 0, hint: "total registado", symbol: "PS", tone: "orange", href: "#pedidos-servico" },
  ] as const;

  return (
    <section className={styles.analytics} aria-label="Painel analítico de gestão">
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>VISÃO EXECUTIVA · SUPER ADMIN</span>
          <h1>Visão geral da plataforma</h1>
          <p>Indicadores para acompanhar crescimento, actividade e pontos que exigem decisão.</p>
        </div>
        <div className={styles.period}><span className={styles.liveDot} /> Tendência de 14 dias <small>Dados do último carregamento</small></div>
      </header>

      <div className={styles.metrics}>
        {metrics.map((metric) => (
          <a className={styles.metric} href={metric.href} key={metric.label}>
            <div className={styles.metricTop}><span>{metric.label}</span><span className={`${styles.metricIcon} ${styles[metric.tone]}`}>{metric.symbol}</span></div>
            <strong>{formatNumber(metric.total)}</strong>
            <div className={styles.metricBottom}><span>{metric.hint}</span></div>
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
      </div>
    </section>
  );
}
