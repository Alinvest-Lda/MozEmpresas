export const dynamic = "force-dynamic";

import Link from "next/link";
import { getSuperAdminContext } from "@/lib/auth/super-admin";

type SearchParams = Promise<{ q?: string; tipo?: string; estado?: string }>;

const userTypes: Record<string, string> = {
  empresa: "Empresa",
  parceiro: "Parceiro",
  profissional: "Profissional",
};
const accountStatuses: Record<string, string> = {
  ACTIVE: "Activo",
  INACTIVE: "Inactivo",
  SUSPENDED: "Suspenso",
  DELETED: "Eliminado",
};

export default async function AdminUsersPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = await searchParams;
  const q = (params?.q ?? "").trim().slice(0, 120);
  const type = ["empresa", "parceiro", "profissional"].includes(params?.tipo ?? "") ? params?.tipo ?? "" : "";
  const status = ["ACTIVE", "INACTIVE", "SUSPENDED", "DELETED"].includes(params?.estado ?? "") ? params?.estado ?? "" : "";
  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) return null;

  let usersQuery = supabase
    .from("profiles")
    .select("id,full_name,user_type,account_status,created_at,deactivated_at,deletion_requested_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(100);

  if (q) {
    const safeQuery = q.replace(/[%,_]/g, " ").trim();
    if (safeQuery) usersQuery = usersQuery.ilike("full_name", `%${safeQuery}%`);
  }
  if (type) usersQuery = usersQuery.eq("user_type", type);
  if (status) usersQuery = usersQuery.eq("account_status", status);

  const { data: users, count, error } = await usersQuery;
  const userIds = (users ?? []).map((profile) => profile.id);
  const [{ data: memberships }, { data: platformMembers }] = userIds.length ? await Promise.all([
    supabase.from("business_members").select("user_id,business_id,role,businesses:business_id(name)").in("user_id", userIds),
    supabase.from("platform_members").select("user_id,role,active").in("user_id", userIds),
  ]) : [{ data: [] }, { data: [] }];

  const activeCount = (users ?? []).filter((profile) => profile.account_status === "ACTIVE").length;
  const deletionRequests = (users ?? []).filter((profile) => Boolean(profile.deletion_requested_at)).length;

  return (
    <main className="dashboard-main admin-workspace">
      <div className="dashboard-content">
        <header className="dashboard-topbar">
          <span className="eyebrow">Administração global</span>
          <h1>Utilizadores e acessos</h1>
          <p className="muted">Consulte o tipo de conta, estado, associação empresarial e privilégios da plataforma. Esta fase é de consulta; não altera contas nem permissões.</p>
        </header>

        <div className="grid">
          <article className="card"><span className="muted">Perfis encontrados</span><h2>{error ? "—" : (count ?? users?.length ?? 0).toLocaleString("pt-MZ")}</h2><p>Resultado dos filtros aplicados.</p></article>
          <article className="card"><span className="muted">Activos nesta consulta</span><h2>{error ? "—" : activeCount.toLocaleString("pt-MZ")}</h2><p>Perfis com estado ACTIVE.</p></article>
          <article className="card"><span className="muted">Pedidos de eliminação</span><h2>{error ? "—" : deletionRequests.toLocaleString("pt-MZ")}</h2><p>Perfis com pedido registado.</p></article>
        </div>

        <section className="dashboard-section" style={{ marginTop: 18 }}>
          <div className="dashboard-section-head"><div><span className="dashboard-kicker">Directório interno</span><h2>Perfis da plataforma</h2><p>Máximo de 100 registos por consulta, ordenados pelos mais recentes.</p></div></div>
          <form className="commerce-form-grid" method="get">
            <label>Nome do utilizador<input name="q" defaultValue={q} maxLength={120} placeholder="Pesquisar por nome" /></label>
            <label>Tipo de conta<select name="tipo" defaultValue={type}><option value="">Todos os tipos</option><option value="empresa">Empresa</option><option value="parceiro">Parceiro</option><option value="profissional">Profissional</option></select></label>
            <label>Estado da conta<select name="estado" defaultValue={status}><option value="">Todos os estados</option><option value="ACTIVE">Activo</option><option value="INACTIVE">Inactivo</option><option value="SUSPENDED">Suspenso</option><option value="DELETED">Eliminado</option></select></label>
            <div className="wide" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><button className="btn primary" type="submit">Aplicar filtros</button>{q || type || status ? <Link className="btn" href="/dashboard/admin/usuarios">Limpar filtros</Link> : null}</div>
          </form>

          {error ? <div className="notice" role="alert" style={{ marginTop: 16 }}>Não foi possível carregar os perfis. Verifique as permissões da base de dados e tente novamente.</div> : users?.length ? (
            <div className="admin-request-list" style={{ marginTop: 16 }}>
              {users.map((profile) => {
                const profileMemberships = (memberships ?? []).filter((membership) => membership.user_id === profile.id);
                const platformRole = (platformMembers ?? []).find((member) => member.user_id === profile.id);
                const businesses = profileMemberships.map((membership) => {
                  const business = Array.isArray(membership.businesses) ? membership.businesses[0] : membership.businesses;
                  return business?.name ? `${business.name} (${membership.role})` : membership.role;
                });
                return <article className="admin-request-card" key={profile.id}>
                  <div className="admin-request-head">
                    <div><span className="dashboard-kicker">{userTypes[profile.user_type] || profile.user_type || "Tipo não indicado"}</span><h3>{profile.full_name?.trim() || "Nome não indicado"}</h3><small>Registado em {new Date(profile.created_at).toLocaleDateString("pt-MZ")} · ID: {profile.id}</small></div>
                    <span className="tag">{accountStatuses[profile.account_status] || profile.account_status || "Estado não indicado"}</span>
                  </div>
                  <div className="admin-request-meta" style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8 }}>
                    <span>{platformRole ? `Acesso de plataforma: ${platformRole.role}${platformRole.active ? " (activo)" : " (inactivo)"}` : "Sem função administrativa global"}</span>
                    {businesses.length ? <span>Empresas: {businesses.join(", ")}</span> : <span>Sem associação empresarial identificada</span>}
                    {profile.deactivated_at ? <span>Desactivado em {new Date(profile.deactivated_at).toLocaleDateString("pt-MZ")}</span> : null}
                    {profile.deletion_requested_at ? <strong>Pedido de eliminação registado em {new Date(profile.deletion_requested_at).toLocaleDateString("pt-MZ")}</strong> : null}
                  </div>
                </article>;
              })}
            </div>
          ) : <div className="admin-request-empty" style={{ marginTop: 16 }}><strong>{q || type || status ? "Nenhum perfil corresponde aos filtros." : "Não existem perfis para apresentar."}</strong><span>Altere os filtros para consultar outros registos.</span></div>}
        </section>
      </div>
    </main>
  );
}
