export const dynamic="force-dynamic";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export default async function PartnerAccountPage(){
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)redirect("/login");
 const {data:profile}=await supabase.from("profiles").select("full_name,account_status,user_type").eq("id",user.id).maybeSingle();
 const name=profile?.full_name||user.email?.split("@")[0]||"Parceiro"; const initials=name.split(/\s+/).filter(Boolean).slice(0,2).map(p=>p[0]).join("").toUpperCase();
 return <main className="dashboard-main partner-main"><div className="dashboard-content partner-content account-page">
  <header className="account-hero"><div className="account-hero-main"><span className="account-section-label">Conta de parceiro</span><h1>A minha conta</h1><p>Identidade, acesso e estado da sua conta dentro do ecossistema MozEmpresas.</p></div><aside className="account-identity-card"><div className="account-avatar">{initials||"P"}</div><strong>{name}</strong><span>{user.email}</span><span className={"account-status-badge "+(profile?.account_status||"ACTIVE").toLowerCase()}>{profile?.account_status||"ACTIVE"}</span></aside></header>
  <nav className="commerce-nav" aria-label="Gestão da conta"><a className="active" href="/parceiro/conta">Perfil e acesso</a></nav>
  <section className="account-panel"><div className="account-panel-head"><div><span className="account-section-label">Identidade</span><h2>Dados da conta</h2><p>Informação associada ao acesso de parceiro atribuído à sua conta.</p></div></div>
   <div className="account-email"><span>Email de acesso</span><strong>{user.email}</strong><small>Este é o email associado à autenticação da conta.</small></div>
   <div className="account-status-actions"><div><strong>Tipo de utilizador: Parceiro</strong><p>Acesso atribuído pela administração da plataforma. O estado actual é <b>{profile?.account_status||"ACTIVE"}</b>.</p></div></div>
  </section>
 </div></main>;
}