import type { ReactNode } from "react";
import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth/partner-access";

export const dynamic = "force-dynamic";

export default async function SuperAdminLayout({ children }: { children: ReactNode }) {
  await requireSuperAdmin("/dashboard/admin");
  return <div className="super-admin-shell">
    <header className="super-admin-header">
      <div className="super-admin-brand">
        <span className="super-admin-mark">ME</span>
        <div><strong>MozEmpresas</strong><span>Super Admin</span></div>
      </div>
      <Link className="btn" href="/dashboard">Voltar ao dashboard</Link>
    </header>
    <nav className="super-admin-nav" aria-label="Navegação administrativa">
      <Link href="/dashboard/admin">Visão geral</Link>
      <Link href="/dashboard/admin/usuarios">Utilizadores</Link>
      <Link href="/dashboard/admin/empresas">Empresas</Link>
      <Link href="/dashboard/admin/oportunidades">Oportunidades</Link>
      <Link href="/dashboard/admin/publicidade">Publicidade</Link>
      <Link href="/dashboard/admin/monetizacao">Monetização</Link>
      <Link href="/dashboard/admin/suporte">Suporte</Link>
      <Link href="/admin/parceiros">Parceiros</Link>
    </nav>
    <div className="super-admin-content">{children}</div>
  </div>;
}
