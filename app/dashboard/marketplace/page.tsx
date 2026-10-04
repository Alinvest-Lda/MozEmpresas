export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { cancelOrder, createListing, updateOrderStatus, saveBuyerInterest, removeBuyerInterest } from "@/lib/commerce/actions";

type Business = { id: string; name: string };
type Listing = {
  id: string;
  title: string;
  description: string;
  type: "PRODUCT" | "SERVICE";
  category_id?: string | null;
  price: number | null;
  currency: string | null;
  location: string | null;
  business_id: string | null;
  image_url?: string | null;
};
type Order = { id: string; status: string; notes: string | null; created_at: string };
type OrderEvent = { id: string; order_id: string; from_status: string | null; to_status: string; note: string | null; created_at: string };
type OrderItem = {
  id: string;
  order_id: string;
  title: string;
  quantity: number;
  line_total: number | null;
  currency: string | null;
  seller_business_id: string | null;
  created_at: string;
};

const statusLabels: Record<string, string> = {
  INTERESTED: "Interesse recebido",
  CONTACTED: "Contactado",
  NEGOTIATING: "Em negociação",
  AGREED: "Acordado",
  COMPLETED: "Concluído",
  CANCELLED: "Encerrado",
};

const statusClass = (status: string) => {
  if (status === "COMPLETED") return "is-success";
  if (status === "CANCELLED") return "is-muted";
  if (status === "NEGOTIATING" || status === "AGREED") return "is-warning";
  return "is-info";
};

