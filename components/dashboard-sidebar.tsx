import Link from "next/link";
import { signOut } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { DashboardSidebarNav } from "@/components/dashboard-sidebar-nav";
import { DashboardMobileMenu } from "@/components/dashboard-mobile-menu";

export async function DashboardSidebar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: platformMember } = user
    ? await supabase.from("platform_members").select("role,active").eq("user_id", user.id).maybeSingle()
    : { data: null };
  const platformAccess = platformMember?.active ? platformMember.role : null;
  const { count: unreadNotifications } = user
    ? await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null)
    : { count: 0 };

  return (
    <>
      <DashboardMobileMenu platformAccess={platformAccess} unreadNotifications={unreadNotifications ?? 0} />
      <aside className="dashboard-sidebar">
      <div className="dashboard-brand"><small>Área empresarial</small><strong>MozEmpresas</strong></div>
      <DashboardSidebarNav platformAccess={platformAccess} unreadNotifications={unreadNotifications ?? 0} />
      <div className="dashboard-user">
        <Link className="dashboard-account-link" href="/dashboard/conta">A minha conta</Link>
        <form action={signOut} className="dashboard-signout-form"><button className="btn header-signout full" type="submit">Sair</button></form>
      </div>
      </aside>
    </>
  );
}
