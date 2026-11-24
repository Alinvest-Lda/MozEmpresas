export const dynamic = "force-dynamic";

import Link from "next/link";
import { Input, Select } from "@/components/ui";
import styles from "./empresas.module.css";
import { getSuperAdminContext } from "@/lib/auth/super-admin";
import { archiveBusiness, restoreBusiness, setBusinessVisibility, transferBusinessOwnership } from "@/lib/admin/business-governance-actions";
import { redirect } from "next/navigation";

type SearchParams = Promise<{ q?: string; visibilidade?: string; result?: string; page?: string }>;

export default async function AdminBusinessesPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = await searchParams;
  const q = (params?.q ?? "").trim().slice(0, 120);
  const visibility = ["publica", "privada", "arquivada"].includes(params?.visibilidade ?? "")
    ? params?.visibilidade ?? ""
    : "";
  const result = params?.result ?? "";
  const pageNumber = Math.max(1, Math.min(10000, Number.parseInt(params?.page ?? "1", 10) || 1));
  const pageSize = 30;
  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) return null;

  const [{ data: adminUsers }, { data: auditRows, error: auditError }] = await Promise.all([supabase.rpc("admin_list_platform_users", { p_search:null,p_user_type:null,p_status:"ACTIVE",p_access:null,p_association:null,p_limit:100,p_offset:0 }),supabase.rpc("admin_list_business_audit", { p_business_id:null,p_limit:100 })]);
  const resultMessages:Record<string,string>={ "ownership-transferred":"Titularidade transferida e registada.","visibility-updated":"Visibilidade actualizada e registada.",archived:"Empresa arquivada; histórico preservado.",restored:"Empresa restaurada como privada.",invalid:"Dados inválidos ou justificação insuficiente.",forbidden:"Operação não autorizada.","not-found":"Empresa não encontrada.","owner-inactive":"O novo titular deve ter conta activa.",unchanged:"Não houve alteração.","operation-failed":"Não foi possível concluir a operação." };
  let query = supabase
    .from("businesses")
    .select("id,name,slug,location,phone,email,is_public,created_at,archived_at,owner_id,business_categories(name)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (q) {
    const safeQuery = q.replace(/[%,_]/g, " ").trim();
    if (safeQuery) query = query.ilike("name", `%${safeQuery}%`);
  }
  if (visibility === "publica") query = query.eq("is_public", true).is("archived_at", null);
  if (visibility === "privada") query = query.eq("is_public", false).is("archived_at", null);
  if (visibility === "arquivada") query = query.not("archived_at", "is", null);

  let currentPage = pageNumber;
  let from = (currentPage - 1) * pageSize;
  let { data: businesses, count, error } = await query.range(from, from + pageSize - 1);
  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (currentPage > pageCount) {
    currentPage = pageCount;
    from = (currentPage - 1) * pageSize;
    ({ data: businesses, count, error } = await query.range(from, from + pageSize - 1));
  }
  const filterParams = new URLSearchParams();
  if (q) filterParams.set("q", q);
  if (visibility) filterParams.set("visibilidade", visibility);
  const queryString = filterParams.toString();
  const pageHref = (number: number) => "/dashboard/admin/empresas?" + [queryString, "page=" + number].filter(Boolean).join("&");

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
            <span className={styles.summaryFoot}>A consulta apresenta 30 registos por página.</span>
          </div>
          <span className={styles.heroDecoration} aria-hidden="true">M</span>
        </header>

        {result && resultMessages[result] ? <div className={styles.notice} role="status">{resultMessages[result]}</div> : null}

        <section className={styles.directory} aria-labelledby="business-directory-title">
          <div className={styles.sectionHead}>
            <div>
              <h2 id="business-directory-title">Directório empresarial</h2>
              <p>Consulte os dados principais e a visibilidade dos registos. A lista é paginada, com 30 empresas por página.</p>
            </div>
          </div>

          <form className={styles.filters} method="get">
            <label className={styles.searchField}>
              <span>Pesquisar empresa</span>
              <Input name="q" defaultValue={q} maxLength={120} placeholder="Nome da empresa" />
            </label>
            <label>
              <span>Estado no directório</span>
              <Select name="visibilidade" defaultValue={visibility}>
                <option value="">Todas as empresas</option>
                <option value="publica">Públicas</option>
                <option value="privada">Privadas</option>
                <option value="arquivada">Arquivadas</option>
              </Select>
            </label>
            <div className={styles.filterActions}>
              <button className="btn primary" type="submit">Pesquisar</button>
              {q || visibility ? <Link className="btn" href="/dashboard/admin/empresas">Limpar filtros</Link> : null}
            </div>
          </form>

          {error ? <div className="notice" role="alert">Não foi possível carregar as empresas. Verifique as permissões da base de dados e tente novamente.</div> : businesses?.length ? (
            <>
              <div className={styles.tableMeta}>
                <span>A mostrar <strong>{from + 1}–{from + businesses.length}</strong> de <strong>{total.toLocaleString("pt-MZ")}</strong> empresas correspondentes</span>
                <span>{pageSize} registos por página</span>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr>
                    <th>Empresa</th>
                    <th>Categoria</th>
                    <th>Titular</th>
                    <th>Visibilidade</th>
                    <th>Localização e contactos</th>
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
                              <strong>{business.name || "Nome não indicado"}</strong>
                              <small title={business.id}>ID {business.id}</small>
                            </span>
                          </div>
                        </td>
                        <td><span className={styles.typeLabel}>{category?.name || "Não indicada"}</span></td>
                        <td><span className={styles.contactCell}><strong>{adminUsers?.find((u:any)=>u.id===business.owner_id)?.full_name || "Titular não identificado"}</strong><small>{adminUsers?.find((u:any)=>u.id===business.owner_id)?.email || business.owner_id}</small></span></td>
                        <td><span className={`${styles.status} ${archived ? styles.statusCritical : business.is_public ? styles.statusActive : styles.statusNeutral}`}>{archived ? "Arquivada" : business.is_public ? "Pública" : "Privada"}</span></td>
                        <td>
                          <div className={styles.contactCell}>
                            <strong>{business.location || "Localização não indicada"}</strong>
                            <span>{business.email || business.phone || "Sem contactos indicados"}</span>
                            {business.email && business.phone ? <small>{business.phone}</small> : null}
                          </div>
                        </td>
                        <td><span className={styles.date}>{new Date(business.created_at).toLocaleDateString("pt-MZ")}</span></td>
                        <td><div className={styles.operations}>
<form action={setBusinessVisibility}><input type="hidden" name="businessId" value={business.id}/><Select name="isPublic" defaultValue={business.is_public?"true":"false"}><option value="true">Pública</option><option value="false">Privada</option></Select><input name="reason" minLength={8} maxLength={500} required placeholder="Justificação da visibilidade"/><button className="btn primary" type="submit" disabled={archived}>Guardar visibilidade</button></form>
<form action={transferBusinessOwnership}><input type="hidden" name="businessId" value={business.id}/><Select name="newOwnerId" defaultValue={business.owner_id}>{(adminUsers??[]).map((u:any)=><option key={u.id} value={u.id} disabled={u.id===business.owner_id}>{u.full_name||u.email} · {u.email}</option>)}</Select><input name="reason" minLength={8} maxLength={500} required placeholder="Justificação da transferência"/><button className="btn" type="submit" disabled={archived}>Transferir titularidade</button></form>
{archived?<form action={restoreBusiness}><input type="hidden" name="businessId" value={business.id}/><input name="reason" minLength={8} maxLength={500} required placeholder="Justificação da restauração"/><button className="btn" type="submit">Restaurar empresa</button></form>:<form action={archiveBusiness}><input type="hidden" name="businessId" value={business.id}/><input name="reason" minLength={8} maxLength={500} required placeholder="Justificação do arquivo"/><button className="btn" type="submit">Arquivar empresa</button></form>}
</div></td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
              <nav className={styles.pagination} aria-label="Paginação">
                <span>Página {currentPage} de {pageCount}</span>
                <div>
                  {currentPage > 1 ? <Link className="btn" href={pageHref(currentPage - 1)}>← Anterior</Link> : <span className={styles.secondary}>← Anterior</span>}
                  {currentPage < pageCount ? <Link className="btn" href={pageHref(currentPage + 1)}>Seguinte →</Link> : <span className={styles.secondary}>Seguinte →</span>}
                </div>
              </nav>
            </>
          ) : <div className={styles.emptyState}><strong>{q || visibility ? "Nenhuma empresa corresponde aos filtros." : "Ainda não existem empresas para apresentar."}</strong><span>Experimente alterar ou limpar os filtros de pesquisa.</span></div>}
        </section>
        <section className={styles.directory} aria-labelledby="business-audit-title">
