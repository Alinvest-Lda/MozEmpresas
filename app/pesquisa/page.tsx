import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type SearchType = "all" | "business" | "listing" | "opportunity" | "contest";

type Result = {
  id: string;
  type: Exclude<SearchType, "all">;
  title: string;
  description: string | null;
  meta: string | null;
  href: string;
  badge: string;
};

function cleanQuery(value: string) {
  return value.replace(/[%_,()']/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
}

function resultLabel(type: SearchType) {
  return {
    all: "Tudo",
    business: "Empresas",
    listing: "Produtos e serviços",
    opportunity: "Oportunidades",
    contest: "Concursos",
  }[type];
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string }>;
}) {
  const params = await searchParams;
  const q = cleanQuery(params.q || "");
  const requestedType = params.tipo as SearchType | undefined;
  const type: SearchType = requestedType && ["all", "business", "listing", "opportunity", "contest"].includes(requestedType)
    ? requestedType
    : "all";

  const results: Result[] = [];
  let error = false;

  if (q.length >= 2) {
    try {
      const supabase = await createClient();

      const searchBusinesses = async () => {
        if (type !== "all" && type !== "business") return;
        const { data, error: queryError } = await supabase
          .from("businesses")
          .select("id,name,slug,description,location")
          .eq("is_public", true)
          .or(`name.ilike.%${q}%,description.ilike.%${q}%,location.ilike.%${q}%`)
          .order("name")
          .limit(12);
        if (queryError) error = true;
        for (const item of data ?? []) {
          results.push({
            id: item.id,
            type: "business",
            title: item.name,
            description: item.description,
            meta: item.location,
            href: "/empresas/" + item.slug,
            badge: "Empresa",
          });
        }
      };

      const searchListings = async () => {
        if (type !== "all" && type !== "listing") return;
        const { data, error: queryError } = await supabase
          .from("listings")
          .select("id,title,description,type,location")
          .eq("status", "PUBLISHED")
          .or(`title.ilike.%${q}%,description.ilike.%${q}%,location.ilike.%${q}%`)
          .order("created_at", { ascending: false })
          .limit(12);
        if (queryError) error = true;
        for (const item of data ?? []) {
          results.push({
            id: item.id,
            type: "listing",
            title: item.title,
            description: item.description,
            meta: [item.type === "PRODUCT" ? "Produto" : "Serviço", item.location].filter(Boolean).join(" · "),
            href: "/marketplace/" + item.id,
            badge: item.type === "PRODUCT" ? "Produto" : "Serviço",
          });
        }
      };

      const searchOpportunities = async () => {
        if (type !== "all" && type !== "opportunity") return;
        const { data, error: queryError } = await supabase
          .from("opportunities")
          .select("id,title,slug,description,type,organization,location")
          .eq("status", "PUBLISHED")
          .or(`title.ilike.%${q}%,description.ilike.%${q}%,organization.ilike.%${q}%,location.ilike.%${q}%`)
          .order("closes_at", { ascending: true, nullsFirst: false })
          .limit(12);
        if (queryError) error = true;
        for (const item of data ?? []) {
          results.push({
            id: item.id,
            type: "opportunity",
            title: item.title,
            description: item.description,
            meta: [item.organization, item.location].filter(Boolean).join(" · "),
            href: "/oportunidades/" + item.slug,
            badge: resultLabel("opportunity"),
          });
        }
      };

      const searchContests = async () => {
        if (type !== "all" && type !== "contest") return;
        const { data, error: queryError } = await supabase
          .from("contests")
          .select("id,title,slug,description,category")
          .eq("status", "OPEN")
          .or(`title.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`)
          .order("closes_at", { ascending: true, nullsFirst: false })
          .limit(12);
        if (queryError) error = true;
        for (const item of data ?? []) {
          results.push({
            id: item.id,
            type: "contest",
            title: item.title,
            description: item.description,
            meta: item.category,
            href: "/concursos/" + item.slug,
            badge: "Concurso aberto",
          });
        }
      };

      await Promise.all([searchBusinesses(), searchListings(), searchOpportunities(), searchContests()]);
    } catch {
      error = true;
    }
  }

  const grouped = (["business", "listing", "opportunity", "contest"] as const)
    .map((itemType) => ({
      type: itemType,
      label: resultLabel(itemType),
      items: results.filter((item) => item.type === itemType),
    }))
    .filter((group) => group.items.length);

  return (
    <main className="global-search-page">
      <div className="container">
        <section className="global-search-hero">
          <span className="eyebrow">Pesquisa transversal</span>
          <h1>Encontre o que procura em todo o MozEmpresas.</h1>
          <p>Uma única pesquisa para descobrir empresas, produtos, serviços, oportunidades e concursos abertos.</p>
          <form className="global-search-form" action="/pesquisa">
            <label>
              <span>O que procura?</span>
              <div className="global-search-input">
                <b aria-hidden="true">⌕</b>
                <input name="q" defaultValue={q} placeholder="Empresa, produto, serviço, oportunidade..." autoFocus />
              </div>
            </label>
            <label>
              <span>Área</span>
              <select name="tipo" defaultValue={type}>
                <option value="all">Tudo</option>
                <option value="business">Empresas</option>
                <option value="listing">Produtos e serviços</option>
                <option value="opportunity">Oportunidades</option>
                <option value="contest">Concursos</option>
              </select>
            </label>
            <button className="btn primary" type="submit">Pesquisar</button>
          </form>
        </section>

        {q.length < 2 ? (
          <section className="global-search-empty">
            <span className="eyebrow">Comece a pesquisar</span>
            <h2>Pesquise por uma necessidade, empresa ou oferta.</h2>
            <p>Ex.: construção, contabilidade, transporte, tecnologia ou o nome de uma empresa.</p>
            <div className="global-search-shortcuts">
              <Link href="/pesquisa?q=construção">Construção</Link>
              <Link href="/pesquisa?q=contabilidade">Contabilidade</Link>
              <Link href="/pesquisa?q=tecnologia">Tecnologia</Link>
              <Link href="/pesquisa?q=logística">Logística</Link>
            </div>
          </section>
        ) : (
          <section className="global-search-results">
            <div className="global-search-results-head">
              <div>
                <span className="eyebrow">Resultados</span>
                <h2>{results.length} resultado{results.length === 1 ? "" : "s"} para “{q}”</h2>
              </div>
              <Link href="/pesquisa" className="text-link">Nova pesquisa →</Link>
            </div>

            {error && <div className="notice">Alguns resultados não puderam ser carregados. Pode continuar a pesquisar noutras áreas.</div>}

            {grouped.length ? (
              <div className="global-search-groups">
                {grouped.map((group) => (
                  <section className="global-search-group" key={group.type}>
                    <div className="global-search-group-head">
                      <div><span className="eyebrow">{group.label}</span><strong>{group.items.length} resultado{group.items.length === 1 ? "" : "s"}</strong></div>
                      <Link href={"/" + (group.type === "business" ? "empresas" : group.type === "listing" ? "marketplace" : group.type === "opportunity" ? "oportunidades" : "concursos")}>Explorar todos →</Link>
                    </div>
                    <div className="global-search-list">
                      {group.items.map((item) => (
                        <Link href={item.href} className="global-search-result" key={item.type + item.id}>
                          <div className="global-search-result-icon">{item.type === "business" ? "E" : item.type === "listing" ? "◇" : item.type === "opportunity" ? "↗" : "▣"}</div>
                          <div className="global-search-result-body">
                            <div className="global-search-result-top"><span>{item.badge}</span>{item.meta && <small>{item.meta}</small>}</div>
                            <h3>{item.title}</h3>
                            <p>{item.description || "Consulte os detalhes para conhecer esta publicação."}</p>
                          </div>
                          <b className="global-search-result-arrow">→</b>
                        </Link>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="global-search-empty">
                <span className="eyebrow">Sem resultados</span>
                <h2>Não encontrámos correspondências.</h2>
                <p>Experimente outro termo ou pesquise em “Tudo” para ampliar a descoberta.</p>
                <div className="global-search-shortcuts">
                  <Link href="/empresas">Explorar empresas</Link>
                  <Link href="/marketplace">Explorar ofertas</Link>
                  <Link href="/oportunidades">Ver oportunidades</Link>
                  <Link href="/concursos">Ver concursos</Link>
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
