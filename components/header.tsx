"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/lib/auth/actions";

const publicLinks = [
  ["/empresas", "Empresas"],
  ["/marketplace", "Produtos e serviços"],
  ["/concursos", "Concursos"],
  ["/oportunidades", "Oportunidades"],
  ["/contactos", "Contactos"],
] as const;

const appLinks = [
  ["/dashboard", "Painel"],
  ["/dashboard/marketplace", "Comprar e vender"],
  ["/dashboard/concursos", "Concursos"],
  ["/dashboard/oportunidades", "Oportunidades"],
  ["/dashboard/empresas", "Empresas"],
  ["/dashboard/acessos", "Acessos"],
] as const;

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;
    try {
      const supabase = createClient();
      supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session))).catch(() => setSignedIn(false));
      const result = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session)));
      subscription = result.data.subscription;
    } catch {
      setSignedIn(false);
    }
    return () => subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handleOutside);
    return () => document.removeEventListener("pointerdown", handleOutside);
  }, [open]);

  const insideApp = pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const links = signedIn ? appLinks : publicLinks;

  return (
    <header className={insideApp && signedIn ? "topbar topbar-app" : "topbar"}>
      <div className="container topbar-inner">
        <Link href={signedIn ? "/dashboard" : "/"} className="brand" aria-label="MozEmpresas">
          Moz<span>Empresas</span>
        </Link>

        <nav className="nav" aria-label={signedIn ? "Navegação do sistema" : "Navegação principal"}>
          {(!insideApp || !signedIn) && links.map(([href, label]) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return <Link key={href} href={href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>{label}</Link>;
          })}
        </nav>

        <div className="header-actions">
          {signedIn ? (
            insideApp ? null : (
              <div className="header-account-actions">
                <Link className="btn primary header-panel-btn" href="/dashboard">Aceder ao painel</Link>
              </div>
            )
          ) : (
            <>
              <Link className="btn ghost desktop-only" href="/login">Entrar</Link>
              <Link className="btn primary desktop-register" href="/registo">Criar conta</Link>
            </>
          )}

          <div className={insideApp && signedIn ? "mobile-menu dashboard-mobile-menu" : "mobile-menu"} ref={menuRef}>
            <button
              type="button"
              className="mobile-menu-trigger"
              aria-expanded={open}
              aria-haspopup="true"
              onClick={() => setOpen((value) => !value)}
            >
              {open ? "Fechar" : "Menu"}
            </button>

            {open && (
              <div className="mobile-menu-panel">
                {(!insideApp || !signedIn) && links.map(([href, label]) => {
                  const active = pathname === href || pathname.startsWith(href + "/");
                  return (
                    <Link key={href} href={href} onClick={() => setOpen(false)} className={active ? "active" : ""} aria-current={active ? "page" : undefined}>
                      {label}
                    </Link>
                  );
                })}

                {signedIn ? (
                  <>
                    {!insideApp && <Link href="/dashboard" onClick={() => setOpen(false)} className="mobile-menu-panel-btn">Aceder ao painel</Link>}

                    <form action={signOut}>
                      <button type="submit" className="btn primary mobile-menu-logout">Sair da conta</button>
                    </form>
                  </>
                ) : (
                  <>
                    <Link href="/login" onClick={() => setOpen(false)}>Entrar</Link>
                    <Link className="mobile-menu-register" href="/registo" onClick={() => setOpen(false)}>Criar conta</Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
