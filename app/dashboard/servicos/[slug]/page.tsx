export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requestPlatformService } from "@/lib/services/actions";
export default async function ServiceDetail({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params;
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect("/login");
  const [{data:service},{data:businesses}]=await Promise.all([
    supabase.from("platform_services").select("id,slug,name,description,category,price,currency,billing").eq("slug",slug).eq("active",true).maybeSingle(),
    supabase.from("businesses").select("id,name").eq("owner_id",user.id).order("name")
  ]);
  if(!service) notFound();
  return <main className="dashboard-main"><div className="dashboard-content">
    <Link href="/dashboard/servicos" className="text-link">← Serviços MozEmpresas</Link>
    <section className="service-detail-card">
      <span className="dashboard-kicker">{service.category}</span><h1>{service.name}</h1><p>{service.description}</p>
      <div className="service-detail-box"><strong>{service.price != null ? service.price+" "+service.currency : "Preço sob consulta"}</strong><span>{service.billing === "ONE_TIME" ? "Pagamento único" : service.billing === "MONTHLY" ? "Mensal" : service.billing === "ANNUAL" ? "Anual" : "Proposta personalizada"}</span></div>
      <form action={async (formData) => { await requestPlatformService(formData); }} className="service-request-form">
        <input type="hidden" name="serviceId" value={service.id}/>
        {businesses?.length ? <label><span>Solicitar em nome de</span><select name="businessId" defaultValue={businesses[0].id}>{businesses.map(b=><option value={b.id} key={b.id}>{b.name}</option>)}</select></label> : null}
        <label><span>O que precisa?</span><textarea name="notes" rows={5} placeholder="Descreva brevemente o objectivo, prazo ou contexto."></textarea></label>
        <div className="service-detail-actions"><button className="btn primary" type="submit">Solicitar serviço</button><Link href="/dashboard/servicos" className="btn">Voltar</Link></div>
      </form>
    </section>
  </div></main>;
}