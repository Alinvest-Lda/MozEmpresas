export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ServiceDetail({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params; const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user) redirect("/login");
  const {data:service}=await supabase.from("platform_services").select("id,slug,name,description,category,price,currency,billing").eq("slug",slug).eq("active",true).maybeSingle();
  if(!service) notFound();
  return <div className="dashboard-shell"><main className="dashboard-main"><div className="dashboard-content"><Link href="/dashboard/servicos" className="text-link">← Serviços MozEmpresas</Link><section className="service-detail-card"><span className="dashboard-kicker">{service.category}</span><h1>{service.name}</h1><p>{service.description}</p><div className="service-detail-box"><strong>{service.price != null ? service.price+" "+service.currency : "Preço sob consulta"}</strong><span>Modalidade: {service.billing === "ONE_TIME" ? "Pagamento único" : service.billing === "MONTHLY" ? "Mensal" : service.billing === "ANNUAL" ? "Anual" : "Proposta personalizada"}</span></div><div className="service-detail-actions"><Link href="/contactos" className="btn primary">Solicitar serviço</Link><Link href="/dashboard/servicos" className="btn">Voltar</Link></div></section></div></main></div>;
}
