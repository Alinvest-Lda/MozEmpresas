import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DirectoryAdSlider, type DirectoryAd } from "@/components/directory-ad-slider";

type Business = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  location: string | null;
  logo_url: string | null;
  category_id: string | null;
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
  title: string;
  text: string | null;
  image_url: string | null;
  target_url: string | null;
  priority: number;
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
  searchParams: Promise<{ q?: string; location?: string; category?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() || "";
  const location = params.location?.trim() || "";
  const category = params.category?.trim() || "";

  let data: Business[] = [];
  let categories: Category[] = [];
  let featured: Promotion[] = [];
  let billboardAds: DirectoryAd[] = [];
  let error = false;

  try {
    const supabase = await createClient();

    const [categoryResult, promotionResult] = await Promise.all([
      supabase.from("business_categories").select("id,name,slug").order("name").limit(24),
      supabase
        .from("business_promotions")
        .select("id,business_id,placement,title,text,image_url,target_url,priority,businesses!inner(id,name,slug,description,location,logo_url)")
        .eq("status", "ACTIVE")
        .lte("starts_at", new Date().toISOString())
        .gt("ends_at", new Date().toISOString())
        .in("placement", ["DIRECTORY_BILLBOARD", "DIRECTORY_FEATURED"])
        .order("priority", { ascending: false })
        .limit(12),
    ]);

    categories = (categoryResult.data ?? []) as Category[];
    const promotions = (promotionResult.data ?? []) as unknown as Promotion[];

    if (promotionResult.error) {
      error = true;
    }

    featured = promotions.filter((item) => item.placement === "DIRECTORY_FEATURED").slice(0, 3);

    billboardAds = promotions
      .filter((item) => item.placement === "DIRECTORY_BILLBOARD")
      .slice(0, 3)
      .map((item) => ({
        label: "Publicidade",
        title: item.title,
        text: item.text || "Destaque a sua empresa perante visitantes do directório.",
        image: item.image_url || undefined,
        href: item.target_url || (item.businesses ? "/empresas/" + item.businesses.slug : "/contactos"),
      }));

    let query = supabase
      .from("businesses")
      .select("id,name,slug,description,location,logo_url,category_id")
      .eq("is_public", true)
      .order("name")
      .limit(60);

    if (q) {
      const safe = q
        .replace(/[%_,()']/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (safe) query = query.or(`name.ilike.%${safe}%,description.ilike.%${safe}%`);
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
    data = (result.data ?? []) as Business[];
    error = error || Boolean(result.error);
  } catch {
    error = true;
  }

  const hasFilters = Boolean(q || location || category);
  const resultLabel = data.length === 1 ? "empresa encontrada" : "empresas encontradas";

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

        <DirectoryAdSlider ads={billboardAds} />

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
                    <p>{item.text || item.title || business.description || "Conheça esta empresa em destaque."}</p>
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
                    <div className="directory-business-logo">
                      {business.logo_url ? <img src={business.logo_url} alt="" /> : business.name.charAt(0)}
                    </div>
                    <div className="directory-business-content">
                      <div className="directory-business-title">
                        <div>
                          <h3>{business.name}</h3>
                          <span>Empresa</span>
                        </div>
                        <b>→</b>
                      </div>
                      {business.location && <div className="directory-business-location">⌖ {business.location}</div>}
                      <p>{business.description || "Perfil empresarial no ecossistema MozEmpresas."}</p>
                      <span className="directory-business-action">Ver perfil da empresa</span>
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
        </section>
      </div>
    </main>
  );
}
