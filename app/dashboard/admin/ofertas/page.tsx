export const dynamic = "force-dynamic";

import { moderateListing } from "@/lib/admin/actions";
import { getSuperAdminContext } from "@/lib/auth/super-admin";
import { redirect } from "next/navigation";
import { Button, Field, Input, Select } from "@/components/ui";

type SearchParams = Promise<{ q?: string; status?: string; page?: string; result?: string }>;

const listingStatuses = ["DRAFT", "PUBLISHED", "PAUSED", "SOLD_OUT", "ARCHIVED"] as const;

export default async function AdminOffersPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = await searchParams;
  const query = (params?.q ?? "").trim().slice(0, 100);
  const status = listingStatuses.includes(params?.status as typeof listingStatuses[number]) ? params?.status as typeof listingStatuses[number] : "";
  const requestedPage = Number.parseInt(params?.page ?? "1", 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const pageSize = 50;
  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) return null;

  let listingsQuery = supabase
    .from("listings")
    .select("id,title,type,status,business_id,created_at,businesses:business_id(name)", { count: "exact" })
    .order("created_at", { ascending: false });
  if (query) listingsQuery = listingsQuery.ilike("title", `%${query.replace(/[%_]/g, "\\$&")}%`);
  if (status) listingsQuery = listingsQuery.eq("status", status);
  const { data: listings, count, error } = await listingsQuery.range((page - 1) * pageSize, page * pageSize - 1);
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pages);
  const result = params?.result === "success" || params?.result === "error" ? params.result : "";

  return <main className="dashboard-main admin-workspace"><div className="dashboard-content">
    <section className="dashboard-section">
      <div className="dashboard-section-head">
        <div><span className="dashboard-kicker">Super Admin · Marketplace</span><h1>Gestão de ofertas</h1><p>Pesquise e modere o inventário completo. A listagem é paginada e não depende das ofertas mais recentes.</p></div>
        <a className="btn" href="/dashboard/admin">Voltar ao painel</a>
      </div>
      {result ? <div className="notice" role={result === "error" ? "alert" : "status"}>{result === "success" ? "Estado da oferta actualizado." : "Não foi possível actualizar a oferta. Verifique os dados e as permissões."}</div> : null}
      <form method="get" className="admin-offers-filters">
        <Field label="Pesquisar pelo título" htmlFor="offers-query">
          <Input id="offers-query" name="q" value={query} maxLength={100} placeholder="Ex.: material de escritório" />
        </Field>
        <Field label="Estado" htmlFor="offers-status">
          <Select id="offers-status" name="status" defaultValue={status}><option value="">Todos os estados</option>{listingStatuses.map((value)=><option value={value} key={value}>{value}</option>)}</Select>
        </Field>
        <Button variant="primary" type="submit">Filtrar</Button>
        <a className="ui-button ui-button-secondary" href="/dashboard/admin/ofertas">Limpar filtros</a>
      </form>
      <div className="directory-results-summary admin-offers-summary"><strong>{total.toLocaleString("pt-MZ")}</strong><span>ofertas encontradas · página {safePage} de {pages}</span></div>
      {error ? <div className="notice" role="alert">Não foi possível carregar as ofertas. Tente novamente ou verifique as permissões.</div> : null}
      <div className="admin-request-list">
        {listings?.length ? listings.map((listing) => {
          const business = Array.isArray(listing.businesses) ? listing.businesses[0] : listing.businesses;
          return <article className="admin-request-card" key={listing.id}>
            <div className="admin-request-head">
              <div><span className="dashboard-kicker">{listing.type === "PRODUCT" ? "Produto" : listing.type === "SERVICE" ? "Serviço" : listing.type} · {business?.name || "Sem empresa associada"}</span><h3>{listing.title}</h3><small>Registada em {new Date(listing.created_at).toLocaleString("pt-MZ")}</small></div>
              <span className="tag">{listing.status}</span>
            </div>
            <form action={async (formData) => { "use server"; const outcome = await moderateListing(formData); redirect(`/dashboard/admin/ofertas?result=${"error" in outcome ? "error" : "success"}&q=${encodeURIComponent(query)}&status=${encodeURIComponent(status)}&page=${safePage}`); }} className="admin-request-form admin-offer-moderation">
              <input type="hidden" name="listingId" value={listing.id} />
              <Field label="Estado da oferta" htmlFor={`offer-status-${listing.id}`}>
                <Select id={`offer-status-${listing.id}`} name="status" defaultValue={listing.status}>{listingStatuses.map((value)=><option value={value} key={value}>{value}</option>)}</Select>
              </Field>
              <Button variant="primary" type="submit">Actualizar estado</Button>
            </form>
          </article>;
        }) : !error ? <div className="admin-request-empty"><strong>Nenhuma oferta corresponde aos filtros.</strong><span>Altere o termo de pesquisa ou seleccione outro estado.</span></div> : null}
      </div>
      <nav aria-label="Paginação de ofertas" className="admin-offers-pagination">
        {safePage > 1 ? <a className="btn" href={`/dashboard/admin/ofertas?q=${encodeURIComponent(query)}&status=${encodeURIComponent(status)}&page=${safePage-1}`}>← Anterior</a> : <span />}
        <span className="muted">A mostrar {total ? ((safePage-1)*pageSize)+1 : 0}–{Math.min(safePage*pageSize,total)} de {total.toLocaleString("pt-MZ")}</span>
        {safePage < pages ? <a className="btn" href={`/dashboard/admin/ofertas?q=${encodeURIComponent(query)}&status=${encodeURIComponent(status)}&page=${safePage+1}`}>Seguinte →</a> : <span />}
      </nav>
    </section>
  </div></main>;
}
