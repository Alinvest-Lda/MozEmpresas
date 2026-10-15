export const dynamic = "force-dynamic";

import Link from "next/link";
import { getSuperAdminContext } from "@/lib/auth/super-admin";

type SearchParams = Promise<{ q?: string; tipo?: string; estado?: string }>;

export default async function AdminOpportunitiesPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = await searchParams;
  const q = (params?.q ?? "").trim().slice(0, 120);
  const type = (params?.tipo ?? "").trim().toUpperCase().slice(0, 40);
  const status = (params?.estado ?? "").trim().toUpperCase().slice(0, 40);
  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) return null;

  let query = supabase
    .from("opportunities")
    .select("id,title,slug,type,status,description,organization,location,opens_at,closes_at,created_at,updated_at,owner_id,partner_account_id", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(100);

  if (q) {
    const safeQuery = q.replace(/[%,_,()]/g, " ").trim();
    if (safeQuery) query = query.or(`title.ilike.%${safeQuery}%,organization.ilike.%${safeQuery}%,location.ilike.%${safeQuery}%`);
  }
  if (type) query = query.eq("type", type);
  if (status) query = query.eq("status", status);

  const { data: opportunities, count, error } = await query;
  const published = (opportunities ?? []).filter((item) => item.status === "PUBLISHED").length;
  const withClosingDate = (opportunities ?? []).filter((item) => Boolean(item.closes_at)).length;

  return <main className="dashboard-main"><div className="dashboard-content">
    <header className="page-header">
      <span className="eyebrow">Administração global</span>
      <h1>Oportunidades</h1>
      <p className="muted">Consulta e acompanhamento das oportunidades registadas. A alteração de estados será activada após validar todos os estados permitidos e as regras de publicação do módulo.</p>
    </header>
    <div className="grid">
      <article className="card"><span className="muted">Oportunidades encontradas</span><h2>{error ? "—" : (count ?? opportunities?.length ?? 0).toLocaleString("pt-MZ")}</h2><p>Resultado dos filtros aplicados.</p></article>
      <article className="card"><span className="muted">Publicadas na consulta</span><h2>{error ? "—" : published.toLocaleString("pt-MZ")}</h2><p>Estado PUBLISHED.</p></article>
      <article className="card"><span className="muted">Com prazo de candidatura</span><h2>{error ? "—" : withClosingDate.toLocaleString("pt-MZ")}</h2><p>Registos com data de encerramento.</p></article>
    </div>
    <section className="dashboard-section" style={{ marginTop: 18 }}>
      <div className="dashboard-section-head"><div><span className="dashboard-kicker">Moderação e acompanhamento</span><h2>Directório de oportunidades</h2><p>Pesquisa por título, organização ou localização. Máximo de 100 registos por consulta.</p></div></div>
      <form className="commerce-form-grid" method="get">
        <label>Pesquisar<input name="q" defaultValue={q} maxLength={120} placeholder="Título, organização ou local" /></label>
        <label>Tipo (código)<input name="tipo" defaultValue={type} maxLength={40} placeholder="Ex.: FUNDING" /></label>
        <label>Estado (código)<input name="estado" defaultValue={status} maxLength={40} placeholder="Ex.: PUBLISHED" /></label>
        <div className="wide" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><button className="btn primary" type="submit">Aplicar filtros</button>{q || type || status ? <Link className="btn" href="/dashboard/admin/oportunidades">Limpar filtros</Link> : null}</div>
      </form>
      {error ? <div className="notice" role="alert" style={{ marginTop: 16 }}>Não foi possível carregar as oportunidades. Verifique as permissões da base de dados e tente novamente.</div> : opportunities?.length ? (
        <div className="admin-request-list" style={{ marginTop: 16 }}>
          {opportunities.map((item) => <article className="admin-request-card" key={item.id}>
            <div className="admin-request-head"><div><span className="dashboard-kicker">{item.type} · {item.organization || "Organização não indicada"} · {item.location || "Localização não indicada"}</span><h3>{item.title}</h3><small>Registada em {new Date(item.created_at).toLocaleDateString("pt-MZ")} · Actualizada em {new Date(item.updated_at).toLocaleDateString("pt-MZ")}</small></div><span className="tag">{item.status}</span></div>
            <p>{item.description.length > 360 ? item.description.slice(0, 360) + "…" : item.description}</p>
            <div className="admin-request-meta" style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
              {item.opens_at ? <span>Abre: {new Date(item.opens_at).toLocaleDateString("pt-MZ")}</span> : null}
              {item.closes_at ? <span>Encerra: {new Date(item.closes_at).toLocaleDateString("pt-MZ")}</span> : <span>Sem prazo de encerramento registado</span>}
              <span>Origem: {item.partner_account_id ? "Conta de parceiro" : "Conta de utilizador"}</span>
              <small>ID: {item.id}</small>
            </div>
          </article>)}
        </div>
      ) : <div className="admin-request-empty" style={{ marginTop: 16 }}><strong>{q || type || status ? "Nenhuma oportunidade corresponde aos filtros." : "Ainda não existem oportunidades para apresentar."}</strong><span>Altere os filtros para consultar outros registos.</span></div>}
    </section>
  </div></main>;
}
