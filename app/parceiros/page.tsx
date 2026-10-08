import Link from "next/link";

const roles = [
  { number:"01", title:"Publicar", text:"Coloque no mercado oportunidades de interesse directo para a comunidade: financiamento, desenvolvimento empresarial, apoio a empreendedores, iniciativas juvenis, formação e capacitação, e internacionalização." },
  { number:"02", title:"Posicionar", text:"Dê mais visibilidade à sua organização, marca, produto, serviço ou oportunidade através de publicidade e campanhas no MozEmpresas." },
  { number:"03", title:"Obter inteligência", text:"Saiba onde está a procura, como o mercado está a mover-se e como a sua organização está posicionada, através de dados e análises." },
];

export default function ParceirosPage() {
  return (
    <main className="page partners-v2">
      <div className="container">
        <section className="partners-v2-hero">
          <div>
            <span className="eyebrow">Para organizações</span>
            <h1>Chegue ao público certo. <span>Com mais contexto.</span></h1>
            <p>O MozEmpresas permite às organizações publicar oportunidades, ganhar exposição perante o público empresarial e contratar informação para compreender melhor o mercado.</p>
            <div className="cta-actions"><Link href="/contactos" className="btn primary">Falar com o MozEmpresas →</Link><Link href="/oportunidades" className="btn">Ver oportunidades</Link></div>
          </div>
          <aside className="partners-v2-side">
            <span className="eyebrow">Área de parceiro</span>
            <strong>Publicar</strong><strong>Posicionar</strong><strong>Obter inteligência</strong>
            <small>Uma conta de parceiro é atribuída pela administração.</small>
          </aside>
        </section>

        <section className="partners-v2-roles">
          {roles.map(item => <article key={item.number}><span>{item.number}</span><h2>{item.title}</h2><p>{item.text}</p><Link href="/contactos">Saber como funciona →</Link></article>)}
        </section>

        <section className="partners-v2-flow">
          <div className="partners-v2-flow-copy"><span className="eyebrow">Um ciclo de actividade</span><h2>Publique uma oportunidade. Depois, decida o que fazer com a atenção e os dados.</h2><p>O valor não termina na publicação. A organização pode promover a sua actividade e, quando fizer sentido, solicitar informação adicional para apoiar decisões.</p></div>
          <div className="partners-v2-steps">
            <div><b>01</b><div><strong>Publique</strong><span>Defina a oportunidade, condições e período de participação.</span></div></div>
            <div><b>02</b><div><strong>Posicione</strong><span>Escolha exposição, destaque ou campanha para chegar melhor ao público.</span></div></div>
            <div><b>03</b><div><strong>Obtenha inteligência</strong><span>Saiba mais sobre procura, mercado, exposição, reputação e oportunidades de decisão.</span></div></div>
          </div>
        </section>

        <section className="partners-v2-catalogue">
          <div className="partners-v2-section-head"><div><span className="eyebrow">O que pode fazer</span><h2>Serviços e possibilidades</h2></div></div>
          <div className="partners-v2-catalogue-grid">
            <article><span>ACTIVIDADE</span><h3>Publicar oportunidades</h3><p>Financiamentos, programas de apoio ao empresariado, iniciativas juvenis, formação, apoio a empreendedores, inovação e internacionalização.</p><Link href="/oportunidades">Ver oportunidades públicas →</Link></article>
            <article><span>EXPOSIÇÃO</span><h3>Promover actividade</h3><p>Publicidade, destaques, patrocínios e campanhas para apresentar a sua actividade ao público do MozEmpresas.</p><Link href="/contactos">Falar sobre exposição →</Link></article>
            <article><span>INTELIGÊNCIA · DADOS</span><h3>Obter inteligência</h3><p>Dados empresariais, procura, mercado, sectores, benchmarking, verificação, reputação e estudos personalizados para apoiar decisões.</p><Link href="/contactos">Falar sobre inteligência →</Link></article>
          </div>
        </section>

        <section className="partners-v2-cta">
          <div><span className="eyebrow">Acesso de parceiro</span><h2>Representa uma organização?</h2><p>As contas de parceiro não são criadas pelo registo público. Fale connosco para apresentar a sua organização e conhecer as possibilidades.</p></div>
          <Link href="/contactos" className="btn primary">Contactar a equipa →</Link>
        </section>
      </div>
      <style>{`
        .partners-v2{background:#fff}.partners-v2-hero{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:45px;padding:65px 0 45px;align-items:center}.partners-v2-hero h1{font-size:clamp(44px,6vw,72px);line-height:1;letter-spacing:-.06em;margin:12px 0 18px}.partners-v2-hero h1 span{color:#0b6b63}.partners-v2-hero p{max-width:720px;font-size:16px;line-height:1.65;color:#65716e}.partners-v2-side{border:1px solid #dbe3e0;border-radius:16px;padding:23px;background:#f5f7f6}.partners-v2-side strong{display:block;font-size:23px;letter-spacing:-.03em;padding:12px 0;border-bottom:1px solid #dbe3e0}.partners-v2-side small{display:block;color:#65716e;font-size:10px;line-height:1.5;margin-top:15px}.partners-v2-roles{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:20px 0 55px}.partners-v2-roles article{padding:24px;border:1px solid #dbe3e0;border-radius:15px}.partners-v2-roles article>span{font-size:10px;font-weight:800;color:#0b6b63}.partners-v2-roles h2{font-size:27px;letter-spacing:-.04em;margin:9px 0}.partners-v2-roles p{font-size:11px;line-height:1.65;color:#65716e;min-height:72px}.partners-v2-roles a,.partners-v2-catalogue a{font-size:11px;color:#0b6b63;font-weight:800}.partners-v2-flow{display:grid;grid-template-columns:1fr 1fr;gap:45px;background:#f5f7f6;border-radius:17px;padding:34px;margin-bottom:60px}.partners-v2-flow h2{font-size:31px;line-height:1.1;letter-spacing:-.045em;margin:9px 0}.partners-v2-flow p{font-size:12px;line-height:1.65;color:#65716e}.partners-v2-steps>div{display:grid;grid-template-columns:38px 1fr;gap:12px;padding:14px 0;border-bottom:1px solid #dbe3e0}.partners-v2-steps b{color:#0b6b63;font-size:10px}.partners-v2-steps strong,.partners-v2-steps span{display:block}.partners-v2-steps strong{font-size:12px}.partners-v2-steps span{font-size:10px;color:#65716e;line-height:1.5;margin-top:3px}.partners-v2-section-head{margin-bottom:20px}.partners-v2-section-head h2{font-size:35px;letter-spacing:-.045em;margin:8px 0}.partners-v2-catalogue-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.partners-v2-catalogue-grid article{padding:23px;border:1px solid #dbe3e0;border-radius:15px}.partners-v2-catalogue-grid article>span{font-size:9px;font-weight:800;color:#0b6b63;letter-spacing:.1em}.partners-v2-catalogue h3{font-size:20px;margin:9px 0}.partners-v2-catalogue p{font-size:11px;line-height:1.6;color:#65716e;min-height:78px}.partners-v2-cta{display:flex;justify-content:space-between;align-items:center;gap:30px;margin:55px 0;padding:28px 30px;background:#142c29;color:#fff;border-radius:17px}.partners-v2-cta h2{font-size:28px;letter-spacing:-.04em;margin:7px 0}.partners-v2-cta p{max-width:650px;color:#c5d3d0;font-size:11px;line-height:1.6;margin:0}.partners-v2-cta .eyebrow{color:#9ed0c7}@media(max-width:800px){.partners-v2-hero,.partners-v2-flow{grid-template-columns:1fr}.partners-v2-roles,.partners-v2-catalogue-grid{grid-template-columns:1fr}.partners-v2-roles p,.partners-v2-catalogue p{min-height:0}.partners-v2-cta{display:block}.partners-v2-cta .btn{display:inline-block;margin-top:20px}}
      `}</style>
    </main>
  );
}
