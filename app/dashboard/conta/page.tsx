export const dynamic="force-dynamic";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm, PasswordForm } from "@/components/account-forms";
import { updateAccountStatus } from "@/lib/account/actions";

const labels={ACTIVE:"Activa",INACTIVE:"Inactiva",DELETED:"Eliminação solicitada"} as const;

export default async function AccountPage(){
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)redirect("/login");
 const {data:profile}=await supabase.from("profiles").select("full_name,location,website,bio,account_status").eq("id",user.id).maybeSingle();
 const status=(profile?.account_status||"ACTIVE") as keyof typeof labels; const name=profile?.full_name||user.email?.split("@")[0]||"Utilizador";
 const initials=name.split(/\s+/).filter(Boolean).slice(0,2).map((p:string)=>p[0]).join("").toUpperCase();
 return <main className="dashboard-main"><div className="dashboard-content account-page">
  <header className="account-hero"><div className="account-hero-main"><span className="account-section-label">Conta pessoal</span><h1>A minha conta</h1><p>Identidade, segurança e estado da sua conta num único espaço.</p></div><aside className="account-identity-card"><div className="account-avatar">{initials||"U"}</div><strong>{name}</strong><span>{user.email}</span><span className={"account-status-badge "+status.toLowerCase()}>{labels[status]}</span></aside></header>
  <nav className="commerce-nav" aria-label="Gestão da conta"><Link href="/dashboard/conta" className="active">Perfil e segurança</Link><Link href="/dashboard/conta?view=estado">Estado da conta</Link><Link href="/dashboard/suporte">Central de suporte</Link></nav>
  <div className="account-layout"><section className="account-panel"><div className="account-panel-head"><div><span className="account-section-label">Perfil</span><h2>Dados pessoais</h2><p>Informação usada para identificar a pessoa por trás da conta.</p></div></div><div className="account-email"><span>Email de acesso</span><strong>{user.email}</strong><small>Este é o email associado à autenticação da conta.</small></div><ProfileForm initial={{fullName:name,location:profile?.location||"",website:profile?.website||"",bio:profile?.bio||""}}/></section>
  <section className="account-panel"><div className="account-panel-head"><div><span className="account-section-label">Segurança</span><h2>Acesso e segurança</h2><p>Mantenha as credenciais sob controlo.</p></div></div><div className="account-security-card"><h3>Alterar password</h3><p>Actualize a password sempre que necessário.</p><PasswordForm/></div></section></div>
  <section className="account-panel account-status-panel"><div className="account-panel-head"><div><span className="account-section-label">Estado</span><h2>Estado da conta</h2><p>A conta pode ser activada, desactivada ou marcada para eliminação.</p></div></div><div className="account-status-actions"><div><strong>Estado actual: {labels[status]}</strong><p>Desactivar impede a utilização normal da conta. A eliminação é uma acção distinta e deve ser tratada como encerramento definitivo.</p></div><div className="account-status-buttons"><form action={updateAccountStatus}><input type="hidden" name="status" value="ACTIVE"/><button className="btn" type="submit">Activar</button></form><form action={updateAccountStatus}><input type="hidden" name="status" value="INACTIVE"/><button className="btn" type="submit">Desactivar</button></form><form action={updateAccountStatus}><input type="hidden" name="status" value="DELETED"/><button className="btn danger" type="submit">Eliminar conta</button></form></div></div></section>
 </div></main>;
}