import Link from "next/link";
import { AdvertisingHero } from "@/components/advertising-hero";

const categories = [
  ["Construção e engenharia", "Obras, projectos e manutenção"],
  ["Consultoria e serviços", "Serviços profissionais e empresariais"],
  ["Tecnologia", "TI, software e soluções digitais"],
  ["Contabilidade e finanças", "Contabilidade, auditoria e finanças"],
  ["Comércio e distribuição", "Produtos, grossistas e retalhistas"],
  ["Logística e transportes", "Transporte, carga e armazenagem"],
  ["Agricultura e agro-negócio", "Produção e soluções para o sector"],
  ["Hotelaria e turismo", "Hotéis, turismo e restauração"],
  ["Saúde", "Clínicas, laboratórios e fornecedores"],
  ["Educação e formação", "Instituições e formação profissional"],
  ["Energia e ambiente", "Energia, água e ambiente"],
  ["Outros serviços", "Outras actividades empresariais"],
];

const opportunities = [
  ["CONCURSOS", "Processos de contratação", "Consulte concursos, chamadas e oportunidades.", "/concursos"],
  ["PROCURA", "Empresas à procura", "Descubra necessidades de produtos, serviços ou parceiros.", "/oportunidades"],
  ["PARCERIAS", "Cooperação empresarial", "Encontre possibilidades de colaboração entre empresas.", "/oportunidades"],
];

const information = [
  ["Informação empresarial", "Pesquise referências e recursos úteis.", "/repositorio"],
  ["Concursos", "Acompanhe chamadas e processos de candidatura.", "/concursos"],
  ["Oportunidades", "Veja necessidades e possibilidades de negócio.", "/oportunidades"],
];

