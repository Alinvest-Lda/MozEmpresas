import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function BusinessDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let supabase;
  try {
    supabase = await createClient();
  } catch {
    notFound();
  }

  type BusinessRecord = {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    location: string | null;
    phone: string | null;
    email: string | null;
    website: string | null;
    logo_url: string | null;
    cover_url: string | null;
    created_at: string;
    category_id: string | null;
  };

  const { data: rawBusiness } = await supabase
    .from("businesses")
    .select("id,name,slug,description,location,phone,email,website,logo_url,cover_url,created_at,category_id")
    .eq("slug", slug)
    .eq("is_public", true)
    .maybeSingle();

  if (!rawBusiness) notFound();
  const business = rawBusiness as unknown as BusinessRecord;

  const { data: listings } = await supabase
    .from("listings")
    .select("id,title,description,type,price,currency")
    .eq("business_id", business.id)
    .eq("status", "PUBLISHED")
    .order("created_at", { ascending: false })
    .limit(6);

  const { data: portfolio } = await supabase.from("business_portfolio_media").select("id,image_url,title,sort_order").eq("business_id",business.id).order("sort_order").limit(5);
  const { data: reviews } = await supabase.from("reviews").select("rating,body,created_at").eq("resource_type","BUSINESS").eq("resource_id",business.id).order("created_at",{ascending:false}).limit(6);
  const ratingCount=reviews?.length??0;
  const ratingAverage=ratingCount ? ((reviews??[]).reduce((sum,item)=>sum+item.rating,0)/ratingCount).toFixed(1) : null;
  let category: string | null = null;
  if (business.category_id) {
    const { data: categoryRow } = await supabase
      .from("business_categories")
      .select("name")
      .eq("id", business.category_id)
      .maybeSingle();
    category = (categoryRow as unknown as { name: string } | null)?.name ?? null;
  }

  return (
    <main className="page">
      <div className="container">
        <Link href="/empresas" className="muted">← Voltar ao directório</Link>

        <div className="business-profile" style={{ marginTop: 18 }}>
          <section className="card business-profile-main">
            {business.cover_url && <img className="business-cover" src={business.cover_url} alt="" />}

            <div className="business-profile-cover-strip">{portfolio?.length ? portfolio.map((item)=><div key={item.id}><img src={item.image_url} alt={item.title || business.name} /></div>) : business.cover_url ? <div><img src={business.cover_url} alt="" /></div> : null}</div>
            <div className="business-profile-head">
              <div className="avatar business-avatar">
                {business.logo_url ? <img src={business.logo_url} alt="" /> : business.name[0]}
              </div>
              <div>
                <span className="eyebrow">{category || "Empresa"}</span>
                <h1>{business.name}</h1>
                <p className="muted">{business.location || "Moçambique"}</p>
              </div>
            </div>

            <div className="business-profile-trust">
              <span><strong>{listings?.length ?? 0}</strong> ofertas publicadas</span>
              <span><strong>{portfolio?.length ?? 0}</strong> imagens de portfólio</span>
              {ratingAverage && <span><strong>{ratingAverage}/5</strong> avaliação{ratingCount===1?"":"ões"}</span>}
            </div>
            <div className="meta" style={{ marginTop: 18 }}>
              {category && <span className="tag">{category}</span>}
              {business.location && <span className="tag">{business.location}</span>}
            </div>

            <div className="detail-section" style={{ paddingTop: 28 }}>
              <span className="eyebrow">Sobre a empresa</span>
              <p className="detail-description" style={{ marginTop: 10 }}>
                {business.description || "Este perfil ainda não tem uma descrição."}
              </p>
            </div>

            <div className="meta" style={{ marginTop: 20 }}>
              {business.phone && <span className="tag">{business.phone}</span>}
              {business.email && <span className="tag">{business.email}</span>}
            </div>

            {business.website && (
              <a className="btn primary" style={{ marginTop: 18 }} href={business.website} target="_blank" rel="noreferrer">
                Visitar website →
              </a>
            )}
          </section>

          <aside className="card business-contact">
            <span className="business-conversion-label">Pronto para conhecer melhor?</span>
            <span className="eyebrow">Contacto empresarial</span>
            <h3>Fale com {business.name}</h3>
            <p className="muted">Escolha o canal disponibilizado pela empresa para iniciar o contacto.</p>
            {business.phone && <a className="btn primary full" href={"tel:" + business.phone}>Ligar</a>}
            {business.email && <a className="btn full" style={{ marginTop: 9 }} href={"mailto:" + business.email}>Enviar email</a>}
            {business.website && <a className="btn full" style={{ marginTop: 9 }} href={business.website} target="_blank" rel="noreferrer">Website</a>}
            {!business.phone && !business.email && !business.website && <p className="muted">A empresa ainda não disponibilizou canais directos de contacto.</p>}
            <div className="business-signup-prompt"><strong>Entre no MozEmpresas</strong><span>Guarde empresas, acompanhe ofertas e avance para compras ou contactos quando estiver pronto.</span><Link href="/registo" className="text-link">Criar conta →</Link></div>
          </aside>
        </div>

        <section className="detail-section">
          <div className="section-head">
            <div>
              <span className="eyebrow">Oferta empresarial</span>
              <h2>Produtos e serviços</h2>
            </div>
          </div>

          {listings?.length ? (
            <div className="business-offer-grid">
              {listings.map((item) => (
                <Link href={"/marketplace/" + item.id} className="business-offer-card" key={item.id}>
                  <span className="tag" style={{ width: "fit-content" }}>{item.type === "PRODUCT" ? "Produto" : "Serviço"}</span>
                  <div className="business-offer-visual">{portfolio?.find((media)=>media.title===item.title) ? <img src={portfolio.find((media)=>media.title===item.title)!.image_url} alt="" /> : <span>{item.type === "PRODUCT" ? "PRODUTO" : "SERVIÇO"}</span>}</div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                  <div className="listing-bottom">
                    <strong>{item.price != null ? item.price + " " + (item.currency || "MZN") : "Sob consulta"}</strong>
                    <span>Ver oferta →</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty card">
              <h3>Produtos e serviços em breve</h3>
              <p>Esta empresa ainda não publicou ofertas no Marketplace.</p>
            </div>
          )}
        </section>
        <section className="business-profile-next">
          <div><span className="eyebrow">Continue a descoberta</span><h2>Compare, contacte e encontre outras opções.</h2><p>O perfil é o ponto de entrada. O Marketplace permite explorar ofertas, enquanto o Directório ajuda a descobrir outras empresas e parceiros.</p></div>
          <div className="business-profile-next-actions"><Link href="/marketplace" className="btn primary">Explorar ofertas</Link><Link href="/empresas" className="btn">Ver directório</Link></div>
        </section>
      </div>
    </main>
  );
}
