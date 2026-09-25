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
  ["CONCURSOS", "Concursos e contratação", "Consulte concursos e processos de contratação.", "/concursos"],
  ["PROCURA", "Pedidos de empresas", "Encontre empresas que procuram produtos, serviços ou parceiros.", "/oportunidades"],
  ["PARCERIAS", "Parcerias empresariais", "Descubra oportunidades de cooperação entre empresas.", "/oportunidades"],
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

      <section className="portal-actions" aria-label="Acesso rápido">
        <div className="container portal-actions-grid">
          <Link href="/empresas"><strong>Encontrar empresas</strong><span>Pesquise por nome, sector ou localização</span><b>→</b></Link>
          <Link href="/marketplace"><strong>Encontrar produtos e serviços</strong><span>Explore ofertas publicadas por empresas</span><b>→</b></Link>
          <Link href="/concursos"><strong>Ver concursos</strong><span>Acompanhe processos e chamadas</span><b>→</b></Link>
          <Link href="/oportunidades"><strong>Publicar uma necessidade</strong><span>Encontre empresas para responder ao que procura</span><b>→</b></Link>
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
              <span className="eyebrow">Descubra e compare</span>
              <h2>Encontre. Compare. Contacte.</h2>
              <p className="section-intro">Use o directório para encontrar empresas, conhecer as suas ofertas e chegar rapidamente ao contacto certo.</p>
            </div>
          </div>

          <div className="market-discovery">
            <div className="market-discovery-image">
              <img src="https://images.pexels.com/photos/3862089/pexels-photo-3862089.jpeg?auto=compress&cs=tinysrgb&w=1400" alt="Profissionais negros numa reunião empresarial em Moçambique" loading="lazy" />
              <div className="image-tag">Mercado empresarial</div>
            </div>
            <div className="discovery-steps">
              <Link href="/empresas" className="discovery-step">
                <span>01</span>
                <div><strong>Encontre empresas</strong><p>Pesquise por nome, sector ou localização.</p></div>
                <b>→</b>
              </Link>
              <Link href="/marketplace" className="discovery-step">
                <span>02</span>
                <div><strong>Conheça ofertas</strong><p>Veja produtos e serviços apresentados pelas empresas.</p></div>
                <b>→</b>
              </Link>
              <Link href="/oportunidades" className="discovery-step">
                <span>03</span>
                <div><strong>Faça negócio</strong><p>Consulte concursos, necessidades e oportunidades de parceria.</p></div>
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
              <span className="eyebrow">Negócios e oportunidades</span>
              <h2>Encontre oportunidades de negócio.</h2>
              <p className="section-intro">Veja onde existem necessidades, processos de contratação e possibilidades de parceria entre empresas.</p>
            </div>
            <Link href="/oportunidades" className="text-link">Ver oportunidades →</Link>
          </div>

          <div className="opportunity-layout">
            <div className="opportunity-visual">
              <img src="https://images.pexels.com/photos/5668778/pexels-photo-5668778.jpeg?auto=compress&cs=tinysrgb&w=1400" alt="Profissionais negros num encontro empresarial em Moçambique" loading="lazy" />
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
            <span className="eyebrow inverse-eyebrow">Procura um fornecedor?</span>
            <h2>Diga o que precisa. Encontre quem pode fornecer.</h2>
            <p>Publique a sua necessidade e permita que empresas com produtos ou serviços adequados encontrem a oportunidade.</p>
          </div>
          <Link href="/oportunidades" className="btn light-btn">Publicar uma necessidade</Link>
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
            <h2>Coloque a sua empresa onde os clientes e parceiros procuram.</h2>
            <p>Crie o perfil da sua empresa e apresente actividade, produtos, serviços e formas de contacto.</p>
          </div>
          <div className="cta-actions">
            <Link href="/registo" className="btn primary">Registar empresa</Link>
            <Link href="/empresas" className="btn">Explorar empresas</Link>
          </div>
        </div>
      </section>
    </>
  );
}
