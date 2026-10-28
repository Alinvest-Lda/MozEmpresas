export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getSuperAdminContext } from "@/lib/auth/super-admin";
import { replySupportAsStaff } from "@/lib/support/admin-actions";
import styles from "./suporte.module.css";

const areas = ["", "Técnico", "Comercial", "Conta e acessos", "Pagamentos e créditos", "Publicidade", "Serviços MozEmpresas"];
const statuses = ["", "OPEN", "IN_PROGRESS", "WAITING_USER", "RESOLVED", "CLOSED"];
const statusLabels: Record<string, string> = { OPEN: "Aberto", IN_PROGRESS: "Em atendimento", WAITING_USER: "Aguarda utilizador", RESOLVED: "Resolvido", CLOSED: "Fechado" };
const priorityLabels: Record<string, string> = { LOW: "Baixa", NORMAL: "Normal", MEDIUM: "Média", HIGH: "Alta", URGENT: "Urgente" };
type SearchParams = Promise<{ area?: string; status?: string; business?: string; subject?: string; result?: string }>;

export default async function AdminSupport({ searchParams }: { searchParams?: SearchParams }) {
  const p = searchParams ? await searchParams : {};
  const result = p.result === "success" || p.result === "error" ? p.result : "";
  const area = areas.includes(p.area ?? "") ? p.area ?? "" : "";
  const status = statuses.includes(p.status ?? "") ? p.status ?? "" : "";
  const subject = (p.subject ?? "").trim().slice(0, 100);
  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) return null;

  let query = supabase.from("support_tickets").select("id,user_id,business_id,area,subject,status,priority,created_at,updated_at").order("updated_at", { ascending: false }).limit(100);
  if (area) query = query.eq("area", area);
  if (status) query = query.eq("status", status);
  if (p.business) query = query.eq("business_id", p.business);
  if (subject) query = query.ilike("subject", "%" + subject.replace(/[%_,]/g, " ") + "%");
  const { data: tickets, error } = await query;
  const rows = tickets ?? [];
  const businessIds = [...new Set(rows.map(t => t.business_id).filter((id): id is string => Boolean(id)))];
  const userIds = [...new Set(rows.map(t => t.user_id))];
  const [{ data: businesses }, { data: profiles }] = await Promise.all([
    businessIds.length ? supabase.from("businesses").select("id,name").in("id", businessIds) : Promise.resolve({ data: [] }),
    userIds.length ? supabase.from("profiles").select("id,full_name").in("id", userIds) : Promise.resolve({ data: [] }),
  ]);
  const ids = rows.map(t => t.id);
  const { data: messages } = ids.length ? await supabase.from("support_messages").select("id,ticket_id,sender_role,body,created_at").in("ticket_id", ids).order("created_at", { ascending: true }) : { data: [] };
  const openCount = rows.filter(t => t.status === "OPEN").length;
  const activeCount = rows.filter(t => t.status === "IN_PROGRESS").length;
  const waitingCount = rows.filter(t => t.status === "WAITING_USER").length;
  const urgentCount = rows.filter(t => ["URGENT", "HIGH"].includes(String(t.priority ?? "").toUpperCase()) && !["RESOLVED", "CLOSED"].includes(t.status ?? "")).length;
  const businessOptions = businesses ?? [];

  return (
    <main className={`dashboard-main admin-workspace ${styles.page}`}>
      <div className={`dashboard-content ${styles.content}`}>
        <header className={styles.hero}>
          <div className={styles.heroCopy}><span className={styles.eyebrow}>Administração global</span><h1>Central de suporte</h1><p>Organize os pedidos de assistência, acompanhe o histórico de conversas e responda aos utilizadores num único espaço.</p></div>
          <div className={styles.heroSummary}><span>Registos carregados</span><strong>{rows.length}</strong><small>Máximo de 100 atendimentos por consulta</small></div>
          <span className={styles.heroMark} aria-hidden="true">?</span>
        </header>

        {result ? <div className={`${styles.notice} ${result === "error" ? styles.noticeError : ""}`} role={result === "error" ? "alert" : "status"}>{result === "success" ? "Resposta enviada e atendimento actualizado." : "Não foi possível enviar a resposta. Confirme o histórico antes de tentar novamente."}</div> : null}

        <section className={styles.metrics} aria-label="Resumo da fila">
          <article><span>Em aberto</span><strong>{openCount}</strong><small>Precisam de triagem</small></article>
          <article><span>Em atendimento</span><strong>{activeCount}</strong><small>Em acompanhamento pelo backoffice</small></article>
          <article><span>A aguardar utilizador</span><strong>{waitingCount}</strong><small>Resposta externa pendente</small></article>
          <article><span>Prioridade alta</span><strong>{urgentCount}</strong><small>Alta ou urgente, não resolvidos</small></article>
        </section>

        <section className={styles.panel} aria-labelledby="support-filters-title">
          <div className={styles.panelHead}><div><span className={styles.kicker}>Pesquisa e triagem</span><h2 id="support-filters-title">Filtrar atendimentos</h2></div><span className={styles.muted}>Localize um pedido por área, estado, empresa ou assunto.</span></div>
          <form className={styles.filters} method="get">
            <label>Área<select name="area" defaultValue={area}>{areas.map(a => <option key={a} value={a}>{a || "Todas as áreas"}</option>)}</select></label>
            <label>Estado<select name="status" defaultValue={status}>{statuses.map(s => <option key={s} value={s}>{s ? statusLabels[s] : "Todos os estados"}</option>)}</select></label>
            <label>Empresa<select name="business" defaultValue={p.business || ""}><option value="">Todas as empresas</option>{businessOptions.map(b => <option value={b.id} key={b.id}>{b.name}</option>)}</select></label>
            <label>Assunto<input name="subject" defaultValue={subject} maxLength={100} placeholder="Pesquisar por assunto" /></label>
            <div className={styles.filterActions}><button className="btn primary" type="submit">Aplicar filtros</button><a className={styles.clear} href="/dashboard/admin/suporte">Limpar</a></div>
          </form>
        </section>

        <section className={styles.queue} aria-labelledby="support-queue-title">
          <div className={styles.queueHead}><div><span className={styles.kicker}>Fila operacional</span><h2 id="support-queue-title">Atendimentos</h2><p>Conversas ordenadas pela actualização mais recente.</p></div><strong>{rows.length} <span>registos</span></strong></div>
          {error ? <div className={styles.empty}><strong>Não foi possível carregar a fila.</strong><p>Verifique a ligação à base de dados e tente novamente.</p></div> :
          rows.length ? <div className={styles.ticketList}>{rows.map(t => {
            const business = businessOptions.find(x => x.id === t.business_id)?.name || "Sem empresa associada";
            const profile = (profiles ?? []).find(x => x.id === t.user_id)?.full_name || "Utilizador";
            const thread = (messages ?? []).filter(m => m.ticket_id === t.id);
            const statusKey = String(t.status ?? "");
            const priorityKey = String(t.priority ?? "NORMAL").toUpperCase();
            return <article className={styles.ticket} key={t.id}>
              <div className={styles.ticketTop}>
                <div className={styles.ticketIdentity}><div className={styles.ticketTitleLine}><span className={styles.areaTag}>{t.area || "Geral"}</span><span className={styles.ticketDate}>Actualizado {new Date(t.updated_at).toLocaleString("pt-MZ", { dateStyle: "medium", timeStyle: "short" })}</span></div><h3>{t.subject}</h3><p>{profile} <span>·</span> {business}</p></div>
                <div className={styles.badges}><span className={`${styles.status} ${styles["status" + statusKey] || ""}`}>{statusLabels[statusKey] || statusKey || "Sem estado"}</span><span className={`${styles.priority} ${["HIGH", "URGENT"].includes(priorityKey) ? styles.priorityHigh : ""}`}>{priorityLabels[priorityKey] || priorityKey}</span></div>
              </div>
              <details className={styles.conversation} open={thread.length > 0}><summary>{thread.length} {thread.length === 1 ? "mensagem" : "mensagens"} no histórico <span>Ver conversa</span></summary><div className={styles.thread}>{thread.length ? thread.map(m => { const isUser = m.sender_role === "USER"; return <div className={`${styles.message} ${isUser ? styles.messageUser : styles.messageStaff}`} key={m.id}><div className={styles.messageMeta}><strong>{isUser ? "Utilizador" : "Backoffice"}</strong><time>{new Date(m.created_at).toLocaleString("pt-MZ", { dateStyle: "medium", timeStyle: "short" })}</time></div><p>{m.body}</p></div>; }) : <p className={styles.noMessages}>Ainda não existem mensagens neste atendimento.</p>}</div></details>
              <form action={async (formData) => { "use server"; const outcome = await replySupportAsStaff(formData); redirect("/dashboard/admin/suporte?result=" + ("error" in outcome ? "error" : "success")); }} className={styles.reply}>
                <input type="hidden" name="ticket_id" value={t.id} /><label htmlFor={`reply-${t.id}`}>Resposta do backoffice</label><div className={styles.replyRow}><textarea id={`reply-${t.id}`} name="body" placeholder="Escreva uma resposta clara para o utilizador…" required maxLength={5000} rows={2} /><button className="btn primary" type="submit">Enviar resposta</button></div>
              </form>
            </article>;
          })}</div> : <div className={styles.empty}><strong>Nenhum atendimento encontrado</strong><p>Experimente remover alguns filtros ou pesquisar por outro assunto.</p></div>}
        </section>
      </div>
    </main>
  );
}
