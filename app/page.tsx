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
  const now = new Date().toISOString();
  const { data: featuredPromotions } = await s
    .from("business_promotions")
    .select("business_id")
    .eq("status", "ACTIVE")
    .eq("slot", "FEATURED")
    .lte("starts_at", now)
    .gt("ends_at", now)
    .order("created_at", { ascending: false })
    .limit(10);

  const featuredIds = [...new Set((featuredPromotions ?? []).map((item) => item.business_id).filter(Boolean))];

  const { data: presenceBusinesses } = await s
    .from("businesses")
    .select("id,name,slug,logo_url,updated_at")
    .eq("is_public", true)
    .is("archived_at", null)
    .not("logo_url", "is", null)
    .order("updated_at", { ascending: false })
    .limit(30);

  const { data: partnerBusinessIds } = await s
    .from("business_partner_relationships")
    .select("business_id,partner_business_id")
    .eq("status", "ACTIVE");
  return (
    <main className="home-v2">

      <section className="home-v2-billboard home-v2-billboard-top">
        <div className="container">
          <div className="home-v2-billboard-stage" aria-label="Destaques do MozEmpresas">
            {[
              { image:"https://images.pexels.com/photos/3869649/pexels-photo-3869649.jpeg?cs=srgb&dl=pexels-picha-stock-2210122-3869649.jpg&fm=jpg", title:"Encontre empresas para fazer negócio.", body:"Pesquise empresas, fornecedores e soluções em Moçambique.", cta:"Explorar empresas", href:"/empresas", external:false, alt:"Mulheres africanas numa reunião profissional" },
              { image:"https://images.pexels.com/photos/9301291/pexels-photo-9301291.jpeg?cs=srgb&dl=pexels-mikhail-nilov-9301291.jpg&fm=jpg", title:"Descubra quem está a fazer acontecer.", body:"Conheça empresas, produtos e serviços disponíveis no mercado.", cta:"Ver produtos e serviços", href:"/marketplace", external:false, alt:"Equipa negra a colaborar numa reunião de trabalho" },
              { image:"https://images.pexels.com/photos/5668496/pexels-photo-5668496.jpeg?cs=srgb&dl=pexels-sora-shimazaki-5668496.jpg&fm=jpg", title:"Novas oportunidades começam com informação.", body:"Explore concursos, oportunidades e iniciativas relevantes para o seu negócio.", cta:"Ver oportunidades", href:"/oportunidades", external:false, alt:"Profissional negra a trabalhar durante uma reunião" },
              { image:"https://images.pexels.com/photos/5685959/pexels-photo-5685959.jpeg?cs=srgb&dl=pexels-tima-miroshnichenko-5685959.jpg&fm=jpg", title:"O mercado empresarial num só lugar.", body:"Encontre contactos, soluções e novas possibilidades para a sua actividade.", cta:"Pesquisar", href:"/empresas", external:false, alt:"Empresária negra a trabalhar e comunicar ao telefone" },
              { image:"https://images.pexels.com/photos/6169636/pexels-photo-6169636.jpeg?cs=srgb&dl=pexels-tima-miroshnichenko-6169636.jpg&fm=jpg", title:"Ligue a sua empresa ao mercado.", body:"Encontre parceiros, fornecedores e clientes através de uma presença empresarial mais visível.", cta:"Registar empresa", href:"/registo", external:false, alt:"Profissional negro a gerir mercadoria num armazém" }
            ].map((slide,index)=>(
              <a key={index} href={slide.href} className="home-v2-billboard-slide" target={slide.external ? "_blank" : undefined} rel={slide.external ? "noreferrer" : undefined}>
                <img src={slide.image} alt={slide.alt}/>
                <div className="home-v2-billboard-overlay"/>
                <div className="home-v2-billboard-content">
                  <span className="home-v2-billboard-kicker">MozEmpresas</span>
                  <div className="home-v2-billboard-copy"><h2>{slide.title}</h2><p>{slide.body}</p></div>
                  <span className="home-v2-billboard-cta">{slide.cta} <b>→</b></span>
                </div>
              </a>
            ))}
            <div className="home-v2-billboard-dots" aria-hidden="true"><span/><span/><span/><span/><span/></div>
          </div>

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

      <section className="home-v2-ad-mix">
        <div className="container">
          <div className="home-v2-ad-mix-head">
            <div><span className="eyebrow">Em destaque</span><h2>O que está a acontecer no mercado.</h2></div>
            <p>Conteúdo, empresas, produtos e oportunidades apresentados no mesmo espaço.</p>
          </div>
          <div className="home-v2-ad-mix-grid">
            {[
              premiumAd ? {href:premiumAd.target_url||"/empresas",external:premiumAd.target_url?.startsWith("http")||false,image:premiumAd.image_url,title:premiumAd.title||"Empresa em destaque",body:premiumAd.body||"Conheça esta presença empresarial.",cta:premiumAd.cta_label||"Conhecer",alt:premiumAd.alt_text||premiumAd.title||"Empresa em destaque"} : {href:"/empresas",external:false,image:"https://images.pexels.com/photos/10375953/pexels-photo-10375953.jpeg?cs=srgb&dl=pexels-rdne-10375953.jpg&fm=jpg",title:"Empresas para conhecer.",body:"Pesquise organizações e encontre contactos, ofertas e parceiros em Moçambique.",cta:"Explorar empresas",alt:"Profissionais negros a trocar documentos numa reunião"},
              exclusiveAd ? {href:exclusiveAd.target_url||"/marketplace",external:exclusiveAd.target_url?.startsWith("http")||false,image:exclusiveAd.image_url,title:exclusiveAd.title||"Oferta em destaque",body:exclusiveAd.body||"Descubra uma solução disponível no mercado.",cta:exclusiveAd.cta_label||"Ver oferta",alt:exclusiveAd.alt_text||exclusiveAd.title||"Oferta em destaque"} : {href:"/marketplace",external:false,image:"https://images.pexels.com/photos/9301291/pexels-photo-9301291.jpeg?cs=srgb&dl=pexels-mikhail-nilov-9301291.jpg&fm=jpg",title:"Produtos e serviços.",body:"Encontre soluções e fornecedores para as necessidades da sua actividade.",cta:"Explorar ofertas",alt:"Equipa negra reunida em ambiente profissional"},
              {href:"/oportunidades",external:false,image:"https://images.pexels.com/photos/5668496/pexels-photo-5668496.jpeg?cs=srgb&dl=pexels-sora-shimazaki-5668496.jpg&fm=jpg",title:"Oportunidades para avançar.",body:"Financiamento, desenvolvimento empresarial, iniciativas e capacitação.",cta:"Ver oportunidades",alt:"Profissional negra a analisar informação numa reunião"},
              {href:"/concursos",external:false,image:"https://images.pexels.com/photos/5685959/pexels-photo-5685959.jpeg?cs=srgb&dl=pexels-tima-miroshnichenko-5685959.jpg&fm=jpg",title:"Informação que pode gerar negócio.",body:"Consulte concursos abertos e acompanhe novas possibilidades para a sua empresa.",cta:"Ver concursos",alt:"Empresária negra a trabalhar ao telefone"}
            ].map((card,index)=>(
              <a key={index} href={card.href} className={"home-v2-ad-card home-v2-ad-card-"+(index+1)} target={card.external?"_blank":undefined} rel={card.external?"noreferrer":undefined}>
                <div className="home-v2-ad-card-media">{card.image?<img src={card.image} alt={card.alt}/>:<div/>}</div>
                <div className="home-v2-ad-card-body">
                  <span>{index===0?"Empresas":index===1?"Produtos e serviços":index===2?"Oportunidades":"Concursos"}</span>
                  <h3>{card.title}</h3><p>{card.body}</p><b>{card.cta} <i>→</i></b>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="home-v2-partner-banner">
        <div className="container">
          <div className="home-v2-partner-stage">
            <div>
              <span className="eyebrow">Para parceiros</span>
              <h2>Leve a sua comunicação para dentro do mercado empresarial.</h2>
              <p>Publique notícias, eventos, newsletters e campanhas e combine conteúdo com presença publicitária no MozEmpresas.</p>
            </div>
            <Link href="/parceiros" className="btn primary">Conhecer soluções</Link>
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

      <section className="home-v2-presence">
        <div className="container">
          <div className="home-v2-presence-head">
            <div><span className="eyebrow">Presença empresarial</span><h2>Quem Está Aqui</h2></div>
            <span>Empresas em destaque no MozEmpresas</span>
          </div>
          <div className="home-v2-logo-track">
            {(() => {
              const featured = (presenceBusinesses ?? []).filter((business) => featuredIds.includes(business.id));
              const rest = (presenceBusinesses ?? []).filter((business) => !featuredIds.includes(business.id));
              const ordered = [...featured, ...rest];
              return ordered.map((business) => {
                const isPartner = (partnerBusinessIds ?? []).some(
                  (relationship) => relationship.business_id === business.id || relationship.partner_business_id === business.id
                );
                const isFeatured = featuredIds.includes(business.id);
                return (
                  <Link href={"/empresas/" + business.slug} key={business.id} className={"home-v2-logo-pill" + (isFeatured ? " home-v2-featured-presence" : "") + (isPartner ? " home-v2-partner-presence" : "")} title={business.name}>
                    {business.logo_url ? <img src={business.logo_url} alt={business.name} /> : <span>{business.name}</span>}
                  </Link>
                );
              });
            })()}
          </div>
        </div>
      </section>

      <style>{`
        .home-v2{background:#fff;color:#172321}.home-v2-hero{background:#f5f7f6;border-bottom:1px solid #e0e6e3}.home-v2-hero-grid{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(300px,.7fr);gap:55px;align-items:center;padding:72px 0 76px}.home-v2-copy{max-width:780px}.home-v2-copy h1{font-size:clamp(45px,6vw,78px);line-height:.98;letter-spacing:-.065em;margin:13px 0 20px}.home-v2-copy h1 span{color:#0b6b63}.home-v2-copy>p{max-width:690px;font-size:16px;line-height:1.65;color:#65716e}.home-v2-search{display:grid;grid-template-columns:1.2fr .8fr auto;gap:7px;background:#fff;border:1px solid #d8e1de;border-radius:14px;padding:7px;margin-top:28px;max-width:760px}.home-v2-search div{display:flex;align-items:center;gap:8px;padding:0 11px;border:1px solid #e2e8e5;border-radius:9px}.home-v2-search span{color:#0b6b63;font-size:20px}.home-v2-search input{width:100%;border:0;outline:0;padding:12px 0;background:transparent;font-size:12px}.home-v2-search button{white-space:nowrap}.home-v2-links{display:flex;flex-wrap:wrap;gap:15px;margin-top:13px;font-size:11px;color:#65716e}.home-v2-links a{color:#0b6b63;font-weight:700}.home-v2-hero-panel{background:#fff;border:1px solid #dbe3e0;border-radius:18px;overflow:hidden}.home-v2-panel-top{padding:15px 18px;border-bottom:1px solid #e5eae8;display:flex;justify-content:space-between;gap:12px;font-size:9px;font-weight:800;letter-spacing:.08em}.home-v2-panel-top small{font-size:9px;color:#7a8582;font-weight:500;letter-spacing:0}.home-v2-panel-main{padding:27px 23px}.home-v2-panel-main>strong{display:block;font-size:26px;line-height:1.1;letter-spacing:-.035em;margin:8px 0 25px}.home-v2-panel-list{border-top:1px solid #e2e8e5}.home-v2-panel-list a{display:grid;grid-template-columns:32px 1fr 20px;gap:10px;align-items:center;padding:15px 0;border-bottom:1px solid #e2e8e5;font-size:12px}.home-v2-panel-list b{font-size:10px;color:#0b6b63}.home-v2-panel-list i{font-style:normal;text-align:right;color:#0b6b63}.home-v2-billboard{padding:22px 0 18px;background:#fff}.home-v2-billboard-top{padding-top:22px}.home-v2-billboard-stage{--moz-billboard-slide:8s;--moz-billboard-slides:5;--moz-billboard-duration:40s;position:relative;height:365px;border-radius:20px;overflow:hidden;background:#142c29;isolation:isolate}.home-v2-billboard-slide{position:absolute;inset:0;display:block;opacity:0;visibility:hidden;color:#fff;animation:mozBillboardFade var(--moz-billboard-duration) linear infinite;pointer-events:auto}.home-v2-billboard-slide:nth-child(1){animation-delay:0s}.home-v2-billboard-slide:nth-child(2){animation-delay:calc(var(--moz-billboard-slide) * -1)}.home-v2-billboard-slide:nth-child(3){animation-delay:calc(var(--moz-billboard-slide) * -2)}.home-v2-billboard-slide:nth-child(4){animation-delay:calc(var(--moz-billboard-slide) * -3)}.home-v2-billboard-slide:nth-child(5){animation-delay:calc(var(--moz-billboard-slide) * -4)}.home-v2-billboard-slide img{width:100%;height:100%;object-fit:cover;display:block;transform:scale(1.045)}.home-v2-billboard-overlay{position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,28,25,.91) 0%,rgba(7,28,25,.72) 34%,rgba(7,28,25,.30) 68%,rgba(7,28,25,.08) 100%)}.home-v2-billboard-content{position:absolute;inset:0;padding:38px 48px 40px;display:flex;flex-direction:column;align-items:flex-start}.home-v2-billboard-kicker{display:inline-flex;align-items:center;min-height:25px;font-size:9px;text-transform:uppercase;letter-spacing:.16em;font-weight:800;color:#b7ded7}.home-v2-billboard-copy{margin-top:auto;margin-bottom:20px;max-width:610px}.home-v2-billboard-copy h2{font-size:clamp(34px,4.4vw,58px);line-height:.98;letter-spacing:-.055em;margin:0 0 14px;max-width:590px}.home-v2-billboard-copy p{font-size:13px;line-height:1.6;color:#d5e1df;max-width:510px;margin:0}.home-v2-billboard-cta{display:inline-flex;align-items:center;justify-content:center;gap:12px;min-height:40px;padding:0 16px;border-radius:9px;background:#fff;color:#17312e;font-size:10px;font-weight:800;flex:0 0 auto}.home-v2-billboard-cta b{font-size:15px;color:#0b6b63}.home-v2-billboard-dots{position:absolute;z-index:5;left:48px;bottom:20px;display:flex;gap:6px}.home-v2-billboard-dots span{width:22px;height:3px;border-radius:99px;background:rgba(255,255,255,.38);animation:mozBillboardDot var(--moz-billboard-duration) linear infinite}.home-v2-billboard-dots span:nth-child(1){animation-delay:0s}.home-v2-billboard-dots span:nth-child(2){animation-delay:calc(var(--moz-billboard-slide) * -1)}.home-v2-billboard-dots span:nth-child(3){animation-delay:calc(var(--moz-billboard-slide) * -2)}.home-v2-billboard-dots span:nth-child(4){animation-delay:calc(var(--moz-billboard-slide) * -3)}.home-v2-billboard-dots span:nth-child(5){animation-delay:calc(var(--moz-billboard-slide) * -4)}@keyframes mozBillboardFade{0%,1%{opacity:0;visibility:hidden}4%,18%{opacity:1;visibility:visible}22%,100%{opacity:0;visibility:hidden}}@keyframes mozBillboardDot{0%,18%{opacity:.38;background:rgba(255,255,255,.38)}19%,23%{opacity:1;background:#fff}24%,100%{opacity:.38;background:rgba(255,255,255,.38)}}.home-v2-ad-mix{padding:22px 0 12px;background:#fff}.home-v2-ad-mix-head{display:flex;align-items:end;justify-content:space-between;gap:30px;margin-bottom:18px}.home-v2-ad-mix-head h2{font-size:28px;line-height:1.05;letter-spacing:-.04em;margin:7px 0 0}.home-v2-ad-mix-head p{max-width:390px;font-size:11px;line-height:1.55;color:#65716e;margin:0}.home-v2-ad-mix-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.home-v2-ad-card{min-width:0;border:1px solid #dbe3e0;border-radius:15px;overflow:hidden;background:#fff;display:flex;flex-direction:column;transition:transform .2s ease,box-shadow .2s ease}.home-v2-ad-card:hover{transform:translateY(-2px);box-shadow:0 10px 28px rgba(19,42,38,.08)}.home-v2-ad-card-media{height:145px;overflow:hidden;background:#e9efed}.home-v2-ad-card-media img{width:100%;height:100%;object-fit:cover;display:block}.home-v2-ad-card-body{padding:18px 18px 19px;display:flex;flex:1;flex-direction:column}.home-v2-ad-card-body>span{font-size:8px;letter-spacing:.11em;text-transform:uppercase;font-weight:800;color:#0b6b63}.home-v2-ad-card-body h3{font-size:20px;line-height:1.08;letter-spacing:-.035em;margin:8px 0}.home-v2-ad-card-body p{font-size:10px;line-height:1.55;color:#65716e;margin:0 0 18px}.home-v2-ad-card-body b{margin-top:auto;font-size:9px;color:#0b6b63}.home-v2-ad-card-body b i{font-style:normal;font-size:13px;margin-left:5px}.home-v2-ad-card-2{background:#f5f7f6}.home-v2-ad-card-3{background:#142c29;color:#fff;border-color:#142c29}.home-v2-ad-card-3 .home-v2-ad-card-body>span{color:#9ed0c7}.home-v2-ad-card-3 .home-v2-ad-card-body p{color:#c5d3d0}.home-v2-ad-card-3 .home-v2-ad-card-body b{color:#9ed0c7}.home-v2-ad-card-4{background:#f7f9f8}.home-v2-partner-banner{padding:34px 0;background:#fff}.home-v2-partner-stage{min-height:220px;padding:34px 38px;border-radius:18px;background:#142c29;color:#fff;border:1px solid #142c29;display:flex;align-items:center;justify-content:space-between;gap:35px}.home-v2-partner-stage h2{font-size:36px;line-height:1.02;letter-spacing:-.045em;max-width:670px;margin:8px 0 12px}.home-v2-partner-stage p{font-size:12px;line-height:1.6;color:#c5d3d0;max-width:640px;margin:0}.home-v2-partner-stage .eyebrow{color:#0b6b63}.home-v2-presence{padding:58px 0 45px;background:#fff}.home-v2-presence-head{display:flex;justify-content:space-between;align-items:end;gap:25px;margin-bottom:22px}.home-v2-presence-head h2{font-size:34px;letter-spacing:-.045em;margin:7px 0 0}.home-v2-presence-head>span{font-size:10px;color:#65716e}.home-v2-logo-track{display:flex;gap:9px;overflow:hidden}.home-v2-logo-pill{height:72px;min-width:170px;padding:0 24px;border:1px solid #dbe3e0;border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:11px;letter-spacing:.13em;font-weight:800;color:#66726f;background:#fbfcfb}.home-v2-logo-pill img{max-width:125px;max-height:38px;width:auto;height:auto;object-fit:contain}.home-v2-featured-presence{border-color:#0b6b63;box-shadow:0 0 0 1px rgba(11,107,99,.12)}.home-v2-partner-presence{border-color:#b8d8d1;background:#f1f7f5}.home-v2-section{padding:70px 0}.home-v2-soft{background:#f7f9f8}.home-v2-section-head{display:flex;justify-content:space-between;align-items:end;gap:25px;margin-bottom:25px}.home-v2-section-head h2{font-size:35px;letter-spacing:-.045em;margin:8px 0}.home-v2-section-head p{font-size:13px;color:#65716e;margin:0}.home-v2-discovery-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}.home-v2-discovery-card{min-height:215px;padding:21px;border:1px solid #dbe3e0;border-radius:14px;background:#fff;display:flex;flex-direction:column;justify-content:space-between}.home-v2-discovery-card.featured{background:#142c29;color:#fff;border-color:#142c29}.home-v2-number{font-size:10px;font-weight:800;color:#0b6b63}.featured .home-v2-number{color:#9ed0c7}.home-v2-discovery-card h3{font-size:22px;letter-spacing:-.035em;margin:0 0 7px}.home-v2-discovery-card p{font-size:11px;line-height:1.6;color:#65716e;margin:0}.featured p{color:#c5d3d0}.home-v2-discovery-card>b{align-self:flex-end;color:#0b6b63}.featured>b{color:#9ed0c7}.home-v2-categories{display:grid;grid-template-columns:1fr 1fr;border-top:1px solid #dbe3e0}.home-v2-categories a{display:grid;grid-template-columns:35px 1fr 20px;gap:12px;align-items:center;padding:17px 4px;border-bottom:1px solid #dbe3e0}.home-v2-categories span{font-size:10px;color:#0b6b63;font-weight:800}.home-v2-categories strong{display:block;font-size:12px}.home-v2-categories small{display:block;color:#65716e;font-size:10px;margin-top:3px}.home-v2-categories b{color:#0b6b63}.home-v2-roles{padding:70px 0;background:#f5f7f6}.home-v2-role-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.home-v2-role-grid article{background:#fff;border:1px solid #dbe3e0;border-radius:15px;padding:28px}.role-label{font-size:9px;font-weight:800;letter-spacing:.1em;color:#0b6b63}.home-v2-role-grid h3{font-size:26px;letter-spacing:-.04em;margin:10px 0}.home-v2-role-grid p{font-size:12px;line-height:1.65;color:#65716e;max-width:520px;min-height:60px}.home-v2-role-grid article>div{display:flex;align-items:center;gap:16px;margin-top:20px}.home-v2-final{padding:45px 0}.home-v2-final>.container{display:flex;align-items:center;justify-content:space-between;gap:30px;padding:28px 30px;background:#142c29;color:#fff;border-radius:17px}.home-v2-final h2{font-size:29px;letter-spacing:-.04em;margin:7px 0}.home-v2-final p{color:#c5d3d0;font-size:12px;margin:0}.home-v2-final .eyebrow{color:#9ed0c7}@media(max-width:900px){.home-v2-hero-grid{grid-template-columns:1fr;gap:25px}.home-v2-discovery-grid{grid-template-columns:1fr 1fr}.home-v2-search{grid-template-columns:1fr}.home-v2-search button{width:100%}}@media(max-width:900px){.home-v2-ad-mix-grid{grid-template-columns:1fr 1fr}}@media(max-width:650px){.home-v2-billboard-stage{height:390px;border-radius:15px}.home-v2-billboard-content{padding:27px 24px 46px}.home-v2-billboard-copy{margin-bottom:18px}.home-v2-billboard-copy h2{font-size:35px}.home-v2-billboard-copy p{font-size:11px;line-height:1.55}.home-v2-billboard-dots{left:24px;bottom:18px}.home-v2-partner-stage{display:block}.home-v2-partner-stage .btn{margin-top:22px}.home-v2-presence{padding:45px 0 35px}.home-v2-presence-head{display:block}.home-v2-presence-head>span{display:block;margin-top:5px}.home-v2-logo-track{overflow-x:auto;padding-bottom:4px}.home-v2-logo-pill{min-width:145px;height:64px}.home-v2-ad-mix-head p{margin-top:8px}.home-v2-ad-mix-grid{grid-template-columns:1fr}.home-v2-ad-card-media{height:175px}.home-v2-hero-grid{padding:45px 0}.home-v2-copy h1{font-size:45px}.home-v2-discovery-grid,.home-v2-role-grid,.home-v2-categories{grid-template-columns:1fr}.home-v2-section{padding:48px 0}.home-v2-section-head{display:block}.home-v2-section-head .text-link{display:inline-block;margin-top:12px}.home-v2-final>.container{display:block}.home-v2-final .btn{display:inline-block;margin-top:20px}}@media(prefers-reduced-motion:reduce){.home-v2-billboard-slide,.home-v2-billboard-dots span{animation:none!important}.home-v2-billboard-slide{opacity:0;visibility:hidden;pointer-events:none}.home-v2-billboard-slide:first-child{opacity:1;visibility:visible;pointer-events:auto}}
      `}</style>
    </main>
  );
}
