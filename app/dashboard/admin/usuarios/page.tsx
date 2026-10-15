export const dynamic = "force-dynamic";

import Link from "next/link";
import { getSuperAdminContext } from "@/lib/auth/super-admin";

type SearchParams = Promise<{ q?: string }>;

export default async function AdminUsersPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = await searchParams;
  const q = (params?.q ?? "").trim().slice(0, 120);
  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) return null;

  let usersQuery = supabase
    .from("profiles")
    .select("id,full_name", { count: "exact" })
    .order("full_name", { ascending: true })
    .limit(100);

  if (q) {
    const safeQuery = q.replace(/[%,_]/g, " ").trim();
    if (safeQuery) usersQuery = usersQuery.ilike("full_name", `%${safeQuery}%`);
  }

  const { data: users, count, error } = await usersQuery;

  return (
    <main className="dashboard-main">
      <div className="dashboard-content">
        <header className="page-header">
          <span className="eyebrow">Administração global</span>
          <h1>Utilizadores e acessos</h1>
          <p className="muted">Consulte os perfis registados na plataforma. As permissões administrativas não são alteradas nesta página.</p>
        </header>

        <div className="grid">
          <article className="card">
            <span className="muted">Perfis encontrados</span>
            <h2>{error ? "—" : (count ?? users?.length ?? 0).toLocaleString("pt-MZ")}</h2>
            <p>Resultado da consulta actual.</p>
          </article>
          <article className="card">
            <span className="muted">Registos apresentados</span>
            <h2>{error ? "—" : (users?.length ?? 0).toLocaleString("pt-MZ")}</h2>
            <p>Máximo de 100 perfis por consulta.</p>
          </article>
        </div>

        <section className="dashboard-section" style={{ marginTop: 18 }}>
          <div className="dashboard-section-head">
            <div>
              <span className="dashboard-kicker">Directório interno</span>
              <h2>Perfis da plataforma</h2>
              <p>Pesquise pelo nome do perfil para localizar uma conta.</p>
            </div>
          </div>

          <form className="commerce-form-grid" method="get">
            <label className="wide">
              Nome do utilizador
              <input name="q" defaultValue={q} maxLength={120} placeholder="Pesquisar por nome" />
            </label>
            <div className="wide" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn primary" type="submit">Pesquisar</button>
              {q ? <Link className="btn" href="/dashboard/admin/usuarios">Limpar pesquisa</Link> : null}
            </div>
          </form>

          {error ? (
            <div className="notice" role="alert" style={{ marginTop: 16 }}>
              Não foi possível carregar os perfis. Verifique as permissões da base de dados e tente novamente.
            </div>
          ) : users?.length ? (
            <div className="admin-request-list" style={{ marginTop: 16 }}>
              {users.map((profile) => (
                <article className="admin-request-card" key={profile.id}>
                  <div className="admin-request-head">
                    <div>
                      <span className="dashboard-kicker">Perfil registado</span>
                      <h3>{profile.full_name?.trim() || "Nome não indicado"}</h3>
                      <small>ID: {profile.id}</small>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="admin-request-empty" style={{ marginTop: 16 }}>
              <strong>{q ? "Nenhum perfil corresponde à pesquisa." : "Não existem perfis para apresentar."}</strong>
              <span>{q ? "Tente pesquisar por outro nome." : "Os perfis aparecerão aqui quando estiverem disponíveis."}</span>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
