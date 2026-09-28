export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export default async function RecommendationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: businesses }, { data: listings }, { data: opportunities }] = await Promise.all([
    supabase.from("businesses").select("id,name,slug,location,description").eq("is_public", true).neq("owner_id", user.id).order("created_at", { ascending: false }).limit(6),
    supabase.from("listings").select("id,title,description,price,currency").neq("owner_id", user.id).order("created_at", { ascending: false }).limit(6),
    supabase.from("opportunities").select("id,title,description").neq("owner_id", user.id).order("created_at", { ascending: false }).limit(4),
  ]);

  return <main className="dashboard-main"><div className="dashboard-content">
    <header className="dashboard-topbar"><div><span className="dashboard-kicker">Descoberta inteligente</span><h1>Recomendações</h1><p>Uma área de descoberta baseada no que pode ser relevante para a actividade da sua empresa — não apenas mais uma lista de produtos.</p></div><Link href="/marketplace" className="btn">Explorar mercado</Link></header>
    <section className="recommendation-hero"><div><span>PARA A SUA EMPRESA</span><h2>Descubra empresas, ofertas e oportunidades relacionadas.</h2><p>Use as recomendações para encontrar novas relações comerciais, fornecedores e possibilidades de negócio.</p></div><Link href="/empresas" className="btn primary">Explorar empresas</Link></section>
    <div className="recommendation-columns">
      <section className="dashboard-section"><div className="dashboard-section-head"><div><span className="dashboard-kicker">Relações</span><h2>Empresas a conhecer</h2></div><Link href="/empresas" className="text-link">Ver directório →</Link></div><div className="recommendation-list">{(businesses ?? []).map(b => <Link href={"/empresas/"+b.slug} key={b.id}><strong>{b.name}</strong><span>{b.location || "Moçambique"}</span><small>{b.description || "Perfil empresarial disponível no directório."}</small><b>→</b></Link>)}</div></section>
      <section className="dashboard-section"><div className="dashboard-section-head"><div><span className="dashboard-kicker">Oportunidades</span><h2>Actividade para explorar</h2></div><Link href="/oportunidades" className="text-link">Ver oportunidades →</Link></div><div className="recommendation-list">{(opportunities ?? []).map(o => <Link href={"/oportunidades/"+o.id} key={o.id}><strong>{o.title}</strong><small>{o.description || "Veja os detalhes e condições."}</small><b>→</b></Link>)}</div></section>
    </div>
    <section className="dashboard-section"><div className="dashboard-section-head"><div><span className="dashboard-kicker">Ofertas</span><h2>Produtos e serviços que podem interessar</h2></div><Link href="/marketplace" className="text-link">Ver mercado →</Link></div><div className="recommendation-offers">{(listings ?? []).map(l => <Link href={"/marketplace/"+l.id} key={l.id}><strong>{l.title}</strong><span>{l.price != null ? l.price+" "+l.currency : "Sob consulta"}</span><small>{l.description || "Oferta publicada no mercado."}</small></Link>)}</div></section>
  </div></main>;
}
;