export const dynamic="force-dynamic";
import { createClient } from "@/lib/supabase/server";

export default async function PartnerAds() {
  const supabase = await createClient();
  const [{ data: products }, { data: campaigns }] = await Promise.all([
    supabase.rpc("partner_ad_products_list"),
    supabase.rpc("partner_ad_campaigns_list"),
  ]);
  return (
    <main className="dashboard-main"><div className="dashboard-content">
      <header className="dashboard-topbar"><div className="dashboard-welcome">
        <span className="dashboard-kicker">Crescimento · Espaços exclusivos</span>
        <h1>Publicidade e exposição</h1>
        <p>Posicionamentos reservados aos parceiros, com alcance qualificado e segmentação de alto valor.</p>
      </div></header>
      <section className="dashboard-section"><div className="dashboard-section-head"><div>
        <span className="dashboard-kicker">Portefólio premium</span><h2>Espaços disponíveis</h2>
        <p>Formatos exclusivos, negociados e aprovados pela MozEmpresas.</p>
      </div></div>
      <div className="dashboard-card-grid">{(products ?? []).map((x: any) => (
        <article className="dashboard-card" key={x.id}><small>{x.placement}</small><h3>{x.name}</h3>
          <p>{x.description}</p><strong>{x.price_mzn != null ? Number(x.price_mzn).toLocaleString("pt-MZ") + " MZN" : "Proposta personalizada"}</strong>
          <span>{x.duration_days} dias · capacidade {x.capacity}</span>
        </article>
      ))}</div></section>
      <section className="dashboard-section"><div className="dashboard-section-head"><div>
        <span className="dashboard-kicker">Alcance personalizado</span><h2>Segmentação de alto valor</h2>
        <p>Sector, província, cidade, dimensão empresarial, intenção e categoria podem ser combinados na definição do alcance.</p>
      </div></div>
      <div className="dashboard-card-grid">
        <div className="dashboard-card"><strong>Contextual</strong><p>Exposição junto de categorias e oportunidades relacionadas.</p></div>
        <div className="dashboard-card"><strong>Geográfica</strong><p>Concentração em mercados relevantes.</p></div>
        <div className="dashboard-card"><strong>Comercial</strong><p>Orientação por perfis empresariais e sinais de intenção.</p></div>
      </div></section>
      <section className="dashboard-section"><div className="dashboard-section-head"><div>
        <span className="dashboard-kicker">Campanhas da entidade</span><h2>Histórico e estado</h2>
      </div></div>
      {campaigns?.length ? <div className="dashboard-list">{campaigns.map((x: any) => (
        <div key={x.id}><div><strong>{x.title}</strong><span>{x.product_name} · {x.status}</span></div><b>{x.price_mzn != null ? Number(x.price_mzn).toLocaleString("pt-MZ") + " MZN" : "Em análise"}</b></div>
      ))}</div> : <div className="empty"><p>Ainda não existem campanhas. Defina o espaço e o objectivo para iniciar uma proposta.</p></div>}
      </section>
    </div></main>
  );
}