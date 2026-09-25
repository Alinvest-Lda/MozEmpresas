import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {createBusiness} from "@/lib/businesses/actions";
import {BusinessForm} from "@/components/business-form";
export default async function MyBusinesses(){
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)redirect("/login");
 const{data:businesses}=await supabase.from("businesses").select("id,name,slug,description,location,is_public,created_at").eq("owner_id",user.id).order("created_at",{ascending:false});
 return <div className="page"><div className="container"><div className="page-header"><span className="eyebrow">Gestão</span><h1>Minhas empresas</h1><p className="muted">Crie e mantenha os perfis empresariais associados à sua conta.</p></div><div className="grid" style={{marginBottom:32}}>{businesses?.map(b=><Link href={"/empresas/"+b.slug} className="card" key={b.id}><div className="icon">{b.name[0]}</div><h3>{b.name}</h3><div className="meta"><span className="tag">{b.location||"Sem localização"}</span><span className="tag">{b.is_public?"Pública":"Privada"}</span></div><p style={{marginTop:12}}>{b.description||"Sem descrição."}</p></Link>)}{(!businesses||businesses.length===0)&&<div className="notice">Ainda não tem empresas. Use o formulário abaixo para criar a primeira.</div>}</div><h2 style={{marginBottom:16}}>Nova empresa</h2><BusinessForm action={createBusiness}/></div></div>
}