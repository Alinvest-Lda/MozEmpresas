export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createBusiness } from "@/lib/businesses/actions";
import { BusinessForm } from "@/components/business-form";
export default async function MyBusinesses({searchParams}:{searchParams?:Promise<{view?:string}>}) {
  const params=await searchParams;
  const view=params?.view==="criar"?"criar":"lista";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: businesses }, { data: memberships }, { data: categories }] = await Promise.all([
    supabase.from("businesses").select("id,name,slug,description,location,is_public,logo_url,cover_url,phone,email,website,category_id,created_at").eq("owner_id", user.id).order("created_at",{ascending:false}),
    supabase.from("business_members").select("business_id,role").eq("user_id", user.id).in("role", ["owner","admin","operator"]),
    supabase.from("business_categories").select("id,name,slug").order("name").limit(100),
  ]);

  const memberIds = [...new Set((memberships ?? []).map((m) => m.business_id))];
  const { data: memberBusinesses } = memberIds.length ? await supabase.from("businesses").select("id,name,slug,description,location,is_public,logo_url,cover_url,phone,email,website,category_id,created_at").in("id", memberIds).order("created_at",{ascending:false}) : { data: [] as typeof businesses };
  const allBusinesses = [...(businesses ?? []), ...(memberBusinesses ?? []).filter((b) => !(businesses ?? []).some((o) => o.id === b.id))];
  const publicCount = allBusinesses.filter((business) => business.is_public).length;
  const readiness = new Map(allBusinesses.map((business) => {
    const checks = [
      Boolean(business.name?.trim()),
      Boolean(business.description?.trim()),
      Boolean(business.location?.trim()),
      Boolean(business.category_id),
      Boolean(business.phone || business.email || business.website),
      Boolean(business.logo_url),
      Boolean(business.cover_url),
    ];
    const missing = [
      !business.description?.trim() ? "descrição" : "",
      !business.location?.trim() ? "localização" : "",
      !business.category_id ? "actividade" : "",
      !business.phone && !business.email && !business.website ? "contacto" : "",
      !business.logo_url ? "logótipo" : "",
      !business.cover_url ? "imagem de capa" : "",
    ].filter(Boolean);
    return [business.id, { percent: Math.round(checks.filter(Boolean).length / checks.length * 100), missing }];
  }));

  return (
    <main className="dashboard-main">
      <div className="dashboard-content business-registration-page">
        <section className="business-presence-hero">
          <div className="business-presence-copy">
            <span className="dashboard-kicker">Presença empresarial</span>
            <h1>A sua empresa no ecossistema</h1>
            <p>Crie uma presença clara e confiável para ser encontrada no directório, apresentar o que faz e abrir portas para produtos, serviços, concursos, oportunidades e parcerias.</p>
          </div>
          <aside className="business-presence-status">
            <span>Estado da sua presença</span>
            <strong>{allBusinesses.length} empresa{allBusinesses.length === 1 ? "" : "s"}</strong>
            <span>{publicCount} perfil{publicCount === 1 ? "" : "is"} actualmente publicado{publicCount === 1 ? "" : "s"} no directório.</span>
            <span className="tag">{publicCount ? "Presença activa" : "Por publicar"}</span>
          </aside>
        </section>
        <nav className="commerce-nav" aria-label="Gestão da presença">
          <Link href="/dashboard/empresas" className={view === "lista" ? "active" : ""}>Empresas e gestão</Link>
          <Link href="/dashboard/empresas?view=criar" className={view === "criar" ? "active" : ""}>Criar empresa</Link>
        </nav>
        <section className="business-presence-guide" aria-label="Como funciona a presença empresarial">
          <div className="business-guide-item"><b>01 · IDENTIDADE</b><strong>Dados essenciais</strong><span>Nome, actividade, localização e contactos que tornam a empresa reconhecível.</span></div>
          <div className="business-guide-item"><b>02 · PRESENÇA</b><strong>Perfil público</strong><span>Uma página empresarial que pode ser descoberta e consultada no directório.</span></div>
          <div className="business-guide-item"><b>03 · ACTIVIDADE</b><strong>Ecossistema</strong><span>Produtos, serviços, oportunidades, concursos e relações comerciais podem ser ligados ao perfil.</span></div>
        </section>
        {view === "lista" ? (
          allBusinesses.length ? (
            <section className="business-owned-grid">
              {allBusinesses.map((business) => (
                <article className="business-management-card" key={business.id}>
                  <div className="business-card-top">
                    <div className="business-management-identity">
                      <div className="business-management-logo">{business.logo_url ? <img src={business.logo_url} alt="" /> : business.name[0]}</div>
                      <div><strong>{business.name}</strong><span>{business.location || "Localização por definir"}</span></div>
                    </div>
                    <span className="tag">{business.is_public ? "Publicado" : "Privado"}</span>
                  </div>
                  <div className="business-readiness"><span>Completude do perfil</span><strong>{readiness.get(business.id)?.percent ?? 0}% · {(readiness.get(business.id)?.percent ?? 0) >= 85 ? "Bem apresentado" : "A completar"}</strong><div role="progressbar" aria-valuenow={readiness.get(business.id)?.percent ?? 0} aria-valuemin={0} aria-valuemax={100} style={{height:6,background:"#e5ebe8",borderRadius:999,overflow:"hidden",marginTop:8}}><span style={{display:"block",height:"100%",width:(readiness.get(business.id)?.percent ?? 0)+"%",background:"#0b6b63",borderRadius:999}}/></div></div>
                  <p>{business.description || "Complete a apresentação da empresa para melhorar a informação disponível no directório."}</p>
                  {(readiness.get(business.id)?.missing?.length ?? 0) > 0 && <p className="muted" style={{fontSize:12}}>Por completar: {readiness.get(business.id)?.missing.join(", ")}.</p>}
                  <div className="business-management-next"><span>Próximo passo</span><strong>{(readiness.get(business.id)?.percent ?? 0) < 85 ? "Completar dados do perfil" : "Adicionar portfólio e ofertas"}</strong></div>
                  <div className="business-card-actions">
                    <Link href={"/empresas/" + business.slug} className="text-link">Ver perfil público →</Link>
                    <Link href={"/dashboard/empresas/" + business.id} className="text-link">Gerir perfil →</Link>
                  </div>
                </article>
              ))}
            </section>
          ) : (
            <section className="business-empty">
              <span className="dashboard-kicker">Primeiro passo</span>
              <h2>Ainda não tem uma empresa associada.</h2>
              <p>Crie o primeiro perfil para representar a sua actividade no ecossistema MozEmpresas.</p>
              <Link href="/dashboard/empresas?view=criar" className="btn primary">Criar empresa →</Link>
            </section>
          )
        ) : (
          <>
            <section className="business-form-heading">
              <Link href="/dashboard/empresas" className="text-link">← Voltar às empresas</Link>
              <span className="dashboard-kicker" style={{display:"block",marginTop:16}}>Nova empresa</span>
              <h2>Registar uma empresa</h2>
              <p>Crie a entidade que representa no MozEmpresas. Depois, a gestão do perfil acontece na lista de empresas.</p>
            </section>
            <div className="business-form-card responsive-form-card"><BusinessForm action={createBusiness} categories={categories ?? []} /></div>
          </>
        )}
      </div>
    </main>
  );
}
