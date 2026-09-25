import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Marketplace() {
  const supabase = await createClient();
  const { data: listings } = await supabase.from("listings").select("id,title,description,listing_type,status,price,currency,business_id").eq("status","PUBLISHED").order("created_at",{ascending:false}).limit(24);
  return <div className="page"><div className="container">
    <div className="page-header page-header-row"><div><span className="eyebrow">Marketplace</span><h1>Produtos e serviços</h1><p className="muted">Descubra ofertas publicadas por empresas e profissionais.</p></div><Link href="/dashboard/empresas" className="btn primary">Publicar oferta</Link></div>
    <form className="toolbar marketplace-toolbar"><input name="q" style={{flex:1}} placeholder="Pesquisar produtos ou serviços..." /><select name="type" defaultValue="all"><option value="all">Todos</option><option value="PRODUCT">Produtos</option><option value="SERVICE">Serviços</option></select><button className="btn">Pesquisar</button></form>
    <div className="grid">{listings?.map((item)=><Link href={"/marketplace/"+item.id} className="card listing" key={item.id}><div className="listing-top"><span className="tag">{item.listing_type === "PRODUCT" ? "Produto" : "Serviço"}</span><span className="status-dot">Publicado</span></div><h3>{item.title}</h3><p>{item.description || "Oferta empresarial disponível no marketplace."}</p><div className="listing-bottom"><strong>{item.price != null ? `${item.price} ${item.currency || "MZN"}` : "Sob consulta"}</strong><span>Ver oferta →</span></div></Link>)}
    {(!listings || listings.length === 0) && <div className="empty card"><div className="empty-icon">◇</div><h3>Ainda não existem ofertas publicadas</h3><p>As primeiras ofertas aparecerão aqui assim que as empresas começarem a publicar produtos e serviços.</p><Link href="/registo" className="btn primary">Criar conta</Link></div>}</div>
  </div></div>;
}