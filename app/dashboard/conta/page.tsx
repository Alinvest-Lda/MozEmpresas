export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccountStatusForm, ProfileForm, PasswordForm } from "@/components/account-forms";
import styles from "./conta.module.css";

const labels = { ACTIVE: "Activa", INACTIVE: "Inactiva", DELETED: "Eliminação solicitada" } as const;

export default async function AccountPage({ searchParams }: { searchParams?: Promise<{ view?: string; inactive?: string }> }) {
  const params = await searchParams;
  const view = params?.view === "estado" ? "estado" : "perfil";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("profiles").select("full_name,location,website,bio,account_status").eq("id", user.id).maybeSingle();
  const status = (profile?.account_status || "ACTIVE") as keyof typeof labels;
  const name = profile?.full_name || user.email?.split("@")[0] || "Utilizador";
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part: string) => part[0]).join("").toUpperCase();

  return <main className={`dashboard-main ${styles.page}`}><div className={`dashboard-content ${styles.content}`}>
    <header className={styles.hero}>
      <div className={styles.heroCopy}><span className={styles.eyebrow}>Definições pessoais</span><h1>Conta e segurança</h1><p>Gira os seus dados pessoais, proteja o acesso e acompanhe o estado da sua conta num só lugar.</p></div>
      <aside className={styles.identity}><div className={styles.avatar}>{initials || "U"}</div><div className={styles.identityText}><strong>{name}</strong><span>{user.email}</span><span className={`${styles.status} ${styles[status.toLowerCase()] || ""}`}>{labels[status]}</span></div></aside>
    </header>
    {params?.inactive === "1" && <p className={styles.notice} role="status">A sua conta está desactivada. Pode rever o estado nesta página; as restantes áreas continuam bloqueadas até a conta voltar a estar activa.</p>}
    <nav className={styles.nav} aria-label="Definições da conta">
      <Link href="/dashboard/conta" className={view === "perfil" ? styles.active : ""}>Perfil e segurança</Link>
      <Link href="/dashboard/conta?view=estado" className={view === "estado" ? styles.active : ""}>Estado da conta</Link>
      <Link href="/dashboard/suporte">Central de suporte <span aria-hidden="true">↗</span></Link>
    </nav>
    {view === "perfil" ? <div className={styles.layout}>
      <section className={styles.panel}><div className={styles.panelHead}><span className={styles.sectionLabel}>Perfil pessoal</span><h2>Os seus dados</h2><p>Mantenha a informação de identificação actualizada para melhorar a sua experiência no MozEmpresas.</p></div>
        <div className={styles.emailBox}><span className={styles.emailIcon} aria-hidden="true">@</span><div><small>Email de acesso</small><strong>{user.email}</strong><p>O email usado para iniciar sessão. Para alterar este endereço, contacte o suporte.</p></div></div>
        <ProfileForm initial={{ fullName: name, location: profile?.location || "", website: profile?.website || "", bio: profile?.bio || "" }} />
      </section>
      <div className={styles.securityColumn}>
        <section className={styles.panel}><div className={styles.panelHead}><span className={styles.sectionLabel}>Protecção da conta</span><h2>Acesso e segurança</h2><p>Boas práticas para manter a sua conta protegida.</p></div>
          <div className={styles.securityItem}><span className={styles.securityIcon} aria-hidden="true">✓</span><div><strong>Password da conta</strong><p>Use uma password exclusiva com pelo menos 8 caracteres e não a partilhe com outras pessoas.</p></div></div>
          <div className={styles.securityItem}><span className={styles.securityIcon} aria-hidden="true">✉</span><div><strong>Email de acesso</strong><p>Confirme que tem acesso à caixa de correio associada à conta.</p></div></div>
          <div className={styles.securityItem}><span className={styles.securityIcon} aria-hidden="true">⌁</span><div><strong>Utilização segura</strong><p>Termine a sessão em dispositivos partilhados e evite reutilizar passwords.</p></div></div>
        </section>
        <section className={styles.panel}><div className={styles.panelHead}><span className={styles.sectionLabel}>Credenciais</span><h2>Alterar password</h2><p>Escolha uma password forte e confirme-a antes de guardar.</p></div><PasswordForm /></section>
      </div>
    </div> : <section className={`${styles.panel} ${styles.statusPanel}`}>
      <div className={styles.panelHead}><span className={styles.sectionLabel}>Controlo da conta</span><h2>Estado da conta</h2><p>Consulte o estado actual ou escolha uma acção. O pedido de eliminação não apaga imediatamente os dados nem a conta de autenticação.</p></div>
      <div className={styles.currentStatus}><div className={styles.statusSymbol} aria-hidden="true">{status === "ACTIVE" ? "✓" : "!"}</div><div><small>Estado actual</small><strong>{labels[status]}</strong><p>{status === "ACTIVE" ? "A conta está activa e pode utilizar as áreas disponíveis." : status === "INACTIVE" ? "A conta está desactivada e o acesso às áreas normais está bloqueado." : "Foi solicitado o encerramento da conta. Contacte o suporte para rever este estado."}</p></div></div>
      <div className={styles.statusActions}><div><strong>Gerir estado</strong><p>Desactivar a conta interrompe a utilização normal. A eliminação exige um processo próprio de revisão e remoção.</p></div><AccountStatusForm status={status} /></div>
    </section>}
  </div></main>;
}
