import Link from "next/link";

const contactChannels = [
  ["Contacto geral","info@mozempresas.co.mz","Envie dúvidas, sugestões ou pedidos de informação.", "mailto:info@mozempresas.co.mz"],
  ["Parcerias","parcerias@mozempresas.co.mz","Fale connosco sobre parcerias, conteúdos e colaboração.", "mailto:parcerias@mozempresas.co.mz"],
  ["Publicidade","publicidade@mozempresas.co.mz","Consulte possibilidades de publicidade e destaque no portal.", "mailto:publicidade@mozempresas.co.mz"],
];

export default function ContactosPage() {
  return <main className="page"><div className="container">
    <section className="page-header" style={{padding:"20px 0 20px"}}>
      <span className="eyebrow">Contactos</span>
      <h1>Fale com o MozEmpresas.</h1>
      <p className="muted" style={{maxWidth:720,fontSize:16,lineHeight:1.6}}>Tem uma dúvida, quer apresentar a sua empresa, anunciar no portal ou explorar uma parceria? Escolha o canal adequado e entre em contacto connosco.</p>
    </section>

    <div className="grid" style={{marginBottom:48}}>
      {contactChannels.map(([title,email,text,href])=><a className="card module-card" href={href} key={email}>
        <span className="module-number">{title}</span><h3>{email}</h3><p>{text}</p><span className="card-link">Enviar mensagem →</span>
      </a>)}
    </div>

    <section className="section-soft" style={{padding:"34px",borderRadius:12,marginBottom:48}}>
      <div className="split">
        <div><span className="eyebrow">Empresas</span><h2>Quer colocar a sua empresa no portal?</h2><p className="muted" style={{maxWidth:650,lineHeight:1.6}}>Crie o seu perfil empresarial para apresentar actividade, produtos, serviços, localização e formas de contacto.</p></div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}><Link href="/registo" className="btn primary">Registar empresa</Link><Link href="/empresas" className="btn">Explorar empresas</Link></div>
      </div>
    </section>

    <section>
      <span className="eyebrow">Outros caminhos</span><h2>Encontre rapidamente o que procura</h2>
      <div className="grid" style={{marginTop:18}}>
        <Link href="/empresas" className="card"><h3>Empresas</h3><p>Pesquise empresas e fornecedores.</p><span className="card-link">Explorar →</span></Link>
        <Link href="/marketplace" className="card"><h3>Produtos e serviços</h3><p>Descubra ofertas empresariais.</p><span className="card-link">Explorar →</span></Link>
        <Link href="/oportunidades" className="card"><h3>Oportunidades</h3><p>Consulte chamadas e oportunidades de negócio.</p><span className="card-link">Explorar →</span></Link>
      </div>
    </section>
  </div></main>;
}
