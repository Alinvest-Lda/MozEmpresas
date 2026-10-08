import Link from "next/link";
import { AdvertisingHero } from "@/components/advertising-hero";

const categories = [
  ["Construção e engenharia","Obras, projectos e manutenção"],
  ["Consultoria e serviços","Serviços profissionais e empresariais"],
  ["Tecnologia","Software, TI e soluções digitais"],
  ["Contabilidade e finanças","Contabilidade, auditoria e finanças"],
  ["Comércio e distribuição","Produtos e fornecimento empresarial"],
  ["Logística e transportes","Transporte, carga e armazenagem"],
  ["Agricultura e agro-negócio","Produção e soluções para o sector"],
  ["Hotelaria e turismo","Turismo, hotelaria e restauração"],
];

export default function Home() {
  return (
    <main className="home-v2">
      <AdvertisingHero />

      <section className="home-v2-hero">
        <div className="container">
          <div className="home-v2-hero-grid">
            <div className="home-v2-copy">
              <span className="eyebrow">Directório e ecossistema empresarial</span>
              <h1>Encontre quem pode <span>fazer negócio</span> consigo.</h1>
              <p>Pesquise empresas, produtos, serviços, concursos e oportunidades em Moçambique. Use o MozEmpresas para descobrir, comparar e entrar em contacto.</p>

              <form action="/empresas" className="home-v2-search">
                <div><span>⌕</span><input name="q" placeholder="Empresa, produto, serviço ou actividade" /></div>
                <div><span>⌖</span><input name="location" placeholder="Província ou localização" /></div>
                <button className="btn primary">Pesquisar</button>
              </form>

              <div className="home-v2-links">
                <span>Explorar:</span>
                <Link href="/empresas">Empresas</Link>
                <Link href="/marketplace">Produtos e serviços</Link>
                <Link href="/concursos">Concursos</Link>
                <Link href="/oportunidades">Oportunidades</Link>
              </div>
            </div>

            <div className="home-v2-hero-panel">
              <div className="home-v2-panel-top"><span>MOZEMPRESAS</span><small>O mercado num só lugar</small></div>
              <div className="home-v2-panel-main">
                <span className="eyebrow">O que procura?</span>
                <strong>Uma empresa. Uma oferta. Uma oportunidade.</strong>
                <div className="home-v2-panel-list">
                  <Link href="/empresas"><b>01</b><span>Encontrar empresas</span><i>→</i></Link>
                  <Link href="/marketplace"><b>02</b><span>Encontrar produtos e serviços</span><i>→</i></Link>
                  <Link href="/oportunidades"><b>03</b><span>Ver oportunidades</span><i>→</i></Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-v2-section">
        <div className="container">
          <div className="home-v2-section-head">
            <div><span className="eyebrow">Descoberta</span><h2>Comece pelo que precisa.</h2><p>O acesso público foi desenhado para encontrar informação rapidamente.</p></div>
          </div>
          <div className="home-v2-discovery-grid">
            <Link href="/empresas" className="home-v2-discovery-card featured"><span className="home-v2-number">01</span><div><h3>Empresas</h3><p>Pesquise por nome, actividade e localização. Consulte perfis, contactos e portfólio.</p></div><b>→</b></Link>
            <Link href="/marketplace" className="home-v2-discovery-card"><span className="home-v2-number">02</span><div><h3>Produtos e serviços</h3><p>Descubra o que as empresas estão a oferecer e encontre fornecedores.</p></div><b>→</b></Link>
            <Link href="/oportunidades" className="home-v2-discovery-card"><span className="home-v2-number">03</span><div><h3>Oportunidades</h3><p>Encontre financiamentos, programas de apoio ao empresariado, iniciativas juvenis, formação, apoio a empreendedores, inovação e internacionalização.</p></div><b>→</b></Link>
            <Link href="/concursos" className="home-v2-discovery-card"><span className="home-v2-number">04</span><div><h3>Concursos</h3><p>Consulte concursos empresariais que estão actualmente abertos.</p></div><b>→</b></Link>
          </div>
        </div>
      </section>

      <section className="home-v2-section home-v2-soft">
        <div className="container">
          <div className="home-v2-section-head"><div><span className="eyebrow">Explore o mercado</span><h2>Procure por actividade.</h2><p>Escolha uma área para começar a descobrir empresas e soluções.</p></div><Link href="/empresas" className="text-link">Ver directório →</Link></div>
          <div className="home-v2-categories">
            {categories.map(([title,desc],index)=><Link href={"/empresas?q="+encodeURIComponent(title)} key={title}><span>{String(index+1).padStart(2,"0")}</span><div><strong>{title}</strong><small>{desc}</small></div><b>→</b></Link>)}
          </div>
        </div>
      </section>

      <section className="home-v2-roles">
        <div className="container">
          <div className="home-v2-section-head"><div><span className="eyebrow">Duas formas de usar o MozEmpresas</span><h2>O que pretende fazer?</h2><p>Utilizadores e organizações têm objectivos diferentes. A plataforma separa essas experiências.</p></div></div>
          <div className="home-v2-role-grid">
            <article>
              <span className="role-label">UTILIZADOR / EMPRESA</span>
              <h3>Quero encontrar e fazer negócio.</h3>
              <p>Crie uma conta para representar uma empresa, publicar produtos e serviços, gerir a sua presença e participar em oportunidades.</p>
              <div><Link href="/registo" className="btn primary">Criar conta</Link><Link href="/login" className="text-link">Entrar</Link></div>
            </article>
            <article>
              <span className="role-label">ORGANIZAÇÃO / PARCEIRO</span>
              <h3>Quero publicar e chegar ao mercado.</h3>
              <p>Organizações parceiras publicam oportunidades, contratam exposição e obtêm dados, inteligência, reputação e estudos para apoiar decisões.</p>
              <div><Link href="/parceiros" className="btn primary">Conhecer para organizações</Link><Link href="/contactos" className="text-link">Falar connosco</Link></div>
            </article>
          </div>
        </div>
      </section>

      <section className="home-v2-final">
        <div className="container">
          <div><span className="eyebrow">Para empresas</span><h2>Faça a sua empresa ser encontrada.</h2><p>Crie a sua presença no MozEmpresas e apresente ao mercado aquilo que faz.</p></div>
          <Link href="/registo" className="btn primary">Registar empresa →</Link>
        </div>
      </section>

      <style>{`
        .home-v2{background:#fff;color:#172321}.home-v2-hero{background:#f5f7f6;border-bottom:1px solid #e0e6e3}.home-v2-hero-grid{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(300px,.7fr);gap:55px;align-items:center;padding:72px 0 76px}.home-v2-copy{max-width:780px}.home-v2-copy h1{font-size:clamp(45px,6vw,78px);line-height:.98;letter-spacing:-.065em;margin:13px 0 20px}.home-v2-copy h1 span{color:#0b6b63}.home-v2-copy>p{max-width:690px;font-size:16px;line-height:1.65;color:#65716e}.home-v2-search{display:grid;grid-template-columns:1.2fr .8fr auto;gap:7px;background:#fff;border:1px solid #d8e1de;border-radius:14px;padding:7px;margin-top:28px;max-width:760px}.home-v2-search div{display:flex;align-items:center;gap:8px;padding:0 11px;border:1px solid #e2e8e5;border-radius:9px}.home-v2-search span{color:#0b6b63;font-size:20px}.home-v2-search input{width:100%;border:0;outline:0;padding:12px 0;background:transparent;font-size:12px}.home-v2-search button{white-space:nowrap}.home-v2-links{display:flex;flex-wrap:wrap;gap:15px;margin-top:13px;font-size:11px;color:#65716e}.home-v2-links a{color:#0b6b63;font-weight:700}.home-v2-hero-panel{background:#fff;border:1px solid #dbe3e0;border-radius:18px;overflow:hidden}.home-v2-panel-top{padding:15px 18px;border-bottom:1px solid #e5eae8;display:flex;justify-content:space-between;gap:12px;font-size:9px;font-weight:800;letter-spacing:.08em}.home-v2-panel-top small{font-size:9px;color:#7a8582;font-weight:500;letter-spacing:0}.home-v2-panel-main{padding:27px 23px}.home-v2-panel-main>strong{display:block;font-size:26px;line-height:1.1;letter-spacing:-.035em;margin:8px 0 25px}.home-v2-panel-list{border-top:1px solid #e2e8e5}.home-v2-panel-list a{display:grid;grid-template-columns:32px 1fr 20px;gap:10px;align-items:center;padding:15px 0;border-bottom:1px solid #e2e8e5;font-size:12px}.home-v2-panel-list b{font-size:10px;color:#0b6b63}.home-v2-panel-list i{font-style:normal;text-align:right;color:#0b6b63}.home-v2-section{padding:70px 0}.home-v2-soft{background:#f7f9f8}.home-v2-section-head{display:flex;justify-content:space-between;align-items:end;gap:25px;margin-bottom:25px}.home-v2-section-head h2{font-size:35px;letter-spacing:-.045em;margin:8px 0}.home-v2-section-head p{font-size:13px;color:#65716e;margin:0}.home-v2-discovery-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.home-v2-discovery-card{min-height:215px;padding:21px;border:1px solid #dbe3e0;border-radius:14px;background:#fff;display:flex;flex-direction:column;justify-content:space-between}.home-v2-discovery-card.featured{background:#142c29;color:#fff;border-color:#142c29}.home-v2-number{font-size:10px;font-weight:800;color:#0b6b63}.featured .home-v2-number{color:#9ed0c7}.home-v2-discovery-card h3{font-size:22px;letter-spacing:-.035em;margin:0 0 7px}.home-v2-discovery-card p{font-size:11px;line-height:1.6;color:#65716e;margin:0}.featured p{color:#c5d3d0}.home-v2-discovery-card>b{align-self:flex-end;color:#0b6b63}.featured>b{color:#9ed0c7}.home-v2-categories{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #dbe3e0}.home-v2-categories a{display:grid;grid-template-columns:35px 1fr 20px;gap:12px;align-items:center;padding:17px 4px;border-bottom:1px solid #dbe3e0}.home-v2-categories span{font-size:10px;color:#0b6b63;font-weight:800}.home-v2-categories strong{display:block;font-size:12px}.home-v2-categories small{display:block;color:#65716e;font-size:10px;margin-top:3px}.home-v2-categories b{color:#0b6b63}.home-v2-roles{padding:70px 0;background:#f5f7f6}.home-v2-role-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.home-v2-role-grid article{background:#fff;border:1px solid #dbe3e0;border-radius:15px;padding:28px}.role-label{font-size:9px;font-weight:800;letter-spacing:.1em;color:#0b6b63}.home-v2-role-grid h3{font-size:26px;letter-spacing:-.04em;margin:10px 0}.home-v2-role-grid p{font-size:12px;line-height:1.65;color:#65716e;max-width:520px;min-height:60px}.home-v2-role-grid article>div{display:flex;align-items:center;gap:16px;margin-top:20px}.home-v2-final{padding:45px 0}.home-v2-final>.container{display:flex;align-items:center;justify-content:space-between;gap:30px;padding:28px 30px;background:#142c29;color:#fff;border-radius:17px}.home-v2-final h2{font-size:29px;letter-spacing:-.04em;margin:7px 0}.home-v2-final p{color:#c5d3d0;font-size:12px;margin:0}.home-v2-final .eyebrow{color:#9ed0c7}@media(max-width:900px){.home-v2-hero-grid{grid-template-columns:1fr;gap:25px}.home-v2-discovery-grid{grid-template-columns:1fr 1fr}.home-v2-search{grid-template-columns:1fr}.home-v2-search button{width:100%}}@media(max-width:650px){.home-v2-hero-grid{padding:45px 0}.home-v2-copy h1{font-size:45px}.home-v2-discovery-grid,.home-v2-role-grid,.home-v2-categories{grid-template-columns:1fr}.home-v2-section{padding:48px 0}.home-v2-section-head{display:block}.home-v2-section-head .text-link{display:inline-block;margin-top:12px}.home-v2-final>.container{display:block}.home-v2-final .btn{display:inline-block;margin-top:20px}}
      `}</style>
    </main>
  );
}
