export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardSidebar } from "@/components/dashboard-sidebar";

export default async function PartnersPage(){
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user) redirect("/login");
 const {data:owned}=await supabase.from("businesses").select("id,name").eq("owner_id",user.id).order("name");
 const ids=(owned??[]).map(b=>b.id);
 const [{data:relations},{data:directory}]=await Promise.all([
   ids.length?supabase.from("business_partner_relationships").select("id,business_id,partner_business_id,status,relationship_type,created_at").in("business_id",ids).order("created_at",{ascending:false}):Promise.resolve({data:[]}),
   supabase.from("businesses").select("id,name,location,description").eq("is_public",true).order("name").limit(40)
 ]);
 const partnerIds=[...new Set((relations??[]).map(r=>r.partner_business_id))];
 const {data:partnerBusinesses}=partnerIds.length?await supabase.from("businesses").select("id,name,location").in("id",partnerIds):{data:[]};
 const names=new Map((partnerBusinesses??[]).map(b=>[b.id,b]));
 return <div className="dashboard-shell"><DashboardSidebar pathname="/dashboard/parceiros" />
 <main className="dashboard-main"><div className="dashboard-content">
 <div className="dashboard-topbar"><div><span className="dashboard-kicker">Ecossistema</span><h1>Parceiros</h1><p>Construa relações comerciais complementares e mantenha-as visíveis para a equipa.</p></div><Link href="/dashboard" className="btn">Voltar</Link></div>
 <div className="dashboard-stat-grid"><div className="dashboard-stat"><small>Relações activas</small><strong>{(relations??[]).filter(r=>r.status==="ACTIVE").length}</strong><span>Parcerias actualmente activas</span></div><div className="dashboard-stat"><small>Empresas disponíveis</small><strong>{directory?.length??0}</strong><span>Perfis públicos para descoberta</span></div></div>
 <section className="dashboard-section"><div className="dashboard-section-head"><div><span className="dashboard-kicker">As suas relações</span><h2>Parceiros activos</h2></div></div>{relations?.length?<div className="dashboard-list">{relations.map(r=>{const b=names.get(r.partner_business_id);return <Link href={b?"/empresas/"+b.id:"/dashboard/parceiros"} key={r.id}><strong>{b?.name||"Empresa parceira"}</strong><span>{b?.location||"Moçambique"} · {r.relationship_type} · {r.status}</span><b>→</b></Link>})}</div>:<div className="empty"><p>Ainda não existem relações. Explore empresas públicas e transforme relações comerciais em parcerias.</p><Link href="/empresas" className="btn primary">Explorar empresas</Link></div>}</section>
 <section className="dashboard-section" style={{marginTop:14}}><div className="dashboard-section-head"><div><span className="dashboard-kicker">Descoberta</span><h2>Empresas para conhecer</h2><p>A próxima etapa é transformar estas descobertas em relações de negócio.</p></div><Link href="/empresas" className="text-link">Ver directório →</Link></div><div className="dashboard-action-grid">{(directory??[]).filter(b=>!(owned??[]).some(o=>o.id===b.id)).slice(0,6).map(b=><Link className="dashboard-action-card" href={"/empresas/"+b.id} key={b.id}><span className="dashboard-action-icon">{b.name.slice(0,1)}</span><div><strong>{b.name}</strong><small>{b.location||"Moçambique"} · {b.description||"Perfil empresarial público"}</small></div></Link>)}</div></section>
 </div></main></div>
}
