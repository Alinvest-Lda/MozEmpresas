import Link from "next/link";

const modules = [
  ["01","Empresas","Encontre empresas, fornecedores e prestadores em Moçambique.","/empresas"],
  ["02","Marketplace","Pesquise produtos e serviços e descubra novas ofertas.","/marketplace"],
  ["03","Concursos","Acompanhe concursos, oportunidades e processos de candidatura.","/concursos"],
  ["04","Oportunidades","Publique ou descubra necessidades empresariais.","/oportunidades"],
  ["05","Repositório","Organize documentos, recursos e informação empresarial.","/repositorio"],
  ["06","Área empresarial","Crie o perfil da sua empresa e gira as suas ofertas.","/dashboard"],
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="eyebrow">Ecossistema empresarial de Moçambique</span>
            <h1>Encontre. Conecte. Faça negócio.</h1>
            <p>Uma plataforma para descobrir empresas, produtos, serviços, oportunidades e recursos num único espaço.</p>
            <form action="/empresas" className="searchbox">
              <input name="q" placeholder="O que procura? Ex.: empresa, serviço, fornecedor..." aria-label="Pesquisar" />
              <button className="btn primary">Pesquisar</button>
            </form>
            <div className="hero-links">
              <Link href="/empresas">Explorar empresas →</Link>
              <Link href="/marketplace">Ver marketplace →</Link>
            </div>
          </div>
          <div className="hero-card">
            <span className="hero-label">MOZEMPRESAS</span>
            <h3>O ponto de encontro entre quem procura e quem oferece.</h3>
            <p>Comece pelo diretório. Depois, evolua para ofertas, oportunidades e relações comerciais.</p>
            <div className="stats">
              <div className="stat"><strong>01</strong><span>Conta empresarial</span></div>
              <div className="stat"><strong>∞</strong><span>Possibilidades</span></div>
              <div className="stat"><strong>MZ</strong><span>Foco local</span></div>
            </div>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="section-head"><div><span className="eyebrow">Primeiros módulos</span><h2>Uma plataforma, vários caminhos</h2></div><Link href="/registo" className="btn">Começar agora</Link></div>
          <div className="grid">{modules.map(([n,title,text,href]) => <Link className="card module-card" href={href} key={title}><span className="module-number">{n}</span><h3>{title}</h3><p>{text}</p><span className="card-link">Abrir módulo →</span></Link>)}</div>
        </div>
      </section>
      <section className="section section-soft">
        <div className="container split">
          <div><span className="eyebrow">Para empresas</span><h2>Crie uma presença digital empresarial.</h2><p className="muted">Registe a sua empresa, apresente o que faz e prepare a base para receber contactos, oportunidades e propostas.</p></div>
          <Link href="/registo" className="btn primary">Criar conta empresarial</Link>
        </div>
      </section>
    </>
  );
}