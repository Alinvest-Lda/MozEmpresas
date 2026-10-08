"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/auth/actions";
import { PartnerMobileMenu, partnerNavGroups } from "@/components/partner-mobile-menu";

export function PartnerSidebar(){
  const pathname=usePathname()||"/parceiro";
  const active=(h:string)=>h==="/parceiro"?pathname===h:pathname===h||pathname.startsWith(h+"/");
  return <>
    <PartnerMobileMenu/>
    <aside className="partner-sidebar">
      <div className="partner-brand"><div className="partner-brand-mark">M</div><div><small>MOZEMPRESAS</small><strong>PARTNER WORKSPACE</strong></div></div>
      <div className="partner-account-badge"><span>Conta parceira</span><b>Activa</b></div>
      <nav className="partner-nav" aria-label="Navegação do parceiro">
        {partnerNavGroups.map(g=><div className="partner-nav-group" key={g.label}><span>{g.label}</span>{g.links.map(([h,l])=><Link key={h} className={"partner-nav-link"+(active(h)?" active":"")} href={h} aria-current={active(h)?"page":undefined}><i aria-hidden="true"/><span>{l}</span></Link>)}</div>)}
      </nav>
      <div className="partner-sidebar-foot"><Link href="/parceiro/conta">Conta e gestores</Link><form action={signOut}><button type="submit">Terminar sessão</button></form></div>
    </aside>
  </>;
}
