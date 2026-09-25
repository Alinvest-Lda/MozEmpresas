import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ListingPage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  const supabase=await createClient();
  const {data:item}=await supabase.from("listings").select("id,title,description,listing_type,status,price,currency,business_id,created_at").eq("id",id).eq("status","PUBLISHED").maybeSingle();
  if(!item) notFound();
  let business=null;
  if(item.business_id){
    const {data}=await supabase.from("businesses").select("name,slug,location").eq("id",item.business_id).maybeSingle();
    business=data;
  }
  return <div className="page"><div className="container">
    <Link href="/marketplace" className="card-link">← Voltar ao marketplace</Link>
    <div className="detail-grid">
      <article className="card detail-card">
        <div className="listing-top"><span className="tag">{item.listing_type==="PRODUCT"?"Produto":"Serviço"}</span><span className="status-dot">Publicado</span></div>
        <h1>{item.title}</h1>
        <p className="detail-description">{item.description||"Oferta empresarial disponível no marketplace MozEmpresas."}</p>
        <div className="detail-price">{item.price!=null?`${item.price} ${item.currency||"MZN"}`:"Sob consulta"}</div>
      </article>
      <aside className="card">
        <span className="eyebrow">Fornecedor</span>
        <h3>{business?.name||"Empresa participante"}</h3>
        {business?.location&&<p className="muted">{business.location}</p>}
        {business?.slug&&<Link href={"/empresas/"+business.slug} className="btn primary full">Ver empresa</Link>}
        <button className="btn full" style={{marginTop:10}}>Contactar fornecedor</button>
      </aside>
    </div>
  </div></div>;
}