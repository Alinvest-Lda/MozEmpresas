import Link from "next/link";

const types = [
  ["Chamadas", "Convites à apresentação de propostas, candidaturas ou manifestações de interesse."],
  ["Financiamentos", "Fundos, subvenções, linhas de financiamento e programas de apoio."],
  ["Parcerias", "Convites para cooperação, alianças, implementação e expansão."],
  ["Capacitações", "Cursos, workshops, bolsas, programas e desenvolvimento de competências."],
  ["Eventos", "Feiras, conferências, fóruns, encontros e oportunidades de networking."],
];

const visibility = [
  ["Publicação standard", "Presença no directório de oportunidades, com informação completa e link de referência."],
  ["Destaque", "Maior exposição dentro da página de oportunidades e posições de destaque na descoberta."],
  ["Parceiro em destaque", "Presença institucional de maior visibilidade no ecossistema MozEmpresas, incluindo espaços próprios de marca."],
];

export default function PublicarOportunidade() {
  return (
    <main className="publish-opportunity-page">
      <div className="container">
        <section className="publish-opportunity-hero">
          <div>
            <span className="eyebrow">Para organizações</span>
            <h1>Tem uma oportunidade que merece chegar às pessoas certas?</h1>
            <p>Publique no MozEmpresas e apresente a sua chamada, financiamento, parceria, capacitação ou evento a um público empresarial que está à procura de novas possibilidades.</p>
            <div className="publish-opportunity-actions">
              <Link href="/contactos" className="btn primary">Solicitar publicação →</Link>
              <Link href="/oportunidades" className="text-link">Ver oportunidades</Link>
            </div>
          </div>
          <aside className="publish-opportunity-intro-card">
            <span>O que poderá gerir</span>
            <strong>Publicação → alcance → interesse → métricas</strong>
            <p>A experiência foi pensada para evoluir para submissão online, revisão, métricas, campanhas de destaque e gestão de parceiros.</p>
          </aside>
        </section>

        <section className="publish-opportunity-section">
          <div className="publish-opportunity-heading">
            <span className="eyebrow">O que pode publicar</span>
            <h2>Uma página para diferentes formas de criar oportunidade.</h2>
          </div>
          <div className="publish-type-grid">
            {types.map(([title, text], index) => (
              <div className="publish-type-card" key={title}>
                <span>0{index + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="publish-opportunity-section publish-process">
          <div className="publish-opportunity-heading">
            <span className="eyebrow">Como funciona</span>
            <h2>Da informação publicada à visibilidade.</h2>
          </div>
          <div className="publish-process-grid">
            <div><b>01</b><h3>Enviar informação</h3><p>Partilhe os dados essenciais, critérios, datas e a fonte oficial da oportunidade.</p></div>
            <div><b>02</b><h3>Revisão</h3><p>A informação é organizada e preparada para uma experiência clara de descoberta.</p></div>
            <div><b>03</b><h3>Publicação</h3><p>A oportunidade fica disponível por categoria, localização e prazo.</p></div>
            <div><b>04</b><h3>Acompanhar</h3><p>Futuramente, poderá acompanhar visualizações, interesse e desempenho da publicação.</p></div>
          </div>
        </section>

        <section className="publish-visibility-section">
          <div className="publish-opportunity-heading">
            <span className="eyebrow">Visibilidade para parceiros</span>
            <h2>Mais do que publicar: associe a sua marca ao ecossistema.</h2>
            <p>Organizações que pretendem uma presença institucional mais forte poderão combinar publicação de oportunidades com formatos de visibilidade próprios.</p>
          </div>
          <div className="publish-visibility-grid">
            {visibility.map(([title, text], index) => (
              <div className={"publish-visibility-card " + (index === 2 ? "is-featured" : "")} key={title}>
                <span>{index === 2 ? "Institucional" : "Visibilidade"}</span>
                <h3>{title}</h3>
                <p>{text}</p>
                <Link href="/contactos">Falar sobre este formato →</Link>
              </div>
            ))}
          </div>
        </section>

        <section className="publish-data-section">
          <div>
            <span className="eyebrow">Preparado para crescer</span>
            <h2>A publicação pode tornar-se um produto completo.</h2>
            <p>O próximo nível poderá incluir contas de organizações, submissão e aprovação, gestão de conteúdos, anexos, tracking de cliques, campanhas patrocinadas, relatórios e renovação automática.</p>
          </div>
          <div className="publish-data-list">
            <span>Perfil da organização</span>
            <span>Tipo e categoria</span>
            <span>Datas e prazo</span>
            <span>Localização e público</span>
            <span>Fonte e documentos</span>
            <span>Visibilidade e campanha</span>
          </div>
        </section>

        <section className="publish-final-cta">
          <div>
            <span className="eyebrow inverse-eyebrow">Começar</span>
            <h2>Conte-nos o que pretende divulgar.</h2>
            <p>Fale com a equipa MozEmpresas para preparar a sua primeira publicação ou uma solução de parceria com maior visibilidade.</p>
          </div>
          <Link href="/contactos" className="btn light-btn">Contactar o MozEmpresas →</Link>
        </section>
      </div>
    </main>
  );
}
