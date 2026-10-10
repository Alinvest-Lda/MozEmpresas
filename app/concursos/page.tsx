import Link from "next/link";

const servicePath = "/dashboard/servicos/concursos-empresariais";
const loginPath = "/login?next=%2Fdashboard%2Fservicos%2Fconcursos-empresariais";

const steps = [
  {
    number: "01",
    title: "Definimos o processo",
    description: "Partilhe o objectivo, o tipo de concurso, os prazos e a informação que já tem disponível.",
  },
  {
    number: "02",
    title: "Estruturamos a publicação",
    description: "Organizamos a apresentação do concurso, os requisitos e a documentação necessária.",
  },
  {
    number: "03",
    title: "Acompanhamos a informação",
    description: "O escopo e as etapas de acompanhamento são definidos de acordo com as necessidades do pedido.",
  },
];

export default function ContestsPage() {
  return (
    <main className="page contests-detail-page">
      <div className="container">
        <section className="page-header">
          <span className="eyebrow">Serviços MozEmpresas · Concursos empresariais</span>
          <h1>Publique e estruture concursos empresariais com apoio da MozEmpresas.</h1>
          <p className="muted" style={{ maxWidth: 780 }}>
            Um serviço para empresas e organizações que precisam de estruturar um processo de concurso,
            organizar requisitos e documentação e preparar a respectiva publicação.
          </p>
          <div className="contest-landing-actions" style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 24 }}>
            <Link href={loginPath} className="btn primary">Solicitar o serviço →</Link>
            <Link href="/login?next=%2Fdashboard%2Fservicos" className="btn">Ver Serviços MozEmpresas</Link>
          </div>
        </section>

        <section className="contest-command-bar" aria-label="Resumo do serviço">
          <div className="contest-command-copy">
            <span className="eyebrow">Apoio empresarial</span>
            <strong>Do enquadramento à publicação</strong>
            <span>O escopo, os prazos e as condições são definidos após análise do pedido.</span>
          </div>
          <div aria-hidden="true" className="contest-type-icon">▣</div>
        </section>

        <section className="contest-discovery" aria-labelledby="contest-service-includes">
          <div className="contest-discovery-head">
            <div>
              <span className="eyebrow">O serviço</span>
              <h2 id="contest-service-includes">O que podemos estruturar consigo.</h2>
            </div>
          </div>
          <div className="contest-results-list">
            <article className="contest-card card">
              <div className="contest-card-index">01</div>
              <div className="directory-business-content">
                <h3>Estruturação do concurso</h3>
                <p>Organização da informação-base e do enquadramento do processo.</p>
              </div>
            </article>
            <article className="contest-card card">
              <div className="contest-card-index">02</div>
              <div className="directory-business-content">
                <h3>Requisitos e documentação</h3>
                <p>Organização dos requisitos, regras e documentos a disponibilizar no processo.</p>
              </div>
            </article>
            <article className="contest-card card">
              <div className="contest-card-index">03</div>
              <div className="directory-business-content">
                <h3>Preparação da publicação</h3>
                <p>Preparação da informação para publicação, de acordo com o escopo acordado.</p>
              </div>
            </article>
            <article className="contest-card card">
              <div className="contest-card-index">04</div>
              <div className="directory-business-content">
                <h3>Acompanhamento da informação</h3>
                <p>Definição da forma de acompanhamento do processo, conforme o pedido contratado.</p>
              </div>
            </article>
          </div>
        </section>

        <section className="contest-detail-section">
          <div className="contest-detail-section-head">
            <div>
              <span className="eyebrow">Como funciona</span>
              <h2>Um processo claro, com o escopo definido antes da execução.</h2>
            </div>
          </div>
          <div className="contest-detail-columns">
            {steps.map((step) => (
              <article className="card detail-text-card" key={step.number}>
                <span className="eyebrow">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="contest-command-bar" style={{ marginTop: 32 }}>
          <div className="contest-command-copy">
            <span className="eyebrow">Próximo passo</span>
            <strong>Tem um concurso para estruturar ou publicar?</strong>
            <span>Envie o pedido pela sua área empresarial para a equipa analisar o escopo.</span>
          </div>
          <Link href={loginPath} className="btn primary">Pedir análise do serviço →</Link>
        </section>
      </div>
    </main>
  );
}
