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
  const initials = name.split(/\s+/).filter(Boolean).slice(0,2).map((part: string) => part[0]).join("").toUpperCase();

  return <div className="dashboard-shell">
    <DashboardSidebar pathname="/dashboard/conta" />
    <main className="dashboard-main">
      <div className="dashboard-content account-page">
        <header className="account-hero">
          <div className="account-hero-main">
            <span className="account-section-label">Conta pessoal</span>
            <h1>A minha conta</h1>
            <p>Um único espaço para gerir a sua identidade, os dados que apresenta aos outros utilizadores e a segurança do seu acesso. A presença das empresas que representa é gerida separadamente.</p>
          </div>
          <aside className="account-identity-card">
            <div className="account-avatar">{initials || "U"}</div>
            <strong>{name}</strong>
            <span>{user.email}</span>
          </aside>
        </header>

        <div className="account-layout">
          <section className="account-panel">
            <div className="account-panel-head">
              <div>
                <span className="account-section-label">Perfil</span>
                <h2>Dados pessoais</h2>
                <p>Informação usada para identificar a pessoa por trás da conta.</p>
              </div>
            </div>
            <div className="account-email">
              <span>Email de acesso</span>
              <strong>{user.email}</strong>
              <small>Este é o email associado à autenticação da conta.</small>
            </div>
            <ProfileForm initial={{fullName:name,location:profile?.location || "",website:profile?.website || "",bio:profile?.bio || ""}} />
          </section>

          <div>
            <section className="account-panel">
              <div className="account-panel-head">
                <div>
                  <span className="account-section-label">Segurança</span>
                  <h2>Acesso e segurança</h2>
                  <p>Mantenha as credenciais da sua conta sob controlo.</p>
                </div>
              </div>
              <div className="account-security-stack">
                <div className="account-security-item">
                  <div><strong>Email de acesso</strong><p>Usado para entrar e recuperar o acesso à conta.</p></div>
                  <span className="account-security-mark">✓</span>
                </div>
                <div className="account-security-item">
                  <div><strong>Password</strong><p>Actualize-a periodicamente ou sempre que suspeitar de acesso indevido.</p></div>
                  <span className="account-security-mark">•</span>
                </div>
              </div>
              <div className="account-security-card">
                <h3>Alterar password</h3>
                <p>Escolha uma password com pelo menos 8 caracteres e confirme-a antes de guardar.</p>
                <PasswordForm />
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  </div>;
}
