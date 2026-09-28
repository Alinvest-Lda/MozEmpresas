export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: member } = await supabase.from("platform_members").select("role,active").eq("user_id", user.id).maybeSingle();
  if (!member?.active) redirect("/dashboard");

  const [{ count: businesses }, { count: users }, { count: listings }, { count: opportunities }] = await Promise.all([
    supabase.from("businesses").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("listings").select("id", { count: "exact", head: true }),
    supabase.from("opportunities").select("id", { count: "exact", head: true }),
  ]);

  return <main className="dashboard-main"><div className="dashboard-content">
    <div className="page-header">
      <span className="eyebrow">Administração MozEmpresas</span>
      <h1>Painel da plataforma</h1>
      <p className="muted">Gestão central da plataforma, separada dos espaços empresariais.</p>
    </div>
    <div className="grid">
      <div className="card"><span className="muted">Empresas</span><h2>{businesses ?? 0}</h2><p>Presenças registadas.</p></div>
      <div className="card"><span className="muted">Utilizadores</span><h2>{users ?? 0}</h2><p>Contas na plataforma.</p></div>
      <div className="card"><span className="muted">Ofertas</span><h2>{listings ?? 0}</h2><p>Produtos e serviços publicados.</p></div>
      <div className="card"><span className="muted">Oportunidades</span><h2>{opportunities ?? 0}</h2><p>Oportunidades registadas.</p></div>
    </div>
    <section className="card" style={{marginTop:18}}>
      <span className="eyebrow">Operação</span><h2 style={{marginTop:10}}>Áreas de administração</h2>
      <div className="grid" style={{marginTop:18}}>
        {["Utilizadores e acessos","Empresas e validação","Produtos e serviços","Concursos","Oportunidades","Parceiros","Publicidade","Relatórios"].map((item)=><div className="card" key={item}><strong>{item}</strong><p style={{marginTop:6}}>Módulo preparado para evolução.</p></div>)}
      </div>
    </section>
    <Link href="/dashboard" className="text-link" style={{display:"inline-block",marginTop:20}}>← Voltar ao painel empresarial</Link>
  </div></main>;
}
;