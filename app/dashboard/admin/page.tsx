export const dynamic = "force-dynamic";

import { updatePlatformServiceRequest } from "@/lib/services/actions";
import { moderateBusiness, moderateListing } from "@/lib/admin/actions";
import { createClient } from "@/lib/supabase/server";

const statuses = [
  ["REQUESTED", "Recebido"],
  ["UNDER_REVIEW", "Em análise"],
  ["QUOTED", "Orçamentado"],
  ["ACCEPTED", "Aceite"],
  ["IN_PROGRESS", "Em execução"],
  ["COMPLETED", "Concluído"],
] as const;

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: member } = await supabase.from("platform_members").select("role,active").eq("user_id", user.id).maybeSingle();
  if (!member?.active) return null;

  const [{ count: businesses }, { count: users }, { count: listings }, { count: opportunities }, { data: requests }] = await Promise.all([
    supabase.from("businesses").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("listings").select("id", { count: "exact", head: true }),
    supabase.from("opportunities").select("id", { count: "exact", head: true }),
    supabase.from("service_requests").select("id,status,requested_price,currency,notes,created_at,updated_at,requester_user_id,requester_business_id,platform_services(name),businesses:requester_business_id(name)").order("created_at", { ascending: false }).limit(30),
  ]);

  const statusLabel = new Map(statuses);
  const [{ data: adminBusinesses }, { data: adminListings }] = await Promise.all([
    supabase.from("businesses").select("id,name,is_public,location,created_at").order("created_at", { ascending: false }).limit(20),
    supabase.from("listings").select("id,title,type,status,business_id,created_at,businesses:business_id(name)").order("created_at", { ascending: false }).limit(20),
  ]);

  return <main className="dashboard-main"><div className="dashboard-content">
    <div className="page-header">
      <span className="eyebrow">Administração MozEmpresas</span>
      <h1>Painel da plataforma</h1>
      <p className="muted">Gestão central da plataforma, separada dos espaços empresariais.</p>
    </div>

    <div className="grid">
      <div className="card"><span className="muted">Empresas</span><h2>{businesses ?? 0}</h2><p>Presenças registadas.</p></div>
      <div className="card"><span className="muted">Utilizadores</span><h2>{users ?? 0}</h2><p>Contas na plataforma.</p></div>
      <div className="card"><span className="muted">Ofertas</span><h2>{listings ?? 0}</h2><p>Produtos e serviços publicados.</p></div>
      <div className="card"><span className="muted">Oportunidades</span><h2>{opportunities ?? 0}</h2><p>Oportunidades registadas.</p></div>
    </div>

    <section className="dashboard-section" style={{marginTop:18}}>
      <div className="dashboard-section-head">
        <div><span className="dashboard-kicker">Operação</span><h2>Pedidos de serviços MozEmpresas</h2><p>Acompanhe os pedidos recebidos e actualize o estado operacional.</p></div>
        <span className="directory-results-summary"><strong>{requests?.length ?? 0}</strong><span>pedidos recentes</span></span>
      </div>

      <div className="admin-request-list">
        {requests?.length ? requests.map((request) => {
          const service = Array.isArray(request.platform_services) ? request.platform_services[0] : request.platform_services;
          const business = Array.isArray(request.businesses) ? request.businesses[0] : request.businesses;
          return <article className="admin-request-card" key={request.id}>
            <div className="admin-request-head">
              <div><span className="dashboard-kicker">{service?.name || "Serviço MozEmpresas"}</span><h3>{business?.name || "Pedido individual"}</h3><small>{new Date(request.created_at).toLocaleString("pt-MZ")}</small></div>
              <span className="tag">{statusLabel.get(request.status as typeof statuses[number][0]) || request.status}</span>
            </div>
            <p>{request.notes || "Sem observações adicionais."}</p>
            <form action={async (formData) => { "use server"; await updatePlatformServiceRequest(formData); }} className="admin-request-form">
              <input type="hidden" name="requestId" value={request.id} />
              <label><span>Estado</span><select name="status" defaultValue={request.status}>{statuses.map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select></label>
              <label><span>Valor proposto</span><input name="requestedPrice" type="number" min="0" step="0.01" defaultValue={request.requested_price ?? ""} placeholder="Sob consulta" /></label>
              <label className="wide"><span>Nota operacional</span><textarea name="notes" rows={2} defaultValue={request.notes ?? ""} /></label>
              <button className="btn primary" type="submit">Actualizar pedido</button>
            </form>
          </article>;
        }) : <div className="admin-request-empty"><strong>Nenhum pedido de serviço recebido.</strong><span>Quando uma empresa solicitar um add-on, o pedido aparecerá aqui.</span></div>}
      </div>
    </section>

    <section className="dashboard-section" style={{marginTop:18}}>
      <div className="dashboard-section-head"><div><span className="dashboard-kicker">Moderação</span><h2>Empresas recentes</h2><p>Controlo de publicação da presença empresarial.</p></div></div>
      <div className="admin-request-list">
        {adminBusinesses?.length ? adminBusinesses.map((business) => <article className="admin-request-card" key={business.id}>
          <div className="admin-request-head"><div><span className="dashboard-kicker">{business.location || "Localização não indicada"}</span><h3>{business.name}</h3><small>{new Date(business.created_at).toLocaleString("pt-MZ")}</small></div><span className="tag">{business.is_public ? "Pública" : "Privada"}</span></div>
          <form action={async (formData) => { "use server"; await moderateBusiness(formData); }} className="admin-request-form">
            <input type="hidden" name="businessId" value={business.id} />
            <label><span>Visibilidade</span><select name="isPublic" defaultValue={business.is_public ? "true" : "false"}><option value="true">Publicada</option><option value="false">Privada</option></select></label>
            <button className="btn primary" type="submit">Actualizar</button>
          </form>
        </article>) : <div className="admin-request-empty"><strong>Nenhuma empresa encontrada.</strong></div>}
      </div>
    </section>

    <section className="dashboard-section" style={{marginTop:18}}>
      <div className="dashboard-section-head"><div><span className="dashboard-kicker">Moderação</span><h2>Ofertas recentes</h2><p>Controlo do estado de produtos e serviços publicados.</p></div></div>
      <div className="admin-request-list">
        {adminListings?.length ? adminListings.map((listing) => {
          const business = Array.isArray(listing.businesses) ? listing.businesses[0] : listing.businesses;
          return <article className="admin-request-card" key={listing.id}>
            <div className="admin-request-head"><div><span className="dashboard-kicker">{listing.type === "PRODUCT" ? "Produto" : "Serviço"} · {business?.name || "Sem empresa"}</span><h3>{listing.title}</h3><small>{new Date(listing.created_at).toLocaleString("pt-MZ")}</small></div><span className="tag">{listing.status}</span></div>
            <form action={async (formData) => { "use server"; await moderateListing(formData); }} className="admin-request-form">
              <input type="hidden" name="listingId" value={listing.id} />
              <label><span>Estado</span><select name="status" defaultValue={listing.status}>{["DRAFT","PUBLISHED","PAUSED","SOLD_OUT","ARCHIVED"].map((value)=><option value={value} key={value}>{value}</option>)}</select></label>
              <button className="btn primary" type="submit">Actualizar</button>
            </form>
          </article>;
        }) : <div className="admin-request-empty"><strong>Nenhuma oferta encontrada.</strong></div>}
      </div>
    </section>

    <section className="card" style={{marginTop:18}}>
      <span className="eyebrow">Administração</span><h2 style={{marginTop:10}}>Áreas da plataforma</h2>
      <div className="grid" style={{marginTop:18}}><a className="card" href="/dashboard/admin/monetizacao"><strong>Monetização</strong><p style={{marginTop:6}}>Planos, assinaturas e publicidade.</p></a>
        {["Utilizadores e acessos","Empresas e validação","Produtos e serviços","Oportunidades","Parceiros","Publicidade","Relatórios"].map((item)=><div className="card" key={item}><strong>{item}</strong><p style={{marginTop:6}}>Módulo preparado para evolução.</p></div>)}
      </div>
    </section>
  </div></main>;
}
