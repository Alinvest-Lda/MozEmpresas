export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PlatformServiceRequestForm } from "@/components/platform-service-request-form";

type Service = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  price: number | string | null;
  currency: string | null;
  billing: string | null;
};

const categoryIntro: Record<string, string> = {
  Presença: "Uma presença empresarial clara começa pela informação certa, organizada para quem procura fornecedores e parceiros.",
  Contratação: "Estruture processos de procura e contratação com informação organizada e um ponto de partida claro.",
  Inteligência: "Transforme informação empresarial em pesquisa, monitoria e sinais que apoiam decisões comerciais.",
  Publicidade: "Use os espaços do ecossistema MozEmpresas para colocar a sua empresa ou campanha diante do público certo.",
  Visibilidade: "Aumente a exposição da sua empresa nos espaços de descoberta do Directório MozEmpresas.",
};

const serviceDetails: Record<string, { includes: string[]; steps: string[] }> = {
  "presenca-profissional": {
    includes: ["Configuração do perfil público", "Organização das informações comerciais", "Revisão da apresentação da empresa", "Orientação para melhorar a presença no Directório"],
    steps: ["Envia os dados e contexto da empresa", "A equipa estrutura e configura a presença", "Recebe o resultado para validação"],
  },
  "diagnostico-presenca-empresarial": {
    includes: ["Análise do perfil empresarial", "Identificação de lacunas de informação", "Revisão da apresentação comercial", "Recomendações práticas de melhoria"],
    steps: ["Analisamos a presença existente", "Mapeamos pontos de melhoria", "Entregamos o diagnóstico estruturado"],
  },
  "catalogo-produtos-servicos": {
    includes: ["Organização de produtos e serviços", "Estruturação por categorias", "Revisão da informação comercial", "Preparação para apresentação no Directório"],
    steps: ["Recolhemos o catálogo actual", "Estruturamos produtos e serviços", "Configuramos a apresentação na plataforma"],
  },
  "pesquisa-fornecedores": {
    includes: ["Definição dos requisitos", "Pesquisa de potenciais fornecedores", "Filtragem por categoria e localização", "Apresentação estruturada dos resultados"],
    steps: ["Define o que procura", "Realizamos a pesquisa", "Recebe uma selecção organizada para avaliação"],
  },
  "concursos-empresariais": {
    includes: ["Estruturação do concurso", "Publicação do processo", "Organização de requisitos e documentação", "Gestão da informação do processo"],
    steps: ["Definimos o processo", "Publicamos e estruturamos a oportunidade", "Acompanhamos a informação do concurso"],
  },
  "mapeamento-comercial": {
    includes: ["Definição do mercado-alvo", "Levantamento de empresas e segmentos", "Organização dos potenciais contactos", "Relatório estruturado"],
    steps: ["Definimos o universo de pesquisa", "Mapeamos empresas e segmentos", "Entregamos os resultados organizados"],
  },
  "monitoria-concursos-oportunidades": {
    includes: ["Definição dos critérios de monitoria", "Pesquisa recorrente", "Filtragem de oportunidades relevantes", "Comunicação dos resultados"],
    steps: ["Definimos o que deve ser acompanhado", "Monitoramos as fontes relevantes", "Sinalizamos oportunidades de acordo com os critérios"],
  },
  "relatorio-empresarial": {
    includes: ["Análise da presença na plataforma", "Consolidação de informação disponível", "Identificação de sinais comerciais", "Relatório estruturado"],
    steps: ["Definimos o objectivo do relatório", "Consolidamos a informação disponível", "Entregamos a análise estruturada"],
  },
  "perfil-destaque": {
    includes: ["Maior exposição no Directório", "Posicionamento em espaços de descoberta", "Período de destaque contratado", "Acompanhamento da campanha"],
    steps: ["Escolhe a duração", "Configuramos o destaque", "A empresa passa a beneficiar da exposição contratada"],
  },
  "publicidade-billboard": {
    includes: ["Planeamento da campanha", "Posicionamento publicitário", "Período contratado", "Acompanhamento da publicação"],
    steps: ["Definimos o espaço e objectivo", "Preparamos a campanha", "Publicamos durante o período contratado"],
  },
};

function priceLabel(service: Service) {
  if (service.price == null) return "Proposta personalizada";
  return `${Number(service.price).toLocaleString("pt-MZ")} ${service.currency || "MZN"}`;
}

