export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PlatformServicesCatalog } from "@/components/platform-services-catalog";
import { getManagedBusinessIds } from "@/lib/businesses/permissions";

function orderStatus(status: string) {
  const map: Record<string, string> = {
    PENDING_PAYMENT: "Pagamento pendente",
    PAID: "Activo",
    IN_PROGRESS: "Em execução",
    COMPLETED: "Concluído",
    CANCELLED: "Cancelado",
    FAILED: "Falhou",
  };
  return map[status] || status;
}

function termLabel(order: { starts_at: string | null; ends_at: string | null; renewal_period: string | null }) {
  if (!order.ends_at) return "Prazo a definir";
  const end = new Date(order.ends_at).toLocaleDateString("pt-MZ");
  if (order.renewal_period === "MONTHLY") return "Mensal · até " + end;
  if (order.renewal_period === "ANNUAL") return "Anual · até " + end;
  return "Até " + end;
}

export default async function ServicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const managedBusinessIds = await getManagedBusinessIds(supabase, user.id);
  const [{ data: serviceRows }, { data: orders }, { data: serviceRequests }] = await Promise.all([
    supabase
      .from("platform_services")
      .select("id,slug,name,description,category,price,currency,billing,default_term_days")
      .eq("active", true)
      .order("category")
      .order("name"),
    managedBusinessIds.length
      ? supabase
          .from("platform_service_orders")
          .select("id,service_id,business_id,status,amount_mzn,currency,starts_at,ends_at,renewal_period,auto_renew,created_at")
          .in("business_id", managedBusinessIds)
          .order("created_at", { ascending: false })
          .limit(8)
      : Promise.resolve({ data: [] as { id: string; service_id: string; business_id: string; status: string; amount_mzn: number; currency: string; starts_at: string | null; ends_at: string | null; renewal_period: string | null; auto_renew: boolean; created_at: string }[] }),
    managedBusinessIds.length
      ? supabase
          .from("service_requests")
          .select("id,service_id,requester_business_id,status,requested_price,currency,notes,created_at,updated_at")
          .or(`requester_user_id.eq.${user.id},requester_business_id.in.(${managedBusinessIds.join(",")})`)
          .order("created_at", { ascending: false })
          .limit(20)
      : supabase
          .from("service_requests")
          .select("id,service_id,requester_business_id,status,requested_price,currency,notes,created_at,updated_at")
          .eq("requester_user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20),
  ]);

  const services = serviceRows ?? [];
  const serviceNames = new Map(services.map((service) => [service.id, service.name]));
  const categories = [...new Set(services.map((service) => service.category))];
  const requestStatusLabels: Record<string, string> = {
    REQUESTED: "Pedido recebido",
    UNDER_REVIEW: "Em análise",
    QUOTED: "Proposta enviada",
    ACCEPTED: "Aceite",
    IN_PROGRESS: "Em execução",
    COMPLETED: "Concluído",
  };

  return (
    <main className="dashboard-main">
      <div className="dashboard-content">
        <header className="dashboard-topbar services-page-hero">
          <div>
            <span className="dashboard-kicker">Serviços MozEmpresas · {services.length} serviços</span>
            <h1>Serviços para executar, acompanhar e repetir.</h1>
            <p>
              Contrate apoio da própria plataforma para operações específicas. Cada serviço apresenta
              claramente o seu prazo ou período de contratação; os serviços recorrentes podem ser renovados.
            </p>
          </div>
          <div className="services-hero-meta">
            <strong>{categories.length}</strong>
            <span>áreas de apoio</span>
          </div>
        </header>

        <div className="services-catalog-surface"><div className="responsive-next-step"><span className="dashboard-kicker">Próxima acção</span><strong>Escolha o apoio que precisa de executar agora.</strong><span>O acompanhamento das contratações fica logo abaixo.</span></div><PlatformServicesCatalog services={services} /></div>

        <section className="dashboard-section service-orders">
          <div className="dashboard-section-head">
            <div>
              <span className="dashboard-kicker">Pedidos personalizados</span>
              <h2>Pedidos em análise</h2>
              <p>Acompanhe os serviços que exigem avaliação de escopo ou proposta antes da contratação.</p>
            </div>
          </div>
          {serviceRequests?.length ? (
            <div className="service-order-list">
              {serviceRequests.map((request) => (
                <article className="service-order-row" key={request.id}>
                  <div>
                    <strong>{serviceNames.get(request.service_id) || "Serviço MozEmpresas"}</strong>
                    <small>Pedido de {new Date(request.created_at).toLocaleDateString("pt-MZ")}</small>
                    {request.notes ? <p>{request.notes}</p> : null}
                    {request.requested_price != null ? <small>Proposta: {Number(request.requested_price).toLocaleString("pt-MZ")} {request.currency || "MZN"}</small> : null}
                  </div>
                  <div className="service-order-meta">
                    <span className={request.status === "COMPLETED" ? "active" : ""}>{requestStatusLabels[request.status] || request.status}</span>
                    <small>Actualizado: {new Date(request.updated_at || request.created_at).toLocaleDateString("pt-MZ")}</small>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="muted">Ainda não submeteu pedidos personalizados de serviço.</p>
          )}
        </section>

        <section className="dashboard-section service-orders">
          <div className="dashboard-section-head">
            <div>
              <span className="dashboard-kicker">Acompanhamento</span>
              <h2>Serviços contratados</h2>
              <p>Consulte prazos, estado e recorrência dos serviços adquiridos pelas suas empresas.</p>
            </div>
          </div>

          {orders?.length ? (
            <div className="service-order-list">
              {orders.map((order) => {
                const serviceName = serviceNames.get(order.service_id) || "Serviço MozEmpresas";
                return (
                  <div className="service-order-row" key={order.id}>
                    <div>
                      <strong>{serviceName}</strong>
                      <small>{termLabel(order)} · {new Date(order.created_at).toLocaleDateString("pt-MZ")}</small>
                    </div>
                    <div className="service-order-meta">
                      <span className={order.status === "PAID" || order.status === "IN_PROGRESS" ? "active" : ""}>
                        {order.auto_renew ? "Recorrência activa" : orderStatus(order.status)}
                      </span>
                      <strong>{Number(order.amount_mzn).toLocaleString("pt-MZ")} {order.currency || "MZN"}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="muted">Ainda não tem serviços contratados. Explore as opções acima para começar.</p>
          )}
        </section>
      </div>
    </main>
  );
}
