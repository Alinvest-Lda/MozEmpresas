export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateBusiness } from "@/lib/businesses/actions";
import { BusinessEditForm } from "@/components/business-edit-form";
import { DashboardSidebar } from "@/components/dashboard-sidebar";

export default async function ManageBusinessPage({ params }: { params: Promise<{ id:string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: business }, { data: categories }, { data: portfolio }] = await Promise.all([
    supabase.from("businesses").select("id,name,slug,description,category_id,location,phone,email,website,is_public").eq("id",id).eq("owner_id",user.id).maybeSingle(),
    supabase.from("business_categories").select("id,name,slug").order("name").limit(100),
    supabase.from("business_portfolio_media").select("id,image_url,title,sort_order").eq("business_id",id).order("sort_order"),
  ]);
  if (!business) notFound();

  return <div className="dashboard-shell">
    <DashboardSidebar pathname={"/dashboard/empresas/" + id} />
    <main className="dashboard-main">
      <div className="dashboard-content business-registration-page">
        <header className="business-presence-hero">
          <div className="business-presence-copy">
            <Link href="/dashboard/empresas" className="text-link">← Presença empresarial</Link>
            <span className="dashboard-kicker" style={{display:"block",marginTop:18}}>Gestão do perfil</span>
            <h1>{business.name}</h1>
            <p>Controle a informação que representa a sua empresa no directório e mantenha os dados essenciais actualizados.</p>
          </div>
          <aside className="business-presence-status">
            <span>Visibilidade actual</span>
            <strong>{business.is_public ? "Publicado" : "Privado"}</strong>
            <span>{business.is_public ? "O perfil pode ser encontrado no directório." : "O perfil está guardado e não é apresentado publicamente."}</span>
            {business.is_public && <Link className="text-link" href={"/empresas/" + business.slug}>Abrir perfil público →</Link>}
          </aside>
        </header>
        <div className="business-form-card">
          <div className="business-form-heading" style={{marginTop:0}}>
            <span className="dashboard-kicker">Informação pública</span>
            <h2>Dados da empresa</h2>
            <p>Estes dados podem ser usados para apresentar a sua empresa a outros participantes do ecossistema.</p>
          </div>
          <BusinessEditForm action={updateBusiness} business={business} categories={categories ?? []} portfolio={portfolio ?? []} />
        </div>
      </div>
    </main>
  </div>;
}