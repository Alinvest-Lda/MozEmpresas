export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
    <header className="dashboard-topbar"><div><span className="dashboard-kicker">Serviços MozEmpresas · {services.length} serviços</span><h1>Serviços para a sua empresa</h1><p>São serviços prestados pela própria plataforma para apoiar operações específicas da sua empresa. Não são espaços publicitários e não substituem a presença gratuita no Directório e no Marketplace.</p></div></header>
    <section className="service-hub-intro"><div><span className="dashboard-kicker">Serviços da plataforma</span><h2>Escolha o serviço de que precisa.</h2><p>Envie um pedido, acompanhe o estado e mantenha o histórico no mesmo espaço.</p></div><div className="service-hub-meta"><strong>{services.length}</strong><span>serviços disponíveis</span><small>{categories.length} áreas de apoio</small></div></section>
    <div className="platform-service-grid">{services.map(service => <article className="platform-service-card" key={service.id}><span className="dashboard-kicker">{service.category}</span><h2>{service.name}</h2><p>{service.description}</p><div className="platform-service-footer"><strong>{service.price != null ? service.price + " " + service.currency : "Sob consulta"}</strong><Link href={"/dashboard/servicos/" + service.slug} className="btn primary">Conhecer e solicitar</Link></div></article>)}</div>
    <section className="dashboard-section service-requests"><div className="dashboard-section-head"><div><span className="dashboard-kicker">Acompanhamento</span><h2>Os seus pedidos</h2><p>Veja o que já solicitou e em que estado se encontra.</p></div></div>{requests?.length ? requests.map(r => <div className="service-request-row" key={r.id}><div><strong>{services.find(s => s.id === r.service_id)?.name || "Serviço MozEmpresas"}</strong><small>{new Date(r.created_at).toLocaleDateString("pt-MZ")} · {r.notes || "Pedido submetido"}</small></div><span>{r.status}</span></div>) : <p className="muted">Ainda não tem pedidos. Escolha um serviço acima para iniciar.</p>}</section>
  </div></main>;
}
