import Link from "next/link";

const sections = [
  ["Directório empresarial", "Empresas, actividades, localização e contactos.", "/empresas"],
  ["Produtos e serviços", "Ofertas publicadas por empresas e fornecedores.", "/marketplace"],
  ["Concursos", "Chamadas, processos de contratação e concursos publicados.", "/concursos"],
  ["Oportunidades", "Parcerias, chamadas, financiamento, eventos e necessidades empresariais.", "/oportunidades"],
  ["Repositório", "Guias, modelos, relatórios e outros recursos de informação empresarial.", "/repositorio"],
];

export default function InformacaoPage() {
  return (
    <main className="page">
      <div className="container">
        <div className="page-header">
          <span className="eyebrow">Informação empresarial</span>
          <h1>Informação para fazer negócio</h1>
          <p className="muted">Explore as áreas de informação do MozEmpresas e encontre empresas, ofertas, oportunidades e recursos para apoiar decisões empresariais.</p>
        </div>

        <div className="grid">
          {sections.map(([title, text, href]) => (
            <Link href={href} className="card listing" key={href}>
              <span className="tag">MozEmpresas</span>
              <h3>{title}</h3>
              <p>{text}</p>
              <span className="card-link">Explorar →</span>
            </Link>
          ))}
        </div>

        <section className="request-section" style={{marginTop:48}}>
          <div className="request-panel">
            <div>
              <span className="eyebrow inverse-eyebrow">Para empresas</span>
              <h2>Quer apresentar informação sobre a sua empresa?</h2>
              <p>Registe a empresa para criar o seu perfil e apresentar actividade, produtos, serviços e formas de contacto.</p>
            </div>
            <Link href="/registo" className="btn light-btn">Registar empresa</Link>
          </div>
        </section>
      </div>
    </main>
  );
}
