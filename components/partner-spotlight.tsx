import Link from "next/link";

export function PartnerSpotlight() {
  return (
    <section className="partner-spotlight">
      <div className="partner-spotlight-copy">
        <span className="eyebrow">Parceiros em destaque</span>
        <h2>Coloque a sua organização no centro do ecossistema empresarial.</h2>
        <p>Organizações que apoiam o mercado podem ter uma presença de maior visibilidade no MozEmpresas — com marca, mensagem e acesso directo ao seu público.</p>
      </div>
      <div className="partner-spotlight-actions">
        <span>Patrocínio · Parceiro institucional · Visibilidade</span>
        <Link href="/publicar-oportunidade">Conhecer oportunidades de parceria →</Link>
      </div>
    </section>
  );
}
