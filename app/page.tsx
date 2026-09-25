import Link from "next/link";

const modules = [
  ["01","Empresas","Directório de empresas, fornecedores e prestadores de serviços em Moçambique.","/empresas"],
  ["02","Produtos e serviços","Encontre ofertas e soluções apresentadas por empresas locais.","/marketplace"],
  ["03","Concursos","Consulte concursos, chamadas e processos de candidatura.","/concursos"],
  ["04","Oportunidades","Descubra necessidades empresariais, parcerias e novas oportunidades.","/oportunidades"],
  ["05","Informação empresarial","Consulte recursos, referências e informação útil para negócios.","/repositorio"],
  ["06","Área empresarial","Apresente a sua empresa, publique ofertas e acompanhe oportunidades.","/dashboard"],
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="eyebrow">Directório empresarial de Moçambique</span>
            <h1>Empresas, oportunidades e negócios num só lugar.</h1>
            <p>O MozEmpresas organiza informação empresarial para facilitar a pesquisa, a descoberta de fornecedores e a ligação entre empresas em Moçambique.</p>
            <form action="/empresas" className="searchbox">
              <input name="q" placeholder="Pesquisar empresa, serviço ou fornecedor..." aria-label="Pesquisar" />
              <button className="btn primary">Pesquisar</button>
            </form>
            <div className="hero-links">
              <Link href="/empresas">Consultar empresas →</Link>
              <Link href="/marketplace">Consultar ofertas →</Link>
            </div>
          </div>
          <aside className="hero-card">
            <span className="hero-label">MOZEMPRESAS</span>
            <h3>Informação empresarial para decisões mais rápidas.</h3>
            <p>Comece por pesquisar uma empresa ou categoria. A plataforma será progressivamente enriquecida com ofertas, oportunidades e informação de mercado.</p>
            <div className="stats">
              <div className="stat"><strong>01</strong><span>Directório</span></div>
              <div className="stat"><strong>MZ</strong><span>Mercado local</span></div>
              <div className="stat"><strong>∞</strong><span>Conexões</span></div>
            </div>
          </aside>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div><span className="eyebrow">Explore a plataforma</span><h2>Informação organizada para o mercado</h2></div>
            <Link href="/registo" className="btn">Registar empresa</Link>
          </div>
          <div className="grid">
            {modules.map(([n,title,text,href]) => (
              <Link className="card module-card" href={href} key={title}>
                <span className="module-number">{n}</span><h3>{title}</h3><p>{text}</p><span className="card-link">Consultar →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section section-soft">
        <div className="container split">
          <div><span className="eyebrow">Para empresas</span><h2>Tenha a sua empresa representada no ecossistema digital.</h2><p className="muted">Crie um perfil público, apresente a sua actividade e prepare a empresa para receber contactos e oportunidades comerciais.</p></div>
          <Link href="/registo" className="btn primary">Registar empresa</Link>
        </div>
      </section>
    </>
  );
}