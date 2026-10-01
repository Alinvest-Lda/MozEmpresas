export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PlatformServicesCatalog } from "@/components/platform-services-catalog";

export default async function ServicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: serviceRows }, { data: requests }] = await Promise.all([
    supabase.from("platform_services").select("id,slug,name,description,category,price,currency,billing").eq("active", true).order("category").order("name"),
    supabase.from("service_requests").select("id,service_id,status,requested_price,currency,notes,created_at").eq("requester_user_id", user.id).order("created_at", { ascending: false }).limit(8),
  ]);
  const services = serviceRows ?? [];
  const categories = [...new Set(services.map(service => service.category))];
  return <main className="dashboard-main"><div className="dashboard-content">
    <header className="dashboard-topbar services-page-hero"><div><span className="dashboard-kicker">Serviços MozEmpresas · {services.length} serviços</span><h1>Serviços que resolvem operações específicas.</h1><p>São serviços prestados pela própria plataforma para apoiar a sua empresa. A presença no Directório e no Marketplace continua gratuita; aqui encontra apoio adicional quando precisar.</p></div><div className="services-hero-meta"><strong>{categories.length}</strong><span>áreas de apoio</span></div></header>
    <PlatformServicesCatalog services={services} />
    <section className="dashboard-section service-requests"><div className="dashboard-section-head"><div><span className="dashboard-kicker">Acompanhamento</span><h2>Os seus pedidos</h2><p>Veja o que já solicitou e em que estado se encontra.</p></div></div>{requests?.length?requests.map(r=><div className="service-request-row" key={r.id}><div><strong>{services.find(s=>s.id===r.service_id)?.name||"Serviço MozEmpresas"}</strong><small>{new Date(r.created_at).toLocaleDateString("pt-MZ")} · {r.notes||"Pedido submetido"}</small></div><span>{r.status}</span></div>):<p className="muted">Ainda não tem pedidos. Escolha um serviço acima para iniciar.</p>}</section>
  </div></main>;
}