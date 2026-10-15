"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/auth/actions";
import { dashboardNavGroups, isDashboardNavActive } from "@/components/dashboard-sidebar-nav";

export function DashboardMobileMenu({ platformAccess, unreadNotifications = 0 }: { platformAccess?: string | null; unreadNotifications?: number }) {
  const pathname = usePathname() || "/dashboard";
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);


  return (
    <>
      <button
        type="button"
        className={"dashboard-mobile-trigger" + (open ? " open" : "")}
        aria-label={open ? "Fechar menu" : "Abrir menu"}
        aria-expanded={open}
        aria-controls="dashboard-mobile-menu"
        onClick={() => setOpen((value) => !value)}
      >
        <span />
        <span />
        <span />
      </button>

      {open ? <button type="button" className="dashboard-mobile-backdrop" aria-label="Fechar menu" onClick={() => setOpen(false)} /> : null}

      <aside id="dashboard-mobile-menu" className={"dashboard-mobile-menu" + (open ? " open" : "")} aria-hidden={!open}>
        <div className="dashboard-mobile-menu-head">
          <div>
            <small>{platformAccess === "super_admin" ? "Administração global" : "Área empresarial"}</small>
            <strong>MozEmpresas</strong>
          </div>
          <button type="button" className="dashboard-mobile-close" aria-label="Fechar menu" onClick={() => setOpen(false)}>×</button>
        </div>

        <nav className="dashboard-mobile-nav" aria-label={platformAccess === "super_admin" ? "Navegação móvel do Super Admin" : "Navegação móvel da área empresarial"}>
          {platformAccess === "super_admin" ? (
            <div className="dashboard-mobile-nav-group">
              <span>Administração global</span>
              {([
                ["/dashboard/admin", "Visão geral da plataforma"],
                ["/dashboard/admin/usuarios", "Utilizadores e acessos"],
                ["/dashboard/admin/empresas", "Empresas"],
                ["/dashboard/admin/oportunidades", "Oportunidades"],
                ["/dashboard/admin/suporte", "Central de suporte"],
                ["/dashboard/admin/monetizacao", "Monetização"],
                ["/admin/parceiros", "Acessos de parceiros"],
                ["/dashboard/notificacoes", "Notificações"],
                ["/dashboard/conta", "Conta e segurança"],
              ] as const).map(([href, label]) => {
                const active = href === "/dashboard/admin" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
                return <Link key={href} href={href} className={"dashboard-mobile-nav-link" + (active ? " active" : "")} aria-current={active ? "page" : undefined} onClick={() => setOpen(false)}><i className="nav-dot" /><span>{label}</span>{href === "/dashboard/notificacoes" && unreadNotifications > 0 ? <b className="dashboard-nav-badge">{unreadNotifications > 99 ? "99+" : unreadNotifications}</b> : null}</Link>;
              })}
            </div>
          ) : dashboardNavGroups.map((group) => (
            <div className="dashboard-mobile-nav-group" key={group.label}>
              <span>{group.label}</span>
              {group.links.map(([href, label]) => {
                const active = isDashboardNavActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={"dashboard-mobile-nav-link" + (active ? " active" : "")}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpen(false)}
                  >
                    <i className="nav-dot" />
                    <span>{label}</span>
                    {href === "/dashboard/notificacoes" && unreadNotifications > 0 ? (
                      <b className="dashboard-nav-badge">{unreadNotifications > 99 ? "99+" : unreadNotifications}</b>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          ))}

          {platformAccess && platformAccess !== "super_admin" ? (
            <div className="dashboard-mobile-nav-group">
              <span>Plataforma</span>
              <Link
                href="/dashboard/admin"
                className={"dashboard-mobile-nav-link" + (pathname.startsWith("/dashboard/admin") ? " active" : "")}
                aria-current={pathname.startsWith("/dashboard/admin") ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                <i className="nav-dot" />
                <span>Administração · {platformAccess}</span>
              </Link>
            </div>
          ) : null}
        </nav>

        <div className="dashboard-mobile-user">
          <Link href="/dashboard/conta" onClick={() => setOpen(false)}>A minha conta</Link>
          <form action={signOut}>
            <button className="btn header-signout full" type="submit">Sair</button>
          </form>
        </div>
      </aside>
    </>
  );
}
