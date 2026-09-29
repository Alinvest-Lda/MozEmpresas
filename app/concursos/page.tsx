export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DirectoryAdSlider, type DirectoryAd } from "@/components/directory-ad-slider";
import { redirect } from "next/navigation";

type Contest = {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: string;
  category: string | null;
  closes_at: string | null;
  created_at?: string;
};

const statusLabel: Record<string, string> = {
  OPEN: "Aberto",
  PUBLISHED: "Publicado",
  EVALUATION: "Em avaliação",
  RESULTS: "Resultados",
};

function daysLeft(date: string | null) {
  if (!date) return null;
  const diff = new Date(date).getTime() - Date.now();
  return Math.ceil(diff / 86400000);
}

function deadlineLabel(date: string | null) {
  const days = daysLeft(date);
  if (days === null) return "Prazo não indicado";
  if (days < 0) return "Prazo terminado";
  if (days === 0) return "Termina hoje";
  if (days === 1) return "Termina amanhã";
  if (days <= 7) return `Termina em ${days} dias`;
  return `Até ${new Date(date as string).toLocaleDateString("pt-MZ")}`;
}

export default async function Concursos({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; deadline?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() || "";
  const category = params.category?.trim() || "";
  const deadline = params.deadline?.trim() || "";
  const sort = params.sort?.trim() || "deadline";

  let data: Contest[] = [];
  let billboardAds: DirectoryAd[] = [];
  let signedIn = false;
  let error = false;

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  signedIn = Boolean(claimsData?.claims?.sub);
  if (signedIn) redirect("/dashboard/concursos");

  try {

    const { data: promotions } = await supabase
      .from("business_promotions")
      .select("id,title,text,image_url,target_url,priority")
      .eq("status", "ACTIVE")
      .lte("starts_at", new Date().toISOString())
      .gt("ends_at", new Date().toISOString())
      .eq("placement", "DIRECTORY_BILLBOARD")
      .order("priority", { ascending: false })
      .limit(6);

    billboardAds = (promotions ?? []).map((item) => ({
      label: "Publicidade empresarial",
      title: item.title,
      text: item.text || "Destaque a sua marca perante organizações e empresas.",
      image: item.image_url || undefined,
      href: item.target_url || "/contactos",
    }));

    let query = supabase
      .from("contests")
      .select("id,title,slug,description,status,category,closes_at,created_at")
      .eq("status", "OPEN")
      .order("created_at", { ascending: false })
      .limit(signedIn ? 48 : 12);

    if (q) {
      const safe = q.replace(/[%_,()']/g, " ").replace(/\s+/g, " ").trim();
      if (safe) query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%,category.ilike.%${safe}%`);
    }
    if (category) query = query.eq("category", category);

    if (deadline === "7") {
      query = query.gte("closes_at", new Date().toISOString()).lte("closes_at", new Date(Date.now() + 7 * 86400000).toISOString());
    } else if (deadline === "30") {
      query = query.gte("closes_at", new Date().toISOString()).lte("closes_at", new Date(Date.now() + 30 * 86400000).toISOString());
    }

    const result = await query;
    data = (result.data ?? []) as Contest[];
    error = Boolean(result.error);

    data.sort((a, b) => {
      if (sort === "newest") return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      if (sort === "title") return a.title.localeCompare(b.title, "pt");
      return (new Date(a.closes_at || "2999-12-31").getTime() - new Date(b.closes_at || "2999-12-31").getTime());
    });
  } catch {
    error = true;
  }

  const categories = Array.from(new Set(data.map((item) => item.category).filter(Boolean))) as string[];
  const hasFilters = Boolean(q || category || deadline);
  const activeCount = [q, category, deadline].filter(Boolean).length;
  const resultLabel = data.length === 1 ? "concurso encontrado" : "concursos encontrados";

  return (
    <main className="directory-page contests-page">
      <div className="container">
        <section className="directory-hero contests-hero">
          <div className="directory-hero-copy">
            <span className="eyebrow">Oportunidades de negócio</span>
            <h1>Encontre concursos que fazem sentido para a sua empresa.</h1>
            <p>
              Pesquise oportunidades de contratação, veja os prazos e abra cada processo para consultar as condições disponíveis.
            </p>
          </div>

          <div className="directory-search-panel">
            <form className="directory-search contests-search" action="/concursos">
              <label className="directory-search-field directory-search-keyword">
                <span>Pesquisar oportunidades</span>
                <div>
                  <b aria-hidden="true">⌕</b>
                  <input name="q" defaultValue={q} placeholder="Serviço, fornecimento, consultoria..." />
                </div>
              </label>
              <label className="directory-search-field">
                <span>Área</span>
                <div>
                  <b aria-hidden="true">◈</b>
                  <input name="category" defaultValue={category} placeholder="Construção, IT, consultoria..." />
                </div>
              </label>
              <div className="directory-search-context">
                <span>Resultados</span>
                <strong>Concursos abertos</strong>
              </div>
              <button className="btn primary directory-search-button">Pesquisar</button>
            </form>
            {hasFilters && <Link href="/concursos" className="directory-clear">Limpar todos os filtros</Link>}
          </div>
        </section>

        <DirectoryAdSlider ads={billboardAds} />

        <section className="contest-command-bar">
          <div className="contest-command-copy">
            <span className="eyebrow">Pesquisa rápida</span>
            <strong>{data.length} {resultLabel}</strong>
            <span>Filtre por prazo ou área para chegar mais depressa às oportunidades relevantes.</span>
          </div>
          <div className="contest-quick-filters">
            <Link href="/concursos" className={!deadline ? "active" : ""}>Todos</Link>
            <Link href="/concursos?deadline=7" className={deadline === "7" ? "active" : ""}>Fecham em 7 dias</Link>
            <Link href="/concursos?deadline=30" className={deadline === "30" ? "active" : ""}>Próximos 30 dias</Link>
          </div>
        </section>

        <section className="contest-discovery">
          <div className="contest-discovery-head">
            <div>
              <span className="eyebrow">Directório de concursos</span>
              <h2>Oportunidades abertas agora</h2>
            </div>
            <div className="contest-sort">
              <span>{activeCount ? `${activeCount} filtro${activeCount > 1 ? "s" : ""} activo${activeCount > 1 ? "s" : ""}` : "Sem filtros adicionais"}</span>
              <form action="/concursos">
                {q && <input type="hidden" name="q" value={q} />}
                {category && <input type="hidden" name="category" value={category} />}
                {deadline && <input type="hidden" name="deadline" value={deadline} />}
                <select name="sort" defaultValue={sort} aria-label="Ordenar concursos">
                  <option value="deadline">Prazo mais próximo</option>
                  <option value="newest">Mais recentes</option>
                  <option value="title">Ordem alfabética</option>
                </select>
                <button className="btn">Ordenar</button>
              </form>
            </div>
          </div>

          {categories.length > 0 && (
            <div className="contest-category-pills">
              <span>Áreas encontradas:</span>
              {categories.slice(0, 10).map((item) => (
                <Link key={item} href={`/concursos?category=${encodeURIComponent(item)}`} className={category === item ? "active" : ""}>{item}</Link>
              ))}
            </div>
          )}

          {error && <div className="notice">Não foi possível carregar os concursos neste momento. Pode continuar a navegar pelo portal.</div>}

          {hasFilters && (
            <div className="directory-active-filters">
              {q && <span>Pesquisa: <b>{q}</b></span>}
              {category && <span>Área: <b>{category}</b></span>}
              {deadline && <span>Prazo: <b>{deadline === "7" ? "próximos 7 dias" : "próximos 30 dias"}</b></span>}
              <Link href="/concursos">× Limpar</Link>
            </div>
          )}

          {data.length > 0 ? (
            <div className="contest-results-layout">
              <div className="contest-results-list">
                {data.map((item, index) => {
                  const days = daysLeft(item.closes_at);
                  const urgent = days !== null && days <= 7;
                  return (
                    <Link href={`/concursos/${item.slug}`} className={`directory-business-card contest-result-card contest-card${urgent ? " is-urgent" : ""}`} key={item.id}>
                      <div className="contest-card-index">{String(index + 1).padStart(2, "0")}</div>
                      <div className="contest-type-icon">{item.category ? item.category.slice(0, 1).toUpperCase() : "C"}</div>
                      <div className="directory-business-content">
                        <div className="directory-business-title">
                          <div>
                            <div className="contest-card-tags">
                              <span>{statusLabel[item.status] || item.status}</span>
                              {urgent && <span className="urgent-tag">Prazo próximo</span>}
                            </div>
                            <h3>{item.title}</h3>
                          </div>
                          <b>→</b>
                        </div>
                        <div className="contest-card-meta">
                          {item.category && <span>Área <strong>{item.category}</strong></span>}
                          {item.created_at && <span>Publicado <strong>{new Date(item.created_at).toLocaleDateString("pt-MZ")}</strong></span>}
                        </div>
                        <p>{signedIn ? item.description : (item.description.length > 190 ? item.description.slice(0, 190) + "…" : item.description)}</p>
                        <div className="contest-result-bottom">
                          <span className={urgent ? "deadline-urgent" : ""}>⌛ {deadlineLabel(item.closes_at)}</span>
                          <span>{signedIn ? "Abrir processo →" : "Ver oportunidade →"}</span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              <aside className="contest-side-rail">
                <div className="contest-side-card">
                  <span className="eyebrow">Para empresas</span>
                  <h3>Não perca oportunidades relevantes.</h3>
                  <p>Registe a sua empresa para consultar os processos disponíveis e acompanhar oportunidades a partir do seu painel.</p>
                  <div className="contest-side-actions">
                    {!signedIn && <Link href="/registo" className="btn primary full">Registar empresa</Link>}
                    <Link href={signedIn ? "/dashboard" : "/login"} className="btn full">{signedIn ? "Ir para o meu painel" : "Já tenho conta"}</Link>
                  </div>
                </div>
                <div className="contest-side-card contest-publish-card">
                  <span className="eyebrow">Para organizações</span>
                  <h3>Tem um processo para publicar?</h3>
                  <p>Crie um concurso e apresente a oportunidade às empresas certas.</p>
                  <Link href="/dashboard" className="text-link">Publicar concurso →</Link>
                </div>
              </aside>
            </div>
          ) : (
            <div className="directory-empty contest-empty">
              <div className="directory-empty-icon">⌕</div>
              <span className="eyebrow">Pesquisa sem resultados</span>
              <h3>Não encontrámos concursos com estes critérios.</h3>
              <p>Retire algum filtro, experimente uma área diferente ou volte a ver todas as oportunidades abertas.</p>
              <div className="directory-empty-actions">
                <Link href="/concursos" className="btn">Ver todos</Link>
                <Link href="/registo" className="btn primary">Registar empresa</Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
