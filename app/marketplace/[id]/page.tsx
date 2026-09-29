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
  const { data: attachments } = await supabase.from("listing_attachments").select("id,file_name,mime_type,size_bytes,kind,storage_path,created_at").eq("listing_id", id).order("created_at", { ascending: true });
  const media = (attachments ?? []).map((file) => ({ ...file, url: supabase.storage.from("listing-media").getPublicUrl(file.storage_path).data.publicUrl }));
  let business=null;
  if(item.business_id){const {data}=await supabase.from("businesses").select("id,name,slug,location,phone,email,website").eq("id",item.business_id).maybeSingle();business=data;}
  return <main className="page"><div className="container">
    <Link href="/marketplace" className="muted">← Voltar ao marketplace</Link>
    <div className="detail-grid"><article className="card detail-card">
      <div className="listing-top"><span className="tag">{item.type==="PRODUCT"?"Produto":"Serviço"}</span><span className="status-dot">Publicado</span></div>
      <h1>{item.title}</h1><p className="detail-description">{item.description}</p>\n      {media.filter((file) => file.kind === "IMAGE").length > 0 && <div className="listing-media-grid">{media.filter((file) => file.kind === "IMAGE").map((file) => <a href={file.url} target="_blank" rel="noreferrer" key={file.id}><img src={file.url} alt={file.file_name} /></a>)}</div>}
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
    <section className="detail-section"><span className="eyebrow">Materiais da oferta</span><h2>Ficheiros disponibilizados</h2>{media.filter((file) => file.kind === "DOCUMENT").length ? <div className="attachment-list">{media.filter((file) => file.kind === "DOCUMENT").map((file) => <a href={file.url} target="_blank" rel="noreferrer" key={file.id}><strong>{file.file_name}</strong><span>{file.mime_type} · {Math.ceil(file.size_bytes / 1024)} KB</span></a>)}</div> : <p className="muted">Não foram disponibilizados documentos para esta oferta.</p>}</section>\n    <section className="detail-section"><span className="eyebrow">Sobre a oferta</span><h2>Informação da publicação</h2><div className="meta"><span className="tag">{item.type==="PRODUCT"?"Produto":"Serviço"}</span>{item.location&&<span className="tag">{item.location}</span>}<span className="tag">Publicado em {new Date(item.created_at).toLocaleDateString("pt-MZ")}</span></div></section>
  </div><style>{`
      .listing-media-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:24px}.listing-media-grid a{display:block;aspect-ratio:4/3;border-radius:14px;overflow:hidden;background:#f1f3f5}.listing-media-grid img{width:100%;height:100%;object-fit:cover}.detail-action-form{display:grid;gap:10px;margin-top:14px}.field-label{display:grid;gap:6px;font-size:12px;font-weight:750;color:#343b44}.field-label input,.field-label select,.field-label textarea{width:100%;box-sizing:border-box;border:1px solid #dfe3e7;border-radius:10px;padding:11px 12px;font:inherit}.attachment-list{display:grid;gap:9px}.attachment-list a{display:flex;justify-content:space-between;gap:15px;padding:13px 15px;border:1px solid #e4e7ea;border-radius:12px;text-decoration:none;color:inherit}.attachment-list span{color:#7b8490;font-size:12px}@media(max-width:700px){.listing-media-grid{grid-template-columns:1fr 1fr}.attachment-list a{display:grid}}`}</style></main>;
}