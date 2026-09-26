import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const sectors = [
  ["Construção e engenharia", "Obras, projectos e manutenção"],
  ["Consultoria e serviços", "Serviços profissionais e empresariais"],
  ["Tecnologia", "TI, software e soluções digitais"],
  ["Contabilidade e finanças", "Contabilidade, auditoria e finanças"],
  ["Comércio e distribuição", "Produtos, grossistas e retalhistas"],
  ["Logística e transportes", "Transporte, carga e armazenagem"],
  ["Agricultura e agro-negócio", "Produção e soluções para o sector"],
  ["Hotelaria e turismo", "Hotéis, turismo e restauração"],
  ["Saúde", "Clínicas, laboratórios e fornecedores"],
  ["Educação e formação", "Instituições e formação profissional"],
  ["Energia e ambiente", "Energia, água e ambiente"],
  ["Outros serviços", "Outras actividades empresariais"],
];

type Business = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  location: string | null;
  logo_url: string | null;
};

export default async function Empresas({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; location?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() || "";
  const location = params.location?.trim() || "";

  let data: Business[] = [];
  let error = false;

  try {
    const supabase = await createClient();
    let query = supabase
      .from("businesses")
      .select("id,name,slug,description,location,logo_url")
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

    const result = await query;
    data = (result.data ?? []) as Business[];
    error = Boolean(result.error);
  } catch {
    error = true;
  }

  const hasFilters = Boolean(q || location);
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
              <button className="btn primary directory-search-button">Pesquisar</button>
            </form>
            {hasFilters && (
              <Link href="/empresas" className="directory-clear">
                Limpar pesquisa
              </Link>
            )}
          </div>
        </section>

        {!hasFilters && (
          <section className="directory-discovery">
            <div className="directory-section-intro">
              <div>
                <span className="eyebrow">Por onde começar</span>
                <h2>Explore por actividade</h2>
              </div>
              <p>Escolha uma área para descobrir empresas que trabalham nesse mercado.</p>
            </div>
            <div className="directory-sector-grid">
              {sectors.map(([title, description]) => (
                <Link
                  href={"/empresas?q=" + encodeURIComponent(title)}
                  className="directory-sector"
                  key={title}
                >
                  <span className="directory-sector-mark">›</span>
                  <span>
                    <strong>{title}</strong>
                    <small>{description}</small>
                  </span>
                  <b>→</b>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="directory-results">
          <div className="directory-results-head">
            <div>
              <span className="eyebrow">{hasFilters ? "Resultados da pesquisa" : "Directório"}</span>
              <h2>{hasFilters ? "Empresas que correspondem à sua pesquisa" : "Empresas no MozEmpresas"}</h2>
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
              <Link href="/empresas">× Limpar</Link>
            </div>
          )}

          {error && (
            <div className="notice">
              O directório está temporariamente indisponível. Pode continuar a navegar pelo portal.
            </div>
          )}

          {data.length > 0 ? (
            <div className="directory-results-layout">
              <div className="directory-results-list">
                {data.map((business, index) => (
                  <Link
                    href={"/empresas/" + business.slug}
                    className="directory-business-card"
                    key={business.id}
                  >
                    <div className="directory-business-number">{String(index + 1).padStart(2, "0")}</div>
                    <div className="directory-business-logo">
                      {business.logo_url ? (
                        <img src={business.logo_url} alt="" />
                      ) : (
                        business.name.charAt(0)
                      )}
                    </div>
                    <div className="directory-business-content">
                      <div className="directory-business-title">
                        <div>
                          <h3>{business.name}</h3>
                          <span>Empresa</span>
                        </div>
                        <b>→</b>
                      </div>
                      {business.location && (
                        <div className="directory-business-location">⌖ {business.location}</div>
                      )}
                      <p>
                        {business.description ||
                          "Perfil empresarial no ecossistema MozEmpresas."}
                      </p>
                      <span className="directory-business-action">Ver perfil da empresa</span>
                    </div>
                  </Link>
                ))}
              </div>

              <aside className="directory-side-card">
                <span className="eyebrow">Para empresas</span>
                <h3>A sua empresa ainda não está aqui?</h3>
                <p>
                  Crie um perfil no MozEmpresas para apresentar a sua actividade,
                  produtos, serviços e contactos a potenciais clientes e parceiros.
                </p>
                <Link href="/registo" className="btn primary full">
                  Registar empresa →
                </Link>
              </aside>
            </div>
          ) : (
            <div className="directory-empty">
              <div className="directory-empty-icon">⌕</div>
              <span className="eyebrow">Pesquisa sem resultados</span>
              <h3>Não encontrámos empresas para esta pesquisa.</h3>
              <p>
                Experimente retirar um termo, usar uma localização diferente ou
                explorar uma actividade do directório.
              </p>
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
