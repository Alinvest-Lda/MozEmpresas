export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createBusiness } from "@/lib/businesses/actions";
import { BusinessForm } from "@/components/business-form";
import { DashboardSidebar } from "@/components/dashboard-sidebar";

export default async function MyBusinesses() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [{ data: businesses }, { data: categories }, { data: platformMember }] = await Promise.all([
    supabase.from("businesses").select("id,name,slug,description,location,is_public,created_at").eq("owner_id", user.id).order("created_at",{ascending:false}),
    supabase.from("business_categories").select("id,name,slug").order("name").limit(100),
    supabase.from("platform_members").select("role,active").eq("user_id", user.id).maybeSingle(),
  ]);
  return <div className="dashboard-shell"><DashboardSidebar pathname="/dashboard/empresas" platformAccess={platformMember?.active ? platformMember.role : null} /><main className="dashboard-main"><div className="dashboard-content business-registration-page">
    <section className="business-registration-intro"><div><span className="dashboard-kicker">Presença empresarial</span><h1>As suas empresas</h1><p>Crie e mantenha perfis completos para ser encontrado no directório, apresentar ofertas e desenvolver relações comerciais.</p></div><div className="business-registration-steps"><span><b>01</b> Dados essenciais</span><span><b>02</b> Presença pública</span><span><b>03</b> Ofertas e relações</span></div></section>
    {businesses?.length ? <section className="business-owned-grid">{businesses.map(b=><article className="card" key={b.id}><div className="business-card-top"><div className="icon">{b.name[0]}</div><span className="tag">{b.is_public ? "Publicado" : "Privado"}</span></div><h3>{b.name}</h3><span className="muted">{b.location || "Localização por definir"}</span><p>{b.description || "Perfil ainda sem descrição."}</p><div className="business-card-actions"><Link href={"/empresas/"+b.slug} className="text-link">Ver perfil público →</Link><Link href="/dashboard/empresas" className="text-link">Gerir</Link></div></article>)}</section> : <section className="business-empty"><span className="dashboard-kicker">Primeiro passo</span><h2>Ainda não tem uma empresa associada.</h2><p>Crie o primeiro perfil para representar a sua actividade no ecossistema MozEmpresas.</p></section>}
    <section className="business-form-heading"><span className="dashboard-kicker">Nova empresa</span><h2>Registar uma empresa</h2><p>Comece pelos dados essenciais. A publicação no directório pode ser activada agora ou depois de completar o perfil.</p></section>
    <BusinessForm action={createBusiness} categories={categories ?? []} />
  </div></main></div>;
}