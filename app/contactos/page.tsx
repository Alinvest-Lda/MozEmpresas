import Link from "next/link";
import { ContactForm } from "@/components/contact-form";

const contactChannels = [
  ["Contacto geral","info@mozempresas.co.mz","Dúvidas, sugestões e pedidos de informação.","mailto:info@mozempresas.co.mz"],
  ["Parcerias","parcerias@mozempresas.co.mz","Parcerias, conteúdos e colaboração.","mailto:parcerias@mozempresas.co.mz"],
  ["Publicidade","publicidade@mozempresas.co.mz","Publicidade e posições de destaque no portal.","mailto:publicidade@mozempresas.co.mz"],
];

export default function ContactosPage() {
  return <main className="page"><div className="container">
    <section className="contact-hero">
      <div><span className="eyebrow">Contactos</span><h1>Fale com o MozEmpresas.</h1><p>Tem uma dúvida, quer apresentar a sua empresa, anunciar no portal ou propor uma parceria? Estamos disponíveis para receber a sua mensagem.</p></div>
      <div className="contact-hero-side"><strong>Um canal para cada assunto.</strong><span>Escolha uma opção ou envie a sua mensagem através do formulário.</span></div>
    </section>

    <div className="contact-layout">
      <div>
        <div className="contact-channels">
          {contactChannels.map(([title,email,text,href])=><a className="contact-channel" href={href} key={email}><span className="contact-channel-index">0{contactChannels.findIndex(x=>x[1]===email)+1}</span><div><small>{title}</small><strong>{email}</strong><p>{text}</p></div><b>↗</b></a>)}
        </div>
        <section className="contact-quick">
          <span className="eyebrow">Acesso rápido</span><h2>Procura algo no portal?</h2>
          <div className="contact-links"><Link href="/empresas">Empresas <span>→</span></Link><Link href="/marketplace">Produtos e serviços <span>→</span></Link><Link href="/concursos">Concursos <span>→</span></Link><Link href="/oportunidades">Oportunidades <span>→</span></Link></div>
        </section>
      </div>
      <ContactForm />
    </div>

    <section className="contact-company"><div><span className="eyebrow inverse-eyebrow">Para empresas</span><h2>Quer colocar a sua empresa no MozEmpresas?</h2><p>Crie o seu perfil empresarial e apresente actividade, produtos, serviços, localização e contactos.</p></div><div><Link href="/registo" className="btn light-btn">Registar empresa</Link><Link href="/empresas" className="btn contact-dark-btn">Explorar empresas</Link></div></section>
  </div></main>;
}