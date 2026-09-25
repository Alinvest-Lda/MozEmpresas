import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/auth/actions";

export default async function Dashboard() {
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)redirect("/login");
  const [{data:profile},{data:businesses},{data:listings},{data:opportunities},{data:applications}]=await Promise.all([
    supabase.from("profiles").select("full_name,location,website,bio").eq("id",user.id).maybeSingle(),
    supabase.from("businesses").select("id,name,slug,location,is_public").eq("owner_id",user.id).order("created_at",{ascending:false}),
    supabase.from("listings").select("id").eq("owner_id",user.id),
    supabase.from("opportunities").select("id").eq("owner_id",user.id),
    supabase.from("opportunity_applications").select("id").eq("applicant_id",user.id)
  ]);
  const name=profile?.full_name||user.email||"Utilizador";
  return <div className="dashboard"><aside className="sidebar"><strong>Área de gestão</strong><div style={{marginTop:18}}><Link href="/dashboard">Visão geral</Link><Link href="/dashboard/empresas">Minhas empresas</Link><Link href="/empresas">Directório</Link><Link href="/marketplace">Marketplace</Link><Link href="/concursos">Concursos</Link><Link href="/oportunidades">Oportunidades</Link><Link href="/repositorio">Repositório</Link></div><form action={signOut} style={{marginTop:24}}><button className="btn full">Sair</button></form></aside>
  <section className="dash-main"><div className="dashboard-top"><div><span className="eyebrow">Área de gestão</span><h1>Olá, {name}</h1><p className="muted">Gira a presença da sua empresa e acompanhe a sua actividade no MozEmpresas.</p></div><Link href="/dashboard/empresas" className="btn primary">Gerir empresas</Link></div>
    <div className="metric-grid"><div className="metric"><span className="muted">Empresas</span><strong>{businesses?.length??0}</strong><small>Perfis associados</small></div><div className="metric"><span className="muted">Ofertas</span><strong>{listings?.length??0}</strong><small>Produtos e serviços</small></div><div className="metric"><span className="muted">Oportunidades</span><strong>{opportunities?.length??0}</strong><small>Publicadas ou em gestão</small></div><div className="metric"><span className="muted">Candidaturas</span><strong>{applications?.length??0}</strong><small>Participações</small></div></div>
    <div className="dashboard-grid"><section className="card"><span className="eyebrow">Presença empresarial</span><h2 style={{marginTop:12}}>As suas empresas</h2>{businesses?.length?<div className="dashboard-list">{businesses.slice(0,5).map(b=><Link href={"/empresas/"+b.slug} key={b.id}><strong>{b.name}</strong><span>{b.location||"Sem localização"} · {b.is_public?"Público":"Privado"}</span><b>→</b></Link>)}</div>:<><p className="muted">Ainda não existe um perfil empresarial associado à sua conta.</p><Link href="/dashboard/empresas" className="btn primary">Criar empresa</Link></>}</section>
    <section className="card"><span className="eyebrow">Próximos passos</span><h2 style={{marginTop:12}}>Construa a sua presença</h2><div className="next-steps"><Link href="/dashboard/empresas"><span>01</span><div><strong>Complete o perfil empresarial</strong><small>Apresente actividade, localização e contactos.</small></div>→</Link><Link href="/marketplace"><span>02</span><div><strong>Publique uma oferta</strong><small>Mostre produtos e serviços ao mercado.</small></div>→</Link><Link href="/oportunidades"><span>03</span><div><strong>Explore oportunidades</strong><small>Encontre concursos, parcerias e necessidades.</small></div>→</Link></div></section></div>
  </section></div>;
}