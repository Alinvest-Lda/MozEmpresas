export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { markNotificationRead, markAllNotificationsRead } from "@/lib/notifications/actions";

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("pt-MZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: notifications } = await supabase.from("notifications")
    .select("id,type,title,body,resource_type,resource_id,read_at,created_at")
    .eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);

  const items = notifications ?? [];
  const unread = items.filter((item) => !item.read_at).length;

  return (
    <main className="dashboard-main"><div className="dashboard-content">
      <header className="dashboard-topbar">
        <div className="dashboard-welcome"><span className="dashboard-kicker">Conta</span><h1>Notificações</h1><p>Acompanhe actualizações importantes sobre pedidos e actividade da sua conta.</p></div>
        {unread > 0 && <form action={markAllNotificationsRead}><button className="btn secondary" type="submit">Marcar todas como lidas</button></form>}
      </header>
      <section className="dashboard-section">
        <div className="dashboard-section-head"><div><span className="dashboard-kicker">{unread ? unread + " por ler" : "Tudo em dia"}</span><h2>Centro de notificações</h2></div></div>
        {items.length ? <div className="dashboard-list">
          {items.map((item) => <div key={item.id} className={"notification-item" + (item.read_at ? "" : " unread")}>
            <div><strong>{item.title}</strong>{item.body && <span>{item.body}</span>}<small>{dateLabel(item.created_at)}</small></div>
            {!item.read_at && <form action={markNotificationRead}><input type="hidden" name="notificationId" value={item.id} /><button className="text-link" type="submit">Marcar como lida</button></form>}
            {item.resource_type === "SERVICE_REQUEST" && <Link className="text-link" href="/dashboard/servicos">Ver pedidos →</Link>}
          </div>)}
        </div> : <div className="empty"><div className="empty-icon">✓</div><p>Ainda não tem notificações.</p></div>}
      </section>
    </div></main>
  );
}
