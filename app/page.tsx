import Link from "next/link";

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

export default async function Home() {
  const supabase = (await import("@/lib/supabase/server")).createClient;
  const s = await supabase();
  const { data: homeAds } = await s.rpc("home_ad_slots");
  const ads = (homeAds ?? []) as Array<{ campaign_id:string; product_code:string; slot:string; title:string|null; body:string|null; image_url:string|null; target_url:string|null; cta_label:string|null; alt_text:string|null }>;
  const premiumAd = ads.find((ad) => ad.slot === "PREMIUM");
  const exclusiveAd = ads.find((ad) => ad.slot === "EXCLUSIVE");
  return (
    <main className="home-v2">

      <section className="home-v2-billboard home-v2-billboard-top">
        <div className="container">
          <div className="home-v2-billboard-stage" aria-label="Destaques do MozEmpresas">
            {[
              ...(exclusiveAd || premiumAd ? [{
                image: (exclusiveAd || premiumAd)!.image_url,
                title: (exclusiveAd || premiumAd)!.title || "Em destaque no MozEmpresas",
                body: (exclusiveAd || premiumAd)!.body || "Descubra novas possibilidades de negócio.",
                cta: (exclusiveAd || premiumAd)!.cta_label || "Explorar",
                href: (exclusiveAd || premiumAd)!.target_url || "/empresas",
                external: (exclusiveAd || premiumAd)!.target_url?.startsWith("http") || false,
                alt: (exclusiveAd || premiumAd)!.alt_text || (exclusiveAd || premiumAd)!.title || "Destaque"
              }] : []),
              {
                image: "https://images.unsplash.com/photo-1758518730037-a16581a040e8?auto=format&fit=crop&w=2200&q=82",
                title: "Encontre empresas para fazer negócio.",
                body: "Pesquise empresas, fornecedores e soluções em Moçambique.",
                cta: "Explorar empresas",
                href: "/empresas",
                external: false,
                alt: "Profissionais reunidos numa reunião de negócios"
              },
              {
                image: "https://images.unsplash.com/photo-1758873268461-aea03b5c2ecb?auto=format&fit=crop&w=2200&q=82",
                title: "Descubra quem está a fazer acontecer.",
                body: "Conheça empresas, produtos e serviços disponíveis no mercado.",
                cta: "Ver produtos e serviços",
                href: "/marketplace",
                external: false,
                alt: "Colegas a colaborar num ambiente de trabalho"
              },
              {
                image: "https://images.unsplash.com/photo-1758518727077-ffb66ffccced?auto=format&fit=crop&w=2200&q=82",
                title: "Novas oportunidades começam com informação.",
                body: "Explore concursos, oportunidades e iniciativas relevantes para o seu negócio.",
                cta: "Ver oportunidades",
                href: "/oportunidades",
                external: false,
                alt: "Profissionais a discutir uma oportunidade de negócio"
              },
              {
                image: "https://images.unsplash.com/photo-1758873268023-15a6e6d739ed?auto=format&fit=crop&w=2200&q=82",
                title: "O mercado empresarial num só lugar.",
                body: "Encontre contactos, soluções e novas possibilidades para a sua actividade.",
                cta: "Pesquisar",
                href: "/empresas",
                external: false,
                alt: "Profissional africano a trabalhar num escritório"
              }
            ].map((slide, index) => (
              <a
                key={index}
                href={slide.href}
                className="home-v2-billboard-slide"
                target={slide.external ? "_blank" : undefined}
                rel={slide.external ? "noreferrer" : undefined}
              >
                {slide.image ? (
                  <img src={slide.image} alt={slide.alt} />
                ) : (
                  <div className="home-v2-billboard-slide-fallback" />
                )}
                <div className="home-v2-billboard-overlay" />
                <div className="home-v2-billboard-content">
                  <span className="home-v2-billboard-kicker">MozEmpresas</span>
                  <h2>{slide.title}</h2>
                  <p>{slide.body}</p>
                  <span className="home-v2-billboard-cta">{slide.cta} <b>→</b></span>
                </div>
              </a>
            ))}
            <div className="home-v2-billboard-dots" aria-hidden="true">
              <span></span><span></span><span></span><span></span><span></span>
            </div>
          </div>
        </div>
      </section>

      <section className="home-v2-hero">
        <div className="container">
          <div className="home-v2-hero-grid">
            <div className="home-v2-copy">
              <span className="eyebrow">Directório e ecossistema empresarial</span>
              <h1>Encontre quem pode <span>fazer negócio</span> consigo.</h1>
              <p>Descubra empresas, produtos, serviços, concursos e oportunidades em Moçambique. Pesquise, compare e encontre quem pode fazer negócio consigo.</p>

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

      <section className="home-v2-ad-space home-v2-premium-strip">
        <div className="container">
          {premiumAd ? (
            <a href={premiumAd.target_url || "#"} className="home-v2-premium-live" target={premiumAd.target_url?.startsWith("http") ? "_blank" : undefined} rel={premiumAd.target_url?.startsWith("http") ? "noreferrer" : undefined}>
              {premiumAd.image_url ? <img src={premiumAd.image_url} alt={premiumAd.alt_text || premiumAd.title || "Destaque"} /> : <div className="home-v2-ad-visual"><span>MOZEMPRESAS</span></div>}
              <div className="home-v2-premium-live-copy"><strong>{premiumAd.title || "Em destaque"}</strong>{premiumAd.body && <p>{premiumAd.body}</p>}{premiumAd.cta_label && <b>{premiumAd.cta_label} →</b>}</div>
            </a>
          ) : (
            <article className="home-v2-editorial-banner">
              <div><small>Em destaque</small><h3>Empresas, produtos, serviços e oportunidades para descobrir.</h3><p>Explore o mercado e encontre novas possibilidades de negócio.</p></div>
              <Link href="/empresas" className="text-link">Explorar →</Link>
            </article>
          )}
        </div>
      </section>

      <section className="home-v2-exclusive">
        <div className="container">
          {exclusiveAd ? (
            <a href={exclusiveAd.target_url || "#"} className="home-v2-exclusive-live" target={exclusiveAd.target_url?.startsWith("http") ? "_blank" : undefined} rel={exclusiveAd.target_url?.startsWith("http") ? "noreferrer" : undefined}>
              <div className="home-v2-exclusive-copy"><h2>{exclusiveAd.title || "Em destaque"}</h2>{exclusiveAd.body && <p>{exclusiveAd.body}</p>}{exclusiveAd.cta_label && <b>{exclusiveAd.cta_label} →</b>}</div>
              <div className="home-v2-exclusive-media">{exclusiveAd.image_url ? <img src={exclusiveAd.image_url} alt={exclusiveAd.alt_text || exclusiveAd.title || "Destaque"} /> : <div className="home-v2-ad-visual"><span>MOZEMPRESAS</span></div>}</div>
            </a>
          ) : (
            <article className="home-v2-editorial-banner home-v2-editorial-dark">
              <div><small>Em destaque</small><h3>Descubra oportunidades e iniciativas relevantes para o seu negócio.</h3><p>Financiamento, parcerias, capacitação, eventos e outras oportunidades.</p></div>
              <Link href="/oportunidades" className="text-link">Ver oportunidades →</Link>
            </article>
          )}
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
            <Link href="/oportunidades" className="home-v2-discovery-card"><span className="home-v2-number">03</span><div><h3>Oportunidades</h3><p>Encontre financiamento, desenvolvimento empresarial, apoio a empreendedores, iniciativas juvenis, formação e capacitação, e internacionalização.</p></div><b>→</b></Link>
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
        .home-v2{background:#fff;color:#172321}.home-v2-hero{background:#f5f7f6;border-bottom:1px solid #e0e6e3}.home-v2-hero-grid{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(300px,.7fr);gap:55px;align-items:center;padding:72px 0 76px}.home-v2-copy{max-width:780px}.home-v2-copy h1{font-size:clamp(45px,6vw,78px);line-height:.98;letter-spacing:-.065em;margin:13px 0 20px}.home-v2-copy h1 span{color:#0b6b63}.home-v2-copy>p{max-width:690px;font-size:16px;line-height:1.65;color:#65716e}.home-v2-search{display:grid;grid-template-columns:1.2fr .8fr auto;gap:7px;background:#fff;border:1px solid #d8e1de;border-radius:14px;padding:7px;margin-top:28px;max-width:760px}.home-v2-search div{display:flex;align-items:center;gap:8px;padding:0 11px;border:1px solid #e2e8e5;border-radius:9px}.home-v2-search span{color:#0b6b63;font-size:20px}.home-v2-search input{width:100%;border:0;outline:0;padding:12px 0;background:transparent;font-size:12px}.home-v2-search button{white-space:nowrap}.home-v2-links{display:flex;flex-wrap:wrap;gap:15px;margin-top:13px;font-size:11px;color:#65716e}.home-v2-links a{color:#0b6b63;font-weight:700}.home-v2-hero-panel{background:#fff;border:1px solid #dbe3e0;border-radius:18px;overflow:hidden}.home-v2-panel-top{padding:15px 18px;border-bottom:1px solid #e5eae8;display:flex;justify-content:space-between;gap:12px;font-size:9px;font-weight:800;letter-spacing:.08em}.home-v2-panel-top small{font-size:9px;color:#7a8582;font-weight:500;letter-spacing:0}.home-v2-panel-main{padding:27px 23px}.home-v2-panel-main>strong{display:block;font-size:26px;line-height:1.1;letter-spacing:-.035em;margin:8px 0 25px}.home-v2-panel-list{border-top:1px solid #e2e8e5}.home-v2-panel-list a{display:grid;grid-template-columns:32px 1fr 20px;gap:10px;align-items:center;padding:15px 0;border-bottom:1px solid #e2e8e5;font-size:12px}.home-v2-panel-list b{font-size:10px;color:#0b6b63}.home-v2-panel-list i{font-style:normal;text-align:right;color:#0b6b63}.home-v2-billboard{padding:20px 0 18px;background:#fff}.home-v2-billboard-top{padding:22px 0 18px}.home-v2-billboard-stage{position:relative;height:365px;border-radius:20px;overflow:hidden;background:#142c29;isolation:isolate}.home-v2-billboard-slide{position:absolute;inset:0;opacity:0;animation:mozBillboardFade 30s infinite;display:block;color:#fff}.home-v2-billboard-slide:nth-child(1){animation-delay:0s}.home-v2-billboard-slide:nth-child(2){animation-delay:6s}.home-v2-billboard-slide:nth-child(3){animation-delay:12s}.home-v2-billboard-slide:nth-child(4){animation-delay:18s}.home-v2-billboard-slide:nth-child(5){animation-delay:24s}.home-v2-billboard-slide img{width:100%;height:100%;object-fit:cover;display:block;transform:scale(1.01);animation:mozBillboardZoom 30s infinite}.home-v2-billboard-overlay{position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,30,27,.88) 0%,rgba(8,30,27,.58) 42%,rgba(8,30,27,.10) 78%,rgba(8,30,27,.02) 100%)}.home-v2-billboard-content{position:absolute;left:0;top:0;bottom:0;width:min(610px,62%);padding:42px 46px;display:flex;flex-direction:column;justify-content:center;align-items:flex-start}.home-v2-billboard-kicker{font-size:9px;text-transform:uppercase;letter-spacing:.16em;font-weight:800;color:#b7ded7;margin-bottom:10px}.home-v2-billboard-content h2{font-size:clamp(34px,4.4vw,58px);line-height:.98;letter-spacing:-.055em;margin:0 0 15px;max-width:570px}.home-v2-billboard-content p{font-size:13px;line-height:1.6;color:#d5e1df;max-width:480px;margin:0 0 21px}.home-v2-billboard-cta{display:inline-flex;align-items:center;gap:12px;padding:10px 15px;border-radius:9px;background:#fff;color:#17312e;font-size:10px;font-weight:800}.home-v2-billboard-cta b{font-size:15px;color:#0b6b63}.home-v2-billboard-slide-fallback{position:absolute;inset:0;background:linear-gradient(135deg,#0b6b63,#142c29)}.home-v2-billboard-dots{position:absolute;z-index:4;left:46px;bottom:22px;display:flex;gap:6px}.home-v2-billboard-dots span{width:22px;height:3px;border-radius:99px;background:rgba(255,255,255,.38);animation:mozBillboardDot 30s infinite}.home-v2-billboard-dots span:nth-child(1){animation-delay:0s}.home-v2-billboard-dots span:nth-child(2){animation-delay:6s}.home-v2-billboard-dots span:nth-child(3){animation-delay:12s}.home-v2-billboard-dots span:nth-child(4){animation-delay:18s}.home-v2-billboard-dots span:nth-child(5){animation-delay:24s}@keyframes mozBillboardFade{0%,16%{opacity:1}20%,96%{opacity:0}100%{opacity:1}}@keyframes mozBillboardZoom{0%{transform:scale(1.02)}20%,100%{transform:scale(1.08)}}@keyframes mozBillboardDot{0%,16%{opacity:1;background:#fff}20%,100%{opacity:.38;background:rgba(255,255,255,.38)}}.home-v2-billboard-card{position:relative;display:grid;grid-template-columns:1.45fr .55fr;min-height:235px;border-radius:18px;overflow:hidden;background:#142c29;color:#fff}.home-v2-billboard-card img{width:100%;height:100%;min-height:235px;object-fit:cover}.home-v2-billboard-content{padding:32px;display:flex;flex-direction:column;justify-content:center}.home-v2-billboard-content small,.home-v2-editorial-banner small{font-size:9px;letter-spacing:.08em;text-transform:uppercase;font-weight:800;opacity:.7}.home-v2-billboard-content h2{font-size:38px;line-height:1.02;letter-spacing:-.045em;margin:8px 0 12px}.home-v2-billboard-content p{font-size:12px;line-height:1.55;color:#c5d3d0;margin:0}.home-v2-billboard-visual,.home-v2-ad-visual{min-height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#0b6b63,#142c29);color:#9ed0c7}.home-v2-billboard-visual span,.home-v2-ad-visual span{font-size:10px;letter-spacing:.15em;font-weight:800}.home-v2-ad-space{padding:18px 0 8px;background:#fff}.home-v2-editorial-banner{display:flex;align-items:center;justify-content:space-between;gap:30px;min-height:135px;padding:25px 28px;border:1px solid #dbe3e0;border-radius:15px;background:#f5f7f6}.home-v2-editorial-banner h3{font-size:22px;line-height:1.08;letter-spacing:-.035em;margin:7px 0}.home-v2-editorial-banner p{font-size:11px;color:#65716e;margin:0}.home-v2-editorial-dark{background:#142c29;color:#fff;border-color:#142c29}.home-v2-editorial-dark p{color:#c5d3d0}.home-v2-editorial-banner .text-link{font-size:10px;white-space:nowrap}.home-v2-premium-grid{display:grid;grid-template-columns:1.35fr .65fr;gap:10px}.home-v2-premium-card{border:1px solid #dbe3e0;border-radius:15px;overflow:hidden;background:#f5f7f6}.home-v2-premium-placeholder{min-height:145px;padding:22px;display:flex;flex-direction:column;justify-content:center;background:linear-gradient(110deg,#e9efed,#f7f9f8)}.home-v2-premium-placeholder span{font-size:9px;letter-spacing:.12em;font-weight:800;color:#0b6b63}.home-v2-premium-placeholder strong{font-size:25px;line-height:1.05;letter-spacing:-.04em;max-width:530px;margin:8px 0}.home-v2-premium-placeholder small{font-size:10px;color:#65716e}.home-v2-premium-meta{padding:12px 18px;border-top:1px solid #dbe3e0;display:flex;justify-content:space-between;gap:15px;align-items:center}.home-v2-premium-meta b{font-size:10px}.home-v2-premium-meta span{font-size:9px;color:#65716e;text-align:right}.home-v2-premium-editorial{padding:20px;display:flex;flex-direction:column;justify-content:space-between}.home-v2-premium-editorial h3{font-size:19px;line-height:1.15;letter-spacing:-.03em;margin:7px 0}.home-v2-premium-editorial p{font-size:10px;line-height:1.55;color:#65716e;margin:0}.home-v2-premium-editorial .text-link{font-size:10px;margin-top:18px}.home-v2-premium-live{display:grid;grid-template-columns:1.15fr .85fr;min-height:165px;border:1px solid #dbe3e0;border-radius:15px;overflow:hidden;background:#142c29;color:#fff}.home-v2-premium-live img{width:100%;height:100%;min-height:165px;object-fit:cover}.home-v2-premium-live-copy{padding:24px;display:flex;flex-direction:column;justify-content:center}.home-v2-premium-live-copy strong{font-size:28px;line-height:1.05;letter-spacing:-.04em;margin:8px 0}.home-v2-premium-live-copy p{font-size:11px;line-height:1.55;color:#c5d3d0;margin:0 0 13px}.home-v2-premium-live-copy b,.home-v2-exclusive-copy>b{font-size:10px;color:#9ed0c7}.home-v2-exclusive-live{display:grid;grid-template-columns:.85fr 1.15fr;min-height:190px;color:inherit}.home-v2-exclusive-live .home-v2-exclusive-copy{background:#fff}.home-v2-exclusive-live .home-v2-exclusive-media{padding:0}.home-v2-exclusive-live .home-v2-exclusive-media img{width:100%;height:100%;min-height:190px;object-fit:cover}.home-v2-exclusive-live .home-v2-exclusive-copy p{margin-bottom:13px}.home-v2-exclusive-live .home-v2-exclusive-copy h2{margin-bottom:12px}.home-v2-exclusive{padding:28px 0 12px;background:#f7f9f8}.home-v2-exclusive-slot{display:grid;grid-template-columns:.85fr 1.15fr;gap:10px;border:1px solid #dbe3e0;border-radius:17px;overflow:hidden;background:#fff}.home-v2-exclusive-copy{padding:27px}.home-v2-exclusive-copy h2{font-size:31px;line-height:1.05;letter-spacing:-.045em;margin:8px 0 12px}.home-v2-exclusive-copy p{font-size:11px;line-height:1.65;color:#65716e;max-width:480px;margin:0}.home-v2-exclusive-media{min-height:180px;padding:25px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;background:#142c29;color:#fff}.home-v2-exclusive-media span{font-size:9px;letter-spacing:.12em;font-weight:800;color:#9ed0c7}.home-v2-exclusive-media strong{font-size:26px;letter-spacing:-.04em;margin:8px 0}.home-v2-exclusive-media small{font-size:9px;color:#c5d3d0}.home-v2-section{padding:70px 0}.home-v2-soft{background:#f7f9f8}.home-v2-section-head{display:flex;justify-content:space-between;align-items:end;gap:25px;margin-bottom:25px}.home-v2-section-head h2{font-size:35px;letter-spacing:-.045em;margin:8px 0}.home-v2-section-head p{font-size:13px;color:#65716e;margin:0}.home-v2-discovery-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.home-v2-discovery-card{min-height:215px;padding:21px;border:1px solid #dbe3e0;border-radius:14px;background:#fff;display:flex;flex-direction:column;justify-content:space-between}.home-v2-discovery-card.featured{background:#142c29;color:#fff;border-color:#142c29}.home-v2-number{font-size:10px;font-weight:800;color:#0b6b63}.featured .home-v2-number{color:#9ed0c7}.home-v2-discovery-card h3{font-size:22px;letter-spacing:-.035em;margin:0 0 7px}.home-v2-discovery-card p{font-size:11px;line-height:1.6;color:#65716e;margin:0}.featured p{color:#c5d3d0}.home-v2-discovery-card>b{align-self:flex-end;color:#0b6b63}.featured>b{color:#9ed0c7}.home-v2-categories{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #dbe3e0}.home-v2-categories a{display:grid;grid-template-columns:35px 1fr 20px;gap:12px;align-items:center;padding:17px 4px;border-bottom:1px solid #dbe3e0}.home-v2-categories span{font-size:10px;color:#0b6b63;font-weight:800}.home-v2-categories strong{display:block;font-size:12px}.home-v2-categories small{display:block;color:#65716e;font-size:10px;margin-top:3px}.home-v2-categories b{color:#0b6b63}.home-v2-roles{padding:70px 0;background:#f5f7f6}.home-v2-role-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.home-v2-role-grid article{background:#fff;border:1px solid #dbe3e0;border-radius:15px;padding:28px}.role-label{font-size:9px;font-weight:800;letter-spacing:.1em;color:#0b6b63}.home-v2-role-grid h3{font-size:26px;letter-spacing:-.04em;margin:10px 0}.home-v2-role-grid p{font-size:12px;line-height:1.65;color:#65716e;max-width:520px;min-height:60px}.home-v2-role-grid article>div{display:flex;align-items:center;gap:16px;margin-top:20px}.home-v2-final{padding:45px 0}.home-v2-final>.container{display:flex;align-items:center;justify-content:space-between;gap:30px;padding:28px 30px;background:#142c29;color:#fff;border-radius:17px}.home-v2-final h2{font-size:29px;letter-spacing:-.04em;margin:7px 0}.home-v2-final p{color:#c5d3d0;font-size:12px;margin:0}.home-v2-final .eyebrow{color:#9ed0c7}@media(max-width:900px){.home-v2-hero-grid{grid-template-columns:1fr;gap:25px}.home-v2-discovery-grid{grid-template-columns:1fr 1fr}.home-v2-search{grid-template-columns:1fr}.home-v2-search button{width:100%}}@media(max-width:650px){.home-v2-billboard-stage{height:340px;border-radius:15px}.home-v2-billboard-content{width:100%;padding:28px 24px 48px;justify-content:flex-end}.home-v2-billboard-content h2{font-size:35px}.home-v2-billboard-content p{font-size:11px;margin-bottom:16px}.home-v2-billboard-dots{left:24px;bottom:18px}.home-v2-billboard-card,.home-v2-premium-live,.home-v2-exclusive-live{grid-template-columns:1fr}.home-v2-editorial-banner{display:block}.home-v2-premium-grid,.home-v2-exclusive-slot{grid-template-columns:1fr}.home-v2-premium-meta{display:block}.home-v2-premium-meta span{display:block;text-align:left;margin-top:4px}.home-v2-hero-grid{padding:45px 0}.home-v2-copy h1{font-size:45px}.home-v2-discovery-grid,.home-v2-role-grid,.home-v2-categories{grid-template-columns:1fr}.home-v2-section{padding:48px 0}.home-v2-section-head{display:block}.home-v2-section-head .text-link{display:inline-block;margin-top:12px}.home-v2-final>.container{display:block}.home-v2-final .btn{display:inline-block;margin-top:20px}}
      `}</style>
    </main>
  );
}
