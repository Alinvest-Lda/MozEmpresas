export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createBusiness } from "@/lib/businesses/actions";
import { BusinessForm } from "@/components/business-form";
export default async function MyBusinesses() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: businesses }, { data: categories }] = await Promise.all([
    supabase.from("businesses").select("id,name,slug,description,location,is_public,logo_url,cover_url,created_at").eq("owner_id", user.id).order("created_at",{ascending:false}),
    supabase.from("business_categories").select("id,name,slug").order("name").limit(100),
  ]);

  const publicCount = businesses?.filter((business) => business.is_public).length ?? 0;

  return <main className="dashboard-main">
      <div className="dashboard-content business-registration-page">
        <section className="business-presence-hero">
          <div className="business-presence-copy">
            <span className="dashboard-kicker">Presença empresarial</span>
            <h1>A sua empresa no ecossistema</h1>
            <p>Crie uma presença clara e confiável para ser encontrada no directório, apresentar o que faz e abrir portas para produtos, serviços, concursos, oportunidades e parcerias.</p>
          </div>
          <aside className="business-presence-status">
            <span>Estado da sua presença</span>
            <strong>{businesses?.length ?? 0} empresa{businesses?.length === 1 ? "" : "s"}</strong>
            <span>{publicCount} perfil{publicCount === 1 ? "" : "is"} actualmente publicado{publicCount === 1 ? "" : "s"} no directório.</span>
            <span className="tag">{publicCount ? "Presença activa" : "Por publicar"}</span>
          </aside>
        </section>

        <section className="business-presence-guide" aria-label="Como funciona a presença empresarial">
          <div className="business-guide-item"><b>01 · IDENTIDADE</b><strong>Dados essenciais</strong><span>Nome, actividade, localização e contactos que tornam a empresa reconhecível.</span></div>
          <div className="business-guide-item"><b>02 · PRESENÇA</b><strong>Perfil público</strong><span>Uma página empresarial que pode ser descoberta e consultada no directório.</span></div>
          <div className="business-guide-item"><b>03 · ACTIVIDADE</b><strong>Ecossistema</strong><span>Produtos, serviços, oportunidades, concursos e relações comerciais podem ser ligados ao perfil.</span></div>
        </section>

        {businesses?.length ? <section className="business-owned-grid">
          {businesses.map((business) => <article className="business-management-card" key={business.id}>
            <div className="business-card-top">
              <div className="business-management-identity"><div className="business-management-logo">{business.logo_url ? <img src={business.logo_url} alt="" /> : business.name[0]}</div><div><strong>{business.name}</strong><span>{business.location || "Localização por definir"}</span></div></div>
              <span className="tag">{business.is_public ? "Publicado" : "Privado"}</span>
            </div>
            <div className="business-readiness"><span>Presença</span><strong>{[business.name,business.description,business.location,business.logo_url,business.cover_url].filter(Boolean).length >= 4 ? "Completa" : "A completar"}</strong></div>
            <p>{business.description || "Complete a apresentação da empresa para melhorar a informação disponível no directório."}</p>
            <div className="business-management-next"><span>Próximo passo</span><strong>Adicionar portfólio e ofertas</strong></div>
            <div className="business-card-meta">
              <span>{business.is_public ? "Visível no directório" : "Não publicado"}</span>
              <span>Perfil empresarial</span>
            </div>
            <div className="business-card-actions">
              <Link href={"/empresas/" + business.slug} className="text-link">Ver perfil público →</Link>
              <Link href={"/dashboard/empresas/" + business.id} className="text-link">Gerir perfil →</Link>
            </div>
          </article>)}
        </section> : <section className="business-empty">
          <span className="dashboard-kicker">Primeiro passo</span>
          <h2>Ainda não tem uma empresa associada.</h2>
          <p>Crie o primeiro perfil para representar a sua actividade no ecossistema MozEmpresas.</p>
        </section>}

        <section className="business-form-heading">
          <span className="dashboard-kicker">Nova empresa</span>
          <h2>Registar uma empresa</h2>
          <p>O registo cria a entidade que representa no MozEmpresas. Não define se compra ou vende: todas as empresas podem participar em todo o ecossistema.</p>
        </section>
        <div className="business-form-card">
          <BusinessForm action={createBusiness} categories={categories ?? []} />
        </div>
      </div>
    </main>;
};