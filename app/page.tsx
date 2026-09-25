import Link from "next/link";

const categories = [
  ["Construção e engenharia", "Empresas e fornecedores para obras, projectos e manutenção."],
  ["Consultoria e serviços", "Consultoras, serviços profissionais e apoio empresarial."],
  ["Tecnologia", "Software, TI, telecomunicações e soluções digitais."],
  ["Contabilidade e finanças", "Serviços financeiros, contabilidade, auditoria e seguros."],
  ["Comércio e distribuição", "Produtos, distribuidores, grossistas e retalhistas."],
  ["Logística e transportes", "Transporte, armazenagem, carga e cadeia de abastecimento."],
  ["Agricultura e agro-negócio", "Produtores, fornecedores e soluções para o sector."],
  ["Hotelaria e turismo", "Hotéis, turismo, restauração e serviços associados."],
  ["Saúde", "Clínicas, laboratórios, fornecedores e serviços de saúde."],
  ["Educação e formação", "Instituições, formação profissional e serviços educativos."],
  ["Energia e ambiente", "Energia, água, ambiente e soluções sustentáveis."],
  ["Outros serviços empresariais", "Explore outras actividades e fornecedores."],
];

const opportunities = [
  ["CONCURSO", "Concursos e processos de contratação", "Consulte oportunidades publicadas e acompanhe os prazos.", "/concursos"],
  ["PROCURA", "Necessidades de empresas", "Descubra empresas que procuram produtos, serviços ou parceiros.", "/oportunidades"],
  ["PARCERIA", "Parcerias e colaboração", "Encontre possibilidades de cooperação entre empresas.", "/oportunidades"],
];

const information = [
  ["Informação empresarial", "Recursos e referências úteis para pesquisa e actividade empresarial.", "/repositorio"],
  ["Concursos", "Chamadas, concursos e processos de candidatura.", "/concursos"],
  ["Oportunidades", "Necessidades, parcerias e novas possibilidades de negócio.", "/oportunidades"],
];

