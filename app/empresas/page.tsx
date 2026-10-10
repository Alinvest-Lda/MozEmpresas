import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PublicAd } from "@/components/public-ad";

type BusinessRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  location: string | null;
  logo_url: string | null;
  cover_url: string | null;
  category_id: string | null;
  owner_id: string | null;
};

type Business = BusinessRecord & {
  portfolio: { image_url: string; title: string | null }[];
};

type Category = {
  id: string;
  name: string;
  slug: string;
};

type Promotion = {
  id: string;
  business_id: string;
  placement: string;
  slot: string;
  title: string;
  headline: string | null;
  body: string | null;
  image_url: string | null;
  target_url: string | null;
  cta_label: string | null;
  alt_text: string | null;
  businesses: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    location: string | null;
    logo_url: string | null;
  } | null;
};

export default async function Empresas({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; location?: string; category?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() || "";
  const location = params.location?.trim() || "";
  const category = params.category?.trim() || "";
  const pageSize = 24;
  const parsedPage = Number.parseInt(params.page || "1", 10);
  const currentPage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  let data: Business[] = [];
  let categories: Category[] = [];
  let featured: Promotion[] = [];
  let error = false;
  let totalResults = 0;

  try {
    const supabase = await createClient();
    const [categoryResult, promotionResult] = await Promise.all([
      supabase.from("business_categories").select("id,name,slug").order("name").limit(24),
      supabase
        .from("business_promotions")
        .select("id,business_id,placement,slot,title,headline,body,image_url,target_url,cta_label,alt_text,businesses!inner(id,name,slug,description,location,logo_url)")
        .eq("status", "ACTIVE")
        .lte("starts_at", new Date().toISOString())
        .gt("ends_at", new Date().toISOString())
        .eq("placement", "DIRECTORY")
        .eq("businesses.is_public", true)
        .is("businesses.archived_at", null)
        .in("slot", ["BILLBOARD", "FEATURED"])
        .order("created_at", { ascending: false })
        .limit(12),
    ]);

    categories = (categoryResult.data ?? []) as Category[];
    const promotions = (promotionResult.data ?? []) as unknown as Promotion[];

    featured = promotions.filter((item) => item.slot === "FEATURED").slice(0, 3);



    let query = supabase
      .from("businesses")
      .select("id,name,slug,description,location,logo_url,cover_url,category_id,owner_id", { count: "exact" })
      .eq("is_public", true)
      .is("archived_at", null)
      .order("name")
      .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

    if (q) {
      const safe = q
        .replace(/[%_,()']/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      if (safe) {
        // A directory search also discovers companies through their published products/services.
        const { data: matchingListings } = await supabase
          .from("listings")
          .select("business_id")
          .eq("status", "PUBLISHED")
          .or(`title.ilike.%${safe}%,description.ilike.%${safe}%`)
          .limit(100);

        const listingBusinessIds = [...new Set((matchingListings ?? []).map((item) => item.business_id).filter(Boolean))];
        const clauses = [`name.ilike.%${safe}%`, `description.ilike.%${safe}%`];
        if (listingBusinessIds.length) clauses.push(`id.in.(${listingBusinessIds.join(",")})`);
        query = query.or(clauses.join(","));
      }
    }

    if (location) {
      query = query.ilike("location", `%${location}%`);
    }

    if (category) {
      query = query.eq("category_id", category);
    }

    const sponsoredIds = featured.map((item) => item.business_id);
    if (sponsoredIds.length > 0) {
      query = query.not("id", "in", `(${sponsoredIds.join(",")})`);
    }

    const result = await query;
    const records = (result.data ?? []) as BusinessRecord[];
    totalResults = result.count ?? records.length;
    error = error || Boolean(result.error);
    if (records.length) {
      const ids=records.map((item)=>item.id);
      const {data:media}=await supabase.from("business_portfolio_media").select("business_id,image_url,title,sort_order").in("business_id",ids).order("sort_order");
      const byBusiness=new Map<string,{image_url:string;title:string|null}[]>();
      (media??[]).forEach((item)=>{const list=byBusiness.get(item.business_id)??[]; if(list.length<5) list.push({image_url:item.image_url,title:item.title}); byBusiness.set(item.business_id,list);});
      data=records.map((item)=>({...item,portfolio:byBusiness.get(item.id)??[]}));
    } else {
      data = [];
    }
  } catch {
    error = true;
  }

  const hasFilters = Boolean(q || location || category);
  const resultLabel = totalResults === 1 ? "empresa encontrada" : "empresas encontradas";
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize));
  const pageHref = (page: number) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (location) next.set("location", location);
    if (category) next.set("category", category);
    if (page > 1) next.set("page", String(page));
    const queryString = next.toString();
    return "/empresas" + (queryString ? "?" + queryString : "");
  };

  return (
    <main className="directory-page">
      <div className="container">
        <section className="directory-hero">
          <div className="directory-hero-copy">
            <span className="eyebrow">Directório empresarial de Moçambique</span>
            <h1>Encontre a empresa certa para o que precisa.</h1>
            <p>
              Pesquise empresas, fornecedores e prestadores de serviços por nome,
              actividade ou localização. Abra um perfil para conhecer a empresa e
              encontrar os seus contactos.
            </p>
          </div>

          <div className="directory-search-panel">
            <form className="directory-search" action="/empresas">
              <label className="directory-search-field directory-search-keyword">
                <span>O que procura?</span>
                <div>
                  <b aria-hidden="true">⌕</b>
                  <input
                    name="q"
                    defaultValue={q}
                    placeholder="Empresa, actividade, produto ou serviço"
                    aria-label="Empresa, actividade, produto ou serviço"
                  />
                </div>
              </label>
              <label className="directory-search-field">
                <span>Onde?</span>
                <div>
                  <b aria-hidden="true">⌖</b>
                  <input
                    name="location"
                    defaultValue={location}
                    placeholder="Província ou localização"
                    aria-label="Província ou localização"
                  />
                </div>
              </label>
              <label className="directory-search-field directory-search-category">
                <span>Actividade</span>
                <div>
                  <b aria-hidden="true">◈</b>
                  <select name="category" defaultValue={category} aria-label="Actividade">
                    <option value="">Todas as actividades</option>
                    {categories.map((item) => (
                      <option value={item.id} key={item.id}>{item.name}</option>
                    ))}
                  </select>
                </div>
              </label>
              <button className="btn primary directory-search-button">Pesquisar</button>
            </form>
            {hasFilters && (
              <Link href="/empresas" className="directory-clear">
                Limpar pesquisa
              </Link>
            )}
          </div>
        </section>

        <PublicAd surface="DIRECTORY" slot="BILLBOARD" context={{query:q,location,category}} interests={[q,category].filter(Boolean)} />

        {featured.length > 0 && (
          <section className="directory-featured">
            <div className="directory-section-head">
              <div>
                <span className="eyebrow">Publicidade empresarial</span>
                <h2>Empresas em destaque</h2>
              </div>
              <span className="directory-section-note">Posições patrocinadas</span>
            </div>
            <div className="directory-featured-grid">
              {featured.map((item) => {
                const business = item.businesses;
                if (!business) return null;
                return (
                  <Link
                    href={item.target_url || "/empresas/" + business.slug}
                    className="directory-featured-card"
                    rel={item.target_url ? "sponsored" : undefined}
                    key={item.id}
                  >
                    <div className="directory-sponsored-label">Patrocinado</div>
                    <div className="directory-featured-main">
                      <div className="directory-business-logo">
                        {business.logo_url ? <img src={business.logo_url} alt="" /> : business.name.charAt(0)}
                      </div>
                      <div>
                        <h3>{business.name}</h3>
                        {business.location && <span>{business.location}</span>}
                      </div>
                    </div>
                    <p>{item.headline || item.body || item.title || business.description || "Conheça esta empresa em destaque."}</p>
                    <span className="directory-business-action">Ver empresa →</span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {categories.length > 0 && (
          <section className="directory-discovery">
            <div className="directory-section-head">
              <div>
                <span className="eyebrow">Descoberta rápida</span>
                <h2>Procure por actividade.</h2>
              </div>
              <span className="directory-section-note">Categorias do directório</span>
            </div>
            <div className="directory-category-list">
              {categories.map((item) => (
                <Link
                  href={"/empresas?category=" + encodeURIComponent(item.id)}
                  className={category === item.id ? "active" : ""}
                  key={item.id}
                >
                  {item.name}<span>→</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="directory-results">
          <div className="directory-results-head">
            <div>
              <span className="eyebrow">{hasFilters ? "Resultados da pesquisa" : "Directório empresarial"}</span>
              <h2>{hasFilters ? "Empresas que correspondem à sua pesquisa" : "Empresas disponíveis no directório"}</h2>
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
              {category && (
                <span>
                  Actividade: <b>{categories.find((item) => item.id === category)?.name || "seleccionada"}</b>
                </span>
              )}
              <Link href="/empresas">× Limpar</Link>
            </div>
          )}

          {error && (
            <div className="notice">
              Algumas funções do directório estão temporariamente indisponíveis. Pode continuar a navegar pelo portal.
            </div>
          )}

          {data.length > 0 ? (
            <div className="directory-results-layout">
              <div className="directory-results-list">
                {data.map((business, index) => (
                  <Link href={"/empresas/" + business.slug} className="directory-business-card" key={business.id}>
                    <div className="directory-business-number">{String(index + 1).padStart(2, "0")}</div>
                    <div className="directory-business-content">
                      <div className="directory-business-visuals" aria-hidden="true">
                        <div className="directory-portfolio-strip">
                          {(business.portfolio.length ? business.portfolio : business.cover_url ? [{image_url:business.cover_url,title:"Imagem de capa"}] : []).slice(0,4).map((image,index)=><span key={image.image_url+index}><img src={image.image_url} alt="" /></span>)}
                          {!business.portfolio.length && !business.cover_url && <span className="directory-portfolio-empty">Sem imagens de portfólio</span>}
                        </div>
                      </div>
                      <div className="directory-business-title">
                        <div>
                          <h3>{business.name}</h3>
                          <span>Empresa</span>
                        </div>
                        <b>→</b>
                      </div>
                      {business.location && <div className="directory-business-location">⌖ {business.location}</div>}
                      <p>{business.description || "Perfil empresarial no ecossistema MozEmpresas."}</p>
                      <div className="directory-business-bottom"><span className="directory-business-action">Ver perfil da empresa</span><span className="directory-business-offer">Ver produtos e serviços →</span></div>
                    </div>
                  </Link>
                ))}
              </div>
              <aside className="directory-side-card">
                <span className="eyebrow">Para empresas</span>
                <h3>A sua empresa ainda não está aqui?</h3>
                <p>Crie um perfil no MozEmpresas para apresentar a sua actividade, produtos, serviços e contactos.</p>
                <Link href="/registo" className="btn primary full">Registar empresa →</Link>
              </aside>
            </div>
          ) : (
            <div className="directory-empty">
              <div className="directory-empty-icon">⌕</div>
              <span className="eyebrow">Pesquisa sem resultados</span>
              <h3>Não encontrámos empresas para esta pesquisa.</h3>
              <p>Experimente retirar um termo, escolher outra actividade ou usar uma localização diferente.</p>
              <div className="directory-empty-actions">
                <Link href="/empresas" className="btn">Ver todas as empresas</Link>
                <Link href="/registo" className="btn primary">Registar empresa</Link>
              </div>
            </div>
          )}

          {totalResults > 0 && totalPages > 1 && (
            <nav className="directory-pagination" aria-label="Paginação de empresas">
              <span>Página {Math.min(currentPage, totalPages)} de {totalPages}</span>
              <div>
                {currentPage > 1 && <Link href={pageHref(currentPage - 1)} className="btn">← Anterior</Link>}
                {currentPage < totalPages && <Link href={pageHref(currentPage + 1)} className="btn primary">Seguinte →</Link>}
              </div>
            </nav>
          )}
        </section>
      </div>
    </main>
  );
}
