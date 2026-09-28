export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DirectoryAdSlider, type DirectoryAd } from "@/components/directory-ad-slider";

const types = [["PRODUCT", "Produtos"], ["SERVICE", "Serviços"]] as const;

const discoveryCategories = [
  ["Tecnologia & Software", "Soluções digitais, software, equipamentos e suporte.", "01"],
  ["Construção & Engenharia", "Materiais, obras, projectos e serviços técnicos.", "02"],
  ["Consultoria & Serviços", "Consultoria empresarial, financeira, jurídica e operacional.", "03"],
  ["Logística & Transportes", "Transporte, distribuição, armazenagem e apoio logístico.", "04"],
  ["Recursos Humanos", "Formação, recrutamento e soluções para equipas.", "05"],
  ["Equipamentos & Fornecimento", "Equipamentos, consumíveis e fornecimento empresarial.", "06"],
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

    {
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

  const hasFilters = Boolean(q || location || (type && type !== "all"));
  const resultLabel = listings.length === 1 ? "oferta encontrada" : "ofertas encontradas";

  return (
    <main className="directory-page marketplace-page">
      <div className="container">
        <section className="marketplace-discovery-hero">
          <div className="marketplace-hero-copy">
            <span className="eyebrow">Produtos & serviços</span>
            <h1>Descubra o que as empresas em Moçambique têm para oferecer.</h1>
            <p>Encontre fornecedores, soluções e oportunidades comerciais num único espaço. Pesquise primeiro; aprofunde a relação com empresas registadas.</p>
            <form className="marketplace-main-search" action="/marketplace">
              <div className="marketplace-main-search-input">
                <span>⌕</span>
                <input name="q" defaultValue={q} placeholder="O que procura para o seu negócio?" />
              </div>
              <select name="type" defaultValue={type || "all"} aria-label="Tipo de oferta">
                <option value="all">Produtos e serviços</option>
                {types.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
              </select>
              <button className="btn primary">Pesquisar →</button>
            </form>
            <div className="marketplace-quick-links">
              <span>Procure rapidamente:</span>
              <Link href="/marketplace?type=PRODUCT">Produtos</Link>
              <Link href="/marketplace?type=SERVICE">Serviços</Link>
              <Link href="/empresas">Fornecedores</Link>
            </div>
          </div>
          <div className="marketplace-hero-panel">
            <span className="marketplace-panel-kicker">Ecossistema comercial</span>
            <strong>3 formas de descobrir oportunidades</strong>
            <div className="marketplace-panel-item"><b>01</b><span>Produtos e serviços publicados</span></div>
            <div className="marketplace-panel-item"><b>02</b><span>Empresas e fornecedores</span></div>
            <div className="marketplace-panel-item"><b>03</b><span>Necessidades e oportunidades empresariais</span></div>
          </div>
        </section>

        <DirectoryAdSlider ads={billboardAds} />

        <section className="marketplace-section marketplace-categories">
          <div className="marketplace-section-head">
            <div>
              <span className="eyebrow">Explore por categoria</span>
              <h2>Comece pelo que o seu negócio precisa.</h2>
            </div>
            <span className="marketplace-section-note">Descoberta rápida</span>
          </div>
          <div className="marketplace-category-grid">
            {discoveryCategories.map(([title, description, number]) => (
              <Link href={"/empresas?q=" + encodeURIComponent(title.split(" & ")[0])} className="marketplace-category-card" key={title}>
                <span className="marketplace-category-number">{number}</span>
                <span className="marketplace-category-arrow">↗</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="marketplace-commercial-strip">
          <div>
            <span className="eyebrow">Publicidade empresarial</span>
            <h2>Coloque a sua oferta onde os compradores estão a descobrir.</h2>
            <p>Empresas podem promover produtos, serviços e campanhas em posições de destaque no ecossistema MozEmpresas.</p>
          </div>
          <Link href="/publicidade" className="btn primary">Conhecer publicidade →</Link>
        </section>

        <section className="marketplace-section marketplace-needs">
          <div className="marketplace-section-head">
            <div>
              <span className="eyebrow">Além do catálogo</span>
              <h2>As empresas também procuram soluções.</h2>
            </div>
            <Link href="/oportunidades" className="marketplace-text-link">Ver oportunidades →</Link>
          </div>
          <div className="marketplace-needs-grid">
            <article><span>NECESSIDADE EMPRESARIAL</span><h3>Encontre quem pode resolver um problema específico.</h3><p>O MozEmpresas pode ligar necessidades empresariais a fornecedores e prestadores adequados.</p><Link href="/oportunidades">Explorar oportunidades →</Link></article>
            <article><span>FORNECEDORES</span><h3>Apresente a sua capacidade a outras empresas.</h3><p>Construa uma presença comercial com produtos, serviços, localização e contactos.</p><Link href="/registo">Registar empresa →</Link></article>
          </div>
        </section>

        {signedIn ? (
          <section className="marketplace-section marketplace-results-section">
            <div className="marketplace-section-head">
              <div>
                <span className="eyebrow">{hasFilters ? "Resultados" : "Ofertas recentes"}</span>
                <h2>{hasFilters ? "Ofertas que correspondem à sua pesquisa." : "O que está a ser publicado."}</h2>
              </div>
              <div className="directory-results-summary"><strong>{listings.length}</strong><span>{resultLabel}</span></div>
            </div>
            <form className="marketplace-filter-bar" action="/marketplace">
              <input name="q" defaultValue={q} placeholder="Palavra-chave" />
              <input name="location" defaultValue={location} placeholder="Localização" />
              <select name="type" defaultValue={type || "all"}><option value="all">Todos</option>{types.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
              <button className="btn primary">Filtrar</button>
              {hasFilters && <Link href="/marketplace" className="btn">Limpar</Link>}
            </form>
            {error && <div className="notice">Algumas funções comerciais estão temporariamente indisponíveis.</div>}
            {listings.length > 0 ? (
              <div className="marketplace-results-gallery">
                {listings.map((item, index) => (
                  <Link href={"/marketplace/" + item.id} className="marketplace-offer-card" key={item.id}>
                    <div className="marketplace-offer-visual"><span>{item.type === "PRODUCT" ? "P" : "S"}</span><small>{item.type === "PRODUCT" ? "PRODUTO" : "SERVIÇO"}</small></div>
                    <div className="marketplace-offer-body">
                      <div className="marketplace-offer-meta"><span>{String(index + 1).padStart(2, "0")}</span>{item.location && <span>⌖ {item.location}</span>}</div>
                      <h3>{item.title}</h3>
                      {item.business_id && <p className="marketplace-provider">Fornecedor: {item.business_id}</p>}
                      <p>{item.description}</p>
                      <div className="marketplace-offer-footer"><strong>{item.price != null ? item.price + " " + (item.currency || "MZN") : "Sob consulta"}</strong><span>Ver oferta →</span></div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="directory-empty"><div className="directory-empty-icon">◇</div><span className="eyebrow">Sem resultados</span><h3>Não encontrámos ofertas para esta pesquisa.</h3><p>Experimente alterar os filtros ou publicar uma nova oferta.</p><div className="directory-empty-actions"><Link href="/marketplace" className="btn">Ver todas</Link><Link href="/dashboard" className="btn primary">Publicar oferta</Link></div></div>
            )}
          </section>
        ) : (
          <section className="marketplace-member-gate">
            <div>
              <span className="eyebrow">Ecossistema comercial</span>
              <h2>Encontre, compare e depois entre em contacto.</h2>
              <p>O catálogo é público para facilitar a descoberta. Para publicar, guardar contactos, responder a necessidades ou iniciar uma compra, entre na sua conta.</p>
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
