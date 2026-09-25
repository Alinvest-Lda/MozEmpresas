"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["/empresas", "Empresas"],
  ["/marketplace", "Produtos e serviços"],
  ["/concursos", "Concursos"],
  ["/oportunidades", "Oportunidades"],
  ["/contactos", "Contactos"],
];

export function Header() {
  const pathname = usePathname();
  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <Link href="/" className="brand" aria-label="MozEmpresas">Moz<span>Empresas</span></Link>
        <nav className="nav" aria-label="Navegação principal">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className={pathname.startsWith(href) ? "active" : ""}>{label}</Link>
          ))}
        </nav>
        <div className="header-actions">
          <Link className="btn ghost desktop-only" href="/login">Entrar</Link>
          <Link className="btn primary desktop-register" href="/registo">Registar empresa</Link>
          <details className="mobile-menu">
            <summary aria-label="Abrir menu">Menu</summary>
            <div className="mobile-menu-panel">
              {links.map(([href, label]) => (
                <Link key={href} href={href}>{label}</Link>
              ))}
              <Link href="/login">Entrar</Link>
              <Link className="mobile-menu-register" href="/registo">Registar empresa</Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}