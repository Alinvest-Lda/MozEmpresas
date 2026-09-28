import Link from "next/link";
import { signOut } from "@/lib/auth/actions";

const groups = [
  { label: "Trabalho", links: [["/dashboard","Visão geral"],["/marketplace","Comprar e vender"],["/oportunidades","Oportunidades"],["/concursos","Concursos"]] },
  { label: "Empresa", links: [["/dashboard/empresas","Presença da empresa"],["/dashboard/acessos","Acessos e equipa"],["/empresas","Directório"]] },
  { label: "Relações", links: [["/dashboard/parceiros","Parceiros"],["/dashboard/servicos","Serviços MozEmpresas"]] },
  { label: "Conta", links: [["/dashboard/conta","A minha conta"]] },
] as const;

export function DashboardSidebar({ pathname, platformAccess }: { pathname: string; platformAccess?: string | null }) {
  return <aside className="dashboard-sidebar">
    <div className="dashboard-brand"><small>Área empresarial</small><strong>MozEmpresas</strong></div>
    <nav className="dashboard-sidebar-nav" aria-label="Navegação da área empresarial">
      {groups.map((group) => <div className="dashboard-nav-group" key={group.label}>
        <span>{group.label}</span>
        {group.links.map(([href,label]) => {
          const active = href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
          return <Link className={"dashboard-nav-link" + (active ? " active" : "")} href={href} key={href}><i className="nav-dot" />{label}</Link>;
        })}
      </div>)}
      {platformAccess && <div className="dashboard-nav-group"><span>Plataforma</span><Link className={"dashboard-nav-link" + (pathname.startsWith("/dashboard/admin") ? " active" : "")} href="/dashboard/admin"><i className="nav-dot" />Administração · {platformAccess}</Link></div>}
    </nav>
    <div className="dashboard-user">
      <strong>Conta activa</strong>
      <Link className="dashboard-account-link" href="/dashboard/conta">Gerir conta</Link>
      <form action={signOut} className="dashboard-signout-form"><button className="btn header-signout full" type="submit">Sair</button></form>
    </div>
  </aside>;
}
