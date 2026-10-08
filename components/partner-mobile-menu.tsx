"use client";
import { useEffect,useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/lib/auth/actions";

export const partnerNavGroups=[
  {label:"Visão geral",links:[["/parceiro","Centro executivo"]]},
  {label:"Actividade",links:[["/parceiro/oportunidades","Publicações"],["/parceiro/oportunidades/nova","Nova publicação"]]},
  {label:"Exposição",links:[["/parceiro/publicidade","Publicidade e campanhas"]]},
  {label:"Inteligência",links:[["/parceiro/inteligencia","Mercado e insights"],["/parceiro/resultados","Desempenho e histórico"]]},
  {label:"Valor",links:[["/parceiro/servicos","Produtos e serviços"]]},
  {label:"Explorar",links:[["/empresas","Directório empresarial"],["/marketplace","Produtos e serviços do mercado"],["/concursos","Concursos"],["/oportunidades","Oportunidades públicas"]]},
  {label:"Conta",links:[["/parceiro/conta","Conta e gestores"]]}
] as const;

export function PartnerMobileMenu(){
  const pathname=usePathname()||"/parceiro";
  const [open,setOpen]=useState(false);
  useEffect(()=>setOpen(false),[pathname]);
  useEffect(()=>{document.body.style.overflow=open?"hidden":"";return()=>{document.body.style.overflow=""}},[open]);
  const active=(h:string)=>h==="/parceiro"?pathname===h:pathname===h||pathname.startsWith(h+"/");
  return <>
    <button className="partner-mobile-trigger" type="button" onClick={()=>setOpen(v=>!v)} aria-label={open?"Fechar menu":"Abrir menu"} aria-expanded={open}><span/><span/><span/></button>
    {open&&<button className="partner-mobile-backdrop" onClick={()=>setOpen(false)} aria-label="Fechar menu"/>}
    <aside className={"partner-mobile-panel"+(open?" open":"")} aria-label="Menu do parceiro">
      <div className="partner-mobile-head"><div><small>MOZEMPRESAS</small><b>PARTNER WORKSPACE</b></div><button onClick={()=>setOpen(false)} aria-label="Fechar">×</button></div>
      <nav>{partnerNavGroups.map(g=><div key={g.label}><span>{g.label}</span>{g.links.map(([h,l])=><Link key={h} href={h} className={active(h)?"active":""}><i aria-hidden="true"/><span>{l}</span></Link>)}</div>)}</nav>
      <div className="partner-mobile-foot"><Link href="/parceiro/conta">A minha conta</Link><form action={signOut}><button type="submit">Terminar sessão</button></form></div>
    </aside>
  </>;
}
