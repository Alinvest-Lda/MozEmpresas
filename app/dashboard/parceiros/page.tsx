export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function PartnersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: businesses } = await supabase.from("businesses").select("id,name,slug,location").eq("owner_id", user.id).order("name");
  const businessIds = (businesses ?? []).map((b) => b.id);
  const [{ data: listings }, { data: opportunities }] = await Promise.all([
    businessIds.length ? supabase.from("listings").select("id,title,type,status").in("business_id", businessIds).limit(12) : Promise.resolve({data: [] as {id:string;title:string;type:string;status:string}[]}),
    supabase.from("opportunities").select("id,title,status,type").eq("owner_id", user.id).limit(12),
  ]);

  return <div className="page"><div className="container">
    <div className="page-header-row page-header">
      <div><span className="eyebrow">Ecossistema</span><h1>Painel dos parceiros</h1><p className="muted">Uma área para acompanhar relações, ofertas, oportunidades e novas possibilidades de negócio.</p></div>
      <Link href="/dashboard" className="btn">Voltar ao painel</Link>
    </div>
    <div className="grid">
      <div className="card"><span className="muted">Empresas</span><h2>{businesses?.length ?? 0}</h2><p>Presenças sob a sua gestão.</p></div>
      <div className="card"><span className="muted">Ofertas</span><h2>{listings?.length ?? 0}</h2><p>Produtos e serviços activos.</p></div>
      <div className="card"><span className="muted">Oportunidades</span><h2>{opportunities?.length ?? 0}</h2><p>Oportunidades publicadas.</p></div>
    </div>
    <div className="grid" style={{marginTop:18}}>
      <section className="card"><span className="eyebrow">Vender</span><h2 style={{marginTop:10}}>Ofertas da rede</h2>{listings?.length ? listings.map(x=><div key={x.id} style={{padding:"12px 0",borderBottom:"1px solid var(--line)"}}><strong>{x.title}</strong><p className="muted" style={{margin:"4px 0 0",fontSize:12}}>{x.type} · {x.status}</p></div>) : <p className="muted">Ainda não existem ofertas associadas às suas empresas.</p>}</section>
      <section className="card"><span className="eyebrow">Oportunidades</span><h2 style={{marginTop:10}}>Actividade</h2>{opportunities?.length ? opportunities.map(x=><div key={x.id} style={{padding:"12px 0",borderBottom:"1px solid var(--line)"}}><strong>{x.title}</strong><p className="muted" style={{margin:"4px 0 0",fontSize:12}}>{x.type} · {x.status}</p></div>) : <p className="muted">Explore oportunidades para criar novas relações.</p>}</section>
    </div>
  </div></div>;
}
