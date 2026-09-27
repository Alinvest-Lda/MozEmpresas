export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { DirectoryAdSlider, type DirectoryAd } from "@/components/directory-ad-slider";
import { PartnerSpotlight } from "@/components/partner-spotlight";

const labels: Record<string, string> = {
  CALL: "Chamadas",
  FUNDING: "Financiamentos",
  PARTNERSHIP: "Parcerias",
  TRAINING: "Capacitações",
  EVENT: "Eventos",
};

const icons: Record<string, string> = {
  CALL: "↗",
  FUNDING: "◈",
  PARTNERSHIP: "⌘",
  TRAINING: "◇",
  EVENT: "◷",
};

type Opportunity = {
  id: string;
  title: string;
  slug: string;
  type: string;
  description: string;
  organization: string | null;
  location: string | null;
  opens_at?: string | null;
  closes_at: string | null;
  created_at?: string;
};

function daysUntil(value: string | null) {
  if (!value) return null;
  return Math.ceil((new Date(value).getTime() - Date.now()) / 86400000);
}

function dateLabel(value: string | null) {
  return value
    ? new Date(value).toLocaleDateString("pt-MZ", { day: "2-digit", month: "short", year: "numeric" })
    : "Data não indicada";
}

export default async function Oportunidades({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string; location?: string; deadline?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() || "";
  const type = params.type?.trim() || "";
  const location = params.location?.trim() || "";
  const deadline = params.deadline?.trim() || "";
  const sort = params.sort?.trim() || "recent";

  let data: Opportunity[] = [];
  let billboardAds: DirectoryAd[] = [];
  let error = false;

  try {
    const supabase = await createClient();
    const now = new Date().toISOString();

    const { data: promotions } = await supabase
      .from("business_promotions")
      .select("id,title,text,image_url,target_url,priority")
      .eq("status", "ACTIVE")
      .lte("starts_at", now)
      .gt("ends_at", now)
      .eq("placement", "DIRECTORY_BILLBOARD")
      .order("priority", { ascending: false })
      .limit(6);

    billboardAds = (promotions ?? []).map((item) => ({
      label: "Publicidade empresarial",
      title: item.title,
      text: item.text || "Conecte a sua organização ao ecossistema empresarial através do MozEmpresas.",
      image: item.image_url || undefined,
      href: item.target_url || "/contactos",
    }));

    let query = supabase
      .from("opportunities")
      .select("id,title,slug,type,description,organization,location,opens_at,closes_at,created_at")
      .eq("status", "PUBLISHED")
      .in("type", Object.keys(labels))
      .order("created_at", { ascending: false })
      .limit(60);

    if (q) {
      const safe = q.replace(/[%_,()']/g, " ").replace(/\s+/g, " ").trim();
      if (safe) query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%,organization.ilike.%${safe}%,location.ilike.%${safe}%`);
    }

    if (type && type !== "all" && labels[type]) query = query.eq("type", type);
    if (location) query = query.ilike("location", `%${location}%`);

    const result = await query;
    data = (result.data ?? []) as Opportunity[];

    if (deadline === "7") {
      data = data.filter((item) => {
        const days = daysUntil(item.closes_at);
        return days !== null && days >= 0 && days <= 7;
      });
    } else if (deadline === "30") {
      data = data.filter((item) => {
        const days = daysUntil(item.closes_at);
        return days !== null && days >= 0 && days <= 30;
      });
    } else if (deadline === "open") {
      data = data.filter((item) => !item.closes_at || (daysUntil(item.closes_at) ?? -1) >= 0);
    }

    data.sort((a, b) => {
      if (sort === "deadline") return (new Date(a.closes_at || "2999-12-31").getTime()) - (new Date(b.closes_at || "2999-12-31").getTime());
      if (sort === "title") return a.title.localeCompare(b.title, "pt");
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

    error = Boolean(result.error);
  } catch {
    error = true;
  }

  const hasFilters = Boolean(q || location || (type && type !== "all") || deadline);
  const resultLabel = data.length === 1 ? "oportunidade encontrada" : "oportunidades encontradas";
  const featured = data.slice(0, 3);

  return (
    <main className="opportunities-page">
      <div className="container">
        <section className="opportunities-hero">
          <div className="opportunities-hero-copy">
            <span className="eyebrow">Ecossistema empresarial de Moçambique</span>
            <h1>Encontre a próxima <em>oportunidade para avançar.</em></h1>
            <p>
              Chamadas, financiamentos, parcerias, capacitações e eventos reunidos num só lugar para ajudar empresas, empreendedores e profissionais a encontrar o próximo passo.
            </p>
            <div className="opportunity-hero-links">
              <a href="#explorar">Explorar oportunidades ↓</a>
              <Link href="/publicar-oportunidade">Publicar uma oportunidade →</Link>
            </div>
          </div>
        </section>

        <section className="opportunity-search-shell" id="explorar">
          <form className="opportunity-search-form" action="/oportunidades">
            <label>
              <span>Pesquisar</span>
              <div><b>⌕</b><input name="q" defaultValue={q} placeholder="Ex.: agronegócio, inovação, Maputo..." /></div>
            </label>
            <label>
              <span>Categoria</span>
              <div><b>◈</b><select name="type" defaultValue={type || "all"}><option value="all">Todas</option>{Object.entries(labels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div>
            </label>
            <label>
              <span>Localização</span>
              <div><b>⌖</b><input name="location" defaultValue={location} placeholder="Província ou país" /></div>
            </label>
            <button className="btn primary">Pesquisar</button>
          </form>
          <div className="opportunity-search-shortcuts">
            <span>Pesquisar por prazo:</span>
            <Link href="/oportunidades?deadline=7">Fecha em 7 dias</Link>
            <Link href="/oportunidades?deadline=30">Próximos 30 dias</Link>
            <Link href="/oportunidades?deadline=open">Em aberto</Link>
            {hasFilters && <Link href="/oportunidades">Limpar filtros</Link>}
          </div>
        </section>

        <DirectoryAdSlider ads={billboardAds} />

        <section className="opportunity-types-section">
          <div className="opportunity-section-heading">
            <div><span className="eyebrow">Encontre pelo que procura</span><h2>Uma porta de entrada para cada necessidade.</h2></div>
            <p>Escolha uma categoria e vá directamente para chamadas, capital, parceiros, aprendizagem ou eventos.</p>
          </div>
          <div className="opportunity-type-grid">
            {Object.entries(labels).map(([value, label]) => {
              const count = data.filter((item) => item.type === value).length;
              return (
                <Link href={"/oportunidades?type=" + value} className={"opportunity-type-card " + (type === value ? "active" : "")} key={value}>
                  <span className="opportunity-type-symbol">{icons[value]}</span>
                  <div><strong>{label}</strong><small>{value === "CALL" ? "Propostas e manifestações de interesse" : value === "FUNDING" ? "Capital, subvenções e linhas de apoio" : value === "PARTNERSHIP" ? "Colaborações e alianças estratégicas" : value === "TRAINING" ? "Cursos, workshops e desenvolvimento" : "Feiras, conferências e networking"}</small></div>
                  <b>{count}</b>
                </Link>
              );
            })}
          </div>
        </section>

        {featured.length > 0 && !hasFilters && (
          <section className="opportunity-featured-section">
            <div className="opportunity-section-heading">
              <div><span className="eyebrow">Selecção actual</span><h2>Veja primeiro o que pode fazer sentido para si.</h2></div>
              <Link href="/oportunidades?sort=deadline">Ver por prazo →</Link>
            </div>
            <div className="opportunity-featured-grid">
              {featured.map((item, index) => {
                const days = daysUntil(item.closes_at);
                return (
                  <Link href={"/oportunidades/" + item.slug} className={"opportunity-featured-card featured-" + index} key={item.id}>
                    <div className="featured-card-top"><span>{labels[item.type]}</span>{days !== null && days >= 0 && days <= 7 && <b>Termina em {days === 0 ? "hoje" : days + " dias"}</b>}</div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    <div className="featured-card-meta"><span>{item.organization || "Organização não indicada"}</span><span>{item.location || "Moçambique"}</span></div>
                    <div className="featured-card-footer"><span>{item.closes_at ? "Prazo " + dateLabel(item.closes_at) : "Prazo não indicado"}</span><strong>Ver oportunidade →</strong></div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <section className="opportunity-results-section">
          <div className="opportunity-section-heading results-heading">
            <div><span className="eyebrow">{hasFilters ? "Pesquisa refinada" : "Oportunidades disponíveis"}</span><h2>{hasFilters ? "Resultados para a sua pesquisa." : "Explore oportunidades abertas."}</h2></div>
            <div className="opportunity-sort"><span>{data.length} {resultLabel}</span><Link href={"/oportunidades?" + new URLSearchParams({ ...(q ? {q} : {}), ...(type ? {type} : {}), ...(location ? {location} : {}), ...(deadline ? {deadline} : {}), sort: "deadline" }).toString()}>Ordenar por prazo ↓</Link></div>
          </div>

          {hasFilters && (
            <div className="directory-active-filters">
              {q && <span>Pesquisa: <b>{q}</b></span>}
              {location && <span>Localização: <b>{location}</b></span>}
              {type && type !== "all" && <span>Categoria: <b>{labels[type]}</b></span>}
              {deadline && <span>Prazo: <b>{deadline === "7" ? "7 dias" : deadline === "30" ? "30 dias" : "Em aberto"}</b></span>}
              <Link href="/oportunidades">× Limpar</Link>
            </div>
          )}

          {error && <div className="notice">Não foi possível carregar todas as oportunidades neste momento.</div>}

          {data.length > 0 ? (
            <div className="opportunity-results-grid">
              {data.map((item) => {
                const days = daysUntil(item.closes_at);
                const urgent = days !== null && days >= 0 && days <= 7;
                return (
                  <Link href={"/oportunidades/" + item.slug} className="opportunity-list-card" key={item.id}>
                    <div className="opportunity-list-top"><span className="opportunity-pill">{icons[item.type]} {labels[item.type]}</span>{urgent && <span className="opportunity-urgent">Prazo próximo</span>}</div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    <div className="opportunity-list-meta"><span>{item.organization || "Organização"}</span><span>{item.location || "Moçambique"}</span></div>
                    <div className="opportunity-list-footer">
                      <span>{item.type === "EVENT" && item.opens_at ? "Evento: " + dateLabel(item.opens_at) : item.closes_at ? "Prazo: " + dateLabel(item.closes_at) : "Sem prazo indicado"}</span>
                      <strong>Ver detalhes →</strong>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="directory-empty">
              <div className="directory-empty-icon">⌕</div>
              <span className="eyebrow">Sem resultados</span>
              <h3>Não encontrámos oportunidades para esta pesquisa.</h3>
              <p>Experimente remover um filtro ou pesquisar por outra palavra-chave.</p>
              <Link href="/oportunidades" className="btn primary">Ver todas as oportunidades</Link>
            </div>
          )}
        </section>

        <PartnerSpotlight />

        <section className="opportunity-publisher-cta">
          <div><span className="eyebrow inverse-eyebrow">Para organizações</span><h2>Tem uma oportunidade para colocar no mercado?</h2><p>Publique chamadas, financiamentos, parcerias, capacitações ou eventos no MozEmpresas. A página de publicação foi preparada para evoluir para revisão, métricas, pagamentos e formatos de maior visibilidade.</p></div>
          <Link href="/publicar-oportunidade" className="btn light-btn">Publicar oportunidade →</Link>
        </section>
      </div>
    </main>
  );
}
