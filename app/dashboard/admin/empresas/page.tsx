export const dynamic = "force-dynamic";

import Link from "next/link";
import { getSuperAdminContext } from "@/lib/auth/super-admin";
import { moderateBusiness } from "@/lib/admin/actions";
import { redirect } from "next/navigation";

type SearchParams = Promise<{ q?: string; visibilidade?: string; result?: string }>;

export default async function AdminBusinessesPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = await searchParams;
  const q = (params?.q ?? "").trim().slice(0, 120);
  const visibility = ["publica", "privada", "arquivada"].includes(params?.visibilidade ?? "")
    ? params?.visibilidade ?? ""
    : "";
  const result = params?.result === "success" || params?.result === "error" ? params.result : "";
  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) return null;

  let query = supabase
    .from("businesses")
    .select("id,name,slug,location,phone,email,is_public,created_at,archived_at,business_categories(name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(100);

  if (q) {
    const safeQuery = q.replace(/[%,_]/g, " ").trim();
    if (safeQuery) query = query.ilike("name", `%${safeQuery}%`);
  }
  if (visibility === "publica") query = query.eq("is_public", true).is("archived_at", null);
  if (visibility === "privada") query = query.eq("is_public", false).is("archived_at", null);
  if (visibility === "arquivada") query = query.not("archived_at", "is", null);

  const { data: businesses, count, error } = await query;

  return (
    <main className="dashboard-main">
      <div className="dashboard-content">
        <header className="page-header">
          <span className="eyebrow">Administração global</span>
          <h1>Empresas</h1>
          <p className="muted">Directório operacional de empresas registadas, com controlo de visibilidade e consulta do estado de arquivo.</p>
        </header>
        {result ? <div className="notice" role={result === "error" ? "alert" : "status"} style={{ marginTop: 16 }}>
          {result === "success" ? "Visibilidade da empresa actualizada." : "Não foi possível actualizar a empresa. Confirme se existe, não está arquivada e se tem autorização."}
        </div> : null}

        <div className="grid">
          <article className="card"><span className="muted">Empresas encontradas</span><h2>{error ? "—" : (count ?? businesses?.length ?? 0).toLocaleString("pt-MZ")}</h2><p>Resultados da consulta actual.</p></article>
          <article className="card"><span className="muted">Registos apresentados</span><h2>{error ? "—" : (businesses?.length ?? 0).toLocaleString("pt-MZ")}</h2><p>Máximo de 100 registos por consulta.</p></article>
        </div>

        <section className="dashboard-section" style={{ marginTop: 18 }}>
          <div className="dashboard-section-head"><div><span className="dashboard-kicker">Directório empresarial</span><h2>Pesquisar e moderar</h2><p>A visibilidade pode ser alterada apenas por um Super Admin autorizado.</p></div></div>
          <form className="commerce-form-grid" method="get">
            <label>Nome da empresa<input name="q" defaultValue={q} maxLength={120} placeholder="Pesquisar empresa" /></label>
            <label>Estado de visibilidade<select name="visibilidade" defaultValue={visibility}><option value="">Todos os estados</option><option value="publica">Pública</option><option value="privada">Privada</option><option value="arquivada">Arquivada</option></select></label>
            <div className="wide" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><button className="btn primary" type="submit">Aplicar filtros</button>{q || visibility ? <Link className="btn" href="/dashboard/admin/empresas">Limpar filtros</Link> : null}</div>
          </form>

          {error ? <div className="notice" role="alert" style={{ marginTop: 16 }}>Não foi possível carregar as empresas. Verifique as permissões da base de dados e tente novamente.</div> : businesses?.length ? (
            <div className="admin-request-list" style={{ marginTop: 16 }}>
              {businesses.map((business) => {
                const category = Array.isArray(business.business_categories) ? business.business_categories[0] : business.business_categories;
                const archived = Boolean(business.archived_at);
                return <article className="admin-request-card" key={business.id}>
                  <div className="admin-request-head">
                    <div><span className="dashboard-kicker">{category?.name || "Categoria não indicada"} · {business.location || "Localização não indicada"}</span><h3>{business.name}</h3><small>Registada em {new Date(business.created_at).toLocaleDateString("pt-MZ")} · ID: {business.id}</small></div>
                    <span className="tag">{archived ? "Arquivada" : business.is_public ? "Pública" : "Privada"}</span>
                  </div>
                  <div className="admin-request-meta" style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
                    {business.email ? <span>{business.email}</span> : null}
                    {business.phone ? <span>{business.phone}</span> : null}
                    {business.slug ? <span>Slug: {business.slug}</span> : null}
                  </div>
                  {!archived ? <form action={async (formData) => { "use server"; const outcome = await moderateBusiness(formData); const next = new URLSearchParams(); if (q) next.set("q", q); if (visibility) next.set("visibilidade", visibility); next.set("result", "error" in outcome ? "error" : "success"); redirect(`/dashboard/admin/empresas?${next.toString()}`); }} className="admin-request-form" style={{ marginTop: 12 }}>
                    <input type="hidden" name="businessId" value={business.id} />
                    <label><span>Visibilidade</span><select name="isPublic" defaultValue={business.is_public ? "true" : "false"}><option value="true">Pública</option><option value="false">Privada</option></select></label>
                    <button className="btn primary" type="submit">Guardar visibilidade</button>
                  </form> : <p className="muted" style={{ marginTop: 10 }}>Registo arquivado. A alteração de visibilidade está indisponível nesta lista.</p>}
                </article>;
              })}
            </div>
          ) : <div className="admin-request-empty" style={{ marginTop: 16 }}><strong>{q || visibility ? "Nenhuma empresa corresponde aos filtros." : "Ainda não existem empresas para apresentar."}</strong><span>Altere os filtros para consultar outros registos.</span></div>}
        </section>
      </div>
    </main>
  );
}
