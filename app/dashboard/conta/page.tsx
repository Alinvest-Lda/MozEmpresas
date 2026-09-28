export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { ProfileForm, PasswordForm } from "@/components/account-forms";

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("full_name,location,website,bio").eq("id", user.id).maybeSingle();
  const name = profile?.full_name || user.email?.split("@")[0] || "Utilizador";

  return <div className="dashboard-shell"><DashboardSidebar pathname="/dashboard/conta" /><main className="dashboard-main"><div className="dashboard-content">
    <header className="dashboard-topbar"><div><span className="dashboard-kicker">Conta</span><h1>A minha conta</h1><p>Gira os seus dados pessoais e as credenciais de acesso. As empresas que representa são geridas separadamente.</p></div></header>
    <div className="account-layout">
      <section className="dashboard-section"><span className="dashboard-kicker">Dados pessoais</span><h2>Perfil do utilizador</h2><p className="muted">Estes dados identificam a pessoa que acede à plataforma.</p><div className="account-email"><span>Email de acesso</span><strong>{user.email}</strong><small>O email actual é a credencial da sua conta.</small></div><ProfileForm initial={{fullName:name,location:profile?.location || "",website:profile?.website || "",bio:profile?.bio || ""}} /></section>
      <section className="dashboard-section"><span className="dashboard-kicker">Segurança</span><h2>Acesso à conta</h2><p className="muted">Altere a sua password sempre que precisar.</p><PasswordForm /></section>
    </div>
  </div></main></div>;
}
