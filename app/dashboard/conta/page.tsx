export const dynamic="force-dynamic";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AccountStatusForm, ProfileForm, PasswordForm } from "@/components/account-forms";

const labels={ACTIVE:"Activa",INACTIVE:"Inactiva",DELETED:"Eliminação solicitada"} as const;

export default async function AccountPage({searchParams}:{searchParams?:Promise<{view?:string}>}){ const params=await searchParams; const view=params?.view==="estado"?"estado":"perfil";
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)redirect("/login");
 const {data:profile}=await supabase.from("profiles").select("full_name,location,website,bio,account_status").eq("id",user.id).maybeSingle();
 const status=(profile?.account_status||"ACTIVE") as keyof typeof labels; const name=profile?.full_name||user.email?.split("@")[0]||"Utilizador";
 const initials=name.split(/\s+/).filter(Boolean).slice(0,2).map((p:string)=>p[0]).join("").toUpperCase();
 return <main className="dashboard-main"><div className="dashboard-content account-page">
  <header className="account-hero"><div className="account-hero-main"><span className="account-section-label">Conta pessoal</span><h1>A minha conta</h1><p>Identidade, segurança e estado da sua conta num único espaço.</p></div><aside className="account-identity-card"><div className="account-avatar">{initials||"U"}</div><strong>{name}</strong><span>{user.email}</span><span className={"account-status-badge "+status.toLowerCase()}>{labels[status]}</span></aside></header>
  <nav className="commerce-nav" aria-label="Gestão da conta"><Link href="/dashboard/conta" className={view==="perfil"?"active":""}>Perfil e segurança</Link><Link href="/dashboard/conta?view=estado" className={view==="estado"?"active":""}>Estado da conta</Link><Link href="/dashboard/suporte">Central de suporte</Link></nav>
  {view==="perfil" && <div className="account-layout"><section className="account-panel"><div className="account-panel-head"><div><span className="account-section-label">Perfil</span><h2>Dados pessoais</h2><p>Informação usada para identificar a pessoa por trás da conta.</p></div></div><div className="account-email"><span>Email de acesso</span><strong>{user.email}</strong><small>Este é o email associado à autenticação da conta.</small></div><ProfileForm initial={{fullName:name,location:profile?.location||"",website:profile?.website||"",bio:profile?.bio||""}}/></section>
  <section className="account-panel"><div className="account-panel-head"><div><span className="account-section-label">Segurança</span><h2>Acesso e segurança</h2><p>Mantenha as credenciais sob controlo.</p></div></div><div className="account-security-card"><h3>Alterar password</h3><p>Actualize a password sempre que necessário.</p><PasswordForm/></div></section></div>}
  {view==="estado" && <section className="account-panel account-status-panel"><div className="account-panel-head"><div><span className="account-section-label">Estado</span><h2>Estado da conta</h2><p>Pode desactivar a conta ou solicitar a sua eliminação. O pedido bloqueia o acesso, mas não elimina automaticamente o registo de autenticação.</p></div></div><div className="account-status-actions"><div><strong>Estado actual: {labels[status]}</strong><p>Desactivar impede a utilização normal da conta. O pedido de eliminação marca a conta para encerramento; a remoção definitiva dos dados e da conta de autenticação exige um processo próprio.</p></div><AccountStatusForm status={status} /></div></section>
 </div></main>;
}