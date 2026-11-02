"use client";
import {useState,type ReactNode} from "react";
import Link from "next/link";
import {usePathname} from "next/navigation";
import {signOut} from "@/lib/auth/actions";

const groups=[
  {label:"Hoje",links:[{label:"Visão geral",href:"/dashboard/admin",mark:"V"}]},
  {label:"Moderação",links:[{label:"Empresas",href:"/dashboard/admin/empresas",mark:"E"},{label:"Ofertas",href:"/dashboard/admin/ofertas",mark:"O"},{label:"Oportunidades",href:"/dashboard/admin/oportunidades",mark:"P"}]},
  {label:"Pedidos",links:[{label:"Publicidade",href:"/dashboard/admin/publicidade",mark:"A"},{label:"Créditos",href:"/dashboard/admin/monetizacao/creditos",mark:"C"},{label:"Atendimentos",href:"/dashboard/admin/suporte",mark:"S"}]},
  {label:"Comércio",links:[{label:"Monetização",href:"/dashboard/admin/monetizacao",mark:"M"}]},
  {label:"Pessoas",links:[{label:"Utilizadores",href:"/dashboard/admin/usuarios",mark:"U"},{label:"Parceiros",href:"/dashboard/admin/parceiros",mark:"R"}]},
  {label:"Sistema",links:[{label:"Biblioteca visual",href:"/dashboard/admin/design-system",mark:"D"}]},
];

export function AdminShell({children}:{children:ReactNode}){
  const pathname=usePathname();
  const [mobileOpen,setMobileOpen]=useState(false);
  const activeHref=groups.flatMap(group=>group.links)
    .filter(link=>pathname===link.href||pathname.startsWith(`${link.href}/`))
    .sort((a,b)=>b.href.length-a.href.length)[0]?.href;

  return <div className="admin-shell">
    <a className="admin-skip-link" href="#admin-main-content">Saltar para o conteúdo</a>
    <header className="admin-topbar">
      <button className="admin-menu-button" type="button" aria-label={mobileOpen?"Fechar navegação":"Abrir navegação"} aria-expanded={mobileOpen} aria-controls="admin-navigation" onClick={()=>setMobileOpen(value=>!value)}>{mobileOpen?"×":"☰"}</button>
      <Link href="/dashboard/admin" className="admin-brand"><span>M</span><span>MozEmpresas<small>Administração global</small></span></Link>
      <div className="admin-topbar-right"><span className="admin-environment"><i/>Produção</span><Link href="/dashboard/conta">Conta</Link></div>
    </header>
    <div className="admin-frame">
      <aside id="admin-navigation" className={`admin-sidebar ${mobileOpen?"admin-sidebar-open":""}`}>
        <nav aria-label="Navegação da administração">
          {groups.map(group=><section className="admin-nav-group" key={group.label}>
            <h2>{group.label}</h2>
            {group.links.map(link=>{
              const active=activeHref===link.href;
              return <Link key={link.href} href={link.href} onClick={()=>setMobileOpen(false)} aria-current={active?"page":undefined} className={active?"admin-nav-active":"admin-nav-link"}><span aria-hidden="true">{link.mark}</span>{link.label}</Link>;
            })}
          </section>)}
        </nav>
        <div className="admin-sidebar-foot"><form action={signOut}><button type="submit">Sair</button></form><small>Plataforma · Moçambique</small></div>
      </aside>
      {mobileOpen?<button type="button" aria-label="Fechar navegação" className="admin-scrim" onClick={()=>setMobileOpen(false)}/>:null}
      <div className="admin-content" id="admin-main-content" tabIndex={-1}>{children}</div>
    </div>
  </div>;
}
