export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ServicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: services } = await supabase.from("platform_services").select("id,slug,name,description,category,price,currency,billing").eq("active",true).order("category").order("name");

  return <div className="dashboard-shell"><aside className="dashboard-sidebar">
    <div className="dashboard-brand"><small>Área empresarial</small><strong>MozEmpresas</strong></div>
    <div className="dashboard-nav-group"><span>Principal</span><Link className="dashboard-nav-link" href="/dashboard"><i className="nav-dot"/>Visão geral</Link><Link className="dashboard-nav-link active" href="/dashboard/servicos"><i className="nav-dot"/>Serviços MozEmpresas</Link><Link className="dashboard-nav-link" href="/marketplace"><i className="nav-dot"/>Comprar e vender</Link><Link className="dashboard-nav-link" href="/concursos"><i className="nav-dot"/>Concursos</Link><Link className="dashboard-nav-link" href="/oportunidades"><i className="nav-dot"/>Oportunidades</Link></div>
    <div className="dashboard-nav-group"><span>Empresa</span><Link className="dashboard-nav-link" href="/dashboard/empresas"><i className="nav-dot"/>Presença da empresa</Link><Link className="dashboard-nav-link" href="/dashboard/acessos"><i className="nav-dot"/>Acessos e equipa</Link></div>
  </aside><main className="dashboard-main"><div className="dashboard-content">
    <div className="dashboard-topbar"><div><span className="dashboard-kicker">Serviços do ecossistema</span><h1>Serviços para a sua empresa</h1><p>Além de comprar de outras empresas, a sua conta pode contratar serviços disponibilizados pelo próprio MozEmpresas.</p></div><Link href="/dashboard" className="btn">Voltar ao painel</Link></div>
    <div className="platform-service-grid">{(services ?? []).map((service)=><article className="platform-service-card" key={service.id}><span className="dashboard-kicker">{service.category}</span><h2>{service.name}</h2><p>{service.description}</p><div className="platform-service-footer"><strong>{service.price != null ? service.price+" "+service.currency : "Sob consulta"}</strong><Link href={"/dashboard/servicos/"+service.slug} className="btn primary">Ver serviço</Link></div></article>)}</div>
  </div></main></div>;
}
