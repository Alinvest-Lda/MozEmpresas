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
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>Gestão do directório</span>
            <h1>Empresas</h1>
            <p>Explore os perfis empresariais, confira os seus dados principais e controle a presença de cada empresa no directório público.</p>
          </div>
          <div className={styles.heroSummary}>
            <span className={styles.summaryLabel}>Resultados desta consulta</span>
            <strong>{error ? "—" : (count ?? businesses?.length ?? 0).toLocaleString("pt-MZ")}</strong>
            <span className={styles.summaryCaption}>empresas encontradas</span>
            <span className={styles.summaryRule} />
            <span className={styles.summaryFoot}>A consulta apresenta até 100 registos recentes.</span>
          </div>
          <span className={styles.heroDecoration} aria-hidden="true">M</span>
        </header>

        {result ? <div className={styles.notice} role={result === "error" ? "alert" : "status"}>
          {result === "success" ? "Visibilidade da empresa actualizada." : "Não foi possível actualizar a empresa. Confirme se existe, não está arquivada e se tem autorização."}
        </div> : null}

        <section className={styles.explorer} aria-labelledby="business-explorer-title">
          <div className={styles.explorerHeading}>
            <div>
              <span className={styles.sectionKicker}>Explorador</span>
              <h2 id="business-explorer-title">Directório empresarial</h2>
              <p>Filtre os registos e abra cada perfil visualmente para consultar os dados essenciais.</p>
            </div>
            <span className={styles.countPill}>{businesses?.length ?? 0} nesta página</span>
          </div>

          <form className={styles.filterBar} method="get">
            <label className={styles.searchField}>
              <span>Pesquisar pelo nome</span>
              <input name="q" defaultValue={q} maxLength={120} placeholder="Ex.: nome da empresa" />
            </label>
            <label className={styles.visibilityFilter}>
              <span>Estado no directório</span>
              <select name="visibilidade" defaultValue={visibility}>
                <option value="">Todas as empresas</option>
                <option value="publica">Públicas</option>
                <option value="privada">Privadas</option>
                <option value="arquivada">Arquivadas</option>
              </select>
            </label>
            <div className={styles.filterActions}>
              <button className="btn primary" type="submit">Aplicar filtros</button>
              {q || visibility ? <Link className="btn" href="/dashboard/admin/empresas">Limpar</Link> : null}
            </div>
          </form>

          {error ? <div className={styles.errorState} role="alert">Não foi possível carregar as empresas. Verifique as permissões da base de dados e tente novamente.</div> : businesses?.length ? (
            <div className={styles.businessGrid}>
              {businesses.map((business) => {
                const category = Array.isArray(business.business_categories) ? business.business_categories[0] : business.business_categories;
                const archived = Boolean(business.archived_at);
                return <article className={styles.businessCard} key={business.id}>
                  <div className={styles.cardTopline}>
                    <span className={styles.businessMark}>{(business.name?.trim() || "?").slice(0, 1).toLocaleUpperCase("pt-MZ")}</span>
                    <span className={`${styles.status} ${archived ? styles.statusArchived : business.is_public ? styles.statusPublic : styles.statusPrivate}`}>
                      <span className={styles.statusDot} />
                      {archived ? "Arquivada" : business.is_public ? "Visível no directório" : "Privada"}
                    </span>
                  </div>
                  <div className={styles.cardIdentity}>
                    <h3>{business.name}</h3>
                    <p>{category?.name || "Categoria não indicada"}</p>
                    <span className={styles.businessId} title={business.id}>ID {business.id}</span>
                  </div>
                  <div className={styles.cardDetails}>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Localização</span>
                      <strong>{business.location || "Não indicada"}</strong>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Contactos</span>
                      <strong>{business.email || business.phone || "Sem contactos indicados"}</strong>
                      {business.email && business.phone ? <span>{business.phone}</span> : null}
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Registada em</span>
                      <strong>{new Date(business.created_at).toLocaleDateString("pt-MZ", { day: "2-digit", month: "short", year: "numeric" })}</strong>
                    </div>
                  </div>
                  <div className={styles.cardFooter}>
                    {archived ? <span className={styles.archivedNote}>Registo arquivado · consulta apenas</span> : <form action={async (formData) => { "use server"; const outcome = await moderateBusiness(formData); const next = new URLSearchParams(); if (q) next.set("q", q); if (visibility) next.set("visibilidade", visibility); next.set("result", "error" in outcome ? "error" : "success"); redirect(`/dashboard/admin/empresas?${next.toString()}`); }} className={styles.visibilityForm}>
                      <input type="hidden" name="businessId" value={business.id} />
                      <label>
                        <span className={styles.detailLabel}>Visibilidade</span>
                        <select name="isPublic" defaultValue={business.is_public ? "true" : "false"} aria-label={`Visibilidade de ${business.name}`}>
                          <option value="true">Pública</option>
                          <option value="false">Privada</option>
                        </select>
                      </label>
                      <button className="btn primary" type="submit">Guardar alteração</button>
                    </form>}
                  </div>
                </article>;
              })}
            </div>
          ) : <div className={styles.emptyState}>
            <strong>{q || visibility ? "Nenhuma empresa corresponde aos filtros." : "Ainda não existem empresas para apresentar."}</strong>
            <span>Experimente outra pesquisa ou limpe os filtros para consultar outros registos.</span>
          </div>}
          {!error && businesses?.length ? <div className={styles.listFooter}>
            <span>A mostrar <strong>{businesses.length}</strong> de <strong>{(count ?? businesses.length).toLocaleString("pt-MZ")}</strong> empresas correspondentes</span>
            <span>Limite de 100 registos por consulta</span>
          </div> : null}
        </section>
      </div>
    </main>
  );
}
