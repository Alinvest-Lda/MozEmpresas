import Link from "next/link";
import { ContactForm } from "@/components/contact-form";

const topics = [
  ["01","Atendimento geral","Dúvidas sobre o portal, contas, empresas e utilização."],
  ["02","Publicidade","Campanhas, espaços publicitários e presença de marcas no portal."],
  ["03","Parcerias","Propostas de colaboração, conteúdos e parcerias empresariais."],
];

export default function ContactosPage() {
  return (
    <main className="page">
      <div className="container">
        <section className="contact-hero">
          <div>
            <span className="eyebrow">Contactos</span>
            <h1>Vamos falar sobre o seu negócio.</h1>
            <p>Use este espaço para entrar em contacto com a equipa MozEmpresas, esclarecer dúvidas, apresentar uma empresa, falar sobre publicidade ou propor uma parceria.</p>
          </div>
          <div className="contact-hero-side"><strong>Resposta orientada ao assunto.</strong><span>Indique o motivo do contacto e deixe os dados necessários para podermos responder.</span></div>
        </section>

        <section className="contact-topics">
          {topics.map(([number,title,text]) => (
            <a href="#contact-form" className="contact-topic" key={number}>
              <span>{number}</span><div><strong>{title}</strong><p>{text}</p></div><b>↓</b>
            </a>
          ))}
        </section>

        <div className="contact-layout">
          <div className="contact-side">
            <span className="eyebrow">Antes de enviar</span>
            <h2>Escolha o assunto e explique o que precisa.</h2>
            <p>Quanto mais claro for o pedido, mais fácil será encaminhá-lo para a área certa.</p>
            <div className="contact-quick">
              <span className="eyebrow">Acesso rápido</span>
              <div className="contact-links">
                <Link href="/empresas">Empresas <span>→</span></Link>
                <Link href="/marketplace">Produtos e serviços <span>→</span></Link>
                <Link href="/concursos">Concursos <span>→</span></Link>
                <Link href="/oportunidades">Oportunidades <span>→</span></Link>
              </div>
            </div>
          </div>
          <ContactForm />
        </div>

        <section className="contact-company">
          <div><span className="eyebrow inverse-eyebrow">Presença empresarial</span><h2>Ainda não encontra a sua empresa no portal?</h2><p>Registe a empresa para criar a sua presença empresarial e apresentar actividade, produtos, serviços e contactos.</p></div>
          <div><Link href="/registo" className="btn light-btn">Registar empresa</Link><Link href="/empresas" className="btn contact-dark-btn">Explorar empresas</Link></div>
        </section>
      </div>
    </main>
  );
}