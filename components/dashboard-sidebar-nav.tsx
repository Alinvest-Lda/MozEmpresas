"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "@/components/dashboard-sidebar-nav.module.css";

type DashboardNavLink = readonly [href: string, label: string];
type DashboardNavGroup = { label: string; links: DashboardNavLink[] };

export const dashboardNavGroups: DashboardNavGroup[] = [
  { label: "Operação", links: [["/dashboard","Visão geral"],["/pesquisa","Pesquisa transversal"],["/dashboard/marketplace","Comprar e vender"],["/dashboard/oportunidades","Oportunidades"],["/dashboard/guardados","Guardados"]] },
  { label: "Presença", links: [["/dashboard/empresas","Presença da empresa"],["/empresas","Directório"],["/dashboard/publicidade","Publicidade"]] },
  { label: "Gestão", links: [["/dashboard/acessos","Acessos e equipa"],["/dashboard/servicos","Serviços MozEmpresas"],["/dashboard/monetizacao","Monetização"],["/dashboard/monetizacao/creditos","Créditos"],["/dashboard/financeiro","Gestão financeira"]] },
  { label: "Conta", links: [["/dashboard/conta","A minha conta"],["/dashboard/notificacoes","Notificações"]] },
];

const allDashboardNavLinks: DashboardNavLink[] = [];
for (const group of dashboardNavGroups) {
  for (const link of group.links) allDashboardNavLinks.push(link);
}

export function isDashboardNavActive(pathname: string, href: string) {
  if (href === "/dashboard") return pathname === href;
  const hasMoreSpecificMatch = allDashboardNavLinks
    .some(([candidate]) => candidate !== href
      && candidate.length > href.length
      && candidate.startsWith(href + "/")
      && (pathname === candidate || pathname.startsWith(candidate + "/")));
  return !hasMoreSpecificMatch && (pathname === href || pathname.startsWith(href + "/"));
}

export function DashboardSidebarNav({ platformAccess, unreadNotifications = 0 }: { platformAccess?: string | null; unreadNotifications?: number }) {
  const pathname = usePathname() || "/dashboard";
  if (platformAccess === "super_admin") {
    const adminLinks: DashboardNavLink[] = [
      ["/dashboard/admin", "Visão geral da plataforma"],
      ["/dashboard/admin/usuarios", "Utilizadores e acessos"],
      ["/dashboard/admin/empresas", "Empresas"],
      ["/dashboard/admin/oportunidades", "Oportunidades"],
      ["/dashboard/admin/suporte", "Central de suporte"],
      ["/dashboard/admin/monetizacao", "Monetização"],
      ["/admin/parceiros", "Acessos de parceiros"],
      ["/dashboard/notificacoes", "Notificações"],
      ["/dashboard/conta", "Conta e segurança"],
    ];
    return (
      <nav className={`dashboard-sidebar-nav ${styles.standardNav}`} aria-label="Navegação do Super Admin">
        <div className="dashboard-nav-group">
          <span>Administração global</span>
          {adminLinks.map(([href, label]) => {
            const active = href === "/dashboard/admin"
              ? pathname === href
              : pathname === href || pathname.startsWith(href + "/");
            return <Link className={"dashboard-nav-link" + (active ? " active" : "")} href={href} key={href} aria-current={active ? "page" : undefined}><i className="nav-dot" />{label}{href === "/dashboard/notificacoes" && unreadNotifications > 0 ? <b className="dashboard-nav-badge">{unreadNotifications > 99 ? "99+" : unreadNotifications}</b> : null}</Link>;
          })}
        </div>
      </nav>
    );
  }
  return (
    <nav className={`dashboard-sidebar-nav ${styles.standardNav}`} aria-label="Navegação da área empresarial">
      {dashboardNavGroups.map((group) => (
        <div className="dashboard-nav-group" key={group.label}>
          <span>{group.label}</span>
          {group.links.map(([href, label]) => {
            const active = isDashboardNavActive(pathname, href);
            return <Link className={"dashboard-nav-link" + (active ? " active" : "")} href={href} key={href} aria-current={active ? "page" : undefined}><i className="nav-dot" />{label}{href === "/dashboard/notificacoes" && unreadNotifications > 0 ? <b className="dashboard-nav-badge">{unreadNotifications > 99 ? "99+" : unreadNotifications}</b> : null}</Link>;
          })}
        </div>
      ))}
      {platformAccess && platformAccess !== "super_admin" && (
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
