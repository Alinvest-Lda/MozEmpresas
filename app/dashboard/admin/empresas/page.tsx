export const dynamic = "force-dynamic";

import Link from "next/link";
import styles from "./empresas.module.css";
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
    <main className={`dashboard-main admin-workspace ${styles.page}`}>
      <div className={`dashboard-content ${styles.content}`}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>Administração global</span>
            <h1>Empresas</h1>
            <p>Consulte o directório empresarial e gira a visibilidade dos registos activos num único espaço.</p>
          </div>
          <div className={styles.resultCount}>
            <strong>{error ? "—" : (count ?? businesses?.length ?? 0).toLocaleString("pt-MZ")}</strong>
            <span>empresas encontradas</span>
          </div>
        </header>

        {result ? <div className={styles.notice} role={result === "error" ? "alert" : "status"}>
          {result === "success" ? "Visibilidade da empresa actualizada." : "Não foi possível actualizar a empresa. Confirme se existe, não está arquivada e se tem autorização."}
        </div> : null}

        <section className={styles.directory} aria-labelledby="business-directory-title">
          <div className={styles.sectionHead}>
            <div>
              <h2 id="business-directory-title">Directório empresarial</h2>
              <p>Consulta até 100 registos, dos mais recentes para os mais antigos. Os registos arquivados permanecem apenas para consulta.</p>
            </div>
          </div>

          <form className={styles.filters} method="get">
            <label className={styles.searchField}>
              <span>Pesquisar empresa</span>
              <input name="q" defaultValue={q} maxLength={120} placeholder="Nome da empresa" />
            </label>
            <label>
              <span>Visibilidade</span>
              <select name="visibilidade" defaultValue={visibility}>
                <option value="">Todos os estados</option>
                <option value="publica">Pública</option>
                <option value="privada">Privada</option>
                <option value="arquivada">Arquivada</option>
              </select>
            </label>
            <div className={styles.filterActions}>
              <button className="btn primary" type="submit">Pesquisar</button>
              {q || visibility ? <Link className="btn" href="/dashboard/admin/empresas">Limpar filtros</Link> : null}
            </div>
          </form>

          {error ? <div className={styles.errorState} role="alert">Não foi possível carregar as empresas. Verifique as permissões da base de dados e tente novamente.</div> : businesses?.length ? (
            <>
              <div className={styles.tableMeta}>
                <span>A mostrar <strong>{businesses.length}</strong> de <strong>{(count ?? businesses.length).toLocaleString("pt-MZ")}</strong> empresas correspondentes</span>
                <span>Máximo de 100 por consulta</span>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr>
                    <th>Empresa</th>
                    <th>Categoria e localização</th>
                    <th>Contactos</th>
                    <th>Visibilidade</th>
                    <th>Registo</th>
                    <th>Acção</th>
                  </tr></thead>
                  <tbody>
                    {businesses.map((business) => {
                      const category = Array.isArray(business.business_categories) ? business.business_categories[0] : business.business_categories;
                      const archived = Boolean(business.archived_at);
                      return <tr key={business.id}>
                        <td>
                          <div className={styles.businessCell}>
                            <span className={styles.businessMark}>{(business.name?.trim() || "?").slice(0, 1).toLocaleUpperCase("pt-MZ")}</span>
                            <span className={styles.businessInfo}>
                              <strong>{business.name}</strong>
                              <small title={business.id}>ID: {business.id}</small>
                              {business.slug ? <small>/{business.slug}</small> : null}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className={styles.detailCell}>
                            <strong>{category?.name || "Categoria não indicada"}</strong>
                            <span>{business.location || "Localização não indicada"}</span>
                          </div>
                        </td>
                        <td>
                          <div className={styles.contactCell}>
                            {business.email ? <span>{business.email}</span> : null}
                            {business.phone ? <span>{business.phone}</span> : null}
                            {!business.email && !business.phone ? <span className={styles.secondary}>Sem contactos indicados</span> : null}
                          </div>
                        </td>
                        <td>
                          <span className={`${styles.status} ${archived ? styles.statusArchived : business.is_public ? styles.statusPublic : styles.statusPrivate}`}>
                            {archived ? "Arquivada" : business.is_public ? "Pública" : "Privada"}
                          </span>
                        </td>
                        <td><span className={styles.date}>{new Date(business.created_at).toLocaleDateString("pt-MZ")}</span></td>
                        <td>
                          {archived ? <span className={styles.secondary}>Só consulta</span> : <form action={async (formData) => { "use server"; const outcome = await moderateBusiness(formData); const next = new URLSearchParams(); if (q) next.set("q", q); if (visibility) next.set("visibilidade", visibility); next.set("result", "error" in outcome ? "error" : "success"); redirect(`/dashboard/admin/empresas?${next.toString()}`); }} className={styles.visibilityForm}>
                            <input type="hidden" name="businessId" value={business.id} />
                            <select name="isPublic" defaultValue={business.is_public ? "true" : "false"} aria-label={`Visibilidade de ${business.name}`}>
                              <option value="true">Pública</option>
                              <option value="false">Privada</option>
                            </select>
                            <button className="btn primary" type="submit">Guardar</button>
                          </form>}
                        </td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : <div className={styles.emptyState}>
            <strong>{q || visibility ? "Nenhuma empresa corresponde aos filtros." : "Ainda não existem empresas para apresentar."}</strong>
            <span>Altere ou limpe os filtros para consultar outros registos.</span>
          </div>}
        </section>
      </div>
    </main>
  );
}