export default async function MarketplaceWorkspace({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; publish?: string; request?: string; status?: string }>;
}) {
  const params = await searchParams;
  const activeTab = ["comprar", "vender", "negociacoes"].includes(params.tab || "") ? params.tab! : "comprar";
  const flash = params.publish === "success"
    ? "Oferta publicada com sucesso."
    : params.request && params.request !== "error" && params.request !== "forbidden"
      ? "Interesse registado. A negociação continuará directamente entre as empresas."
      : params.status === "updated"
        ? "Estado da negociação actualizado."
        : params.status === "cancelled"
          ? "Interesse encerrado."
          : "";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: owned }, { data: memberships }, { data: buyerOrders }, { data: buyerCategories }] = await Promise.all([
    supabase.from("businesses").select("id,name").eq("owner_id", user.id).order("name"),
    supabase.from("business_members").select("business_id,role").eq("user_id", user.id).in("role", ["owner", "admin", "operator"]),
    supabase.from("commerce_orders").select("id,status,notes,created_at").eq("buyer_user_id", user.id).order("created_at", { ascending: false }).limit(12),
    supabase.from("business_categories").select("id,name,slug").order("name").limit(100),
  ]);

  const memberIds = [...new Set((memberships ?? []).map((x) => x.business_id))];
  const { data: memberBusinesses } = memberIds.length
    ? await supabase.from("businesses").select("id,name").in("id", memberIds)
    : { data: [] as Business[] };

  const businesses: Business[] = [
    ...(owned ?? []),
    ...(memberBusinesses ?? []).filter((b) => !(owned ?? []).some((o) => o.id === b.id)),
  ];
  const businessIds = businesses.map((b) => b.id);
  const buyerBusinessIds = businesses.map((b) => b.id);
  const { data: buyerInterests } = buyerBusinessIds.length ? await supabase.from("business_buyer_interests").select("id,business_id,category_id,location,listing_type").in("business_id", buyerBusinessIds).order("created_at", { ascending: false }).limit(40) : { data: [] };

  const [{ data: myListings }, { data: sellerItems }, { data: recentListings }] = await Promise.all([
    businessIds.length
      ? supabase.from("listings").select("id,title,description,type,price,currency,location,business_id").in("business_id", businessIds).order("created_at", { ascending: false }).limit(50)
      : Promise.resolve({ data: [] as Listing[] }),
    businessIds.length
      ? supabase.from("commerce_order_items").select("id,order_id,title,quantity,line_total,currency,seller_business_id,created_at").in("seller_business_id", businessIds).order("created_at", { ascending: false }).limit(30)
      : Promise.resolve({ data: [] as OrderItem[] }),
    supabase.from("listings").select("id,title,description,type,price,currency,location,business_id,category_id").eq("status", "PUBLISHED").order("created_at", { ascending: false }).limit(12),
  ]);

  const sellerOrderIds = [...new Set((sellerItems ?? []).map((item) => item.order_id))];
  const { data: sellerOrders } = sellerOrderIds.length
    ? await supabase.from("commerce_orders").select("id,status,notes,created_at").in("id", sellerOrderIds).order("created_at", { ascending: false })
    : { data: [] as Order[] };

  const businessNames = new Map(businesses.map((b) => [b.id, b.name]));
  const listings = (myListings ?? []) as Listing[];
  const orders = (buyerOrders ?? []) as Order[];
  const salesOrders = (sellerOrders ?? []) as Order[];
  const salesByOrder = new Map((sellerItems ?? []).map((item) => [item.order_id, item]));
  const allOrderIds = [...new Set([...orders, ...salesOrders].map((o) => o.id))];
  const { data: orderEvents } = allOrderIds.length
    ? await supabase.from("commerce_order_events").select("id,order_id,from_status,to_status,note,created_at").in("order_id", allOrderIds).order("created_at", { ascending: false })
    : { data: [] as OrderEvent[] };
  const eventsByOrder = new Map<string, OrderEvent[]>();
  for (const event of (orderEvents ?? []) as OrderEvent[]) {
    const current = eventsByOrder.get(event.order_id) ?? [];
    current.push(event);
    eventsByOrder.set(event.order_id, current);
  }
  const activeSellerOrders = salesOrders.filter((o) => !["COMPLETED", "CANCELLED"].includes(o.status));
  const latestListings = (recentListings ?? []).filter((item) => !businessIds.includes(item.business_id || "")) as Listing[];
  const { data: promotedRows } = await supabase
    .from("business_promotions")
    .select("listing_id,audience_mode")
    .eq("status","ACTIVE")
    .lte("starts_at",new Date().toISOString())
    .gt("ends_at",new Date().toISOString())
    .eq("audience_mode","TARGETED")
    .not("listing_id","is",null)
    .order("created_at",{ascending:false})
    .limit(12);
  const promotedIds=[...new Set((promotedRows??[]).map(row=>row.listing_id).filter(Boolean))];
  let promotedListings: Listing[]=[];
  if(promotedIds.length){
    const {data:promoted}=await supabase.from("listings").select("id,title,description,type,price,currency,location,business_id,category_id").eq("status","PUBLISHED").in("id",promotedIds);
    promotedListings=(promoted??[]).filter(item=>!businessIds.includes(item.business_id||"")) as Listing[];
  }
  const categoryNames = new Map((buyerCategories ?? []).map((item) => [item.id, item.name]));
  const interests = buyerInterests ?? [];
  const interestScore = (item: Listing) => interests.reduce((score, interest) => {
    const categoryMatch = interest.category_id && (item as Listing & { category_id?: string | null }).category_id === interest.category_id ? 4 : 0;
    const locationMatch = interest.location && item.location?.toLowerCase().includes(String(interest.location).toLowerCase()) ? 2 : 0;
    const typeMatch = interest.listing_type && item.type === interest.listing_type ? 2 : 0;
    return score + categoryMatch + locationMatch + typeMatch;
  }, 0);
  const matchedPromoted = [...promotedListings].sort((a,b) => interestScore(b)-interestScore(a));
  const buyingListings=[...matchedPromoted,...latestListings.filter(item=>!promotedIds.includes(item.id)).sort((a,b)=>interestScore(b)-interestScore(a))].slice(0,8);
  if (latestListings.length) {
    const { data: attachments } = await supabase.from("listing_attachments").select("listing_id,storage_path,kind,created_at").in("listing_id", latestListings.map((item) => item.id)).eq("kind", "IMAGE").order("created_at", { ascending: true });
    const firstImage = new Map<string, string>();
    for (const attachment of attachments ?? []) if (!firstImage.has(attachment.listing_id)) firstImage.set(attachment.listing_id, supabase.storage.from("listing-media").getPublicUrl(attachment.storage_path).data.publicUrl);
    latestListings.forEach((item) => { item.image_url = firstImage.get(item.id) ?? null; });
  }


  const renderOfferCard = (item: Listing, compact = false) => (
    <article className={compact ? "commerce-offer commerce-offer-compact" : "commerce-offer"}>
      <div className="commerce-offer-art">{item.image_url ? <img src={item.image_url} alt="" /> : <span>{item.type === "PRODUCT" ? "P" : "S"}</span>}<small>{item.type === "PRODUCT" ? "PRODUTO" : "SERVIÇO"}</small></div>
      <div className="commerce-offer-body">
        <div className="commerce-offer-meta">
          <span className={"commerce-chip " + (item.type === "PRODUCT" ? "chip-product" : "chip-service")}>{item.type === "PRODUCT" ? "Produto" : "Serviço"}</span>
          {item.location && <span>{item.location}</span>}
        </div>
        <h3>{item.title}</h3>
        {!compact && <p>{item.description}</p>}
        <div className="commerce-offer-bottom">
          <strong>{item.price != null ? item.price.toLocaleString("pt-MZ") + " " + (item.currency || "MZN") : "Sob consulta"}</strong>
          <Link href={"/marketplace/" + item.id} className="commerce-link">Ver oferta →</Link>
        </div>
      </div>
    </article>
  );

  return (
    <main className="dashboard-main commerce-hub">
      <style>{`
        .commerce-hub .dashboard-content{max-width:1480px}
        .commerce-hub .commerce-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:32px;padding:8px 0 30px}
        .commerce-hub .commerce-hero h1{font-size:clamp(30px,3vw,44px);letter-spacing:-.035em;margin:6px 0 10px}
        .commerce-hub .commerce-hero p{max-width:720px;margin:0;color:var(--muted,#68717c);font-size:15px;line-height:1.7}
        .commerce-hub .commerce-hero-actions{display:flex;gap:10px;flex-wrap:wrap}
        .commerce-hub .commerce-nav{display:flex;gap:6px;border-bottom:1px solid #e5e7eb;margin-bottom:26px}
        .commerce-hub .commerce-nav a{padding:13px 18px;border-radius:10px 10px 0 0;color:#69717c;text-decoration:none;font-weight:700;font-size:14px}
        .commerce-hub .commerce-nav a.active{color:#111827;background:#f4f6f8;box-shadow:inset 0 -2px 0 currentColor}
        .commerce-hub .commerce-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:24px}
        .commerce-hub .commerce-kpi{background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:20px;min-height:120px}
        .commerce-hub .commerce-kpi small{display:block;color:#707986;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}
        .commerce-hub .commerce-kpi strong{display:block;font-size:30px;letter-spacing:-.03em;margin:12px 0 5px}
        .commerce-hub .commerce-kpi span{color:#7b8490;font-size:12px}
        .commerce-hub .commerce-grid{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(320px,.75fr);gap:18px}
        .commerce-hub .commerce-panel{background:#fff;border:1px solid #e5e7eb;border-radius:18px;padding:24px}
        .commerce-hub .commerce-panel-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;margin-bottom:20px}
        .commerce-hub .commerce-panel-head h2{margin:3px 0 5px;font-size:20px;letter-spacing:-.02em}
        .commerce-hub .commerce-panel-head p{margin:0;color:#7b8490;font-size:13px;line-height:1.55}
        .commerce-hub .commerce-eyebrow{font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#727b87}
        .commerce-hub .commerce-action-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
        .commerce-hub .commerce-action{display:flex;align-items:center;gap:14px;padding:17px;border:1px solid #e5e7eb;border-radius:14px;text-decoration:none;color:inherit;transition:.18s ease}
        .commerce-hub .commerce-action:hover{transform:translateY(-1px);border-color:#cbd1d8;background:#fafbfc}
        .commerce-hub .commerce-action-icon{width:40px;height:40px;border-radius:12px;background:#f1f3f5;display:grid;place-items:center;font-weight:800}
        .commerce-hub .commerce-action strong{display:block;font-size:14px}.commerce-hub .commerce-action small{display:block;color:#7b8490;margin-top:3px;font-size:12px;line-height:1.45}
        .commerce-hub .commerce-action b{margin-left:auto}
        .commerce-hub .commerce-list{display:grid;gap:0}
        .commerce-hub .commerce-list-row{display:flex;align-items:center;gap:14px;padding:15px 0;border-top:1px solid #edf0f2}
        .commerce-hub .commerce-list-row:first-child{border-top:0;padding-top:0}
        .commerce-hub .commerce-list-main{min-width:0;flex:1}.commerce-hub .commerce-timeline{display:grid;gap:5px;margin-top:8px}.commerce-hub .commerce-timeline div{display:flex;gap:8px;align-items:baseline;color:#68717c;font-size:10px}.commerce-hub .commerce-timeline span{font-weight:800;color:#3f4852}.commerce-hub .commerce-timeline small{font-size:10px}.commerce-hub .commerce-list-main strong{display:block;font-size:14px}.commerce-hub .commerce-list-main span{display:block;color:#7b8490;font-size:12px;margin-top:4px}
        .commerce-hub .commerce-status{display:inline-flex;align-items:center;white-space:nowrap;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:800}
        .commerce-hub .commerce-status.is-info{background:#edf5ff;color:#2364a0}.commerce-hub .commerce-status.is-warning{background:#fff5df;color:#98650c}.commerce-hub .commerce-status.is-success{background:#edf8f1;color:#28734a}.commerce-hub .commerce-status.is-muted{background:#f0f1f2;color:#707780}
        .commerce-hub .commerce-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}
        .commerce-hub .commerce-form-grid .wide{grid-column:1/-1}
        .commerce-hub .commerce-form-grid label{display:grid;gap:7px;font-size:12px;font-weight:750;color:#343b44}
        .commerce-hub .commerce-form-grid input,.commerce-hub .commerce-form-grid select,.commerce-hub .commerce-form-grid textarea{width:100%;box-sizing:border-box;border:1px solid #dfe3e7;border-radius:11px;padding:11px 12px;background:#fff;font:inherit;color:#222;outline:none}
        .commerce-hub .commerce-form-grid textarea{resize:vertical}.commerce-hub .commerce-form-grid input:focus,.commerce-hub .commerce-form-grid select:focus,.commerce-hub .commerce-form-grid textarea:focus{border-color:#8f99a5;box-shadow:0 0 0 3px #f0f2f4}
        .commerce-hub .commerce-offer-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
        .commerce-hub .commerce-offer{display:grid;grid-template-columns:110px minmax(0,1fr);border:1px solid #e4e7ea;border-radius:16px;overflow:hidden;background:#fff}
        .commerce-hub .commerce-offer-art{min-height:150px;background:linear-gradient(145deg,#eef1f3,#dfe4e8);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;overflow:hidden}.commerce-hub .commerce-offer-art img{width:100%;height:100%;min-height:150px;object-fit:cover}
        .commerce-hub .commerce-offer-art span{font-size:38px;font-weight:900;letter-spacing:-.06em;color:#333b43}.commerce-hub .commerce-offer-art small{font-size:9px;font-weight:900;letter-spacing:.08em;color:#68727d}
        .commerce-hub .commerce-offer-body{padding:16px;min-width:0}.commerce-hub .commerce-offer-meta{display:flex;gap:8px;align-items:center;flex-wrap:wrap;color:#7a838e;font-size:11px}
        .commerce-hub .commerce-chip{border-radius:999px;padding:4px 8px;font-weight:800}.commerce-hub .chip-product{background:#eef5ff;color:#32679b}.commerce-hub .chip-service{background:#f3f0ff;color:#6750a0}
        .commerce-hub .commerce-offer h3{font-size:16px;margin:12px 0 7px;letter-spacing:-.015em}.commerce-hub .commerce-offer p{color:#737d88;font-size:12px;line-height:1.55;margin:0;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
        .commerce-hub .commerce-offer-bottom{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:16px}.commerce-hub .commerce-offer-bottom strong{font-size:14px}.commerce-hub .commerce-link{color:#1d5f8f;text-decoration:none;font-weight:800;font-size:12px}
        .commerce-hub .commerce-split{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(300px,.8fr);gap:18px}
        .commerce-hub .commerce-empty{border:1px dashed #d8dde2;border-radius:14px;padding:28px;text-align:center;color:#747e89}.commerce-hub .commerce-empty strong{display:block;color:#303741;margin-bottom:5px}.commerce-hub .commerce-empty p{font-size:13px;margin:0 0 14px}
        .commerce-hub .commerce-flash{margin-bottom:18px;border-radius:12px;padding:12px 15px;background:#edf8f1;border:1px solid #cfe9d9;color:#28734a;font-size:13px;font-weight:650}
        .commerce-hub .commerce-note{font-size:11px;color:#7b8490;line-height:1.55;margin-top:12px}
        @media(max-width:1050px){.commerce-hub .commerce-grid,.commerce-hub .commerce-split{grid-template-columns:1fr}.commerce-hub .commerce-kpis{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:720px){.commerce-hub .commerce-hero{display:block}.commerce-hub .commerce-hero-actions{margin-top:18px}.commerce-hub .commerce-kpis,.commerce-hub .commerce-action-grid,.commerce-hub .commerce-form-grid,.commerce-hub .commerce-offer-grid{grid-template-columns:1fr}.commerce-hub .commerce-offer{grid-template-columns:82px minmax(0,1fr)}.commerce-hub .commerce-offer-art{min-height:130px}.commerce-hub .commerce-nav{overflow-x:auto}.commerce-hub .commerce-nav a{white-space:nowrap}.commerce-hub .commerce-panel{padding:18px}}
      `}</style>

      <div className="dashboard-content">
        {flash && <div className="commerce-flash" role="status">{flash}</div>}

        <header className="commerce-hero">
          <div>
            <span className="commerce-eyebrow">Área comercial</span>
            <h1>Comprar e vender</h1>
            <p>Um espaço único para descobrir ofertas, publicar o que a sua empresa vende e acompanhar relações comerciais.</p>
          </div>
          <div className="commerce-hero-actions">
            <Link href="/dashboard/marketplace?tab=comprar" className="btn">Explorar ofertas</Link>
            <Link href="/dashboard/marketplace?tab=vender" className="btn primary">Publicar oferta →</Link>
          </div>
        </header>

        <nav className="commerce-nav" aria-label="Centro comercial">
          
          <Link href="/dashboard/marketplace?tab=comprar" className={activeTab === "comprar" ? "active" : ""}>Comprar</Link>
          <Link href="/dashboard/marketplace?tab=vender" className={activeTab === "vender" ? "active" : ""}>Vender</Link>
          <Link href="/dashboard/marketplace?tab=negociacoes" className={activeTab === "negociacoes" ? "active" : ""}>Negociações</Link>
        </nav>

        {activeTab === "comprar" && (
          <section id="comprar" className="commerce-grid">
            <div className="commerce-panel">
              <div className="commerce-panel-head">
                <div><span className="commerce-eyebrow">Comprar</span><h2>Encontre o que precisa.</h2><p>Veja primeiro as ofertas destacadas para a audiência da sua empresa e depois explore todo o marketplace quando quiser ampliar a pesquisa.</p></div>
                <Link href="/marketplace" className="commerce-link">Ver marketplace →</Link>
              </div>
              {buyingListings.length ? <div className="commerce-offer-grid">{buyingListings.map((item) => <div key={item.id}>{renderOfferCard(item)}</div>)}</div> : <div className="commerce-empty"><strong>Ainda não existem ofertas publicadas.</strong><p>Quando empresas publicarem produtos ou serviços, eles aparecerão aqui.</p><Link href="/dashboard/marketplace?tab=vender" className="btn primary">Publicar a primeira oferta</Link></div>}
            </div>

            <div className="commerce-panel">
              <div className="commerce-panel-head"><div><span className="commerce-eyebrow">Actividade de compra</span><h2>Os seus interesses</h2><p>Acompanhe o que já iniciou com fornecedores.</p></div></div>
              <section className="buyer-interest-box">
                <div className="commerce-panel-head"><div><span className="commerce-eyebrow">Preferências de compra</span><h2>O que procura?</h2><p>Escolha interesses da empresa para que ofertas patrocinadas relevantes apareçam primeiro.</p></div></div>
                <form action={saveBuyerInterest} className="commerce-form-grid">
                  <label>Empresa<select name="business_id" required><option value="">Seleccione a empresa</option>{businesses.map((b) => <option value={b.id} key={b.id}>{b.name}</option>)}</select></label>
                  <label>Categoria<select name="category_id"><option value="">Qualquer categoria</option>{(buyerCategories ?? []).map((cat) => <option value={cat.id} key={cat.id}>{cat.name}</option>)}</select></label>
                  <label>Tipo<select name="listing_type"><option value="">Produto ou serviço</option><option value="PRODUCT">Produto</option><option value="SERVICE">Serviço</option></select></label>
                  <label>Localização<input name="interest_location" placeholder="Maputo, Matola, Nampula..." /></label>
                  <div className="wide"><button className="btn" type="submit">Adicionar interesse</button></div>
                </form>
                {interests.length > 0 && <div className="buyer-interest-list">{interests.map((interest) => <div className="buyer-interest-item" key={interest.id}><span>{interest.category_id ? categoryNames.get(interest.category_id) : "Qualquer categoria"}{interest.listing_type ? " · " + (interest.listing_type === "PRODUCT" ? "Produto" : "Serviço") : ""}{interest.location ? " · " + interest.location : ""}</span><form action={removeBuyerInterest}><input type="hidden" name="id" value={interest.id}/><button className="text-link" type="submit">Remover</button></form></div>)}</div>}
              </section>

              {orders.length ? <div className="commerce-list">{orders.slice(0, 5).map((order) => <div className="commerce-list-row" key={order.id}><div className="commerce-list-main"><strong>Solicitação #{order.id.slice(0, 8)}</strong><span>{new Date(order.created_at).toLocaleDateString("pt-MZ")}</span></div><span className={"commerce-status " + statusClass(order.status)}>{statusLabels[order.status] || order.status}</span>{["INTERESTED","CONTACTED","NEGOTIATING"].includes(order.status) && <form action={cancelOrder}><input type="hidden" name="order_id" value={order.id}/><button className="btn" type="submit">Encerrar</button></form>}</div>)}</div> : <div className="commerce-empty"><strong>Nenhum interesse iniciado.</strong><p>Abra uma oferta e manifeste o seu interesse para começar uma relação comercial.</p><Link href="/marketplace" className="btn primary">Encontrar ofertas</Link></div>}
            </div>
          </section>
        )}

        {activeTab === "vender" && (
          <section id="vender" className="commerce-split" style={{marginTop:18}}>
            <div className="commerce-panel">
              <div className="commerce-panel-head"><div><span className="commerce-eyebrow">Vender</span><h2>Apresente o que a sua empresa oferece.</h2><p>Crie uma publicação comercial completa, com informação clara, imagens e documentos de apoio para facilitar a avaliação por potenciais compradores.</p></div></div>
              {businesses.length ? (
                <form action={createListing} className="commerce-form-grid" encType="multipart/form-data">
                  <label>Empresa<select name="business_id" required><option value="">Seleccione a empresa</option>{businesses.map((business) => <option value={business.id} key={business.id}>{business.name}</option>)}</select></label>
                  <label>Tipo<select name="type" required><option value="PRODUCT">Produto</option><option value="SERVICE">Serviço</option></select></label>
                  <label className="wide">Título<input name="title" required placeholder="Ex.: Equipamento de segurança industrial" /></label>
                  <label className="wide">Descrição<textarea name="description" required rows={4} placeholder="Explique o que oferece, para quem, o que está incluído e porque deve ser considerado." /></label>
                  <label className="wide">Imagens da oferta<input name="attachments" type="file" accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx,.xls,.xlsx" multiple /><small className="commerce-note">Pode adicionar várias imagens e documentos. Use imagens nítidas e documentos comerciais relevantes.</small></label>
                  <label>Preço em MZN<input name="price" type="number" min="0" step="0.01" placeholder="Deixe vazio para sob consulta" /></label>
                  <label>Localização<input name="location" placeholder="Maputo, Matola..." /></label>
                  <div className="wide"><button className="btn primary" type="submit">Publicar oferta →</button><p className="commerce-note">A publicação fica disponível no marketplace. A negociação e o pagamento são tratados directamente entre as empresas.</p></div>
                </form>
              ) : <div className="commerce-empty"><strong>Primeiro associe uma empresa à sua conta.</strong><p>Uma oferta comercial precisa de estar ligada a uma empresa que representa.</p><Link href="/dashboard/empresas" className="btn primary">Criar ou associar empresa</Link></div>}
            </div>

            <div className="commerce-panel">
              <div className="commerce-panel-head"><div><span className="commerce-eyebrow">A sua montra</span><h2>Ofertas publicadas</h2><p>Gerencie visualmente o que está disponível.</p></div></div>
              {listings.length ? <div className="commerce-list">{listings.slice(0, 6).map((item) => <div className="commerce-list-row" key={item.id}><div className="commerce-list-main"><strong>{item.title}</strong><span>{businessNames.get(item.business_id || "") || "Empresa"} · {item.type === "PRODUCT" ? "Produto" : "Serviço"}</span></div><strong>{item.price != null ? item.price.toLocaleString("pt-MZ") + " MZN" : "Sob consulta"}</strong><Link href={"/marketplace/" + item.id} className="commerce-link">Abrir →</Link></div>)}</div> : <div className="commerce-empty"><strong>A sua montra está vazia.</strong><p>Publique a primeira oferta para começar a aparecer no marketplace.</p></div>}
            </div>
          </section>
        )}

        {activeTab === "negociacoes" && <section id="negociacoes" className="commerce-panel" style={{marginTop:18}}>
          <div className="commerce-panel-head"><div><span className="commerce-eyebrow">Negociações</span><h2>Relações comerciais a acompanhar</h2><p>Veja os interesses recebidos pelas empresas que representa e avance cada negociação por estado.</p></div></div>
          {activeSellerOrders.length ? <div className="commerce-list">{activeSellerOrders.slice(0, 8).map((order) => {
            const item = salesByOrder.get(order.id);
            return <div className="commerce-list-row" key={order.id}>
              <div className="commerce-list-main"><strong>{item?.title || "Interesse comercial"}</strong><span>{businessNames.get(item?.seller_business_id || "") || "A sua empresa"} · {new Date(order.created_at).toLocaleDateString("pt-MZ")}</span></div>
              <span className={"commerce-status " + statusClass(order.status)}>{statusLabels[order.status] || order.status}</span>
              <form action={updateOrderStatus} style={{display:"flex",gap:8,alignItems:"center"}}>
                <input type="hidden" name="order_id" value={order.id}/>
                {order.status === "INTERESTED" && <><select name="status" defaultValue="CONTACTED"><option value="CONTACTED">Contactar</option><option value="CANCELLED">Encerrar</option></select><button className="btn" type="submit">Actualizar</button></>}
                {order.status === "CONTACTED" && <><select name="status" defaultValue="NEGOTIATING"><option value="NEGOTIATING">Em negociação</option><option value="CANCELLED">Encerrar</option></select><button className="btn" type="submit">Actualizar</button></>}
                {order.status === "NEGOTIATING" && <><select name="status" defaultValue="AGREED"><option value="AGREED">Acordado</option><option value="CANCELLED">Encerrar</option></select><button className="btn" type="submit">Actualizar</button></>}
                {order.status === "AGREED" && <><select name="status" defaultValue="COMPLETED"><option value="COMPLETED">Concluído</option><option value="CANCELLED">Encerrar</option></select><button className="btn" type="submit">Actualizar</button></>}
              </form><div className="commerce-timeline">{(eventsByOrder.get(order.id) ?? []).slice(0, 4).map((event) => <div key={event.id}><span>{statusLabels[event.to_status] || event.to_status}</span><small>{new Date(event.created_at).toLocaleDateString("pt-MZ")} · {event.note || "Estado actualizado."}</small></div>)}</div>
            </div>;
          })}</div> : <div className="commerce-empty"><strong>Nenhuma negociação pendente.</strong><p>Os novos interesses aparecerão aqui automaticamente quando alguém demonstrar interesse numa das suas ofertas.</p></div>}
        </section>}
      </div>
    </main>
  );
}
