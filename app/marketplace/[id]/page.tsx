import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createOrder } from "@/lib/commerce/actions";

export default async function ListingPage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params; const supabase=await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  if (!claimsData?.claims?.sub) redirect("/login?next=/marketplace/" + encodeURIComponent(id));
  const {data:item}=await supabase.from("listings").select("id,title,slug,description,type,status,price,currency,location,business_id,created_at").eq("id",id).eq("status","PUBLISHED").maybeSingle();
  if(!item) notFound();
  let business=null;
  if(item.business_id){const {data}=await supabase.from("businesses").select("id,name,slug,location,phone,email,website").eq("id",item.business_id).maybeSingle();business=data;}
  return <main className="page"><div className="container">
    <Link href="/marketplace" className="muted">← Voltar ao marketplace</Link>
    <div className="detail-grid"><article className="card detail-card">
      <div className="listing-top"><span className="tag">{item.type==="PRODUCT"?"Produto":"Serviço"}</span><span className="status-dot">Publicado</span></div>
      <h1>{item.title}</h1><p className="detail-description">{item.description}</p>
      <div className="detail-price">{item.price!=null ? item.price+" "+(item.currency||"MZN") : "Sob consulta"}</div>
      {item.location&&<p className="muted" style={{marginTop:12}}>Disponível em {item.location}</p>}
    </article>
    <aside className="card"><span className="eyebrow">Fornecedor</span><h3>{business?.name||"Empresa participante"}</h3>
      {business?.location&&<p className="muted">{business.location}</p>}
      {business?.slug&&<Link href={"/empresas/"+business.slug} className="btn primary full">Ver empresa</Link>}
      {business?.phone&&<a href={"tel:"+business.phone} className="btn full" style={{marginTop:9}}>Contactar por telefone</a>}
      {business?.email&&<a href={"mailto:"+business.email} className="btn full" style={{marginTop:9}}>Enviar email</a>}
      <div className="detail-action-panel">
        <span className="eyebrow">Negociação comercial</span>
        <p className="muted">O MozEmpresas não processa pagamentos. Registe o seu interesse e combine directamente com o fornecedor.</p>
        <form action={createOrder} className="detail-action-form">
          <input type="hidden" name="listing_id" value={item.id} />
          <input type="number" name="quantity" min="1" step="1" defaultValue="1" aria-label="Quantidade" />
          <textarea name="notes" rows={3} placeholder="Mensagem ou necessidade específica (opcional)." aria-label="Mensagem" />
          <button className="btn primary full" type="submit">Tenho interesse →</button>
        </form>
      </div>
    </aside></div>
    <section className="detail-section"><span className="eyebrow">Sobre a oferta</span><h2>Informação da publicação</h2><div className="meta"><span className="tag">{item.type==="PRODUCT"?"Produto":"Serviço"}</span>{item.location&&<span className="tag">{item.location}</span>}<span className="tag">Publicado em {new Date(item.created_at).toLocaleDateString("pt-MZ")}</span></div></section>
  </div></main>;
}