"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const links = [
  ["/empresas", "Empresas"],
  ["/marketplace", "Produtos e serviços"],
  ["/concursos", "Concursos"],
  ["/oportunidades", "Oportunidades"],
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => {
      setSignedIn(Boolean(data.session));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handleOutside);
    return () => document.removeEventListener("pointerdown", handleOutside);
  }, [open]);

  return (
    <header className="topbar">
      <div className="container topbar-inner">
        <Link href="/" className="brand" aria-label="MozEmpresas">
          Moz<span>Empresas</span>
        </Link>

        <nav className="nav" aria-label="Navegação principal">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className={pathname.startsWith(href) ? "active" : ""}>
              {label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          {signedIn ? (
            <Link className="btn primary" href="/dashboard">
              Painel
            </Link>
          ) : (
            <>
              <Link className="btn ghost desktop-only" href="/login">Entrar</Link>
              <Link className="btn primary desktop-register" href="/registo">Registar empresa</Link>
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
                {links.map(([href, label]) => (
                  <Link key={href} href={href} onClick={() => setOpen(false)}>
                    {label}
                  </Link>
                ))}
                {signedIn ? (
                  <Link href="/dashboard" onClick={() => setOpen(false)}>
                    Painel do utilizador
                  </Link>
                ) : (
                  <>
                    <Link href="/login" onClick={() => setOpen(false)}>Entrar</Link>
                    <Link className="mobile-menu-register" href="/registo" onClick={() => setOpen(false)}>
                      Registar empresa
                    </Link>
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
