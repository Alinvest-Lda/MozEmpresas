"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PartnerMobileMenu, partnerNavGroups } from "@/components/partner-mobile-menu";
import { SignOutButton } from "@/components/sign-out-button";

export function PartnerSidebar() {
  const pathname = usePathname() || "/parceiro";
  const active = (h: string) => h === "/parceiro" ? pathname === h : pathname === h || pathname.startsWith(h + "/");

  return (
    <>
      <PartnerMobileMenu />
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand"><small>Área de parceiro</small><strong>MozEmpresas</strong></div>
        <nav className="dashboard-sidebar-nav">
          {partnerNavGroups.map(g => (
            <div className="dashboard-nav-group" key={g.label}>
              <span>{g.label}</span>
              {g.links.map(([h, l]) => <Link key={h} className={"dashboard-nav-link" + (active(h) ? " active" : "")} href={h} aria-current={active(h) ? "page" : undefined}><i className="nav-dot" />{l}</Link>)}
            </div>
          ))}
        </nav>
        <div className="dashboard-user">
          <Link className="dashboard-account-link" href="/parceiro/conta">Perfil e gestores</Link>
          <div className="dashboard-signout-form"><SignOutButton /></div>
        </div>
      </aside>
    </>
  );
}
