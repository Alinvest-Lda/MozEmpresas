import Link from "next/link";
import { signOut } from "@/lib/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { DashboardSidebarNav } from "@/components/dashboard-sidebar-nav";

export async function DashboardSidebar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: platformMember } = user
    ? await supabase.from("platform_members").select("role,active").eq("user_id", user.id).maybeSingle()
    : { data: null };
  const platformAccess = platformMember?.active ? platformMember.role : null;

  return (
    <aside className="dashboard-sidebar">
      <div className="dashboard-brand"><small>Área empresarial</small><strong>MozEmpresas</strong></div>
      <DashboardSidebarNav platformAccess={platformAccess} />
      <div className="dashboard-user">
        <strong>Conta activa</strong>
        <Link className="dashboard-account-link" href="/dashboard/conta">Gerir conta</Link>
        <form action={signOut} className="dashboard-signout-form"><button className="btn header-signout full" type="submit">Sair</button></form>
      </div>
    </aside>
  );
}
