export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { deleteBusinessAction, updateBusiness } from "@/lib/businesses/actions";
import { BusinessEditForm } from "@/components/business-edit-form";
export default async function ManageBusinessPage({ params }: { params: Promise<{ id:string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: business }, { data: categories }, { data: portfolio }] = await Promise.all([
    supabase.from("businesses").select("id,name,slug,description,category_id,location,phone,email,website,logo_url,cover_url,is_public,owner_id,archived_at").eq("id",id).maybeSingle(),
    supabase.from("business_categories").select("id,name,slug").order("name").limit(100),
    supabase.from("business_portfolio_media").select("id,image_url,title,sort_order").eq("business_id",id).order("sort_order"),
  ]);
  if (!business) notFound();
  const canManage = business.owner_id === user.id || Boolean((await supabase.from("business_members").select("role").eq("business_id", id).eq("user_id", user.id).in("role", ["owner","admin","operator"]).maybeSingle()).data);
  if (!canManage) notFound();

  return <main className="dashboard-main">
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
            <strong>{business.archived_at ? "Arquivado" : business.is_public ? "Publicado" : "Privado"}</strong>
            <span>{business.archived_at ? "O perfil foi arquivado e deixou de aparecer publicamente." : business.is_public ? "O perfil pode ser encontrado no directório." : "O perfil está guardado e não é apresentado publicamente."}</span>
            {!business.archived_at && business.is_public && <Link className="text-link" href={"/empresas/" + business.slug}>Abrir perfil público →</Link>}
          </aside>
        </header>
        <div className="business-form-card">
          <div className="business-form-heading" style={{marginTop:0}}>
            <span className="dashboard-kicker">Informação pública</span>
            <h2>Dados da empresa</h2>
            <p>Estes dados podem ser usados para apresentar a sua empresa a outros participantes do ecossistema.</p>
          </div>
          <BusinessEditForm action={updateBusiness} business={business} categories={categories ?? []} portfolio={portfolio ?? []} />
          {business.owner_id === user.id && !business.archived_at && (
            <form action={deleteBusinessAction} className="business-danger-zone" onSubmit={(event) => { if (!window.confirm("Arquivar esta empresa? O perfil deixará de aparecer publicamente, mas o histórico comercial e financeiro será preservado.")) event.preventDefault(); }}>
              <input type="hidden" name="businessId" value={business.id} />
              <div><span className="dashboard-kicker">Zona de risco</span><h3>Arquivar empresa</h3><p>Remove a empresa da apresentação pública sem apagar o histórico comercial, financeiro e operacional associado.</p></div>
              <button className="btn" type="submit">Arquivar empresa</button>
            </form>
          )}
        </div>
      </div>
    </main>;
};