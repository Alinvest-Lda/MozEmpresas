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
      <div className="footer-brand"><div className="footer-logo">Moz<span>Empresas</span></div><p>Ecossistema empresarial de Moçambique para descobrir empresas, ofertas, concursos e oportunidades — e para organizações comunicarem, posicionarem-se e compreenderem o mercado.</p></div>
      <div><h3>Explorar</h3><Link href="/empresas">Empresas</Link><Link href="/marketplace">Produtos e serviços</Link><Link href="/concursos">Concursos</Link><Link href="/oportunidades">Oportunidades</Link></div>
      <div><h3>Para utilizadores</h3><Link href="/registo">Criar conta</Link><Link href="/login">Entrar</Link><Link href="/empresas">Encontrar empresas</Link><Link href="/marketplace">Encontrar ofertas</Link></div>
      <div><h3>Para organizações</h3><Link href="/parceiros">Publicar e posicionar</Link><Link href="/parceiros#inteligencia">Inteligência e mercado</Link><Link href="/parceiros#servicos">Serviços e estudos</Link><Link href="/contactos">Falar com o MozEmpresas</Link></div>
    </div>
    <div className="container footer-bottom"><span>© {new Date().getFullYear()} MozEmpresas. Todos os direitos reservados.</span><div><span>Termos</span><span>Privacidade</span></div></div>
  </footer>;
}
