export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DirectoryAdSlider, type DirectoryAd } from "@/components/directory-ad-slider";

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
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() || "";
  const category = params.category?.trim() || "";

  let data: Contest[] = [];
  let billboardAds: DirectoryAd[] = [];
  let signedIn = false;
  let error = false;

  try {
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    signedIn = Boolean(claimsData?.claims?.sub);
    const { data: promotions } = await supabase.from("business_promotions").select("id,title,text,image_url,target_url,priority").eq("status","ACTIVE").lte("starts_at",new Date().toISOString()).gt("ends_at",new Date().toISOString()).eq("placement","DIRECTORY_BILLBOARD").order("priority",{ascending:false}).limit(6);
    billboardAds = (promotions ?? []).map((item) => ({ label:"Publicidade empresarial", title:item.title, text:item.text || "Destaque a sua marca perante organizações e empresas.", image:item.image_url || undefined, href:item.target_url || "/contactos" }));
    let query = supabase
      .from("contests")
      .select("id,title,slug,description,status,category,closes_at")
      .eq("status", "OPEN")
      .order("created_at", { ascending: false })
      .limit(signedIn ? 48 : 6);

    if (q) {
      const safe = q.replace(/[%_,()']/g, " ").replace(/\s+/g, " ").trim();
      if (safe) query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%,category.ilike.%${safe}%`);
    }
    if (category) query = query.eq("category", category);

    const result = await query;
    data = (result.data ?? []) as Contest[];
    error = Boolean(result.error);
  } catch {
    error = true;
  }

  const hasFilters = Boolean(q || category);
  const resultLabel = data.length === 1 ? "concurso encontrado" : "concursos encontrados";

  return (
    <main className="directory-page">
      <div className="container">
        <section className="directory-hero">
          <div className="directory-hero-copy">
            <span className="eyebrow">Concursos e contratação</span>
            <h1>Concursos abertos para empresas.</h1>
            <p>
              Consulte os processos actualmente abertos. Visitantes vêem um resumo; membros registados têm acesso à área completa do processo.
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
                <span>Categoria</span>
                <div><b aria-hidden="true">◈</b><input name="category" defaultValue={category} placeholder="Sector ou categoria" /></div>
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

        <DirectoryAdSlider ads={billboardAds} />

        <section className="directory-discovery">
          <div className="directory-section-head">
            <div>
              <span className="eyebrow">Estado público</span>
              <h2>Apenas concursos abertos.</h2>
            </div>
            <span className="directory-section-note">Avaliações e resultados são internos</span>
          </div>
          <div className="directory-category-list">
            <Link href="/concursos" className={!category ? "active" : ""}>Todos os concursos abertos <span>→</span></Link>
            {category && <Link href="/concursos">Limpar categoria <span>×</span></Link>}
          </div>
        </section>

        <section className="directory-results">
          <div className="directory-results-head">
            <div>
              <span className="eyebrow">{hasFilters ? "Resultados da pesquisa" : "Processos publicados"}</span>
              <h2>{hasFilters ? "Concursos abertos que correspondem à sua pesquisa" : "Concursos actualmente abertos"}</h2>
            </div>
            <div className="directory-results-summary">
              <strong>{data.length}</strong>
              <span>{resultLabel}</span>
            </div>
          </div>

          {hasFilters && (
            <div className="directory-active-filters">
              {q && <span>Pesquisa: <b>{q}</b></span>}
              {category && <span>Categoria: <b>{category}</b></span>}
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
                          <span>Aberto</span>
                        </div>
                        <b>→</b>
                      </div>
                      {item.category && <div className="directory-business-location">Categoria: {item.category}</div>}
                      <p>{signedIn ? item.description : (item.description.length > 180 ? item.description.slice(0, 180) + "…" : item.description)}</p>
                      <div className="contest-result-bottom">
                        {item.closes_at ? <span>Prazo: <strong>{new Date(item.closes_at).toLocaleDateString("pt-MZ")}</strong></span> : <span>Prazo não indicado</span>}
                        <span>{signedIn ? "Abrir processo →" : "Ver preview →"}</span>
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
