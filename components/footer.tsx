"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function Footer() {
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session))).catch(() => setSignedIn(false));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session)));
    return () => subscription.unsubscribe();
  }, []);
  const authenticatedArea = pathname === "/dashboard" || pathname.startsWith("/dashboard/") || pathname === "/parceiro" || pathname.startsWith("/parceiro/");
  if (authenticatedArea || signedIn && (pathname === "/dashboard" || pathname.startsWith("/dashboard/") || pathname === "/parceiro" || pathname.startsWith("/parceiro/"))) return null;
  return <footer className="site-footer">
    <div className="container footer-grid">
      <div className="footer-brand"><div className="footer-logo">Moz<span>Empresas</span></div><p>Directório e plataforma de informação empresarial de Moçambique.</p></div>
      <div><h3>Explorar</h3><Link href="/empresas">Empresas</Link><Link href="/marketplace">Produtos e serviços</Link><Link href="/contactos">Contactos</Link></div>
      <div><h3>Empresas</h3><Link href="/registo">Registar empresa</Link><Link href="/dashboard">Área empresarial</Link><Link href="/contactos">Contactos</Link></div>
      <div><h3>Publicidade e serviços</h3><span>Promova a sua empresa</span><span>Espaços publicitários</span><span>Serviços empresariais</span><Link href="/contactos">Falar com o MozEmpresas</Link></div>
    </div>
    <div className="container footer-bottom"><span>© {new Date().getFullYear()} MozEmpresas. Todos os direitos reservados.</span><div><span>Termos</span><span>Privacidade</span></div></div>
  </footer>;
}