export default function Home() {
  return (
    <>
      <AdvertisingHero />

      <section className="home-search-hero">
        <div className="container">
          <div className="search-hero-copy">
            <span className="eyebrow">Directório empresarial de Moçambique</span>
            <h1>Encontre quem pode <span>fazer negócio consigo.</span></h1>
            <p>Pesquise empresas, fornecedores, produtos, serviços e oportunidades em Moçambique.</p>
          </div>

          <form action="/empresas" className="market-search market-search-main">
            <div className="search-field">
              <span className="search-symbol" aria-hidden="true">⌕</span>
              <input name="q" placeholder="Empresa, produto, serviço ou actividade" aria-label="Empresa, produto, serviço ou actividade" />
            </div>
            <div className="search-field location-field">
              <span className="search-symbol" aria-hidden="true">⌖</span>
              <input name="location" placeholder="Província ou localização" aria-label="Província ou localização" />
            </div>
            <button className="btn primary search-button">Pesquisar</button>
          </form>

          <div className="popular-searches">
            <span>Pesquisas populares</span>
            <Link href="/empresas?q=construção">Construção</Link>
            <Link href="/empresas?q=contabilidade">Contabilidade</Link>
            <Link href="/empresas?q=tecnologia">Tecnologia</Link>
            <Link href="/empresas?q=logística">Logística</Link>
            <Link href="/empresas?q=consultoria">Consultoria</Link>
          </div>
        </div>
      </section>

      <section className="portal-stats">
        <div className="container portal-stats-grid">
          <div><strong>Empresas</strong><span>Directório empresarial</span></div>
          <div><strong>Produtos &amp; serviços</strong><span>Ofertas para o mercado</span></div>
          <div><strong>Concursos</strong><span>Processos e oportunidades</span></div>
          <div><strong>Necessidades</strong><span>Procura empresarial</span></div>
        </div>
      </section>

      <section className="section home-section">
        <div className="container">
          <div className="section-head home-section-head">
            <div>
              <span className="eyebrow">Explore o mercado</span>
              <h2>Pesquise por actividade</h2>
              <p className="section-intro">Escolha uma área para encontrar empresas, fornecedores e soluções relacionados.</p>
            </div>
            <Link href="/empresas" className="text-link">Ver todas as empresas →</Link>
          </div>

          <div className="category-list">
            {categories.map(([title, text]) => (
              <Link href={`/empresas?q=${encodeURIComponent(title)}`} className="category-row" key={title}>
                <span className="category-icon">›</span>
                <span><strong>{title}</strong><small>{text}</small></span>
                <span className="category-arrow">→</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="ad-slot ad-slot-wide">
        <div className="container">
          <div className="ad-slot-inner">
            <span>ESPAÇO PUBLICITÁRIO</span>
            <strong>Publicidade horizontal / campanha institucional</strong>
            <small>Posição disponível para marcas, eventos e serviços empresariais.</small>
          </div>
        </div>
      </section>

      <section className="section home-section section-soft">
        <div className="container">
          <div className="section-head home-section-head">
            <div>
              <span className="eyebrow">Como usar o portal</span>
              <h2>Da pesquisa ao contacto.</h2>
              <p className="section-intro">O MozEmpresas organiza informação empresarial para tornar a descoberta mais simples.</p>
            </div>
          </div>

          <div className="market-discovery">
            <div className="market-discovery-image">
              <img src="https://central.bvm.co.mz/storage/app/public/files/notice/140/_MG_8266.JPG" alt="Profissionais negros numa reunião empresarial em Moçambique" loading="lazy" />
              <div className="image-tag">Mercado empresarial</div>
            </div>
            <div className="discovery-steps">
              <Link href="/empresas" className="discovery-step">
                <span>01</span>
                <div><strong>Descubra empresas</strong><p>Pesquise por nome, actividade ou localização.</p></div>
                <b>→</b>
              </Link>
              <Link href="/marketplace" className="discovery-step">
                <span>02</span>
                <div><strong>Compare soluções</strong><p>Explore produtos e serviços publicados.</p></div>
                <b>→</b>
              </Link>
              <Link href="/oportunidades" className="discovery-step">
                <span>03</span>
                <div><strong>Encontre oportunidades</strong><p>Acompanhe necessidades, concursos e parcerias.</p></div>
                <b>→</b>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section home-section">
        <div className="container">
          <div className="section-head home-section-head">
            <div>
              <span className="eyebrow">Oportunidades para empresas</span>
              <h2>Onde a procura encontra a oferta.</h2>
              <p className="section-intro">Além do directório, o portal pode aproximar empresas com necessidades concretas de quem pode responder.</p>
            </div>
            <Link href="/oportunidades" className="text-link">Ver oportunidades →</Link>
          </div>

          <div className="opportunity-layout">
            <div className="opportunity-visual">
              <img src="https://central.bvm.co.mz/storage/app/public/files/notice/123/7.JPG" alt="Profissionais negros num encontro empresarial em Moçambique" loading="lazy" />
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
        </div>
      </section>

      <section className="ad-slot ad-slot-medium">
        <div className="container">
          <div className="ad-slot-inner compact">
            <span>PUBLICIDADE</span>
            <strong>Espaço para banners, campanhas e ofertas especiais</strong>
            <small>Posicionamento entre conteúdos para maior visibilidade.</small>
          </div>
        </div>
      </section>

      <section className="request-section">
        <div className="container request-panel">
          <div>
            <span className="eyebrow inverse-eyebrow">Precisa de um fornecedor?</span>
            <h2>Publique o que procura e deixe empresas responderem.</h2>
            <p>Uma área dedicada a necessidades empresariais permite transformar o directório num ponto de ligação entre procura e oferta.</p>
          </div>
          <Link href="/oportunidades" className="btn light-btn">Explorar oportunidades</Link>
        </div>
      </section>

      <section className="section home-section">
        <div className="container">
          <div className="section-head home-section-head">
            <div>
              <span className="eyebrow">Informação empresarial</span>
              <h2>Mais contexto para pesquisar melhor.</h2>
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

      <section className="ad-slot ad-slot-bottom">
        <div className="container">
          <div className="ad-slot-inner compact">
            <span>ESPAÇO PATROCINADO</span>
            <strong>Divulgue a sua empresa junto do público empresarial.</strong>
            <small>Formatos publicitários para diferentes posições do portal.</small>
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
