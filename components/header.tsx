"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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

  return (
    <header className={insideApp && signedIn ? "topbar topbar-app dashboard-header" : "topbar"}>
      <div className="container topbar-inner">
        <Link href={signedIn ? "/dashboard" : "/"} className="brand" aria-label="MozEmpresas">
          Moz<span>Empresas</span>
        </Link>


        <div className="header-actions">
          {signedIn ? (
            <div className="header-account-actions">
              {!insideApp && <Link className="btn primary header-panel-btn" href="/dashboard">Aceder ao painel</Link>}
              {insideApp && <Link className="btn ghost header-portal-btn" href="/">Portal público</Link>}
            </div>
          ) : (
            <>
              <Link className="btn ghost desktop-only" href="/login">Entrar</Link>
              <Link className="btn primary desktop-register" href="/registo">Criar conta</Link>
            </>
          )}

          <div className="mobile-menu" ref={menuRef}>
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
                {signedIn ? (
                  <>
                    {!insideApp && <Link href="/dashboard" onClick={() => setOpen(false)} className="mobile-menu-panel-btn">Aceder ao painel</Link>}
                    {insideApp && <Link href="/" onClick={() => setOpen(false)}>Portal público</Link>}
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
