import Link from "next/link";
import type { ReactNode } from "react";

export function PartnerPage({ eyebrow, title, description, action, children }: {
  eyebrow: string; title: string; description: string; action?: { href: string; label: string }; children: ReactNode;
}) {
  return <main className="dashboard-main partner-workspace"><div className="dashboard-content">
    <header className="partner-page-hero"><div><span className="dashboard-kicker">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action && <Link href={action.href} className="btn primary">{action.label} →</Link>}</header>
    {children}
  </div></main>;
}
export function PartnerSection({ eyebrow, title, description, children, action }: { eyebrow?: string; title: string; description?: string; children: ReactNode; action?: { href: string; label: string } }) {
  return <section className="partner-section dashboard-section"><div className="partner-section-head dashboard-section-head"><div>{eyebrow && <span className="dashboard-kicker">{eyebrow}</span>}<h2>{title}</h2>{description && <p>{description}</p>}</div>{action && <Link href={action.href} className="text-link">{action.label} →</Link>}</div>{children}</section>;
}
export function PartnerMetric({ label, value, detail, featured = false }: { label: string; value: ReactNode; detail: string; featured?: boolean }) {
  return <article className={"partner-metric dashboard-stat" + (featured ? " partner-metric-featured" : "")}><small>{label}</small><strong>{value}</strong><span>{detail}</span></article>;
}
export function PartnerEmpty({ title, text, href, label }: { title: string; text: string; href?: string; label?: string }) {
  return <div className="partner-empty empty"><strong>{title}</strong><p>{text}</p>{href && label && <Link href={href} className="btn primary">{label}</Link>}</div>;
}
