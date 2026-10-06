"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/auth/actions";
import { PartnerMobileMenu, partnerNavGroups } from "@/components/partner-mobile-menu";
export function PartnerSidebar(){
 const pathname=usePathname()||"/parceiro"; const active=(href:string)=>href==="/parceiro"?pathname===href:pathname===href||pathname.startsWith(href+"/");
 return <><PartnerMobileMenu/><aside className="dashboard-sidebar partner-sidebar">
  <div className="dashboard-brand partner-brand"><small>Área de parceiro</small><strong>MozEmpresas</strong></div>
  <nav className="dashboard-sidebar-nav" aria-label="Navegação da área de parceiro">
   {partnerNavGroups.map(group=><div className="dashboard-nav-group" key={group.label}><span>{group.label}</span>{group.links.map(([href,label])=><Link key={href} className={"dashboard-nav-link"+(active(href)?" active":"")} href={href} aria-current={active(href)?"page":undefined}><i className="nav-dot"/>{label}</Link>)}</div>)}
  </nav>
  <div className="dashboard-user"><Link className="dashboard-account-link" href="/parceiro/conta">A minha conta</Link><form action={signOut} className="dashboard-signout-form"><button className="btn header-signout full" type="submit">Sair</button></form></div>
 </aside></>;
}