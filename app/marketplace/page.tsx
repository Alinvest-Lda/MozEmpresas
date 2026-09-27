import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const types = [["PRODUCT", "Produtos"], ["SERVICE", "Serviços"]] as const;

type Listing = {
  id: string;
  title: string;
  description: string;
  type: "PRODUCT" | "SERVICE";
  price: number | null;
  currency: string | null;
  location: string | null;
  business_id: string | null;
};

export default async function Marketplace({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; location?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() || "";
  const type = params.type?.trim() || "";
  const location = params.location?.trim() || "";

  let listings: Listing[] = [];
  let error = false;

  try {
    const supabase = await createClient();
    let query = supabase
      .from("listings")
      .select("id,title,description,type,price,currency,location,business_id")
      .eq("status", "PUBLISHED")
      .order("created_at", { ascending: false })
      .limit(48);

    if (q) {
      const safe = q.replace(/[%_,()']/g, " ").replace(/\s+/g, " ").trim();
      if (safe) query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%`);
    }
    if (type && type !== "all") query = query.eq("type", type);
    if (location) query = query.ilike("location", `%${location}%`);

    const result = await query;
    listings = (result.data ?? []) as Listing[];
    error = Boolean(result.error);

    const ids = [...new Set(listings.map((item) => item.business_id).filter(Boolean))];
    if (ids.length) {
      const { data: businesses } = await supabase.from("businesses").select("id,name").in("id", ids);
      const names = new Map((businesses ?? []).map((business) => [business.id, business.name]));
      listings = listings.map((item) => ({
        ...item,
        business_id: item.business_id ? names.get(item.business_id) ?? item.business_id : null,
      }));
    }
  } catch {
    error = true;
  }

  const hasFilters = Boolean(q || location || (type && type !== "all"));
  const resultLabel = listings.length === 1 ? "oferta encontrada" : "ofertas encontradas";

  return (
    <main className="directory-page">
      <div className="container">
        <section className="directory-hero">
          <div className="directory-hero-copy">
            <span className="eyebrow">Produtos e serviços</span>
            <h1>Encontre produtos e serviços para fazer negócio.</h1>
            <p>
              Pesquise ofertas publicadas por empresas em Moçambique por nome,
              tipo ou localização. Consulte os detalhes e avance directamente
              para o fornecedor.
            </p>
          </div>

          <div className="directory-search-panel">
            <form className="directory-search marketplace-search" action="/marketplace">
              <label className="directory-search-field directory-search-keyword">
                <span>O que procura?</span>
                <div>
                  <b aria-hidden="true">⌕</b>
                  <input name="q" defaultValue={q} placeholder="Produto, serviço ou palavra-chave" />
                </div>
              </label>
              <label className="directory-search-field">
                <span>Tipo</span>
                <div>
                  <b aria-hidden="true">◈</b>
                  <select name="type" defaultValue={type || "all"}>
                    <option value="all">Produtos e serviços</option>
                    {types.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
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
            {hasFilters && <Link href="/marketplace" className="directory-clear">Limpar pesquisa</Link>}
          </div>
        </section>

        <section className="directory-discovery marketplace-shortcuts">
          <div className="directory-section-head">
            <div>
              <span className="eyebrow">Exploração rápida</span>
              <h2>Procure por tipo de oferta.</h2>
            </div>
            <span className="directory-section-note">Categorias comerciais</span>
          </div>
          <div className="directory-category-list">
            <Link href="/marketplace" className={!type || type === "all" ? "active" : ""}>Todos <span>→</span></Link>
            {types.map(([value, label]) => (
              <Link key={value} href={"/marketplace?type=" + value} className={type === value ? "active" : ""}>
                {label}<span>→</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="directory-results">
          <div className="directory-results-head">
            <div>
              <span className="eyebrow">{hasFilters ? "Resultados da pesquisa" : "Ofertas publicadas"}</span>
              <h2>{hasFilters ? "Ofertas que correspondem à sua pesquisa" : "Produtos e serviços disponíveis"}</h2>
            </div>
            <div className="directory-results-summary">
              <strong>{listings.length}</strong>
              <span>{resultLabel}</span>
            </div>
          </div>

          {hasFilters && (
            <div className="directory-active-filters">
              {q && <span>Pesquisa: <b>{q}</b></span>}
              {location && <span>Localização: <b>{location}</b></span>}
              {type && type !== "all" && <span>Tipo: <b>{types.find(([value]) => value === type)?.[1] || type}</b></span>}
              <Link href="/marketplace">× Limpar</Link>
            </div>
          )}

          {error && <div className="notice">Algumas funções do marketplace estão temporariamente indisponíveis. Pode continuar a navegar pelo portal.</div>}

          {listings.length > 0 ? (
            <div className="directory-results-layout">
              <div className="directory-results-list">
                {listings.map((item, index) => (
                  <Link href={"/marketplace/" + item.id} className="directory-business-card marketplace-result-card" key={item.id}>
                    <div className="directory-business-number">{String(index + 1).padStart(2, "0")}</div>
                    <div className="marketplace-type-icon">{item.type === "PRODUCT" ? "P" : "S"}</div>
                    <div className="directory-business-content">
                      <div className="directory-business-title">
                        <div>
                          <h3>{item.title}</h3>
                          <span>{item.type === "PRODUCT" ? "Produto" : "Serviço"}</span>
                        </div>
                        <b>→</b>
                      </div>
                      {item.location && <div className="directory-business-location">⌖ {item.location}</div>}
                      {item.business_id && <div className="listing-provider">Fornecedor: {item.business_id}</div>}
                      <p>{item.description}</p>
                      <div className="marketplace-result-bottom">
                        <strong>{item.price != null ? `${item.price} ${item.currency || "MZN"}` : "Sob consulta"}</strong>
                        <span>Ver oferta →</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <aside className="directory-side-card">
                <span className="eyebrow">Para empresas</span>
                <h3>Apresente os seus produtos e serviços.</h3>
                <p>Crie a sua presença no MozEmpresas e publique ofertas para serem encontradas por clientes e parceiros.</p>
                <Link href="/registo" className="btn primary full">Criar presença empresarial →</Link>
              </aside>
            </div>
          ) : (
            <div className="directory-empty">
              <div className="directory-empty-icon">◇</div>
              <span className="eyebrow">Sem resultados</span>
              <h3>Não encontrámos ofertas para esta pesquisa.</h3>
              <p>Experimente retirar um filtro, alterar a palavra-chave ou procurar noutra localização.</p>
              <div className="directory-empty-actions">
                <Link href="/marketplace" className="btn">Ver todas as ofertas</Link>
                <Link href="/registo" className="btn primary">Publicar oferta</Link>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
