import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const typeLabel: Record<string,string> = { PRODUCT:"Produto", SERVICE:"Serviço" };

export default async function Marketplace({ searchParams }: { searchParams: Promise<{q?:string;type?:string;location?:string}> }) {
  const params = await searchParams;
  const supabase = await createClient();
  let query = supabase.from("listings")
    .select("id,title,slug,description,type,status,price,currency,location,business_id,created_at")
    .eq("status","PUBLISHED").order("created_at",{ascending:false}).limit(48);

  if (params.q?.trim()) query = query.or(`title.ilike.%${params.q.trim()}%,description.ilike.%${params.q.trim()}%`);
  if (params.type && params.type !== "all") query = query.eq("type", params.type);
  if (params.location?.trim()) query = query.ilike("location", `%${params.location.trim()}%`);
  const {data:listings,error}=await query;

  const businessIds=[...new Set((listings||[]).map(x=>x.business_id).filter(Boolean))];
  const {data:businesses}=businessIds.length ? await supabase.from("businesses").select("id,name,slug").in("id",businessIds) : {data:[]};
  const names=new Map((businesses||[]).map(b=>[b.id,b]));

  return <main className="page"><div className="container">
    <div className="page-header page-header-row"><div><span className="eyebrow">Marketplace</span><h1>Produtos e serviços</h1><p className="muted">Descubra ofertas publicadas por empresas em Moçambique.</p></div><Link href="/dashboard" className="btn primary">Publicar oferta</Link></div>
    <form className="toolbar" action="/marketplace">
      <input name="q" defaultValue={params.q} style={{flex:1}} placeholder="Produto, serviço ou palavra-chave..." />
      <input name="location" defaultValue={params.location} placeholder="Localização" />
      <select name="type" defaultValue={params.type || "all"}><option value="all">Todos os tipos</option><option value="PRODUCT">Produtos</option><option value="SERVICE">Serviços</option></select>
      <button className="btn primary">Pesquisar</button>
    </form>
    <div className="result-bar"><span>{listings?.length ?? 0} ofertas publicadas</span><span>Marketplace empresarial</span></div>
    {error && <div className="notice">Não foi possível carregar as ofertas neste momento.</div>}
    <div className="grid">{listings?.map(item => {
      const business=names.get(item.business_id);
      return <Link href={"/marketplace/"+item.id} className="card listing" key={item.id}>
        <div className="listing-top"><span className="tag">{typeLabel[item.type] || item.type}</span><span className="status-dot">Publicado</span></div>
        <h3>{item.title}</h3><p>{item.description}</p>
        {business && <span className="muted" style={{fontSize:12,marginTop:10}}>{business.name}</span>}
        <div className="listing-bottom"><strong>{item.price != null ? `${item.price} ${item.currency || "MZN"}` : "Sob consulta"}</strong><span>Ver oferta →</span></div>
      </Link>;
    })}</div>
    {(!listings || listings.length===0) && <div className="empty card"><div className="empty-icon">◇</div><h3>Ainda não existem ofertas publicadas</h3><p>As ofertas publicadas pelas empresas aparecerão aqui.</p><Link href="/registo" className="btn primary">Criar conta empresarial</Link></div>}
  </div></main>;
}