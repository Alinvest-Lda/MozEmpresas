"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/auth/actions";

export const partnerNavGroups=[
  {label:"Workspace",links:[["/parceiro","Visão geral"]]},
  {label:"Publicar",links:[["/parceiro/oportunidades","Oportunidades publicadas"],["/parceiro/oportunidades/nova","Nova publicação"]]},
  {label:"Posicionar",links:[["/parceiro/publicidade","Publicidade e campanhas"]]},
  {label:"Compreender",links:[["/parceiro/inteligencia","Inteligência e mercado"],["/parceiro/resultados","Actividade e histórico"]]},
  {label:"Contratar",links:[["/parceiro/servicos","Serviços e estudos"]]},
  {label:"Organização",links:[["/parceiro/conta","Conta, gestores e segurança"]]}
] as const;

export function PartnerMobileMenu(){
  const pathname=usePathname()||"/parceiro";
  const [open,setOpen]=useState(false);
  useEffect(()=>setOpen(false),[pathname]);
  useEffect(()=>{document.body.style.overflow=open?"hidden":"";return()=>{document.body.style.overflow=""}},[open]);
  const active=(h:string)=>{if(h==="/parceiro")return pathname===h;if(h==="/parceiro/oportunidades")return pathname===h||pathname.startsWith(h+"/")&&!pathname.startsWith(h+"/nova");return pathname===h||pathname.startsWith(h+"/")};
  return <>
    <button className={"partner-mobile-trigger"+(open?" open":"")} type="button" onClick={()=>setOpen(v=>!v)} aria-label={open?"Fechar menu":"Abrir menu"} aria-expanded={open} aria-controls="partner-mobile-menu"><span/><span/><span/></button>
    {open&&<button type="button" className="partner-mobile-backdrop" onClick={()=>setOpen(false)} aria-label="Fechar menu"/>}
    <aside id="partner-mobile-menu" className={"partner-mobile-panel"+(open?" open":"")} aria-label="Menu do parceiro">
      <div className="partner-mobile-head"><div><small>MOZEMPRESAS</small><b>PARTNER WORKSPACE</b></div><button type="button" onClick={()=>setOpen(false)} aria-label="Fechar">×</button></div>
      <nav>{partnerNavGroups.map(g=><div key={g.label}><span>{g.label}</span>{g.links.map(([h,l])=><Link key={h} href={h} className={active(h)?"active":""}><i aria-hidden="true"/><span>{l}</span></Link>)}</div>)}</nav>
      <div className="partner-mobile-foot"><Link href="/parceiro/conta">Conta e gestores</Link><form action={signOut}><button type="submit">Terminar sessão</button></form></div>
    </aside>
  </>;
}
