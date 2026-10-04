"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/auth/actions";

const groups = [
  { label: "Centro", links: [["/parceiro","Início"],["/parceiro/empresas","Empresas"],["/parceiro/oportunidades","Oportunidades"]] },
  { label: "Operação", links: [["/parceiro/servicos","Serviços"],["/parceiro/indicacoes","Indicações e recomendações"],["/parceiro/resultados","Resultados"]] },
  { label: "Conta", links: [["/parceiro/conta","Conta do parceiro"]] },
] as const;

export function PartnerSidebar() {
  const pathname = usePathname() || "/parceiro";
  return <aside className="partner-sidebar">
    <Link href="/parceiro" className="partner-brand"><small>Área de parceiro</small><strong>MozEmpresas</strong></Link>
    <nav aria-label="Navegação do parceiro">
      {groups.map(group => <div className="partner-nav-group" key={group.label}>
        <span>{group.label}</span>
        {group.links.map(([href,label]) => {
          const active = href === "/parceiro" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
          return <Link key={href} href={href} className={active ? "active" : ""} aria-current={active ? "page" : undefined}><i />{label}</Link>;
        })}
      </div>)}
    </nav>
    <div className="partner-sidebar-bottom"><Link href="/dashboard">Área empresarial</Link><form action={signOut}><button className="btn header-signout full" type="submit">Sair</button></form></div>
  </aside>;
}