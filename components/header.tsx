"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { AccountType } from "@/lib/auth/access";

const publicLinks = [
  ["/empresas", "Empresas"],
  ["/marketplace", "Produtos e serviços"],
  ["/oportunidades", "Oportunidades"],
  ["/parceiros", "Parceiros"],
] as const;

const appLinks = [
  ["/dashboard", "Painel"],
  ["/dashboard/marketplace", "Comprar e vender"],
  ["/dashboard/empresas", "Empresas"],
  ["/dashboard/acessos", "Acessos"],
  ["/dashboard/servicos", "Serviços"],
] as const;

const partnerLinks = [
  ["/parceiro", "Área de parceiro"],
  ["/parceiro/oportunidades", "Publicações"],
  ["/parceiro/publicidade", "Publicidade"],
  ["/parceiro/inteligencia", "Inteligência"],
] as const;

export function Header({ initialSignedIn = false, initialAccountType = null }: { initialSignedIn?: boolean; initialAccountType?: AccountType | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(initialSignedIn);
  const [accountType, setAccountType] = useState<AccountType | null>(initialAccountType);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;
    let active = true;
    const syncSession = async (session: { user: { id: string } } | null) => {
      if (!active) return;
      if (!session) { setSignedIn(false); setAccountType(null); return; }
      setSignedIn(true);
      try {
        const supabase = createClient();
        const { data: partnerResult } = await supabase.rpc("is_partner_account");
        if (active) setAccountType(partnerResult === true ? "parceiro" : "empresa");
      } catch {
        if (active) setAccountType(initialAccountType === "parceiro" ? "parceiro" : "empresa");
      }
    };
    try {
      const supabase = createClient();
      supabase.auth.getSession().then(({ data }) => syncSession(data.session)).catch(() => { if (active) { setSignedIn(false); setAccountType(null); } });
      const result = supabase.auth.onAuthStateChange((_event, session) => { void syncSession(session); });
      subscription = result.data.subscription;
    } catch { setSignedIn(false); setAccountType(null); }
    return () => { active = false; subscription?.unsubscribe(); };
  }, [initialAccountType]);

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (event: PointerEvent) => { if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", handleOutside);
    return () => document.removeEventListener("pointerdown", handleOutside);
  }, [open]);

  const insideApp = pathname === "/dashboard" || pathname.startsWith("/dashboard/") || pathname === "/parceiro" || pathname.startsWith("/parceiro/");
  const links = signedIn ? (accountType === "parceiro" ? partnerLinks : appLinks) : publicLinks;
  const searchActive = pathname === "/pesquisa";
  const panelHref = accountType === "parceiro" ? "/parceiro" : "/dashboard";
  const panelLabel = accountType === "parceiro" ? "Aceder à área de parceiro" : "Aceder ao painel";

  return (
    <header className={insideApp && signedIn ? "topbar topbar-app" : "topbar"}>
      <div className="container topbar-inner">
        <Link href={signedIn ? panelHref : "/"} className="brand" aria-label="MozEmpresas">Moz<span>Empresas</span></Link>
        <nav className="nav" aria-label={signedIn ? "Navegação do sistema" : "Navegação principal"}>
          {(!insideApp || !signedIn) && links.map(([href, label]) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return <Link key={href} href={href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>{label}</Link>;
          })}
        </nav>
        <div className="header-actions">
          <Link href="/pesquisa" className={"header-search-link" + (searchActive ? " active" : "")} aria-label="Pesquisar no MozEmpresas" title="Pesquisar no MozEmpresas">⌕<span>Pesquisar</span></Link>
          {!signedIn ? (
            <><Link className="btn ghost desktop-only" href="/login">Entrar</Link><Link className="btn primary desktop-register" href="/registo">Criar conta</Link></>
          ) : (insideApp ? null : <div className="header-account-actions"><Link className="btn primary header-panel-btn" href={panelHref}>{panelLabel}</Link></div>)}
          {(!insideApp || !signedIn) && (
            <div className="mobile-menu" ref={menuRef}>
              <button type="button" className="mobile-menu-trigger" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((value) => !value)}>{open ? "Fechar" : "Menu"}</button>
              {open && <div className="mobile-menu-panel">
                {links.map(([href, label]) => {
                  const active = pathname === href || pathname.startsWith(href + "/");
                  return <Link key={href} href={href} onClick={() => setOpen(false)} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>{label}</Link>;
                })}
                <Link href="/pesquisa" onClick={() => setOpen(false)} className={searchActive ? "active" : ""}>Pesquisar</Link>
                {signedIn ? <Link href={panelHref} onClick={() => setOpen(false)} className="mobile-menu-panel-btn">{panelLabel}</Link> : <><Link href="/login" onClick={() => setOpen(false)}>Entrar</Link><Link className="mobile-menu-register" href="/registo" onClick={() => setOpen(false)}>Criar conta</Link></>}
              </div>}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
