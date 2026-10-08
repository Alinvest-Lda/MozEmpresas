import Link from "next/link";

const roles=[
  {number:"01",title:"Publicar",text:"Divulgue oportunidades abertas ao público: financiamento, programas, bolsas ou prémios, parcerias e manifestações de interesse.",href:"/contactos"},
  {number:"02",title:"Posicionar",text:"Promova a sua entidade, marca, produto, serviço ou oportunidade através de espaços publicitários e campanhas no MozEmpresas.",href:"/contactos"},
  {number:"03",title:"Compreender",text:"Transforme actividade, exposição e informação empresarial em relatórios, inteligência de mercado, reputação e estudos.",href:"/contactos"},
];

export default function ParceirosPage(){
 return <main className="page partners-public-page">
  <div className="container">
   <section className="page-header partners-public-hero">
    <span className="eyebrow">Para organizações</span>
    <h1>Publique. Posicione. Compreenda.</h1>
    <p className="muted">O MozEmpresas é também um espaço de trabalho para organizações que querem comunicar oportunidades ao mercado, ganhar exposição perante o público empresarial e contratar informação para tomar melhores decisões.</p>
    <div className="cta-actions"><Link href="/contactos" className="btn primary">Falar com o MozEmpresas →</Link><Link href="/empresas" className="btn">Explorar o ecossistema</Link></div>
   </section>

   <section className="partners-public-grid">
    {roles.map(item=><article className="card" key={item.number}><span className="eyebrow">{item.number}</span><h2>{item.title}</h2><p className="muted">{item.text}</p><Link href={item.href} className="text-link">Saber mais →</Link></article>)}
   </section>

   <section className="partners-public-flow section-soft">
    <div><span className="eyebrow">Como funciona</span><h2>Uma actividade pode gerar mais valor dentro do ecossistema.</h2><p className="muted">Uma organização pode publicar uma oportunidade, promovê-la perante o público certo, acompanhar a actividade disponível e contratar análises ou estudos quando precisar de aprofundar a leitura do mercado.</p></div>
    <div className="partners-public-steps">
      <div><strong>01</strong><span>Publique uma oportunidade</span><small>Defina condições, período e forma de participação.</small></div>
      <div><strong>02</strong><span>Ganhe exposição</span><small>Escolha um espaço ou campanha adequado ao objectivo.</small></div>
      <div><strong>03</strong><span>Compreenda o mercado</span><small>Solicite dados, inteligência, reputação ou estudos.</small></div>
    </div>
   </section>

   <section className="partners-public-service-grid">
    <article className="card"><span className="eyebrow">Actividade</span><h3>O que pode publicar</h3><p className="muted">Financiamento · Programas / candidaturas · Bolsas / prémios · Parcerias / cooperação · Manifestações de interesse.</p><Link href="/oportunidades" className="text-link">Ver oportunidades públicas →</Link></article>
    <article className="card" id="inteligencia"><span className="eyebrow">Inteligência</span><h3>O que pode compreender</h3><p className="muted">Dados empresariais, procura, exposição, mercado, sectores, reputação, benchmarking, monitoria e estudos personalizados.</p><Link href="/contactos" className="text-link">Falar sobre inteligência →</Link></article>
    <article className="card" id="servicos"><span className="eyebrow">Serviços</span><h3>O que pode contratar</h3><p className="muted">Publicidade, estudos, relatórios, verificação empresarial, inteligência de mercado e serviços de reputação, conforme o catálogo disponível.</p><Link href="/contactos" className="text-link">Conhecer soluções →</Link></article>
   </section>

   <section className="company-cta">
    <div className="company-cta-inner"><div><span className="eyebrow">Acesso de parceiro</span><h2>Uma conta de parceiro é atribuída pela administração do MozEmpresas.</h2><p>Não é necessário criar uma conta de parceiro através do registo público. Se representa uma organização e pretende trabalhar com o MozEmpresas, fale connosco.</p></div><Link href="/contactos" className="btn primary">Contactar a equipa →</Link></div>
   </section>
  </div>
  <style>{`
    .partners-public-hero{max-width:920px;padding-bottom:25px}.partners-public-hero h1{font-size:clamp(42px,6vw,70px);letter-spacing:-.055em;line-height:1.02;margin:12px 0}.partners-public-hero p{max-width:760px;font-size:16px;line-height:1.65}.partners-public-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:10px 0 28px}.partners-public-grid .card{padding:24px}.partners-public-grid h2{font-size:25px;margin:9px 0 7px}.partners-public-grid p{font-size:12px;line-height:1.6;min-height:76px}.partners-public-flow{display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,.9fr);gap:30px;padding:28px;border-radius:16px;margin-bottom:28px}.partners-public-flow h2{font-size:28px;letter-spacing:-.035em;margin:8px 0}.partners-public-flow p{font-size:12px;line-height:1.65}.partners-public-steps{display:grid;gap:0}.partners-public-steps>div{display:grid;grid-template-columns:35px 1fr;gap:10px;padding:14px 0;border-bottom:1px solid #dbe3e0}.partners-public-steps strong{color:#0b6b63}.partners-public-steps span{font-weight:800;font-size:12px}.partners-public-steps small{grid-column:2;color:#65716e;font-size:10px;line-height:1.5}.partners-public-service-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:28px}.partners-public-service-grid .card{padding:22px}.partners-public-service-grid h3{font-size:18px;margin:8px 0}.partners-public-service-grid p{font-size:11px;line-height:1.6;min-height:70px}.partners-public-page .company-cta{margin-bottom:50px}@media(max-width:800px){.partners-public-grid,.partners-public-service-grid,.partners-public-flow{grid-template-columns:1fr}.partners-public-flow{padding:20px}.partners-public-grid .card p,.partners-public-service-grid .card p{min-height:0}}
  `}</style>
 </main>;
}
