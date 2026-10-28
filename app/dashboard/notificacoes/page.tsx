export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/notifications/actions";
import styles from "./notificacoes.module.css";

function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Data indisponível"
    : new Intl.DateTimeFormat("pt-MZ", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Maputo" }).format(date);
}

const typeLabels: Record<string, string> = {
  SERVICE_REQUEST: "Serviços",
  ORDER: "Comprar e vender",
  OPPORTUNITY_APPLICATION: "Oportunidades",
  PAYMENT: "Pagamentos",
  ADVERTISING: "Publicidade",
  ACCOUNT: "Conta",
  SYSTEM: "Sistema",
  SAVED_SEARCH_MATCH: "Pesquisa guardada",
};

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  resource_type: string | null;
  resource_id: string | null;
  read_at: string | null;
  created_at: string;
};

export default async function NotificationsPage({ searchParams }: { searchParams?: Promise<{ filter?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: notifications }, { data: platformMember }] = await Promise.all([
    supabase.from("notifications")
      .select("id,type,title,body,resource_type,resource_id,read_at,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("platform_members").select("role,active").eq("user_id", user.id).maybeSingle(),
  ]);

  const rawNotifications = (notifications ?? []) as Notification[];
  const availableFilters = new Set(["all", "unread", "read", ...rawNotifications.map((item) => item.type)]);
  const filter = availableFilters.has(params?.filter || "all") ? params?.filter || "all" : "all";
  const businessIds = [...new Set(rawNotifications.filter((n) => n.resource_type === "BUSINESS" && n.resource_id).map((n) => n.resource_id as string))];
  const listingIds = [...new Set(rawNotifications.filter((n) => n.resource_type === "LISTING" && n.resource_id).map((n) => n.resource_id as string))];
  const opportunityIds = [...new Set(rawNotifications.filter((n) => n.resource_type === "OPPORTUNITY" && n.resource_id).map((n) => n.resource_id as string))];

  const [businessRows, listingRows, opportunityRows] = await Promise.all([
    businessIds.length ? supabase.from("businesses").select("id,slug").in("id", businessIds) : Promise.resolve({ data: [] }),
    listingIds.length ? supabase.from("listings").select("id").in("id", listingIds) : Promise.resolve({ data: [] }),
    opportunityIds.length ? supabase.from("opportunities").select("id,slug").in("id", opportunityIds) : Promise.resolve({ data: [] }),
  ]);

  const resourceLinks = new Map<string, string>();
  (businessRows.data ?? []).forEach((item: { id: string; slug: string }) => resourceLinks.set("BUSINESS:" + item.id, "/empresas/" + item.slug));
  (listingRows.data ?? []).forEach((item: { id: string }) => resourceLinks.set("LISTING:" + item.id, "/marketplace/" + item.id));
  (opportunityRows.data ?? []).forEach((item: { id: string; slug: string }) => resourceLinks.set("OPPORTUNITY:" + item.id, "/oportunidades/" + item.slug));

  const items = rawNotifications.filter((item) =>
    filter === "unread" ? !item.read_at
      : filter === "read" ? Boolean(item.read_at)
      : filter === "all" || item.type === filter
  );
  const unread = rawNotifications.filter((item) => !item.read_at).length;
  const types = [...new Set(rawNotifications.map((item) => item.type).filter(Boolean))];
  const isSuperAdmin = Boolean(platformMember?.active && platformMember.role === "super_admin");
  const heading = filter === "unread" ? "Por ler"
    : filter === "read" ? "Lidas"
    : filter !== "all" ? (typeLabels[filter] || filter)
    : "Todas as notificações";

  return (
    <main className={`dashboard-main ${styles.page}`}>
      <div className={`dashboard-content ${styles.content}`}>
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>{isSuperAdmin ? "Administração global · Actividade" : "Conta · Centro de actividade"}</span>
            <h1>Notificações</h1>
            <p>Consulte alertas, acompanhe actualizações e abra directamente o registo relacionado quando existir uma acção a tratar.</p>
          </div>
          <div className={styles.heroBadge}>
            <span className={styles.badgeIcon} aria-hidden="true">◎</span>
            <strong>{unread.toLocaleString("pt-MZ")} por ler</strong>
            <small>{rawNotifications.length.toLocaleString("pt-MZ")} notificações recentes</small>
          </div>
        </header>

        {unread > 0 ? (
          <div className={styles.toolbar}>
            <p>As notificações por ler ficam destacadas até serem marcadas como lidas.</p>
            <form action={markAllNotificationsRead}>
              <button className="btn secondary" type="submit">Marcar todas como lidas</button>
            </form>
          </div>
        ) : null}

        <section className={styles.panel} aria-labelledby="notifications-heading">
          <div className={styles.panelHeader}>
            <div>
              <span className={styles.kicker}>{unread > 0 ? `${unread} por ler` : "Tudo em dia"}</span>
              <h2 id="notifications-heading">{heading}</h2>
              <p>O histórico apresenta até 100 notificações recentes.</p>
            </div>
          </div>

          <nav className={styles.filters} aria-label="Filtros de notificações">
            <Link href="/dashboard/notificacoes?filter=all" className={filter === "all" ? styles.activeFilter : ""}>Todas</Link>
            <Link href="/dashboard/notificacoes?filter=unread" className={filter === "unread" ? styles.activeFilter : ""}>Por ler <span>{unread}</span></Link>
            <Link href="/dashboard/notificacoes?filter=read" className={filter === "read" ? styles.activeFilter : ""}>Lidas</Link>
            {types.map((type) => (
              <Link key={type} href={"/dashboard/notificacoes?filter=" + encodeURIComponent(type)} className={filter === type ? styles.activeFilter : ""}>
                {typeLabels[type] || type}
              </Link>
            ))}
          </nav>

          {items.length ? (
            <div className={styles.list}>
              {items.map((item) => {
                const resourceKey = item.resource_type && item.resource_id
                  ? String(item.resource_type).toUpperCase() + ":" + item.resource_id
                  : "";
                const resourceLink = resourceLinks.get(resourceKey);
                return (
                  <article key={item.id} className={`${styles.notification} ${item.read_at ? "" : styles.unread}`}>
                    <div className={styles.notificationBody}>
                      <div className={styles.itemMeta}>
                        <span className={styles.typePill}>{typeLabels[item.type] || item.type}</span>
                        {!item.read_at ? <span className={styles.unreadMark}>Por ler</span> : null}
                      </div>
                      <h3>{item.title}</h3>
                      {item.body ? <p>{item.body}</p> : null}
                      <time dateTime={item.created_at}>{dateLabel(item.created_at)}</time>
                    </div>
                    <div className={styles.actions}>
                      {!item.read_at ? (
                        <form action={markNotificationRead}>
                          <input type="hidden" name="notificationId" value={item.id} />
                          <button className={styles.textAction} type="submit">Marcar como lida</button>
                        </form>
                      ) : null}
                      {item.resource_type === "SERVICE_REQUEST" ? <Link className={styles.textAction} href="/dashboard/servicos">Abrir serviço <span aria-hidden="true">→</span></Link> : null}
                      {item.resource_type === "ORDER" ? <Link className={styles.textAction} href="/dashboard/marketplace?tab=negociacoes">Abrir negociação <span aria-hidden="true">→</span></Link> : null}
                      {resourceLink ? <Link className={styles.textAction} href={resourceLink}>Abrir registo <span aria-hidden="true">→</span></Link> : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <span aria-hidden="true">✓</span>
              <strong>Não existem notificações neste filtro.</strong>
              <p>Quando houver uma actualização relevante, ela aparecerá aqui.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
