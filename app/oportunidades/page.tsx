export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const labels: Record<string, string> = {
  CALL: "Chamada",
  FUNDING: "Financiamento",
  PARTNERSHIP: "Parceria",
  TRAINING: "Capacitação",
  EVENT: "Evento",
  BUSINESS: "Negócio",
  TENDER: "Concurso",
  OTHER: "Outro",
};

const icons: Record<string, string> = {
  CALL: "↗",
  FUNDING: "◈",
  PARTNERSHIP: "⌘",
  TRAINING: "◇",
  EVENT: "◷",
  BUSINESS: "◆",
  TENDER: "▣",
  OTHER: "•",
};

function dateLabel(value: string | null) {
  return value
    ? new Date(value).toLocaleDateString("pt-MZ", { day: "2-digit", month: "short", year: "numeric" })
    : "Prazo não indicado";
}

export default async function OpportunitiesPage() {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("opportunities")
    .select("id,title,slug,type,description,organization,location,opens_at,closes_at")
    .eq("status", "PUBLISHED")
    .order("closes_at", { ascending: true, nullsFirst: false })
    .limit(30);

  const opportunities = items ?? [];

  return (
    <main className="page">
      <div className="container">
        <section className="page-header">
          <span className="eyebrow">Oportunidades empresariais</span>
          <h1>Encontre oportunidades que podem mover o seu negócio.</h1>
          <p className="muted" style={{ maxWidth: 760 }}>
            Chamadas, financiamento, parcerias, capacitação e outros processos publicados por organizações.
            Consulte as condições e participe quando fizer sentido para a sua empresa.
          </p>
        </section>

        <div className="contest-command-bar">
          <div className="contest-command-copy">
            <span className="eyebrow">Descoberta</span>
            <strong>{opportunities.length} oportunidades disponíveis</strong>
            <span>Ordenadas pelo prazo mais próximo.</span>
          </div>
          <Link href="/dashboard/recomendacoes" className="btn">Ver recomendações →</Link>
        </div>

        {opportunities.length ? (
          <section className="opportunity-category-sections" style={{ marginTop: 28 }}>
            <div className="opportunity-grid">
              {opportunities.map((item) => (
                <Link href={"/oportunidades/" + item.slug} className="opportunity-card" key={item.id}>
                  <div className="opportunity-label">
                    {icons[item.type] || "•"} {labels[item.type] || item.type}
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.description || "Consulte os detalhes e condições desta oportunidade."}</p>
                  <div className="opportunity-result-bottom">
                    <span>{item.organization || "Organização não indicada"}</span>
                    <span>{item.closes_at ? "Até " + dateLabel(item.closes_at) : "Prazo aberto"}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : (
          <section className="card" style={{ marginTop: 28, padding: 28 }}>
            <span className="eyebrow">Sem resultados</span>
            <h2 style={{ margin: "9px 0 6px" }}>Ainda não existem oportunidades publicadas.</h2>
            <p className="muted">Volte mais tarde ou explore o Directório e o Marketplace enquanto novas oportunidades são adicionadas.</p>
            <Link href="/empresas" className="btn primary" style={{ marginTop: 15 }}>Explorar empresas →</Link>
          </section>
        )}
      </div>
    </main>
  );
}
