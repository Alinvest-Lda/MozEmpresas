export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteListingAttachment, updateListing } from "@/lib/commerce/actions";
import { ListingEditForm } from "@/components/listing-edit-form";

export default async function ManageListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: ownedBusinesses } = await supabase
    .from("businesses")
    .select("id,name")
    .eq("owner_id", user.id)
    .order("name");
  const { data: memberships } = await supabase
    .from("business_members")
    .select("business_id,role")
    .eq("user_id", user.id)
    .in("role", ["owner", "admin", "operator"]);
  const memberIds = [...new Set((memberships ?? []).map((membership) => membership.business_id))];
  const { data: memberBusinesses } = memberIds.length
    ? await supabase.from("businesses").select("id,name").in("id", memberIds).order("name")
    : { data: [] as { id: string; name: string }[] };
  const businesses = [
    ...(ownedBusinesses ?? []),
    ...(memberBusinesses ?? []).filter((business) => !(ownedBusinesses ?? []).some((owned) => owned.id === business.id)),
  ];
  const businessIds = businesses.map((business) => business.id);
  if (!businessIds.length) notFound();

  const { data: listing } = await supabase
    .from("listings")
    .select("id,title,description,type,price,location,business_id,status")
    .eq("id", id)
    .maybeSingle();

  if (!listing || !listing.business_id || !businessIds.includes(listing.business_id)) notFound();

  const { data: attachments } = await supabase
    .from("listing_attachments")
    .select("id,file_name,mime_type,size_bytes,kind,storage_path,created_at")
    .eq("listing_id", id)
    .order("created_at", { ascending: true });

  const attachmentRows = (attachments ?? []).map((attachment) => ({
    ...attachment,
    url: supabase.storage.from("listing-media").getPublicUrl(attachment.storage_path).data.publicUrl,
  }));

  return (
    <main className="dashboard-main">
      <div className="dashboard-content business-registration-page">
        <header className="business-presence-hero">
          <div className="business-presence-copy">
            <Link href="/dashboard/marketplace" className="text-link">← Comprar e vender</Link>
            <span className="dashboard-kicker" style={{display:"block",marginTop:18}}>Gestão da oferta</span>
            <h1>{listing.title}</h1>
            <p>Actualize a informação comercial, a empresa associada e o estado de publicação desta oferta.</p>
          </div>
          <aside className="business-presence-status">
            <span>Estado actual</span>
            <strong>{listing.status}</strong>
            <span>As alterações ficam disponíveis no marketplace de acordo com o estado escolhido.</span>
            {listing.status === "PUBLISHED" && <Link className="text-link" href={"/marketplace/" + listing.id}>Abrir oferta pública →</Link>}
          </aside>
        </header>
        <div className="business-form-card">
          <div className="business-form-heading" style={{marginTop:0}}>
            <span className="dashboard-kicker">Oferta comercial</span>
            <h2>Dados da oferta</h2>
            <p>Mantenha título, descrição, preço e estado actualizados para evitar informação comercial desactualizada.</p>
          </div>
          <ListingEditForm action={updateListing} listing={listing} businesses={businesses} />
          <section className="business-form-card" style={{marginTop:18}}>
            <div className="business-form-heading" style={{marginTop:0}}>
              <span className="dashboard-kicker">Media</span>
              <h2>Anexos da oferta</h2>
              <p>Adicione novas imagens ou documentos no formulário e remova os ficheiros que já não devem acompanhar a oferta.</p>
            </div>
            {attachmentRows.length ? <div style={{display:"grid",gap:10}}>{attachmentRows.map((attachment) => <div key={attachment.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",border:"1px solid #e5e7eb",borderRadius:12}}>{attachment.kind === "IMAGE" ? <img src={attachment.url} alt="" style={{width:64,height:48,objectFit:"cover",borderRadius:8}} /> : <span style={{width:64,height:48,display:"grid",placeItems:"center",background:"#f3f4f6",borderRadius:8,fontSize:11,fontWeight:800}}>DOC</span>}<div style={{minWidth:0,flex:1}}><strong style={{display:"block",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{attachment.file_name}</strong><small>{Math.ceil(attachment.size_bytes / 1024)} KB</small></div><a className="text-link" href={attachment.url} target="_blank" rel="noreferrer">Abrir</a><form action={deleteListingAttachment}><input type="hidden" name="attachment_id" value={attachment.id}/><button className="btn" type="submit">Remover</button></form></div>)}</div> : <p className="muted">Ainda não existem anexos nesta oferta.</p>}
          </section>
        </div>
      </div>
    </main>
  );
}
