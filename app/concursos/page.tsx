import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const statuses: Record<string, string> = {
  PUBLISHED: "Publicado",
  OPEN: "Aberto",
  CLOSED: "Encerrado",
  EVALUATION: "Em avaliação",
  RESULTS: "Resultados",
};

type Contest = {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: string;
  category: string | null;
  closes_at: string | null;
};

export default async function Concursos({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() || "";
  const status = params.status?.trim() || "";

  let data: Contest[] = [];
  let error = false;

  try {
    const supabase = await createClient();
    let query = supabase
      .from("contests")
      .select("id,title,slug,description,status,category,closes_at")
      .in("status", ["PUBLISHED", "OPEN", "CLOSED", "EVALUATION", "RESULTS"])
      .order("created_at", { ascending: false })
      .limit(48);

    if (q) {
      const safe = q.replace(/[%_,()']/g, " ").replace(/\s+/g, " ").trim();
      if (safe) query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%,category.ilike.%${safe}%`);
    }
    if (status && status !== "all") query = query.eq("status", status);

    const result = await query;
    data = (result.data ?? []) as Contest[];
    error = Boolean(result.error);
  } catch {
    error = true;
  }

  const hasFilters = Boolean(q || (status && status !== "all"));
  const resultLabel = data.length === 1 ? "concurso encontrado" : "concursos encontrados";

  return (
    <main className="directory-page">
      <div className="container">
        <section className="directory-hero">
          <div className="directory-hero-copy">
            <span className="eyebrow">Concursos e contratação</span>
            <h1>Encontre concursos e processos de contratação.</h1>
            <p>
              Consulte chamadas, requisitos, prazos e estados dos processos
              publicados por organizações e empresas no MozEmpresas.
            </p>
          </div>

          <div className="directory-search-panel">
            <form className="directory-search contests-search" action="/concursos">
              <label className="directory-search-field directory-search-keyword">
                <span>O que procura?</span>
                <div>
                  <b aria-hidden="true">⌕</b>
                  <input name="q" defaultValue={q} placeholder="Título, sector ou palavra-chave" />
                </div>
              </label>
              <label className="directory-search-field">
                <span>Estado</span>
                <div>
                  <b aria-hidden="true">◉</b>
                  <select name="status" defaultValue={status || "all"}>
                    <option value="all">Todos os estados</option>
                    {Object.entries(statuses).map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                  </select>
                </div>
              </label>
              <div className="directory-search-context">
                <span>Foco</span>
                <strong>Processos empresariais</strong>
              </div>
              <button className="btn primary directory-search-button">Pesquisar</button>
            </form>
            {hasFilters && <Link href="/concursos" className="directory-clear">Limpar pesquisa</Link>}
          </div>
        </section>

        <section className="directory-discovery">
          <div className="directory-section-head">
            <div>
              <span className="eyebrow">Pesquisa rápida</span>
              <h2>Filtre por estado.</h2>
            </div>
            <span className="directory-section-note">Acompanhe o ciclo do processo</span>
          </div>
          <div className="directory-category-list">
            <Link href="/concursos" className={!status || status === "all" ? "active" : ""}>Todos <span>→</span></Link>
            {Object.entries(statuses).map(([value, label]) => (
              <Link key={value} href={"/concursos?status=" + value} className={status === value ? "active" : ""}>
                {label}<span>→</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="directory-results">
          <div className="directory-results-head">
            <div>
              <span className="eyebrow">{hasFilters ? "Resultados da pesquisa" : "Processos publicados"}</span>
              <h2>{hasFilters ? "Concursos que correspondem à sua pesquisa" : "Concursos e processos disponíveis"}</h2>
            </div>
            <div className="directory-results-summary">
              <strong>{data.length}</strong>
              <span>{resultLabel}</span>
            </div>
          </div>

          {hasFilters && (
            <div className="directory-active-filters">
              {q && <span>Pesquisa: <b>{q}</b></span>}
              {status && status !== "all" && <span>Estado: <b>{statuses[status] || status}</b></span>}
              <Link href="/concursos">× Limpar</Link>
            </div>
          )}

          {error && <div className="notice">Não foi possível carregar os concursos neste momento. Pode continuar a navegar pelo portal.</div>}

          {data.length > 0 ? (
            <div className="directory-results-layout">
              <div className="directory-results-list">
                {data.map((item, index) => (
                  <Link href={"/concursos/" + item.slug} className="directory-business-card contest-result-card" key={item.id}>
                    <div className="directory-business-number">{String(index + 1).padStart(2, "0")}</div>
                    <div className="contest-type-icon">{item.status === "OPEN" ? "O" : "C"}</div>
                    <div className="directory-business-content">
                      <div className="directory-business-title">
                        <div>
                          <h3>{item.title}</h3>
                          <span>{statuses[item.status] || item.status}</span>
                        </div>
                        <b>→</b>
                      </div>
                      {item.category && <div className="directory-business-location">Categoria: {item.category}</div>}
                      <p>{item.description}</p>
                      <div className="contest-result-bottom">
                        {item.closes_at ? <span>Prazo: <strong>{new Date(item.closes_at).toLocaleDateString("pt-MZ")}</strong></span> : <span>Prazo não indicado</span>}
                        <span>Consultar concurso →</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <aside className="directory-side-card">
                <span className="eyebrow">Para organizações</span>
                <h3>Publique um concurso ou processo.</h3>
                <p>Coloque uma oportunidade de contratação no portal e permita que empresas encontrem a informação necessária para responder.</p>
                <Link href="/dashboard" className="btn primary full">Ir para o painel →</Link>
              </aside>
            </div>
          ) : (
            <div className="directory-empty">
              <div className="directory-empty-icon">§</div>
              <span className="eyebrow">Sem resultados</span>
              <h3>Nenhum concurso corresponde à pesquisa.</h3>
              <p>Experimente retirar filtros ou pesquisar por outro termo. Novos processos aparecerão aqui quando forem publicados.</p>
              <div className="directory-empty-actions">
                <Link href="/concursos" className="btn">Ver todos os concursos</Link>
                <Link href="/registo" className="btn primary">Registar empresa</Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
