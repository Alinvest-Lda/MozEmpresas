export const dynamic = "force-dynamic";

import Link from "next/link";
import type { CSSProperties } from "react";
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

  const canManage = business.owner_id === user.id || Boolean(
    (await supabase.from("business_members").select("role").eq("business_id", id).eq("user_id", user.id).in("role", ["owner","admin","operator"]).maybeSingle()).data
  );
  if (!canManage) notFound();

  const completeness = [
    business.name,
    business.description,
    business.category_id,
    business.location,
    business.phone,
    business.email,
    business.website,
    business.logo_url,
    business.cover_url,
    portfolio?.length ? "portfolio" : null,
  ].filter(Boolean).length;
  const completenessPercent = Math.round((completeness / 10) * 100);
  const missing: string[] = [];
  if (!business.description) missing.push("Descrição");
  if (!business.category_id) missing.push("Categoria");
  if (!business.location) missing.push("Localização");
  if (!business.phone && !business.email) missing.push("Contacto");
  if (!business.logo_url) missing.push("Logótipo");
  if (!portfolio?.length) missing.push("Portfólio");

  return (
    <main className="dashboard-main business-manage-page">
      <style>{`
        .business-manage-page .dashboard-content{max-width:1440px}
        .business-manage-breadcrumb{display:flex;align-items:center;gap:10px;margin-bottom:18px;font-size:13px}
        .business-manage-breadcrumb a{color:#68717c;text-decoration:none}
        .business-manage-hero{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:18px;align-items:stretch;margin-bottom:18px}
        .business-manage-intro,.business-manage-status{background:#fff;border:1px solid #e5e7eb;border-radius:18px}
        .business-manage-intro{padding:28px}
        .business-manage-intro h1{margin:6px 0 10px;font-size:clamp(30px,3vw,44px);letter-spacing:-.04em}
        .business-manage-intro p{max-width:760px;margin:0;color:#68717c;line-height:1.7;font-size:14px}
        .business-manage-status{padding:22px;display:flex;flex-direction:column;justify-content:space-between}
        .business-manage-status>span:first-child{font-size:11px;text-transform:uppercase;letter-spacing:.09em;font-weight:800;color:#7b8490}
        .business-manage-status strong{display:block;font-size:25px;margin:8px 0}
        .business-manage-status p{margin:0;color:#68717c;font-size:12px;line-height:1.55}
        .business-manage-status .tag{align-self:flex-start;margin-top:14px}
        .business-manage-grid{display:grid;grid-template-columns:minmax(0,1fr) 350px;gap:18px;align-items:start}
        .business-manage-card{background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:24px}
        .business-manage-card-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;margin-bottom:20px}
        .business-manage-card-head h2{margin:3px 0 5px;font-size:20px;letter-spacing:-.025em}
        .business-manage-card-head p{margin:0;color:#7b8490;font-size:13px;line-height:1.55}
        .business-manage-readiness{display:grid;gap:16px}
        .business-manage-readiness-bar{height:9px;background:#edf0f2;border-radius:99px;overflow:hidden}
        .business-manage-readiness-bar span{display:block;height:100%;width:var(--readiness);background:var(--brand);border-radius:inherit}
        .business-manage-readiness-meta{display:flex;justify-content:space-between;gap:12px;font-size:12px;color:#68717c}
        .business-manage-readiness-meta strong{color:#111827}
        .business-manage-signals{display:grid;gap:10px;margin-top:20px}
        .business-manage-signal{padding:13px 14px;border:1px solid #edf0f2;border-radius:12px;background:#fafbfc}
        .business-manage-signal strong{display:block;font-size:13px}
        .business-manage-signal span{display:block;margin-top:3px;color:#7b8490;font-size:12px;line-height:1.45}
        .business-manage-actions{display:grid;gap:9px;margin-top:18px}
        .business-manage-actions a{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px 14px;border:1px solid #e5e7eb;border-radius:12px;color:inherit;text-decoration:none}
        .business-manage-actions a:hover{background:#fafbfc}
        .business-danger-zone{margin-top:24px;padding-top:20px;border-top:1px solid #eceff1;display:flex;justify-content:space-between;gap:18px;align-items:flex-end}
        .business-danger-zone p{max-width:680px}
        @media(max-width:900px){.business-manage-hero,.business-manage-grid{grid-template-columns:1fr}}
        @media(max-width:600px){.business-manage-intro,.business-manage-status,.business-manage-card{padding:17px}.business-danger-zone{display:grid;align-items:stretch}.business-danger-zone .btn{width:100%}}
      `}</style>

      <div className="dashboard-content">
        <nav className="business-manage-breadcrumb" aria-label="Navegação">
          <Link href="/dashboard">Visão geral</Link><span>→</span>
          <Link href="/dashboard/empresas">Presença empresarial</Link><span>→</span>
          <strong>{business.name}</strong>
        </nav>

        <section className="business-manage-hero">
          <div className="business-manage-intro">
            <span className="dashboard-kicker">Gestão da presença</span>
            <h1>{business.name}</h1>
            <p>Este é o espaço para manter a informação que representa a empresa no directório. Complete primeiro o que aumenta a confiança e a capacidade de ser encontrado; depois, expanda para ofertas e actividade comercial.</p>
          </div>
          <aside className="business-manage-status">
            <div>
              <span>Visibilidade actual</span>
              <strong>{business.archived_at ? "Arquivado" : business.is_public ? "Publicado" : "Privado"}</strong>
              <p>{business.archived_at ? "O perfil está arquivado." : business.is_public ? "A empresa está disponível publicamente no directório." : "O perfil ainda não está visível publicamente."}</p>
            </div>
            {!business.archived_at && business.is_public && <Link className="text-link" href={"/empresas/" + business.slug}>Abrir perfil público →</Link>}
          </aside>
        </section>

        <div className="business-manage-grid">
          <section className="business-manage-card">
            <div className="business-manage-card-head">
              <div><span className="dashboard-kicker">Informação pública</span><h2>Dados da empresa</h2><p>Actualize os dados que outras empresas verão quando encontrarem o seu perfil.</p></div>
            </div>
            <BusinessEditForm action={updateBusiness} business={business} categories={categories ?? []} portfolio={portfolio ?? []} />

            {business.owner_id === user.id && !business.archived_at && (
              <form action={deleteBusinessAction} className="business-danger-zone" onSubmit={(event) => { if (!window.confirm("Arquivar esta empresa? O perfil deixará de aparecer publicamente, mas o histórico comercial e financeiro será preservado.")) event.preventDefault(); }}>
                <div><span className="dashboard-kicker">Zona de risco</span><h3>Arquivar empresa</h3><p>Remove a empresa da apresentação pública sem apagar o histórico comercial, financeiro e operacional associado.</p></div>
                <button className="btn" type="submit">Arquivar empresa</button>
              </form>
            )}
          </section>

          <aside className="business-manage-card">
            <div className="business-manage-card-head">
              <div><span className="dashboard-kicker">Leitura rápida</span><h2>Prontidão do perfil</h2><p>O que já está preparado para representar a empresa.</p></div>
            </div>
            <div className="business-manage-readiness">
              <div className="business-manage-readiness-meta"><span>Completude estimada</span><strong>{completenessPercent}%</strong></div>
              <div className="business-manage-readiness-bar" style={{"--readiness":`${completenessPercent}%`} as CSSProperties}><span /></div>
            </div>
            <div className="business-manage-signals">
              <div className="business-manage-signal"><strong>{business.is_public ? "Presença activa" : "Presença por publicar"}</strong><span>{business.is_public ? "O perfil já pode ser encontrado no directório." : "Termine a informação essencial e publique quando estiver pronto."}</span></div>
              <div className="business-manage-signal"><strong>{portfolio?.length ? `${portfolio.length} item(ns) no portfólio` : "Portfólio ainda vazio"}</strong><span>{portfolio?.length ? "Já existe prova visual ou descritiva do que a empresa apresenta." : "Adicionar portfólio ajuda a transformar descrição em evidência."}</span></div>
            </div>
            {missing.length > 0 && (
              <div className="business-manage-actions">
                <div className="dashboard-kicker">Próximos ajustes</div>
                {missing.slice(0,4).map(item => <div key={item} className="business-manage-signal"><strong>{item}</strong><span>Campo recomendado para aumentar a qualidade da presença.</span></div>)}
              </div>
            )}
            <div className="business-manage-actions">
              <Link href="/dashboard/empresas"><span>← Voltar às empresas</span><b>→</b></Link>
              <Link href="/dashboard/marketplace?tab=vender"><span>Apresentar produtos e serviços</span><b>→</b></Link>
              {business.is_public && <Link href={"/empresas/" + business.slug}><span>Ver como o mercado vê</span><b>→</b></Link>}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
