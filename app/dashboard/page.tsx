import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/auth/actions";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: profile }, { data: businesses }] = await Promise.all([
    supabase.from("profiles").select("full_name, location").eq("id", user.id).maybeSingle(),
    supabase.from("businesses").select("id, name, slug, location, is_public").eq("owner_id", user.id).order("created_at", { ascending: false }),
  ]);
  const name = profile?.full_name || user.email || "Utilizador";
  return <div className="dashboard"><aside className="sidebar"><strong>Área de gestão</strong><div style={{ marginTop: 18 }}><Link href="/dashboard">Visão geral</Link><Link href="/empresas">Diretório</Link><Link href="/dashboard/empresas">Minhas empresas</Link><Link href="/marketplace">Marketplace</Link><Link href="/concursos">Candidaturas</Link><Link href="/repositorio">Documentos</Link></div><form action={signOut} style={{ marginTop: 24 }}><button className="btn ghost full">Sair</button></form></aside><section className="dash-main"><span className="eyebrow">Dashboard</span><h1 style={{ fontSize: 40, letterSpacing: "-.05em", margin: "14px 0 8px" }}>Olá, {name}</h1><p className="muted">A sua conta está ligada ao Supabase e os dados abaixo são reais.</p><div className="metric-grid"><div className="metric"><span className="muted">Perfil</span><strong>{profile ? "Completo" : "Pendente"}</strong></div><div className="metric"><span className="muted">Empresas</span><strong>{businesses?.length ?? 0}</strong></div><div className="metric"><span className="muted">Anúncios</span><strong>0</strong></div><div className="metric"><span className="muted">Candidaturas</span><strong>0</strong></div></div><div className="notice" style={{ marginTop: 24 }}><strong>Próximo passo:</strong> crie o perfil público da sua empresa para aparecer no diretório.</div></section></div>;
}