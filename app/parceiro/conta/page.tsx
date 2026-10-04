export const dynamic="force-dynamic";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export default async function PartnerAccountPage(){
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)redirect("/login");
 const {data:profile}=await supabase.from("profiles").select("full_name,account_status,user_type").eq("id",user.id).maybeSingle();
 return <main className="partner-main"><div className="partner-content"><header className="partner-page-head"><span className="partner-kicker">Identidade</span><h1>Conta do parceiro</h1><p>Esta conta está configurada como parceiro do ecossistema MozEmpresas.</p></header><section className="partner-section partner-account-card"><div><span>Tipo de utilizador</span><strong>Parceiro</strong></div><div><span>Email</span><strong>{user.email}</strong></div><div><span>Nome</span><strong>{profile?.full_name||"Por definir"}</strong></div><div><span>Estado</span><strong>{profile?.account_status||"ACTIVE"}</strong></div></section></div></main>;
}