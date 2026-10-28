export const dynamic = "force-dynamic";

import Link from "next/link";
import styles from "./usuarios.module.css";
import { getSuperAdminContext } from "@/lib/auth/super-admin";

type SearchParams = Promise<{ q?: string; tipo?: string; estado?: string; acesso?: string; associacao?: string }>;

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
  const access = ["admin_activo", "admin_inactivo", "sem_admin"].includes(params?.acesso ?? "") ? params?.acesso ?? "" : "";
  const association = ["com_empresa", "sem_empresa"].includes(params?.associacao ?? "") ? params?.associacao ?? "" : "";
  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) return null;

  const [{ data: allPlatformMembers }, { data: allBusinessMembers }] = await Promise.all([
    supabase.from("platform_members").select("user_id,active"),
    supabase.from("business_members").select("user_id"),
  ]);
  const platformRows = allPlatformMembers ?? [];
  const businessUserIds = [...new Set((allBusinessMembers ?? []).map((row) => row.user_id))];
  const platformUserIds = [...new Set(platformRows.map((row) => row.user_id))];
  const activePlatformIds = [...new Set(platformRows.filter((row) => row.active).map((row) => row.user_id))];
  const inactivePlatformIds = [...new Set(platformRows.filter((row) => !row.active).map((row) => row.user_id))];

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
  if (access === "admin_activo") usersQuery = activePlatformIds.length ? usersQuery.in("id", activePlatformIds) : usersQuery.eq("id", "00000000-0000-0000-0000-000000000000");
  if (access === "admin_inactivo") usersQuery = inactivePlatformIds.length ? usersQuery.in("id", inactivePlatformIds) : usersQuery.eq("id", "00000000-0000-0000-0000-000000000000");
  if (access === "sem_admin" && platformUserIds.length) usersQuery = usersQuery.not("id", "in", `(${platformUserIds.join(",")})`);
  if (association === "com_empresa") usersQuery = businessUserIds.length ? usersQuery.in("id", businessUserIds) : usersQuery.eq("id", "00000000-0000-0000-0000-000000000000");
  if (association === "sem_empresa" && businessUserIds.length) usersQuery = usersQuery.not("id", "in", `(${businessUserIds.join(",")})`);

  const { data: users, count, error } = await usersQuery;
  const userIds = (users ?? []).map((profile) => profile.id);
  const [{ data: memberships }, { data: platformMembers }] = userIds.length ? await Promise.all([
    supabase.from("business_members").select("user_id,business_id,role,businesses:business_id(name)").in("user_id", userIds),
    supabase.from("platform_members").select("user_id,role,active").in("user_id", userIds),
  ]) : [{ data: [] }, { data: [] }];

  const activeCount = (users ?? []).filter((profile) => profile.account_status === "ACTIVE").length;
  const deletionRequests = (users ?? []).filter((profile) => Boolean(profile.deletion_requested_at)).length;

  return (
    <main className={`dashboard-main admin-workspace ${styles.page}`}>
      <div className={`dashboard-content ${styles.content}`}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>Administração global</span>
            <h1>Utilizadores e acessos</h1>
            <p>Pesquise perfis e consulte o estado das contas, funções administrativas e associações empresariais.</p>
          </div>
          <div className={styles.resultCount}>
            <strong>{error ? "—" : (count ?? users?.length ?? 0).toLocaleString("pt-MZ")}</strong>
            <span>perfis encontrados</span>
          </div>
        </header>

        <section className={styles.directory} aria-labelledby="users-directory-title">
          <div className={styles.sectionHead}>
            <div>
              <h2 id="users-directory-title">Directório de utilizadores</h2>
              <p>Consulta até 100 registos por pesquisa, dos mais recentes para os mais antigos. Não altera contas nem permissões.</p>
            </div>
          </div>

          <form className={styles.filters} method="get">
            <label className={styles.searchField}>
              <span>Pesquisar utilizador</span>
              <input name="q" defaultValue={q} maxLength={120} placeholder="Nome do utilizador" />
            </label>
            <label>
              <span>Tipo de conta</span>
              <select name="tipo" defaultValue={type}>
                <option value="">Todos os tipos</option>
                <option value="empresa">Empresa</option>
                <option value="parceiro">Parceiro</option>
                <option value="profissional">Profissional</option>
              </select>
            </label>
            <label>
              <span>Estado da conta</span>
              <select name="estado" defaultValue={status}>
                <option value="">Todos os estados</option>
                <option value="ACTIVE">Activo</option>
                <option value="INACTIVE">Inactivo</option>
                <option value="SUSPENDED">Suspenso</option>
                <option value="DELETED">Eliminado</option>
              </select>
            </label>
            <label>
              <span>Acesso administrativo</span>
              <select name="acesso" defaultValue={access}>
                <option value="">Todos os acessos</option>
                <option value="admin_activo">Activo</option>
                <option value="admin_inactivo">Inactivo</option>
                <option value="sem_admin">Sem acesso global</option>
              </select>
            </label>
            <label>
              <span>Associação empresarial</span>
              <select name="associacao" defaultValue={association}>
                <option value="">Todas</option>
                <option value="com_empresa">Com empresa</option>
                <option value="sem_empresa">Sem empresa</option>
              </select>
            </label>
            <div className={styles.filterActions}>
              <button className="btn primary" type="submit">Pesquisar</button>
              {q || type || status || access || association ? <Link className="btn" href="/dashboard/admin/usuarios">Limpar filtros</Link> : null}
            </div>
          </form>

          {error ? <div className="notice" role="alert">Não foi possível carregar os perfis. Verifique as permissões da base de dados e tente novamente.</div> : users?.length ? (
            <>
              <div className={styles.tableMeta}>
                <span>A mostrar <strong>{users.length}</strong> de <strong>{(count ?? users.length).toLocaleString("pt-MZ")}</strong> perfis correspondentes</span>
                <span>Máximo de 100 por consulta</span>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr>
                    <th>Utilizador</th>
                    <th>Tipo</th>
                    <th>Estado</th>
                    <th>Acesso global</th>
                    <th>Empresas associadas</th>
                    <th>Registo</th>
                  </tr></thead>
                  <tbody>
                    {users.map((profile) => {
                      const profileMemberships = (memberships ?? []).filter((membership) => membership.user_id === profile.id);
                      const platformRole = (platformMembers ?? []).find((member) => member.user_id === profile.id);
                      const businesses = profileMemberships.map((membership) => {
                        const business = Array.isArray(membership.businesses) ? membership.businesses[0] : membership.businesses;
                        return business?.name ? { name: business.name, role: membership.role } : { name: membership.role, role: "" };
                      });
                      const statusClass = profile.account_status === "ACTIVE" ? styles.statusActive : profile.account_status === "SUSPENDED" || profile.account_status === "DELETED" ? styles.statusCritical : styles.statusNeutral;
                      return <tr key={profile.id}>
                        <td>
                          <div className={styles.userCell}>
                            <span className={styles.avatar}>{(profile.full_name?.trim() || "?").slice(0, 1).toLocaleUpperCase("pt-MZ")}</span>
                            <span className={styles.userInfo}>
                              <strong>{profile.full_name?.trim() || "Nome não indicado"}</strong>
                              <small>{profile.id}</small>
                              {profile.deletion_requested_at ? <em>Pedido de eliminação registado</em> : null}
                            </span>
                          </div>
                        </td>
                        <td><span className={styles.typeLabel}>{userTypes[profile.user_type] || profile.user_type || "Não indicado"}</span></td>
                        <td><span className={`${styles.status} ${statusClass}`}>{accountStatuses[profile.account_status] || profile.account_status || "Não indicado"}</span></td>
                        <td>
                          {platformRole ? <div className={styles.accessCell}><strong>{platformRole.role}</strong><span className={`${styles.status} ${platformRole.active ? styles.statusActive : styles.statusNeutral}`}>{platformRole.active ? "Activo" : "Inactivo"}</span></div> : <span className={styles.secondary}>Sem acesso global</span>}
                        </td>
                        <td>
                          {businesses.length ? <div className={styles.businessList}>{businesses.slice(0, 2).map((business, index) => <span key={`${profile.id}-${index}`}>{business.name}{business.role ? <small> · {business.role}</small> : null}</span>)}{businesses.length > 2 ? <small>+{businesses.length - 2} outras</small> : null}</div> : <span className={styles.secondary}>Sem associação</span>}
                        </td>
                        <td><span className={styles.date}>{new Date(profile.created_at).toLocaleDateString("pt-MZ")}</span>{profile.deactivated_at ? <small className={styles.subDate}>Desactivado: {new Date(profile.deactivated_at).toLocaleDateString("pt-MZ")}</small> : null}</td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : <div className={styles.emptyState}><strong>{q || type || status || access || association ? "Nenhum perfil corresponde aos filtros." : "Não existem perfis para apresentar."}</strong><span>Experimente alterar ou limpar os filtros de pesquisa.</span></div>}
        </section>
      </div>
    </main>
  );
}
