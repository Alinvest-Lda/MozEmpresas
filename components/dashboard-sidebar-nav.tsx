"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const groups = [
  { label: "Trabalho", links: [["/dashboard","Visão geral"],["/dashboard/marketplace","Comprar e vender"]] },
  { label: "Empresa", links: [["/dashboard/empresas","Presença da empresa"],["/dashboard/acessos","Acessos e equipa"],["/empresas","Directório"]] },
  { label: "Serviços", links: [["/dashboard/servicos","Serviços MozEmpresas"]] },
  { label: "Conta", links: [["/dashboard/conta","A minha conta"]] },
] as const;

export function DashboardSidebarNav({ platformAccess }: { platformAccess?: string | null }) {
  const pathname = usePathname() || "/dashboard";
  return (
    <nav className="dashboard-sidebar-nav" aria-label="Navegação da área empresarial">
      {groups.map((group) => (
        <div className="dashboard-nav-group" key={group.label}>
          <span>{group.label}</span>
          {group.links.map(([href, label]) => {
            const active = href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
            return <Link className={"dashboard-nav-link" + (active ? " active" : "")} href={href} key={href} aria-current={active ? "page" : undefined}><i className="nav-dot" />{label}</Link>;
          })}
        </div>
      ))}
      {platformAccess && (
        <div className="dashboard-nav-group">
          <span>Plataforma</span>
          <Link className={"dashboard-nav-link" + (pathname.startsWith("/dashboard/admin") ? " active" : "")} href="/dashboard/admin" aria-current={pathname.startsWith("/dashboard/admin") ? "page" : undefined}>
            <i className="nav-dot" />Administração · {platformAccess}
          </Link>
        </div>
      )}
    </nav>
  );
}
