"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/auth/actions";

export const partnerNavGroups = [
 {label:"Trabalho",links:[["/parceiro","Visão geral"],["/parceiro/oportunidades","Minhas oportunidades"]]},
 {label:"Serviços",links:[["/parceiro/servicos","Serviços"]]},
 {label:"Actividade",links:[["/parceiro/resultados","Actividade"]]},
 {label:"Conta",links:[["/parceiro/conta","Perfil e gestores"]]},
] as const;

export function PartnerMobileMenu(){
 const pathname=usePathname()||"/parceiro"; const [open,setOpen]=useState(false);
 useEffect(()=>{setOpen(false)},[pathname]); useEffect(()=>{document.body.style.overflow=open?"hidden":"";return()=>{document.body.style.overflow=""}},[open]);
 const active=(href:string)=>href==="/parceiro"?pathname===href:pathname===href||pathname.startsWith(href+"/");
 return <>
  <button type="button" className={"dashboard-mobile-trigger"+(open?" open":"")} aria-label={open?"Fechar menu":"Abrir menu"} aria-expanded={open} aria-controls="partner-mobile-menu" onClick={()=>setOpen(v=>!v)}><span/><span/><span/></button>
  {open?<button type="button" className="dashboard-mobile-backdrop" aria-label="Fechar menu" onClick={()=>setOpen(false)}/>:null}
  <aside id="partner-mobile-menu" className={"dashboard-mobile-menu"+(open?" open":"")} aria-hidden={!open}>
   <div className="dashboard-mobile-menu-head"><div><small>Área de parceiro</small><strong>MozEmpresas</strong></div><button type="button" className="dashboard-mobile-close" aria-label="Fechar menu" onClick={()=>setOpen(false)}>×</button></div>
   <nav className="dashboard-mobile-nav" aria-label="Navegação móvel da área de parceiro">
    {partnerNavGroups.map(group=><div className="dashboard-mobile-nav-group" key={group.label}><span>{group.label}</span>{group.links.map(([href,label])=><Link key={href} href={href} className={"dashboard-mobile-nav-link"+(active(href)?" active":"")} aria-current={active(href)?"page":undefined} onClick={()=>setOpen(false)}><i className="nav-dot"/><span>{label}</span></Link>)}</div>)}
   </nav>
   <div className="dashboard-mobile-user"><Link href="/parceiro/conta" onClick={()=>setOpen(false)}>A minha conta</Link><form action={signOut}><button className="btn header-signout full" type="submit">Sair</button></form></div>
  </aside>
 </>;
}