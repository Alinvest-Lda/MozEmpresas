import Link from "next/link";
import type { ReactNode } from "react";

export function PartnerPage({eyebrow,title,description,action,children}:{eyebrow:string;title:string;description:string;action?:{href:string;label:string};children:ReactNode}){
  return <main className="partner-main">
    <div className="partner-topbar">
      <div className="partner-topbar-left"><span>MOZEMPRESAS</span><b>/</b><strong>PARTNER WORKSPACE</strong><b>/</b><span>{eyebrow}</span></div>
      <div className="partner-topbar-right"><span className="partner-topbar-account"><i/> Conta activa</span><Link href="/parceiro/conta" className="partner-topbar-link">Conta →</Link></div>
    </div>
    <div className="partner-content">
      <header className="partner-page-hero">
        <div className="partner-hero-copy"><span className="partner-kicker">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>
        {action&&<Link href={action.href} className="partner-primary-action">{action.label}<b>→</b></Link>}
      </header>
      {children}
    </div>
  </main>
}
export function PartnerSection({eyebrow,title,description,children,action}:{eyebrow?:string;title:string;description?:string;children:ReactNode;action?:{href:string;label:string}}){
  return <section className="partner-section"><div className="partner-section-head"><div>{eyebrow&&<span className="partner-kicker">{eyebrow}</span>}<h2>{title}</h2>{description&&<p>{description}</p>}</div>{action&&<Link href={action.href} className="partner-inline-action">{action.label} →</Link>}</div>{children}</section>
}
export function PartnerMetric({label,value,detail,featured=false}:{label:string;value:ReactNode;detail:string;featured?:boolean}){
  return <article className={"partner-metric"+(featured?" featured":"")}><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>
}
export function PartnerEmpty({title,text,href,label}:{title:string;text:string;href?:string;label?:string}){
  return <div className="partner-empty"><strong>{title}</strong><p>{text}</p>{href&&label&&<Link href={href} className="partner-primary-action">{label} →</Link>}</div>
}
