import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/header";
import Link from "next/link";

export const metadata: Metadata = {
  title: "MozEmpresas — Ecossistema empresarial de Moçambique",
  description: "Descubra empresas, produtos, serviços, concursos e oportunidades em Moçambique.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-MZ">
      <body>
        <Header />
        {children}
        <footer className="site-footer">
          <div className="container footer-grid">
            <div className="footer-brand">
              <div className="footer-logo">Moz<span>Empresas</span></div>
              <p>Directório e plataforma de informação empresarial de Moçambique.</p>
            </div>
            <div>
              <h3>Explorar</h3>
              <Link href="/empresas">Empresas</Link>
              <Link href="/marketplace">Produtos e serviços</Link>
              <Link href="/concursos">Concursos</Link>
              <Link href="/oportunidades">Oportunidades</Link>
            </div>
            <div>
              <h3>Empresas</h3>
              <Link href="/registo">Registar empresa</Link>
              <Link href="/dashboard">Área empresarial</Link>
              <Link href="/contactos">Contactos</Link>
            </div>
            <div>
              <h3>Publicidade</h3>
              <span>Promova a sua empresa</span>
              <span>Espaços publicitários</span>
              <span>Campanhas e destaques</span>
              <Link href="/contactos">Falar sobre publicidade</Link>
            </div>
          </div>
          <div className="container footer-bottom">
            <span>© {new Date().getFullYear()} MozEmpresas. Todos os direitos reservados.</span>
            <div><span>Termos</span><span>Privacidade</span></div>
          </div>
        </footer>
      </body>
    </html>
  );
}