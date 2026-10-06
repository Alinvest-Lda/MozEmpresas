"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { partnerNavGroups } from "@/components/partner-mobile-menu-data";
import { SignOutButton } from "@/components/sign-out-button";
export { partnerNavGroups } from "@/components/partner-mobile-menu-data";
export function PartnerMobileMenu() {
  const pathname = usePathname() || "/parceiro";
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; return () => { document.body.style.overflow = ""; }; }, [open]);
  const active = (h: string) => h === "/parceiro" ? pathname === h : pathname === h || pathname.startsWith(h + "/");
  return (
    <>
      <button type="button" className={"dashboard-mobile-trigger" + (open ? " open" : "")} aria-label={open ? "Fechar menu" : "Abrir menu"} aria-expanded={open} aria-controls="partner-mobile-menu" onClick={() => setOpen(v => !v)}><span /><span /><span /></button>
      {open && <button type="button" className="dashboard-mobile-backdrop" aria-label="Fechar menu" onClick={() => setOpen(false)} />}
      <aside id="partner-mobile-menu" className={"dashboard-mobile-menu" + (open ? " open" : "")} aria-hidden={!open}>
        <div className="dashboard-mobile-menu-head"><div><small>Área de parceiro</small><strong>MozEmpresas</strong></div><button type="button" className="dashboard-mobile-close" onClick={() => setOpen(false)} aria-label="Fechar menu">×</button></div>
        <nav className="dashboard-mobile-nav">
          {partnerNavGroups.map(g => <div className="dashboard-mobile-nav-group" key={g.label}><span>{g.label}</span>{g.links.map(([h,l]) => <Link key={h} href={h} className={"dashboard-mobile-nav-link" + (active(h) ? " active" : "")} aria-current={active(h) ? "page" : undefined} onClick={() => setOpen(false)}><i className="nav-dot" /><span>{l}</span></Link>)}</div>)}
        </nav>
        <div className="dashboard-mobile-user"><Link href="/parceiro/conta" onClick={() => setOpen(false)}>A minha conta</Link><SignOutButton /></div>
      </aside>
    </>
  );
}
