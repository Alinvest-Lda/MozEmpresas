import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const labels: Record<string, string> = {
  CONTEST: "Concurso",
  CALL: "Chamada",
  TENDER: "Contratação",
  FUNDING: "Financiamento",
  PARTNERSHIP: "Parceria",
  TRAINING: "Capacitação",
  EVENT: "Evento",
  BUSINESS: "Negócio",
  OTHER: "Outro",
};

type Opportunity = {
  id: string;
  title: string;
  slug: string;
  type: string;
  description: string;
  organization: string | null;
  location: string | null;
  closes_at: string | null;
};

export default async function Oportunidades({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; location?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() || "";
  const type = params.type?.trim() || "";
  const location = params.location?.trim() || "";

  let data: Opportunity[] = [];
  let error = false;

  try {
    const supabase = await createClient();
    let query = supabase
      .from("opportunities")
      .select("id,title,slug,type,description,organization,location,closes_at")
      .eq("status", "PUBLISHED")
      .order("created_at", { ascending: false })
      .limit(48);

    if (q) {
      const safe = q.replace(/[%_,()']/g, " ").replace(/\s+/g, " ").trim();
      if (safe) query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%,organization.ilike.%${safe}%`);
    }
    if (type && type !== "all") query = query.eq("type", type);
    if (location) query = query.ilike("location", `%${location}%`);

    const result = await query;
    data = (result.data ?? []) as Opportunity[];
    error = Boolean(result.error);
  } catch {
    error = true;
  }

  const hasFilters = Boolean(q || location || (type && type !== "all"));
  const resultLabel = data.length === 1 ? "oportunidade encontrada" : "oportunidades encontradas";

  return (
    <main className="directory-page">
      <div className="container">
        <section className="directory-hero">
          <div className="directory-hero-copy">
            <span className="eyebrow">Oportunidades de negócio</span>
            <h1>Descubra oportunidades para a sua empresa.</h1>
            <p>
              Encontre chamadas, parcerias, financiamento, necessidades empresariais
              e outras oportunidades publicadas no mercado moçambicano.
            </p>
          </div>

          <div className="directory-search-panel">
            <form className="directory-search opportunities-search" action="/oportunidades">
              <label className="directory-search-field directory-search-keyword">
                <span>O que procura?</span>
                <div>
                  <b aria-hidden="true">⌕</b>
                  <input name="q" defaultValue={q} placeholder="Oportunidade, organização ou palavra-chave" />
                </div>
              </label>
              <label className="directory-search-field">
                <span>Tipo</span>
                <div>
                  <b aria-hidden="true">◈</b>
                  <select name="type" defaultValue={type || "all"}>
                    <option value="all">Todos os tipos</option>
                    {Object.entries(labels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                  </select>
                </div>
              </label>
              <label className="directory-search-field">
                <span>Onde?</span>
                <div>
                  <b aria-hidden="true">⌖</b>
                  <input name="location" defaultValue={location} placeholder="Província ou localização" />
                </div>
              </label>
              <button className="btn primary directory-search-button">Pesquisar</button>
            </form>
            {hasFilters && <Link href="/oportunidades" className="directory-clear">Limpar pesquisa</Link>}
          </div>
        </section>

        <section className="directory-discovery">
          <div className="directory-section-head">
            <div>
              <span className="eyebrow">Exploração rápida</span>
              <h2>Procure por tipo de oportunidade.</h2>
            </div>
            <span className="directory-section-note">Caminhos de negócio</span>
          </div>
          <div className="directory-category-list">
            <Link href="/oportunidades" className={!type || type === "all" ? "active" : ""}>Todas <span>→</span></Link>
            {Object.entries(labels).map(([value, label]) => (
              <Link key={value} href={"/oportunidades?type=" + value} className={type === value ? "active" : ""}>
                {label}<span>→</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="directory-results">
          <div className="directory-results-head">
            <div>
              <span className="eyebrow">{hasFilters ? "Resultados da pesquisa" : "Oportunidades publicadas"}</span>
              <h2>{hasFilters ? "Oportunidades que correspondem à sua pesquisa" : "Oportunidades disponíveis"}</h2>
            </div>
            <div className="directory-results-summary">
              <strong>{data.length}</strong>
              <span>{resultLabel}</span>
            </div>
          </div>

          {hasFilters && (
            <div className="directory-active-filters">
              {q && <span>Pesquisa: <b>{q}</b></span>}
              {location && <span>Localização: <b>{location}</b></span>}
              {type && type !== "all" && <span>Tipo: <b>{labels[type] || type}</b></span>}
              <Link href="/oportunidades">× Limpar</Link>
            </div>
          )}

          {error && <div className="notice">Não foi possível carregar as oportunidades neste momento. Pode continuar a navegar pelo portal.</div>}

          {data.length > 0 ? (
            <div className="directory-results-layout">
              <div className="directory-results-list">
                {data.map((item, index) => (
                  <Link href={"/oportunidades/" + item.slug} className="directory-business-card opportunity-result-card" key={item.id}>
                    <div className="directory-business-number">{String(index + 1).padStart(2, "0")}</div>
                    <div className="opportunity-type-icon">↗</div>
                    <div className="directory-business-content">
                      <div className="directory-business-title">
                        <div>
                          <h3>{item.title}</h3>
                          <span>{labels[item.type] || item.type}</span>
                        </div>
                        <b>→</b>
                      </div>
                      {item.organization && <div className="directory-business-location">{item.organization}{item.location ? " · " + item.location : ""}</div>}
                      <p>{item.description}</p>
                      <div className="opportunity-result-bottom">
                        <span>{item.closes_at ? `Prazo: ${new Date(item.closes_at).toLocaleDateString("pt-MZ")}` : "Sem prazo indicado"}</span>
                        <span>Ver oportunidade →</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <aside className="directory-side-card">
                <span className="eyebrow">Para empresas</span>
                <h3>Tem uma necessidade de negócio?</h3>
                <p>Publique uma oportunidade para encontrar fornecedores, parceiros ou empresas capazes de responder ao que procura.</p>
                <Link href="/dashboard" className="btn primary full">Publicar oportunidade →</Link>
              </aside>
            </div>
          ) : (
            <div className="directory-empty">
              <div className="directory-empty-icon">↗</div>
              <span className="eyebrow">Sem resultados</span>
              <h3>Não encontrámos oportunidades para esta pesquisa.</h3>
              <p>Experimente alterar os filtros ou consultar todas as oportunidades publicadas.</p>
              <div className="directory-empty-actions">
                <Link href="/oportunidades" className="btn">Ver todas</Link>
                <Link href="/dashboard" className="btn primary">Publicar oportunidade</Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
