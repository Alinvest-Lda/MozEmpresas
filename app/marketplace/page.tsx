import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const types=[["PRODUCT","Produtos"],["SERVICE","Serviços"]] as const;

export default async function Marketplace({searchParams}:{searchParams:Promise<{q?:string;type?:string;location?:string}>}) {
  const params=await searchParams;
  let listings: Array<{id:string;title:string;description:string;type:"PRODUCT"|"SERVICE";price:number|null;currency:string|null;location:string|null;business_id:string|null}> = [];
  let error=false;
  try {
    const supabase=await createClient();
    let query=supabase.from("listings").select("id,title,description,type,price,currency,location,business_id").eq("status","PUBLISHED").order("created_at",{ascending:false}).limit(48);
    const q=params.q?.trim();
    if(q){const safe=q.replace(/[%_,()]/g," ").replace(/\s+/g," ").trim();if(safe) query=query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%`);}
    if(params.type&&params.type!=="all") query=query.eq("type",params.type);
    if(params.location?.trim()) query=query.ilike("location",`%${params.location.trim()}%`);
    const result=await query; listings=result.data??[]; error=Boolean(result.error);
    const ids=[...new Set(listings.map(x=>x.business_id).filter(Boolean))];
    if(ids.length){const {data:businesses}=await supabase.from("businesses").select("id,name").in("id",ids);const names=new Map((businesses??[]).map(b=>[b.id,b.name]));listings=listings.map(x=>({...x,business_id:x.business_id?names.get(x.business_id)??x.business_id:null}));}
  } catch { error=true; }
  return <main className="page"><div className="container"><section className="page-header"><span className="eyebrow">Marketplace empresarial</span><h1>Produtos e serviços para o mercado.</h1><p className="muted page-lead">Descubra o que empresas em Moçambique estão a vender e a fornecer. Compare ofertas e entre directamente em contacto com o fornecedor.</p></section>
    <form className="toolbar" action="/marketplace"><input name="q" defaultValue={params.q} placeholder="Produto, serviço ou palavra-chave" /><input name="location" defaultValue={params.location} placeholder="Localização" /><select name="type" defaultValue={params.type||"all"}><option value="all">Produtos e serviços</option>{types.map(([v,l])=><option value={v} key={v}>{l}</option>)}</select><button className="btn primary">Pesquisar</button></form>
    <section className="section page-section"><div className="section-head"><div><span className="eyebrow">Como utilizar</span><h2>Encontre uma oferta. Conheça o fornecedor. Contacte.</h2></div><Link href="/registo" className="text-link">Publicar oferta →</Link></div><div className="grid"><div className="card module-card"><span className="module-number">01</span><h3>Pesquise</h3><p>Procure por produto, serviço, sector ou localização.</p></div><div className="card module-card"><span className="module-number">02</span><h3>Compare</h3><p>Consulte detalhes da oferta e identifique quem fornece.</p></div><div className="card module-card"><span className="module-number">03</span><h3>Contacte</h3><p>Abra o perfil da oferta e avance para o contacto comercial.</p></div></div></section>
    <div className="result-bar"><strong>{listings.length} ofertas publicadas</strong><span>Marketplace empresarial</span></div>{error&&<div className="notice">O marketplace está temporariamente indisponível. Pode continuar a navegar pelo portal.</div>}<div className="grid">{listings.map(item=><Link href={"/marketplace/"+item.id} className="card listing" key={item.id}><div className="listing-top"><span className="tag">{item.type==="PRODUCT"?"Produto":"Serviço"}</span><span className="status-dot">Publicado</span></div><h3>{item.title}</h3><p>{item.description}</p>{item.business_id&&<span className="muted listing-business">{item.business_id}</span>}<div className="listing-bottom"><strong>{item.price!=null?`${item.price} ${item.currency||"MZN"}`:"Sob consulta"}</strong><span>Ver oferta →</span></div></Link>)}{listings.length===0&&<div className="empty card"><div className="empty-icon">◇</div><h3>Ainda não existem ofertas publicadas</h3><p>As empresas poderão apresentar aqui os seus produtos e serviços.</p><Link href="/registo" className="btn primary">Criar presença empresarial</Link></div>}</div>
  </div></main>;
}