<div className={styles.sectionHead}><div><h2 id="business-audit-title">Histórico de governação empresarial</h2><p>Transferências, visibilidade, arquivos e restaurações.</p></div></div>
{auditError?<div className="notice" role="alert">Não foi possível carregar o histórico.</div>:auditRows?.length?<div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Data</th><th>Empresa</th><th>Acção</th><th>Responsável</th><th>Alteração</th><th>Justificação</th></tr></thead><tbody>{auditRows.map((e:any)=><tr key={e.id}><td>{new Date(e.created_at).toLocaleString("pt-MZ")}</td><td>{e.business_name}</td><td>{e.action}</td><td>{e.actor_user_id}</td><td>{e.action==="OWNERSHIP_TRANSFERRED"?e.old_owner_id+" → "+e.new_owner_id:e.action==="VISIBILITY_CHANGED"?(e.old_is_public?"Pública":"Privada")+" → "+(e.new_is_public?"Pública":"Privada"):e.action==="BUSINESS_ARCHIVED"?"Arquivada":"Restaurada"}</td><td>{e.reason}</td></tr>)}</tbody></table></div>:<div className={styles.emptyState}><strong>Sem operações administrativas registadas.</strong><span>As próximas alterações serão registadas aqui.</span></div>}
</section>
      </div>
    </main>
  );
}
