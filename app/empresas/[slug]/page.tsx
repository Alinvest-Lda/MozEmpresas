import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function BusinessDetail({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params; const supabase=await createClient();
  const {data:business}=await supabase.from("businesses").select("id,name,slug,description,location,phone,email,website,logo_url,cover_url,created_at").eq("slug",slug).eq("is_public",true).maybeSingle();
  if(!business) notFound();
  const [{data:listings},{data:reviews}]=await Promise.all([
    supabase.from("listings").select("id,title,description,type,price,currency").eq("business_id",business.id).eq("status","PUBLISHED").order("created_at",{ascending:false}).limit(6),
    supabase.from("reviews").select("rating,body,created_at").eq("resource_type","business").eq("resource_id",business.id).order("created_at",{ascending:false}).limit(6)
  ]);
  const avg=reviews?.length ? (reviews.reduce((s,r)=>s+r.rating,0)/reviews.length).toFixed(1) : null;
  return <main className="page"><div className="container"><Link href="/empresas" className="muted">← Voltar ao directório</Link>
    <div className="business-profile"><section className="card business-profile-main">
      {business.cover_url&&<img className="business-cover" src={business.cover_url} alt="" />}
      <div className="business-profile-head"><div className="avatar business-avatar">{business.logo_url?<img src={business.logo_url} alt="" />:business.name[0]}</div><div><span className="eyebrow">Empresa</span><h1>{business.name}</h1><p className="muted">{business.location||"Moçambique"}</p></div></div>
      <p className="detail-description">{business.description||"Este perfil ainda não tem uma descrição."}</p>
      <div className="meta">{business.phone&&<span className="tag">{business.phone}</span>}{business.email&&<span className="tag">{business.email}</span>}{avg&&<span className="tag">Avaliação {avg}/5</span>}</div>
      {business.website&&<a className="btn primary" style={{marginTop:18}} href={business.website} target="_blank" rel="noreferrer">Visitar website →</a>}
    </section><aside className="card business-contact"><span className="eyebrow">Contacto</span><h3>Fale com esta empresa</h3><p className="muted">Use os dados públicos disponibilizados pela empresa para iniciar o contacto.</p>{business.phone&&<a className="btn primary full" href={"tel:"+business.phone}>Ligar</a>}{business.email&&<a className="btn full" style={{marginTop:9}} href={"mailto:"+business.email}>Enviar email</a>}<Link className="btn full" style={{marginTop:9}} href="/registo">Criar conta</Link></aside></div>
    <section className="detail-section"><div className="section-head"><div><span className="eyebrow">Ofertas</span><h2>Produtos e serviços</h2></div></div>{listings?.length?<div className="grid">{listings.map(item=><Link href={"/marketplace/"+item.id} className="card listing" key={item.id}><span className="tag" style={{width:"fit-content"}}>{item.type==="PRODUCT"?"Produto":"Serviço"}</span><h3>{item.title}</h3><p>{item.description}</p><div className="listing-bottom"><strong>{item.price!=null?item.price+" "+(item.currency||"MZN"):"Sob consulta"}</strong><span>Ver oferta →</span></div></Link>)}</div>:<div className="empty card"><h3>Sem ofertas publicadas</h3><p>Esta empresa ainda não publicou produtos ou serviços.</p></div>}</section>
    <section className="detail-section"><div className="section-head"><div><span className="eyebrow">Experiência</span><h2>Avaliações</h2></div></div>{reviews?.length?<div className="review-list">{reviews.map((r,i)=><article className="card review-card" key={i}><strong>{"★".repeat(r.rating)}{"☆".repeat(5-r.rating)}</strong><p>{r.body||"Sem comentário."}</p><small className="muted">{new Date(r.created_at).toLocaleDateString("pt-MZ")}</small></article>)}</div>:<div className="empty card"><h3>Ainda sem avaliações</h3><p>As avaliações públicas aparecerão aqui.</p></div>}</section>
  </div></main>;
}