import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DirectoryAdSlider, type DirectoryAd } from "@/components/directory-ad-slider";

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
  let billboardAds: DirectoryAd[] = [];
  let signedIn = false;
  let error = false;

  try {
    const supabase = await createClient();
    const { data: claimsData } = await supabase.auth.getClaims();
    signedIn = Boolean(claimsData?.claims?.sub);

    const { data: promotions, error: promotionError } = await supabase
      .from("business_promotions")
      .select("id,title,text,image_url,target_url,priority")
      .eq("status", "ACTIVE")
      .lte("starts_at", new Date().toISOString())
      .gt("ends_at", new Date().toISOString())
      .eq("placement", "DIRECTORY_BILLBOARD")
      .order("priority", { ascending: false })
      .limit(6);

    if (promotionError) error = true;
    billboardAds = (promotions ?? []).map((item) => ({
      label: "Publicidade empresarial",
      title: item.title,
      text: item.text || "Apresente os seus produtos e serviços ao público empresarial.",
      image: item.image_url || undefined,
      href: item.target_url || "/contactos",
    }));

    if (signedIn) {
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
      error = error || Boolean(result.error);

      const ids = [...new Set(listings.map((item) => item.business_id).filter(Boolean))];
      if (ids.length) {
        const { data: businesses } = await supabase.from("businesses").select("id,name").in("id", ids);
        const names = new Map((businesses ?? []).map((business) => [business.id, business.name]));
        listings = listings.map((item) => ({
          ...item,
          business_id: item.business_id ? names.get(item.business_id) ?? item.business_id : null,
        }));
      }
    }
  } catch {
    error = true;
  }

  if (!signedIn) {
    return (
      <main className="directory-page marketplace-public-page">
        <div className="container">
          <section className="directory-hero marketplace-landing-hero">
            <div className="directory-hero-copy">
              <span className="eyebrow">Produtos e serviços</span>
              <h1>Um espaço comercial para descobrir fornecedores e soluções.</h1>
              <p>O público visitante conhece o mercado. As empresas registadas acedem ao directório completo, publicam ofertas e desenvolvem relações comerciais dentro da plataforma.</p>
              <div className="directory-empty-actions">
                <Link href="/registo" className="btn primary">Registar empresa</Link>
                <Link href="/login" className="btn">Entrar na plataforma</Link>
              </div>
            </div>
            <div className="directory-side-card">
              <span className="eyebrow">Área exclusiva</span>
              <h3>Directório de produtos e serviços</h3>
              <p>Pesquise, compare e consulte ofertas publicadas pela comunidade empresarial depois de iniciar sessão.</p>
              <strong>Para empresas registadas</strong>
            </div>
          </section>

          <DirectoryAdSlider ads={billboardAds} />

          <section className="directory-featured marketplace-public-grid">
            <div className="directory-section-head">
              <div><span className="eyebrow">Como funciona</span><h2>Descoberta aberta, relacionamento dentro da comunidade.</h2></div>
            </div>
            <div className="directory-featured-grid">
              <article className="directory-featured-card"><span className="directory-sponsored-label">01</span><h3>Visibilidade</h3><p>Empresas podem promover produtos, serviços e campanhas através de posições publicitárias.</p></article>
              <article className="directory-featured-card"><span className="directory-sponsored-label">02</span><h3>Directório</h3><p>O catálogo completo é uma funcionalidade da comunidade registada.</p></article>
              <article className="directory-featured-card"><span className="directory-sponsored-label">03</span><h3>Negócio</h3><p>Os membros podem avançar para contactos, oportunidades e funcionalidades comerciais futuras.</p></article>
            </div>
          </section>
        </div>
      </main>
    );
  }

  const hasFilters = Boolean(q || location || (type && type !== "all"));
  const resultLabel = listings.length === 1 ? "oferta encontrada" : "ofertas encontradas";

  return (
    <main className="directory-page">
      <div className="container">
        <section className="directory-hero">
          <div className="directory-hero-copy">
            <span className="eyebrow">Área da comunidade empresarial</span>
            <h1>Encontre produtos e serviços para fazer negócio.</h1>
            <p>Explore ofertas publicadas por empresas registadas no MozEmpresas e avance para o fornecedor.</p>
          </div>
          <div className="directory-search-panel">
            <form className="directory-search marketplace-search" action="/marketplace">
              <label className="directory-search-field directory-search-keyword"><span>O que procura?</span><div><b>⌕</b><input name="q" defaultValue={q} placeholder="Produto, serviço ou palavra-chave" /></div></label>
              <label className="directory-search-field"><span>Tipo</span><div><b>◈</b><select name="type" defaultValue={type || "all"}><option value="all">Produtos e serviços</option>{types.map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></div></label>
              <label className="directory-search-field"><span>Onde?</span><div><b>⌖</b><input name="location" defaultValue={location} placeholder="Província ou localização" /></div></label>
              <button className="btn primary directory-search-button">Pesquisar</button>
            </form>
            {hasFilters && <Link href="/marketplace" className="directory-clear">Limpar pesquisa</Link>}
          </div>
        </section>

        <DirectoryAdSlider ads={billboardAds} />

        <section className="directory-discovery marketplace-shortcuts">
          <div className="directory-section-head"><div><span className="eyebrow">Exploração rápida</span><h2>Procure por tipo de oferta.</h2></div><span className="directory-section-note">Directório para membros</span></div>
          <div className="directory-category-list">
            <Link href="/marketplace" className={!type || type === "all" ? "active" : ""}>Todos <span>→</span></Link>
            {types.map(([value,label])=><Link key={value} href={"/marketplace?type="+value} className={type===value?"active":""}>{label}<span>→</span></Link>)}
          </div>
        </section>

        <section className="directory-results">
          <div className="directory-results-head"><div><span className="eyebrow">{hasFilters?"Resultados da pesquisa":"Ofertas publicadas"}</span><h2>{hasFilters?"Ofertas que correspondem à sua pesquisa":"Produtos e serviços disponíveis"}</h2></div><div className="directory-results-summary"><strong>{listings.length}</strong><span>{resultLabel}</span></div></div>
          {hasFilters && <div className="directory-active-filters">{q&&<span>Pesquisa: <b>{q}</b></span>}{location&&<span>Localização: <b>{location}</b></span>}{type&&type!=="all"&&<span>Tipo: <b>{types.find(([value])=>value===type)?.[1]||type}</b></span>}<Link href="/marketplace">× Limpar</Link></div>}
          {error&&<div className="notice">Algumas funções comerciais estão temporariamente indisponíveis.</div>}
          {listings.length>0 ? <div className="directory-results-layout"><div className="directory-results-list">{listings.map((item,index)=><Link href={"/marketplace/"+item.id} className="directory-business-card marketplace-result-card" key={item.id}><div className="directory-business-number">{String(index+1).padStart(2,"0")}</div><div className="marketplace-type-icon">{item.type==="PRODUCT"?"P":"S"}</div><div className="directory-business-content"><div className="directory-business-title"><div><h3>{item.title}</h3><span>{item.type==="PRODUCT"?"Produto":"Serviço"}</span></div><b>→</b></div>{item.location&&<div className="directory-business-location">⌖ {item.location}</div>}{item.business_id&&<div className="listing-provider">Fornecedor: {item.business_id}</div>}<p>{item.description}</p><div className="marketplace-result-bottom"><strong>{item.price!=null?`${item.price} ${item.currency||"MZN"}`:"Sob consulta"}</strong><span>Ver oferta →</span></div></div></Link>)}</div><aside className="directory-side-card"><span className="eyebrow">Para empresas</span><h3>Apresente os seus produtos e serviços.</h3><p>Publique ofertas, acompanhe a presença comercial e prepare-se para futuras funcionalidades de negociação.</p><Link href="/dashboard" className="btn primary full">Gerir presença →</Link></aside></div> : <div className="directory-empty"><div className="directory-empty-icon">◇</div><span className="eyebrow">Sem resultados</span><h3>Não encontrámos ofertas para esta pesquisa.</h3><p>Experimente retirar um filtro ou publicar uma nova oferta.</p><div className="directory-empty-actions"><Link href="/marketplace" className="btn">Ver todas</Link><Link href="/dashboard" className="btn primary">Publicar oferta</Link></div></div>}
        </section>
      </div>
    </main>
  );
}
