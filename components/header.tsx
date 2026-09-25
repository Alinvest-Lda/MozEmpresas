"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["/empresas", "Empresas"],
  ["/marketplace", "Marketplace"],
  ["/concursos", "Concursos"],
  ["/oportunidades", "Oportunidades"],
  ["/repositorio", "Repositório"],
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
          <Link className="btn primary" href="/registo">Criar conta</Link>
        </div>
      </div>
    </header>
  );
}