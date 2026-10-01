export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateListing } from "@/lib/commerce/actions";
import { ListingEditForm } from "@/components/listing-edit-form";

export default async function ManageListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: listing } = await supabase
    .from("listings")
    .select("id,title,description,type,price,location,business_id,status")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!listing) notFound();

  const { data: businesses } = await supabase
    .from("businesses")
    .select("id,name")
    .eq("owner_id", user.id)
    .order("name");

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
          <ListingEditForm action={updateListing} listing={listing} businesses={businesses ?? []} />
        </div>
      </div>
    </main>
  );
}
