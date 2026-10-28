export const dynamic = "force-dynamic";

import Link from "next/link";
import styles from "./oportunidades.module.css";
import { getSuperAdminContext } from "@/lib/auth/super-admin";
import { moderateOpportunity } from "@/lib/admin/opportunity-actions";

type SearchParams = Promise<{ q?: string; tipo?: string; estado?: string; prazo?: string; page?: string; result?: string }>;

const typeLabels: Record<string, string> = {
  FUNDING: "Financiamento",
  PROGRAM: "Desenvolvimento empresarial",
  YOUTH_INITIATIVE: "Iniciativa juvenil",
  TRAINING: "Formação e capacitação",
  ENTREPRENEUR_SUPPORT: "Apoio a empreendedores",
  EXPORT_INTERNATIONAL: "Exportação e internacionalização",
  AWARD_SCHOLARSHIP: "Bolsa / Prémio",
  PARTNERSHIP: "Parceria / Cooperação",
  EXPRESSION_OF_INTEREST: "Manifestação de interesse",
  INNOVATION_TECH: "Inovação e tecnologia",
  CALL: "Chamada anterior",
  EVENT: "Evento anterior",
  BUSINESS: "Negócio anterior",
  OTHER: "Outro",
};
const statusLabels: Record<string, string> = {
  DRAFT: "Rascunho",
  PUBLISHED: "Publicada",
  CLOSED: "Encerrada",
  ARCHIVED: "Arquivada",
};
const statusClass: Record<string, string> = {
  DRAFT: "draft",
  PUBLISHED: "published",
  CLOSED: "closed",
  ARCHIVED: "archived",
};
const pageSize = 30;

function dateLabel(value: string | null) {
  return value ? new Date(value).toLocaleDateString("pt-MZ", { day: "2-digit", month: "short", year: "numeric" }) : "Sem prazo";
}

