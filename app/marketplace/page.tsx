export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PublicAd } from "@/components/public-ad";

const types = [["PRODUCT", "Produtos"], ["SERVICE", "Serviços"]] as const;

const categories = [
  ["technology", "Tecnologia e software", ["tecnologia", "software", "digital", "informática"]],
  ["construction", "Construção e engenharia", ["construção", "engenharia", "obras", "materiais"]],
  ["consulting", "Consultoria e serviços profissionais", ["consultoria", "consultor", "serviços profissionais", "gestão"]],
  ["logistics", "Logística e transportes", ["logística", "transporte", "armazenagem", "distribuição"]],
  ["hr", "Recursos humanos e formação", ["recursos humanos", "recrutamento", "formação", "capacitação"]],
  ["equipment", "Equipamentos e fornecimento", ["equipamentos", "fornecimento", "consumíveis", "material"]],
] as const;

type Listing = {
  id: string;
  title: string;
  description: string;
  type: "PRODUCT" | "SERVICE";
  price: number | null;
  currency: string | null;
  location: string | null;
  business_id: string | null;
  image_url?: string | null;
  business_name?: string | null;
  business_logo?: string | null;
};

export default async function Marketplace({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; location?: string; category?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() || "";
  const type = params.type?.trim() || "";
  const location = params.location?.trim() || "";
  const category = params.category?.trim() || "";
  const requestedPage = Number.parseInt(params.page || "1", 10);
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = 24;
  const selectedCategory = categories.find(([value]) => value === category);

  let listings: Listing[] = [];
  let signedIn = false;
  let error = false;
  let totalListings = 0;

  try {
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    signedIn = Boolean(claimsData?.claims?.sub);
    if (signedIn) redirect("/dashboard/marketplace");
    {
      let query = supabase
        .from("listings")
        .select("id,title,description,type,price,currency,location,business_id", { count: "exact" })
        .eq("status", "PUBLISHED")
        .order("created_at", { ascending: false })
        ;

      if (q) {
        const safe = q.replace(/[%_,()']/g, " ").replace(/\s+/g, " ").trim();
        if (safe) {
          // Search both the offer itself and the supplier name.
          const { data: matchingBusinesses } = await supabase
            .from("businesses")
            .select("id")
            .eq("is_public", true)
            .ilike("name", `%${safe}%`)
            .limit(100);

          const businessIds = [...new Set((matchingBusinesses ?? []).map((business) => business.id))];
          const clauses = [`title.ilike.%${safe}%`, `description.ilike.%${safe}%`];
          if (businessIds.length) clauses.push(`business_id.in.(${businessIds.join(",")})`);
          query = query.or(clauses.join(","));
        }
      }
      if (type && type !== "all") query = query.eq("type", type);
      if (location) query = query.ilike("location", `%${location}%`);
      if (selectedCategory) {
        const terms = selectedCategory[2].map((term) => `title.ilike.%${term}%,description.ilike.%${term}%`);
        query = query.or(terms.join(","));
      }

      const result = await query.range((currentPage - 1) * pageSize, currentPage * pageSize - 1);
      listings = (result.data ?? []) as Listing[];
      totalListings = result.count ?? listings.length;
      error = error || Boolean(result.error);

      const attachmentIds = listings.map((item) => item.id);
      if (attachmentIds.length) {
        const { data: attachments } = await supabase.from("listing_attachments").select("listing_id,storage_path,kind,created_at").in("listing_id", attachmentIds).eq("kind", "IMAGE").order("created_at", { ascending: true });
        const firstImage = new Map<string, string>();
        for (const attachment of attachments ?? []) {
          if (!firstImage.has(attachment.listing_id)) firstImage.set(attachment.listing_id, supabase.storage.from("listing-media").getPublicUrl(attachment.storage_path).data.publicUrl);
        }
        listings = listings.map((item) => ({ ...item, image_url: firstImage.get(item.id) ?? null }));
      }

      const ids = [...new Set(listings.map((item) => item.business_id).filter(Boolean))];
      if (ids.length) {
        const { data: businesses } = await supabase.from("businesses").select("id,name,logo_url").in("id", ids);
        const suppliers = new Map((businesses ?? []).map((business) => [business.id, { name: business.name, logo: business.logo_url }]));
        listings = listings.map((item) => {
          const supplier = item.business_id ? suppliers.get(item.business_id) : null;
          return { ...item, business_name: supplier?.name ?? null, business_logo: supplier?.logo ?? null };
        });
      }
    }
  } catch {
    error = true;
  }

  const hasFilters = Boolean(q || location || category || (type && type !== "all"));
  const totalPages = Math.max(1, Math.ceil(totalListings / pageSize));
  const pageHref = (targetPage: number) => {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (location) next.set("location", location);
    if (category) next.set("category", category);
    if (type && type !== "all") next.set("type", type);
    if (targetPage > 1) next.set("page", String(targetPage));
    const queryString = next.toString();
    return "/marketplace" + (queryString ? "?" + queryString : "");
  };
  if (currentPage > totalPages) redirect(pageHref(totalPages));
  const resultLabel = totalListings === 1 ? "oferta encontrada" : "ofertas encontradas";

  return (
    <main className="directory-page marketplace-page">
      <div className="container">
        <section className="marketplace-discovery-hero">
          <div className="marketplace-hero-copy">
            <span className="eyebrow">Produtos & serviços</span>
            <h1>Descubra o que as empresas em Moçambique têm para oferecer.</h1>
            <p>Encontre fornecedores, soluções e oportunidades comerciais num único espaço. Pesquise primeiro; aprofunde a relação com empresas registadas.</p>
          </div>
          <div className="marketplace-hero-panel">
            <span className="marketplace-panel-kicker">Ecossistema comercial</span>
            <strong>3 formas de descobrir oportunidades</strong>
            <div className="marketplace-panel-item"><b>01</b><span>Produtos e serviços publicados</span></div>
            <div className="marketplace-panel-item"><b>02</b><span>Empresas e fornecedores</span></div>
            <div className="marketplace-panel-item"><b>03</b><span>Necessidades e oportunidades empresariais</span></div>
          </div>
        </section>

        <PublicAd surface="MARKETPLACE" slot="EXCLUSIVE" variant="billboard" className="marketplace-exclusive-billboard" context={{query:q,type,location,category,placement:"exclusive_partner"}} interests={[q,type,location,category,"exclusive_partner"].filter(Boolean)} />

        <section className="marketplace-section marketplace-results-section">
            <div className="marketplace-section-head">
              <div>
                <span className="eyebrow">{hasFilters ? "Ofertas encontradas" : "Vitrine comercial"}</span>
                <h2>{hasFilters ? "Produtos e serviços que correspondem à sua pesquisa." : "Produtos e serviços publicados pelas empresas."}</h2>
              </div>
              <div className="directory-results-summary"><strong>{totalListings}</strong><span>{resultLabel}</span></div>
            </div>
            <form className="marketplace-filter-bar" action="/marketplace">
              <label><span>Palavra-chave</span><input name="q" defaultValue={q} placeholder="Produto, serviço ou fornecedor" /></label>
              <label><span>Localização</span><input name="location" defaultValue={location} placeholder="Província ou cidade" /></label>
              <label><span>Categoria</span><select name="category" defaultValue={category}><option value="">Todas as categorias</option>{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <label><span>Tipo de oferta</span><select name="type" defaultValue={type || "all"}><option value="all">Produtos e serviços</option>{types.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
              <button className="btn primary">Aplicar filtros</button>
              {hasFilters && <Link href="/marketplace" className="btn">Limpar</Link>}
            </form>
            {error && <div className="notice">Algumas funções comerciais estão temporariamente indisponíveis.</div>}
            {listings.length > 0 ? (
              <div className="directory-marketplace-grid marketplace-listing-cards">
                {listings.map((item) => (
                  <Link href={"/marketplace/" + item.id} className="directory-marketplace-card" key={item.id}>
                    <div className="directory-marketplace-visual">
                      {item.image_url ? <img src={item.image_url} alt="" loading="lazy" /> : <div className="directory-marketplace-placeholder"><span>{item.type === "PRODUCT" ? "P" : "S"}</span><small>{item.type === "PRODUCT" ? "Produto" : "Serviço"}</small></div>}
                      <span className="directory-marketplace-type">{item.type === "PRODUCT" ? "Produto" : "Serviço"}</span>
                    </div>
                    <div className="directory-marketplace-body">
                      <div className="directory-marketplace-identity">
                        <div className="directory-business-logo">{item.business_logo ? <img src={item.business_logo} alt="" loading="lazy" /> : (item.business_name || "F").charAt(0)}</div>
                        <div className="directory-marketplace-name">
                          <h3>{item.title}</h3>
                          {item.business_name && <span>Fornecedor: {item.business_name}</span>}
                          {item.location && <span>⌖ {item.location}</span>}
                        </div>
                      </div>
                      <p>{item.description || "Consulte os detalhes desta oferta."}</p>
                      <div className="directory-marketplace-footer">
                        <b>{item.price != null ? item.price + " " + (item.currency || "MZN") : "Sob consulta"}</b><span>Ver oferta ↗</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="directory-empty"><div className="directory-empty-icon">◇</div><span className="eyebrow">Sem resultados</span><h3>Não encontrámos ofertas para esta pesquisa.</h3><p>Experimente alterar os filtros ou publicar uma nova oferta.</p><div className="directory-empty-actions"><Link href="/marketplace" className="btn">Ver todas</Link><Link href="/dashboard" className="btn primary">Publicar oferta</Link></div></div>
            )}
            {totalPages > 1 && (
              <nav className="marketplace-pagination" aria-label="Paginação das ofertas">
                {currentPage > 1 ? <Link href={pageHref(currentPage - 1)} className="btn">← Anterior</Link> : <span className="btn is-disabled" aria-disabled="true">← Anterior</span>}
                <span className="marketplace-pagination-status">Página {currentPage} de {totalPages}</span>
                {currentPage < totalPages ? <Link href={pageHref(currentPage + 1)} className="btn primary">Seguinte →</Link> : <span className="btn is-disabled" aria-disabled="true">Seguinte →</span>}
              </nav>
            )}
          </section>

        <style>{`
          .marketplace-pagination{display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;margin-top:26px}
          .marketplace-pagination-status{font-size:12px;font-weight:700;color:var(--muted,#65716e)}
          .marketplace-pagination .is-disabled{opacity:.45;pointer-events:none}
        `}</style>
        {!signedIn && (
          <section className="marketplace-member-gate marketplace-member-gate-premium">
            <div className="marketplace-gate-mark" aria-hidden="true">M</div>
            <div className="marketplace-gate-copy">
              <span className="eyebrow">Faça parte do ecossistema</span>
              <h2>Mais visibilidade para a sua oferta. Mais oportunidades para o seu negócio.</h2>
              <p>Crie uma presença comercial, apresente os seus produtos e serviços e conheça opções de destaque. Organizações parceiras podem beneficiar de espaços exclusivos.</p>
            </div>
            <div className="marketplace-gate-actions">
              {signedIn ? <Link href="/dashboard" className="btn primary">Ir para o meu painel</Link> : <><Link href="/registo" className="btn primary">Criar conta</Link><Link href={"/login?next=" + encodeURIComponent("/marketplace")} className="btn">Entrar</Link></>}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