function billingLabel(service: Service) {
  if (service.billing === "ONE_TIME") return "Pagamento único";
  if (service.billing === "MONTHLY") return "Serviço mensal";
  if (service.billing === "ANNUAL") return "Serviço anual";
  return "Orçamento após análise do pedido";
}

export default async function ServiceDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: service }, { data: businesses }] = await Promise.all([
    supabase
      .from("platform_services")
      .select("id,slug,name,description,category,price,currency,billing")
      .eq("slug", slug)
      .eq("active", true)
      .maybeSingle(),
    supabase
      .from("businesses")
      .select("id,name")
      .eq("owner_id", user.id)
      .order("name"),
  ]);

  if (!service) notFound();

  const details = serviceDetails[service.slug] ?? {
    includes: [
      "Análise do pedido e do contexto",
      "Definição do escopo de trabalho",
      "Execução do serviço acordado",
      "Acompanhamento do resultado",
    ],
    steps: [
      "Envia o contexto e os requisitos",
      "A equipa analisa e define o escopo",
      "Executamos o serviço conforme acordado",
    ],
  };

  return (
    <main className="dashboard-main">
      <div className="dashboard-content">
        <div className="service-detail-breadcrumb">
          <Link href="/dashboard/servicos" className="text-link">
            ← Serviços MozEmpresas
          </Link>
          <span>/</span>
          <span>{service.category}</span>
        </div>

        <section className="service-detail-hero">
          <div className="service-detail-hero-copy">
            <span className="service-detail-eyebrow">{service.category}</span>
            <h1>{service.name}</h1>
            <p className="service-detail-lead">
              {service.description || categoryIntro[service.category] || "Serviço especializado da plataforma MozEmpresas."}
            </p>
            <div className="service-detail-hero-actions">
              <a href="#solicitar" className="btn primary">Conhecer e solicitar →</a>
              <Link href="/dashboard/servicos" className="btn">Ver outros serviços</Link>
            </div>
          </div>

          <aside className="service-detail-offer">
            <span className="dashboard-kicker">Condições</span>
            <strong>{priceLabel(service)}</strong>
            <p>{billingLabel(service)}</p>
            <div className="service-detail-offer-note">
              {service.price == null
                ? "O valor depende do escopo, volume, prazo e requisitos do pedido."
                : "O valor apresentado corresponde à configuração actualmente disponível na plataforma."}
            </div>
          </aside>
        </section>

        <section className="service-detail-grid">
          <div className="service-detail-content">
            <section className="service-info-section">
              <span className="dashboard-kicker">O que está incluído</span>
              <h2>O serviço é pensado para chegar ao resultado, não apenas à entrega.</h2>
              <div className="service-includes-list">
                {details.includes.map((item, index) => (
                  <div key={item}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <strong>{item}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="service-info-section">
              <span className="dashboard-kicker">Como funciona</span>
              <h2>Um processo simples, com o contexto definido antes da execução.</h2>
              <div className="service-steps">
                {details.steps.map((step, index) => (
                  <div key={step} className="service-step">
                    <span>{index + 1}</span>
                    <div>
                      <strong>{step}</strong>
                      <p>
                        {index === 0
                          ? "Partilhe apenas a informação necessária para compreendermos o pedido."
                          : index === 1
                            ? "A equipa transforma o pedido num escopo operacional claro."
                            : "O resultado é acompanhado através do seu espaço MozEmpresas."}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="service-info-section service-fit-section">
              <span className="dashboard-kicker">Quando faz sentido</span>
              <h2>{categoryIntro[service.category] || "Quando precisa de apoio especializado para uma operação específica."}</h2>
              <p>
                Este serviço é indicado quando a empresa precisa de executar uma tarefa
                específica sem transformar essa necessidade numa operação interna permanente.
              </p>
            </section>
          </div>

          <aside id="solicitar" className="service-request-panel">
            <PlatformServiceRequestForm
              serviceId={service.id}
              businesses={businesses ?? []}
            />
          </aside>
        </section>

        <section className="service-detail-bottom">
          <div>
            <span className="dashboard-kicker">Ainda está a avaliar?</span>
            <h2>Compare com os restantes serviços MozEmpresas.</h2>
            <p>
              Pode voltar ao catálogo e escolher outra área sem perder o contexto da sua empresa.
            </p>
          </div>
          <Link href="/dashboard/servicos" className="btn">Voltar ao catálogo →</Link>
        </section>
      </div>
    </main>
  );
}
