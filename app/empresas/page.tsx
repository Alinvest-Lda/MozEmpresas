import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Empresas({searchParams}:{searchParams:Promise<{q?:string;location?:string}>}) {
 const params=await searchParams; const supabase=await createClient();
 let query=supabase.from("businesses").select("id,name,slug,description,location").eq("is_public",true).order("name").limit(60);
 if(params.q) query=query.ilike("name","%"+params.q+"%");
 if(params.location) query=query.ilike("location","%"+params.location+"%");
 const {data:businesses}=await query;
 return <div className="page"><div className="container">
   <div className="page-header page-header-row"><div><span className="eyebrow">Diretório empresarial</span><h1>Empresas</h1><p className="muted">Descubra empresas e potenciais parceiros em Moçambique.</p></div><Link href="/dashboard/empresas" className="btn primary">Registar empresa</Link></div>
   <form className="toolbar"><input name="q" defaultValue={params.q} style={{flex:1}} placeholder="Nome da empresa..." /><input name="location" defaultValue={params.location} placeholder="Localização" /><button className="btn primary">Pesquisar</button></form>
   <div className="result-bar"><span>{businesses?.length ?? 0} empresas encontradas</span><span>Perfis públicos</span></div>
   <div className="grid">{businesses?.map(b=><Link href={"/empresas/"+b.slug} className="card business-card" key={b.id}><div className="business-head"><div className="avatar">{b.name[0]}</div><span className="verified">Perfil público</span></div><h3>{b.name}</h3><div className="meta">{b.location&&<span className="tag">{b.location}</span>}</div><p>{b.description||"Empresa registada no ecossistema MozEmpresas."}</p><span className="card-link">Ver perfil →</span></Link>)}{(!businesses||businesses.length===0)&&<div className="empty card"><div className="empty-icon">⌂</div><h3>Nenhuma empresa encontrada</h3><p>Tente alterar os termos de pesquisa ou seja a primeira empresa a criar um perfil público.</p><Link href="/dashboard/empresas" className="btn primary">Criar perfil empresarial</Link></div>}</div>
 </div></div>;
}