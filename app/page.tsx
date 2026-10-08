import Link from "next/link";
import { AdvertisingHero } from "@/components/advertising-hero";

const categories = [
  ["Construção e engenharia","Obras, projectos e manutenção"],["Consultoria e serviços","Serviços profissionais e empresariais"],["Tecnologia","TI, software e soluções digitais"],["Contabilidade e finanças","Contabilidade, auditoria e finanças"],["Comércio e distribuição","Produtos, grossistas e retalhistas"],["Logística e transportes","Transporte, carga e armazenagem"],["Agricultura e agro-negócio","Produção e soluções para o sector"],["Hotelaria e turismo","Hotéis, turismo e restauração"],["Saúde","Clínicas, laboratórios e fornecedores"],["Educação e formação","Instituições e formação profissional"],["Energia e ambiente","Energia, água e ambiente"],["Outros serviços","Outras actividades empresariais"],
];

export default function Home() {
 return <>
  <AdvertisingHero />
  <section className="home-search-hero"><div className="container">
   <div className="search-hero-copy"><span className="eyebrow">Ecossistema empresarial de Moçambique</span><h1>Encontre empresas. Descubra ofertas. <span>Participe.</span></h1><p>Pesquise empresas, produtos, serviços, concursos e oportunidades. Crie uma conta quando quiser participar e construir a sua presença empresarial.</p></div>
   <form action="/empresas" className="market-search market-search-main"><div className="search-field"><span className="search-symbol" aria-hidden="true">⌕</span><input name="q" placeholder="Empresa, produto, serviço ou actividade" aria-label="Empresa, produto, serviço ou actividade" /></div><div className="search-field location-field"><span className="search-symbol" aria-hidden="true">⌖</span><input name="location" placeholder="Província ou localização" aria-label="Província ou localização" /></div><button className="btn primary search-button">Pesquisar</button></form>
   <div className="popular-searches"><span>Explore</span><Link href="/empresas">Empresas</Link><Link href="/marketplace">Produtos e serviços</Link><Link href="/concursos">Concursos</Link><Link href="/oportunidades">Oportunidades</Link></div>
  </div></section>

  <section className="portal-actions" aria-label="O que pode fazer"><div className="container portal-actions-grid">
   <Link href="/empresas"><strong>Encontrar empresas</strong><span>Pesquise por nome, actividade ou localização.</span><b>→</b></Link>
   <Link href="/marketplace"><strong>Encontrar produtos e serviços</strong><span>Descubra ofertas publicadas por empresas.</span><b>→</b></Link>
   <Link href="/oportunidades"><strong>Encontrar oportunidades</strong><span>Veja financiamento, programas, bolsas, parcerias e manifestações de interesse.</span><b>→</b></Link>
  </div></section>

  <section className="section home-section"><div className="container">
   <div className="section-head home-section-head"><div><span className="eyebrow">Explore o mercado</span><h2>Pesquise por actividade</h2><p className="section-intro">Escolha uma área para encontrar empresas, fornecedores e soluções.</p></div><Link href="/empresas" className="text-link">Ver todas as empresas →</Link></div>
   <div className="category-list">{categories.map(([title,text])=><Link href={"/empresas?q="+encodeURIComponent(title)} className="category-row" key={title}><span className="category-icon">›</span><span><strong>{title}</strong><small>{text}</small></span><span className="category-arrow">→</span></Link>)}</div>
  </div></section>

  <section className="section home-section section-soft"><div className="container">
   <div className="section-head home-section-head"><div><span className="eyebrow">Do lado de quem procura</span><h2>Encontre. Compare. Contacte.</h2><p className="section-intro">A área pública facilita a descoberta; a conta permite transformar essa descoberta em actividade.</p></div></div>
   <div className="market-discovery"><div className="market-discovery-image"><img src="https://central.bvm.co.mz/storage/app/public/files/notice/140/_MG_8266.JPG" alt="Profissionais negros numa reunião empresarial em Moçambique" loading="lazy" /><div className="image-tag">Mercado empresarial</div></div><div className="discovery-steps">
    <Link href="/empresas" className="discovery-step"><span>01</span><div><strong>Descubra empresas</strong><p>Pesquise perfis, actividade, localização e contactos.</p></div><b>→</b></Link>
    <Link href="/marketplace" className="discovery-step"><span>02</span><div><strong>Conheça ofertas</strong><p>Veja produtos e serviços apresentados pelas empresas.</p></div><b>→</b></Link>
    <Link href="/oportunidades" className="discovery-step"><span>03</span><div><strong>Participe</strong><p>Consulte oportunidades e, com uma conta, avance para a participação.</p></div><b>→</b></Link>
   </div></div>
  </div></section>

  <section className="section home-role-split"><div className="container">
   <div className="section-head"><div><span className="eyebrow">Dois modos de estar no ecossistema</span><h2>Para quem procura e para quem publica.</h2><p className="section-intro">O MozEmpresas serve utilizadores empresariais e organizações com necessidades diferentes.</p></div></div>
   <div className="home-role-grid">
    <article><span className="eyebrow">UTILIZADOR / EMPRESA</span><h3>Encontre e faça negócio.</h3><p>Crie uma conta para representar uma empresa, publicar produtos e serviços, explorar o mercado, iniciar contactos comerciais e participar em oportunidades.</p><div><Link href="/registo" className="btn primary">Criar conta →</Link><Link href="/login" className="text-link">Já tenho conta</Link></div></article>
    <article><span className="eyebrow">ORGANIZAÇÃO / PARCEIRO</span><h3>Publique, posicione e compreenda.</h3><p>Organizações com conta de parceiro podem publicar oportunidades, contratar exposição e aceder a serviços de inteligência, dados, reputação e estudos.</p><div><Link href="/parceiros" className="btn primary">Conhecer área de parceiro →</Link><Link href="/contactos" className="text-link">Falar com a equipa</Link></div></article>
   </div>
  </div></section>

  <section className="section company-cta"><div className="container company-cta-inner"><div><span className="eyebrow">Para empresas</span><h2>Coloque a sua empresa onde o mercado procura.</h2><p>Crie a sua presença empresarial, apresente produtos e serviços e comece a participar no ecossistema.</p></div><div className="cta-actions"><Link href="/registo" className="btn primary">Registar empresa</Link><Link href="/empresas" className="btn">Explorar empresas</Link></div></div></section>
  <style>{`
   .home-role-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.home-role-grid article{padding:26px;border:1px solid #dbe3e0;border-radius:15px;background:#fff}.home-role-grid h3{font-size:24px;letter-spacing:-.03em;margin:9px 0 7px}.home-role-grid p{font-size:12px;line-height:1.65;color:#65716e;min-height:80px}.home-role-grid article>div{display:flex;gap:16px;align-items:center;margin-top:18px}.home-role-grid .text-link{font-size:11px}.home-role-split{background:#f5f7f6}@media(max-width:700px){.home-role-grid{grid-template-columns:1fr}.home-role-grid article>div{flex-wrap:wrap}}
  `}</style>
 </>;
}