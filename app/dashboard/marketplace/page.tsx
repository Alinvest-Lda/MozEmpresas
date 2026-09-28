export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createListing, updateOrderStatus, cancelOrder } from "@/lib/commerce/actions";

export default async function MarketplaceWorkspace({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: owned }, { data: memberships }, { data: purchases }, { data: sales }] = await Promise.all([
    supabase.from("businesses").select("id,name").eq("owner_id", user.id).order("name"),
    supabase.from("business_members").select("business_id,role").eq("user_id", user.id).in("role", ["owner","admin","operator"]),
    supabase.from("commerce_orders").select("id,status,total,currency,created_at").eq("buyer_user_id", user.id).order("created_at",{ascending:false}).limit(8),
    supabase.from("commerce_order_items").select("id,order_id,title,quantity,line_total,currency,seller_business_id,created_at").order("created_at",{ascending:false}).limit(20),
  ]);

  const memberIds = [...new Set((memberships ?? []).map(x => x.business_id))];
  const { data: memberBusinesses } = memberIds.length
    ? await supabase.from("businesses").select("id,name").in("id", memberIds)
    : { data: [] };
  const businesses = [...(owned ?? []), ...(memberBusinesses ?? []).filter(b => !(owned ?? []).some(o => o.id === b.id))];

  const salesBusinessIds = new Set(businesses.map(b => b.id));
  const visibleSales = (sales ?? []).filter(s => s.seller_business_id && salesBusinessIds.has(s.seller_business_id)).slice(0,8);

  return (
    <main className="dashboard-main">
      <div className="dashboard-content">
        <header className="dashboard-topbar">
          <div>
            <span className="dashboard-kicker">Comprar e vender</span>
            <h1>Centro comercial</h1>
            <p>Pesquise no mercado, publique ofertas e acompanhe pedidos feitos ou recebidos pela sua empresa.</p>
          </div>
          <Link href="/marketplace" className="btn">Explorar mercado →</Link>
        </header>

        <div className="commerce-work-grid">
          <section className="dashboard-section">
            <div className="dashboard-section-head">
              <div><span className="dashboard-kicker">Vender</span><h2>Publicar uma oferta</h2><p>Qualquer empresa que representa pode disponibilizar produtos ou serviços.</p></div>
            </div>
            <form action={createListing} className="commerce-form">
              <label>Empresa<select name="business_id" required><option value="">Seleccione</option>{businesses.map(b=><option value={b.id} key={b.id}>{b.name}</option>)}</select></label>
              <label>Tipo<select name="type" required><option value="PRODUCT">Produto</option><option value="SERVICE">Serviço</option></select></label>
              <label>Título<input name="title" required placeholder="Ex.: Auditoria de segurança no trabalho" /></label>
              <label>Descrição<textarea name="description" required rows={4} placeholder="Explique claramente o que está a oferecer." /></label>
              <div className="commerce-form-row">
                <label>Preço (MZN)<input name="price" type="number" min="0" step="0.01" placeholder="Sob consulta" /></label>
                <label>Localização<input name="location" placeholder="Maputo, Matola..." /></label>
              </div>
              <button className="btn primary" type="submit">Publicar oferta →</button>
            </form>
          </section>

          <section className="dashboard-section">
            <div className="dashboard-section-head">
              <div><span className="dashboard-kicker">Comprar</span><h2>Pedidos recentes</h2><p>Os pedidos ficam registados no seu histórico.</p></div>
              <Link href="/marketplace" className="text-link">Encontrar ofertas →</Link>
            </div>
            {purchases?.length ? <div className="dashboard-list">{purchases.map(p=><div key={p.id}><strong>Pedido #{p.id.slice(0,8)}</strong><span>{p.status} · {Number(p.total).toLocaleString("pt-MZ")} {p.currency} · {new Date(p.created_at).toLocaleDateString("pt-MZ")}</span>{["PENDING","AWAITING_PAYMENT","PROCESSING"].includes(p.status) && <form action={cancelOrder}><input type="hidden" name="order_id" value={p.id} /><button className="btn" type="submit">Cancelar</button></form>}</div>)}</div> : <div className="empty"><p>Ainda não fez pedidos. Explore produtos e serviços e inicie uma compra.</p><Link href="/marketplace" className="btn primary">Explorar ofertas</Link></div>}
          </section>
        </div>

        <section className="dashboard-section">
          <div className="dashboard-section-head"><div><span className="dashboard-kicker">Vendas</span><h2>Pedidos recebidos</h2><p>Veja as solicitações relacionadas com as ofertas das empresas que representa.</p></div></div>
          {visibleSales.length ? <div className="dashboard-list">{visibleSales.map(s=><div key={s.id}><div><strong>{s.title}</strong><span>{s.quantity} × {Number(s.line_total).toLocaleString("pt-MZ")} {s.currency} · {new Date(s.created_at).toLocaleDateString("pt-MZ")}</span></div><form action={updateOrderStatus}><input type="hidden" name="order_id" value={s.order_id} /><select name="status" defaultValue="PROCESSING" aria-label="Novo estado do pedido"><option value="PROCESSING">Processar</option><option value="COMPLETED">Concluir</option><option value="CANCELLED">Cancelar</option></select><button className="btn" type="submit">Actualizar</button></form></div>)}</div> : <p className="muted">Ainda não existem pedidos recebidos para as suas empresas.</p>}
        </section>

        {params.order && <section className="notice"><strong>Pedido criado.</strong> O pedido #{params.order.slice(0,8)} foi registado como PENDENTE. O pagamento e o processamento do pedido continuam como etapas próprias.</section>}
      </div>
    </main>
  );
}