export default function Home() {
  return (
    <>
      <section className="home-hero">
        <div className="container">
          <div className="home-hero-copy">
            <span className="eyebrow">Directório empresarial de Moçambique</span>
            <h1>Encontre empresas.<br /><span>Encontre oportunidades.</span></h1>
            <p>Pesquise empresas, fornecedores, produtos, serviços e oportunidades de negócio em Moçambique.</p>
          </div>

          <form action="/empresas" className="market-search">
            <div className="search-field">
              <span className="search-symbol" aria-hidden="true">⌕</span>
              <input name="q" placeholder="O que procura? Empresa, serviço, fornecedor..." aria-label="O que procura" />
            </div>
            <div className="search-field location-field">
              <span className="search-symbol" aria-hidden="true">⌖</span>
              <input name="location" placeholder="Localização ou província" aria-label="Localização ou província" />
            </div>
            <button className="btn primary search-button">Pesquisar</button>
          </form>

          <div className="popular-searches">
            <span>Pesquisas populares:</span>
            <Link href="/empresas?q=construção">Construção</Link>
            <Link href="/empresas?q=contabilidade">Contabilidade</Link>
            <Link href="/empresas?q=tecnologia">Tecnologia</Link>
            <Link href="/empresas?q=logística">Logística</Link>
            <Link href="/empresas?q=consultoria">Consultoria</Link>
          </div>
        </div>
      </section>

      <section className="trust-strip">
        <div className="container trust-strip-inner">
          <div><strong>EMPRESAS</strong><span>Descubra fornecedores e parceiros</span></div>
          <div><strong>PRODUTOS &amp; SERVIÇOS</strong><span>Compare ofertas disponíveis</span></div>
          <div><strong>OPORTUNIDADES</strong><span>Encontre novas possibilidades</span></div>
          <div><strong>INFORMAÇÃO</strong><span>Pesquise antes de decidir</span></div>
        </div>
      </section>

      <section className="section home-section">
        <div className="container">
          <div className="section-head home-section-head">
            <div>
              <span className="eyebrow">Explore por actividade</span>
              <h2>Encontre empresas por sector</h2>
              <p className="section-intro">Comece por uma actividade para descobrir empresas e fornecedores relacionados.</p>
            </div>
            <Link href="/empresas" className="text-link">Ver todas as empresas →</Link>
          </div>

          <div className="category-grid">
            {categories.map(([title, text]) => (
              <Link href={`/empresas?q=${encodeURIComponent(title)}`} className="category-item" key={title}>
                <span className="category-mark">›</span>
                <span><strong>{title}</strong><small>{text}</small></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section home-section section-soft">
        <div className="container">
          <div className="section-head home-section-head">
            <div>
              <span className="eyebrow">Para quem procura</span>
              <h2>O mercado começa com uma pesquisa.</h2>
              <p className="section-intro">Use o directório para identificar empresas, fornecedores e soluções antes de iniciar um contacto comercial.</p>
            </div>
            <Link href="/empresas" className="btn">Pesquisar empresas</Link>
          </div>

          <div className="portal-columns">
            <Link href="/empresas" className="portal-feature">
              <span className="portal-index">01</span>
              <div><h3>Empresas</h3><p>Pesquise por nome, actividade ou localização e conheça a presença empresarial disponível na plataforma.</p></div>
              <span className="portal-arrow">→</span>
            </Link>
            <Link href="/marketplace" className="portal-feature">
              <span className="portal-index">02</span>
              <div><h3>Produtos e serviços</h3><p>Descubra ofertas apresentadas por empresas e encontre soluções para as suas necessidades.</p></div>
              <span className="portal-arrow">→</span>
            </Link>
            <Link href="/oportunidades" className="portal-feature">
              <span className="portal-index">03</span>
              <div><h3>Oportunidades</h3><p>Explore necessidades empresariais, parcerias e possibilidades de ligação comercial.</p></div>
              <span className="portal-arrow">→</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="section home-section">
        <div className="container">
          <div className="section-head home-section-head">
            <div>
              <span className="eyebrow">Oportunidades para empresas</span>
              <h2>Há mais do que um directório.</h2>
              <p className="section-intro">O MozEmpresas foi pensado para aproximar procura e oferta empresarial.</p>
            </div>
          </div>

          <div className="opportunity-grid">
            {opportunities.map(([label, title, text, href]) => (
              <Link href={href} className="opportunity-card" key={title}>
                <span className="opportunity-label">{label}</span>
                <h3>{title}</h3>
                <p>{text}</p>
                <span className="card-link">Explorar →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="request-section">
        <div className="container request-panel">
          <div>
            <span className="eyebrow inverse-eyebrow">Precisa de um fornecedor?</span>
            <h2>Apresente a sua necessidade e deixe o mercado chegar até si.</h2>
            <p>Uma evolução natural da plataforma é permitir que empresas publiquem necessidades e recebam propostas de fornecedores interessados.</p>
          </div>
          <Link href="/oportunidades" className="btn light-btn">Ver oportunidades</Link>
        </div>
      </section>

      <section className="section home-section">
        <div className="container">
          <div className="section-head home-section-head">
            <div>
              <span className="eyebrow">Informação empresarial</span>
              <h2>Mais contexto para melhores decisões.</h2>
            </div>
            <Link href="/repositorio" className="text-link">Ver informação →</Link>
          </div>
          <div className="information-grid">
            {information.map(([title, text, href], index) => (
              <Link href={href} className="information-card" key={title}>
                <span className="information-number">0{index + 1}</span>
                <h3>{title}</h3>
                <p>{text}</p>
                <span className="card-link">Consultar →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section company-cta">
        <div className="container company-cta-inner">
          <div>
            <span className="eyebrow">Para empresas</span>
            <h2>A sua empresa ainda não está no MozEmpresas?</h2>
            <p>Crie a presença da sua empresa no directório e apresente a sua actividade, produtos e serviços.</p>
          </div>
          <div className="cta-actions">
            <Link href="/registo" className="btn primary">Registar empresa</Link>
            <Link href="/empresas" className="btn">Consultar directório</Link>
          </div>
        </div>
      </section>
    </>
  );
}
