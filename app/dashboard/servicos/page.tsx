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
  const [{ data: serviceRows }, { data: orders }] = await Promise.all([
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
  ]);

  const services = serviceRows ?? [];
  const serviceNames = new Map(services.map((service) => [service.id, service.name]));
  const categories = [...new Set(services.map((service) => service.category))];

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

        <section className="services-primary-action"><div><span className="dashboard-kicker">Próxima acção</span><h2>Escolha o apoio que precisa de executar agora.</h2><p>Veja primeiro os serviços disponíveis; o acompanhamento das contratações fica logo abaixo.</p></div></section><div className="services-catalog-surface"><PlatformServicesCatalog services={services} /></div>

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