export default async function AdminOpportunitiesPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = searchParams ? await searchParams : {};
  const q = (params.q ?? "").trim().slice(0, 120);
  const type = Object.hasOwn(typeLabels, (params.tipo ?? "").toUpperCase()) ? (params.tipo ?? "").toUpperCase() : "";
  const status = Object.hasOwn(statusLabels, (params.estado ?? "").toUpperCase()) ? (params.estado ?? "").toUpperCase() : "";
  const deadlineFilter = ["expirado", "sem-prazo", "proximo"].includes(params.prazo ?? "") ? params.prazo ?? "" : "";
  const pageNumber = Math.max(1, Math.min(10000, Number.parseInt(params.page ?? "1", 10) || 1));
  const result = params.result === "success" || params.result === "error" ? params.result : "";
  const now = new Date();
  const nowIso = now.toISOString();
  const soonIso = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) return null;

  const [allCount, publishedCount, draftCount, closedCount, archivedCount, expiredCount, upcomingCount, noDeadlineCount] = await Promise.all([
    supabase.from("opportunities").select("id", { count: "exact", head: true }),
    supabase.from("opportunities").select("id", { count: "exact", head: true }).eq("status", "PUBLISHED"),
    supabase.from("opportunities").select("id", { count: "exact", head: true }).eq("status", "DRAFT"),
    supabase.from("opportunities").select("id", { count: "exact", head: true }).eq("status", "CLOSED"),
    supabase.from("opportunities").select("id", { count: "exact", head: true }).eq("status", "ARCHIVED"),
    supabase.from("opportunities").select("id", { count: "exact", head: true }).eq("status", "PUBLISHED").lt("closes_at", nowIso),
    supabase.from("opportunities").select("id", { count: "exact", head: true }).eq("status", "PUBLISHED").gte("closes_at", nowIso).lte("closes_at", soonIso),
    supabase.from("opportunities").select("id", { count: "exact", head: true }).eq("status", "PUBLISHED").is("closes_at", null),
  ]);

  let query = supabase
    .from("opportunities")
    .select("id,title,slug,type,status,description,organization,location,opens_at,closes_at,created_at,updated_at,owner_id,partner_account_id", { count: "exact" })
    .order("created_at", { ascending: false });

  if (q) {
    const safeQuery = q.replace(/[%,_()]/g, " ").trim();
    if (safeQuery) query = query.or(`title.ilike.%${safeQuery}%,organization.ilike.%${safeQuery}%,location.ilike.%${safeQuery}%`);
  }
  if (type) query = query.eq("type", type);
  if (status) query = query.eq("status", status);
  if (deadlineFilter === "expirado") query = query.eq("status", "PUBLISHED").lt("closes_at", nowIso);
  if (deadlineFilter === "sem-prazo") query = query.eq("status", "PUBLISHED").is("closes_at", null);
  if (deadlineFilter === "proximo") query = query.eq("status", "PUBLISHED").gte("closes_at", nowIso).lte("closes_at", soonIso);

  const from = (pageNumber - 1) * pageSize;
  const { data: opportunities, count, error } = await query.range(from, from + pageSize - 1);
  const total = count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(pageNumber, pageCount);
  const filterParams = new URLSearchParams();
  if (q) filterParams.set("q", q);
  if (type) filterParams.set("tipo", type);
  if (status) filterParams.set("estado", status);
  if (deadlineFilter) filterParams.set("prazo", deadlineFilter);
  const queryString = filterParams.toString();
  const pageHref = (number: number) => "/dashboard/admin/oportunidades?" + [queryString, "page=" + number].filter(Boolean).join("&");

  return (
    <main className={`dashboard-main admin-workspace ${styles.page}`}>
      <div className={`dashboard-content ${styles.content}`}>
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>Administração global</span>
            <h1>Oportunidades</h1>
            <p>Controle as publicações, acompanhe prazos e modere o ciclo de vida de cada oportunidade da plataforma.</p>
          </div>
          <div className={styles.heroSummary}>
            <span>Total registado</span>
            <strong>{allCount.error ? "—" : (allCount.count ?? 0).toLocaleString("pt-MZ")}</strong>
            <small>Oportunidades em todos os estados</small>
          </div>
        </header>

        {result ? <div className={`${styles.notice} ${result === "error" ? styles.noticeError : ""}`} role={result === "error" ? "alert" : "status"}>
          {result === "success" ? "Estado da oportunidade actualizado." : "Não foi possível actualizar o estado. Confirme a autorização e tente novamente."}
        </div> : null}

        <section className={styles.metrics} aria-label="Resumo do módulo">
          <Link href="/dashboard/admin/oportunidades?estado=PUBLISHED" className={styles.metric}>
            <span>Publicadas</span><strong>{publishedCount.error ? "—" : (publishedCount.count ?? 0).toLocaleString("pt-MZ")}</strong><small>Visíveis no directório, conforme os prazos</small>
          </Link>
          <Link href="/dashboard/admin/oportunidades?estado=DRAFT" className={styles.metric}>
            <span>Rascunhos</span><strong>{draftCount.error ? "—" : (draftCount.count ?? 0).toLocaleString("pt-MZ")}</strong><small>Ainda não publicadas</small>
          </Link>
          <Link href="/dashboard/admin/oportunidades?estado=CLOSED" className={styles.metric}>
            <span>Encerradas</span><strong>{closedCount.error ? "—" : (closedCount.count ?? 0).toLocaleString("pt-MZ")}</strong><small>Participação encerrada</small>
          </Link>
          <Link href="/dashboard/admin/oportunidades?estado=ARCHIVED" className={styles.metric}>
            <span>Arquivadas</span><strong>{archivedCount.error ? "—" : (archivedCount.count ?? 0).toLocaleString("pt-MZ")}</strong><small>Fora do ciclo activo</small>
          </Link>
        </section>

        <section className={styles.alertStrip} aria-label="Alertas de prazo">
          <Link href="/dashboard/admin/oportunidades?prazo=expirado"><strong>{expiredCount.error ? "—" : (expiredCount.count ?? 0).toLocaleString("pt-MZ")}</strong><span>Com prazo ultrapassado</span></Link>
          <Link href="/dashboard/admin/oportunidades?prazo=proximo"><strong>{upcomingCount.error ? "—" : (upcomingCount.count ?? 0).toLocaleString("pt-MZ")}</strong><span>Encerram nos próximos 7 dias</span></Link>
          <Link href="/dashboard/admin/oportunidades?prazo=sem-prazo"><strong>{noDeadlineCount.error ? "—" : (noDeadlineCount.count ?? 0).toLocaleString("pt-MZ")}</strong><span>Sem prazo definido</span></Link>
        </section>

        <section className={styles.directory}>
          <div className={styles.sectionHead}>
            <div><span className={styles.kicker}>Gestão operacional</span><h2>Directório de oportunidades</h2><p>Filtre os registos e altere o estado quando necessário. A listagem é paginada.</p></div>
            <span className={styles.resultCount}>{error ? "Consulta indisponível" : `${total.toLocaleString("pt-MZ")} resultado(s)`}</span>
          </div>

          <form className={styles.filters} method="get">
            <label className={styles.searchField}><span>Pesquisar</span><input name="q" defaultValue={q} maxLength={120} placeholder="Título, organização ou localização" /></label>
            <label><span>Tipo de oportunidade</span><select name="tipo" defaultValue={type}><option value="">Todos os tipos</option>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label><span>Estado</span><select name="estado" defaultValue={status}><option value="">Todos os estados</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label><span>Prazo</span><select name="prazo" defaultValue={deadlineFilter}><option value="">Todos os prazos</option><option value="proximo">Encerra nos próximos 7 dias</option><option value="expirado">Prazo ultrapassado</option><option value="sem-prazo">Sem prazo definido</option></select></label>
            <div className={styles.filterActions}><button className="btn primary" type="submit">Aplicar filtros</button>{q || type || status || deadlineFilter ? <Link className="btn" href="/dashboard/admin/oportunidades">Limpar</Link> : null}</div>
          </form>

          {error ? <div className="notice" role="alert">Não foi possível carregar as oportunidades. Verifique as permissões da base de dados e tente novamente.</div> : opportunities?.length ? <>
            <div className={styles.tableMeta}><span>A mostrar <strong>{from + 1}–{from + opportunities.length}</strong> de <strong>{total.toLocaleString("pt-MZ")}</strong></span><span>{pageSize} registos por página</span></div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>Oportunidade</th><th>Tipo / organização</th><th>Prazo</th><th>Estado</th><th>Acção</th></tr></thead>
                <tbody>{opportunities.map((item) => {
                  const expired = item.status === "PUBLISHED" && Boolean(item.closes_at && new Date(item.closes_at).getTime() < now.getTime());
                  const closingSoon = item.status === "PUBLISHED" && Boolean(item.closes_at && new Date(item.closes_at).getTime() >= now.getTime() && new Date(item.closes_at).getTime() <= now.getTime() + 7 * 86400000);
                  const nextStatus = item.status === "DRAFT" ? "PUBLISHED" : item.status === "PUBLISHED" ? "CLOSED" : item.status === "CLOSED" ? "PUBLISHED" : "PUBLISHED";
                  return <tr key={item.id}>
                    <td><div className={styles.opportunityCell}><strong>{item.title}</strong><small>{item.location || "Localização não indicada"} · Registada {dateLabel(item.created_at)}</small><span className={styles.description}>{(item.description || "Sem descrição").slice(0, 145)}{(item.description || "").length > 145 ? "…" : ""}</span>{item.status === "PUBLISHED" ? <Link className={styles.detailLink} href={"/oportunidades/" + item.slug} target="_blank" rel="noreferrer">Ver publicação ↗</Link> : null}</div></td>
                    <td><strong className={styles.typeLabel}>{typeLabels[item.type] || item.type}</strong><small className={styles.organization}>{item.organization || "Organização não indicada"}</small><small className={styles.origin}>{item.partner_account_id ? "Conta de parceiro" : "Conta de utilizador"}</small></td>
                    <td><span className={styles.deadline}>{item.closes_at ? dateLabel(item.closes_at) : "Sem prazo"}</span>{expired ? <small className={styles.deadlineExpired}>Prazo ultrapassado</small> : closingSoon ? <small className={styles.deadlineSoon}>Encerra em breve</small> : null}{item.opens_at ? <small className={styles.opensAt}>Abre: {dateLabel(item.opens_at)}</small> : null}</td>
                    <td><span className={`${styles.status} ${styles[statusClass[item.status] || "draft"]}`}>{statusLabels[item.status] || item.status}</span><small className={styles.updated}>Actualizada {dateLabel(item.updated_at)}</small></td>
                    <td><form action={moderateOpportunity} className={styles.actionForm}><input type="hidden" name="opportunityId" value={item.id}/><label className={styles.srOnly} htmlFor={`status-${item.id}`}>Novo estado para {item.title}</label><select id={`status-${item.id}`} name="status" defaultValue={item.status}><option value="DRAFT">Rascunho</option><option value="PUBLISHED">Publicar</option><option value="CLOSED">Encerrar</option><option value="ARCHIVED">Arquivar</option></select><button className="btn primary" type="submit">Guardar</button></form></td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
            <nav className={styles.pagination} aria-label="Paginação"><span>Página {currentPage} de {pageCount}</span><div>{currentPage > 1 ? <Link className="btn" href={pageHref(currentPage - 1)}>← Anterior</Link> : <span className={styles.disabled}>← Anterior</span>}{currentPage < pageCount ? <Link className="btn" href={pageHref(currentPage + 1)}>Seguinte →</Link> : <span className={styles.disabled}>Seguinte →</span>}</div></nav>
          </> : <div className={styles.empty}><strong>{q || type || status || deadlineFilter ? "Nenhuma oportunidade corresponde aos filtros." : "Ainda não existem oportunidades."}</strong><span>Altere os filtros para consultar outros registos.</span></div>}
        </section>
      </div>
    </main>
  );
}
