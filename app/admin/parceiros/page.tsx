import Link from "next/link";
import { createPartnerAccess, requireSuperAdmin } from "@/lib/auth/partner-access";
import { PartnerAccessLink } from "@/components/partner-access-link";
import styles from "./parceiros.module.css";

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  validation: "O email ou o prazo indicado não é válido. Reveja os campos e tente novamente.",
  forbidden: "Apenas o Super Admin pode criar acessos dedicados de parceiros.",
  create: "Não foi possível criar o acesso. Verifique as permissões e tente novamente.",
};

export default async function PartnerAccessAdmin({ searchParams }: { searchParams: Promise<{ created?: string; access?: string; error?: string; status?: string }> }) {
  await requireSuperAdmin();
  const params = await searchParams;
  const inviteUrl = params.created === "1" && params.access ? params.access : "";
  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const { data: grantsData, error: grantsError } = await supabase.rpc("partner_access_list");
  const grants = (Array.isArray(grantsData) ? grantsData : []) as Array<{
    id: string; email: string; status: string; created_at: string; expires_at: string; accepted_at: string | null;
  }>;
  const selectedStatus = ["ALL", "PENDING", "ACCEPTED", "EXPIRED", "REVOKED"].includes(params.status || "")
    ? (params.status || "ALL") : "ALL";
  const visibleGrants = selectedStatus === "ALL" ? grants : grants.filter((grant) => grant.status === selectedStatus);
  const statusLabels: Record<string, string> = {
    PENDING: "Pendente", ACCEPTED: "Aceite", EXPIRED: "Expirado", REVOKED: "Revogado",
  };
  const statusCounts = {
    PENDING: grants.filter((grant) => grant.status === "PENDING").length,
    ACCEPTED: grants.filter((grant) => grant.status === "ACCEPTED").length,
    EXPIRED: grants.filter((grant) => grant.status === "EXPIRED").length,
    REVOKED: grants.filter((grant) => grant.status === "REVOKED").length,
  };
  const formatDate = (value: string | null) => value
    ? new Intl.DateTimeFormat("pt-MZ", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Maputo" }).format(new Date(value))
    : "—";

  return (
    <main className={`dashboard-main admin-workspace ${styles.page}`}>
      <div className={`dashboard-content ${styles.content}`}>
        <header className={styles.hero}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>Administração global · Parceiros</span>
            <h1>Acessos de parceiros</h1>
            <p>Crie acessos dedicados para organizações parceiras e partilhe um convite seguro com prazo definido.</p>
          </div>
          <div className={styles.heroBadge}><span className={styles.badgeIcon} aria-hidden="true">↗</span><strong>Acesso controlado</strong><small>Convite individual por email</small></div>
          <span className={styles.heroMark} aria-hidden="true">P</span>
        </header>

        <div className={styles.noticeInfo}>
          <span className={styles.noticeIcon} aria-hidden="true">i</span>
          <p><strong>Como funciona</strong> O acesso é criado pelo Super Admin. O parceiro activa a conta através do link e do email autorizado; não pode escolher este perfil no registo público.</p>
        </div>

        {inviteUrl ? (
          <section className={styles.resultPanel} aria-labelledby="created-title">
            <div className={styles.resultIcon} aria-hidden="true">✓</div>
            <div className={styles.resultBody}>
              <span className={styles.kicker}>Convite criado</span>
              <h2 id="created-title">Partilhe o link com o parceiro</h2>
              <p>Copie o endereço e envie-o directamente ao contacto indicado. O link é apresentado apenas nesta confirmação; guarde-o antes de sair.</p>
              <PartnerAccessLink url={inviteUrl} />
              <small className={styles.securityNote}>Por segurança, trate este link como um convite privado. Qualquer pessoa que o receba ainda terá de usar o email autorizado.</small>
            </div>
          </section>
        ) : null}

        {params.error ? <div className={styles.errorNotice} role="alert">{errorMessages[params.error] || "Não foi possível concluir a operação. Tente novamente."}</div> : null}

        <div className={styles.mainGrid}>
          <section className={styles.formPanel} aria-labelledby="new-access-title">
            <div className={styles.sectionHead}>
              <span className={styles.kicker}>Novo convite</span>
              <h2 id="new-access-title">Criar acesso dedicado</h2>
              <p>Defina o email do parceiro e o prazo para activar a conta.</p>
            </div>
            <form action={createPartnerAccess} className={styles.form}>
              <label className={styles.field} htmlFor="partner-email">
                <span>Email do parceiro</span>
                <input id="partner-email" name="email" type="email" placeholder="nome@organizacao.co.mz" autoComplete="email" required />
                <small>O convite só pode ser aceite com este endereço de email.</small>
              </label>
              <label className={styles.field} htmlFor="partner-expiry">
                <span>Validade do convite</span>
                <select id="partner-expiry" name="expiresInDays" defaultValue="7">
                  <option value="1">1 dia</option>
                  <option value="7">7 dias</option>
                  <option value="14">14 dias</option>
                  <option value="30">30 dias</option>
                </select>
              </label>
              <button className={`btn primary ${styles.submit}`} type="submit">Criar acesso de parceiro <span aria-hidden="true">→</span></button>
            </form>
          </section>

          <aside className={styles.stepsPanel} aria-label="Etapas do acesso">
            <span className={styles.kicker}>Processo de activação</span>
            <h2>Do convite ao acesso</h2>
            <ol className={styles.steps}>
              <li><span>01</span><div><strong>Criar convite</strong><p>Indique o email e escolha a validade.</p></div></li>
              <li><span>02</span><div><strong>Partilhar o link</strong><p>Envie o link gerado ao contacto autorizado.</p></div></li>
              <li><span>03</span><div><strong>Activar a conta</strong><p>O parceiro define o nome e a palavra-passe para concluir o registo.</p></div></li>
            </ol>
            <div className={styles.securityCallout}><strong>Nota de segurança</strong><p>O link expira automaticamente. Se o prazo terminar, será necessário criar um novo convite.</p></div>
          </aside>
        </div>

        <section className={styles.invitesPanel} aria-labelledby="invites-title">
          <div className={styles.invitesHeader}>
            <div>
              <span className={styles.kicker}>Acompanhamento</span>
              <h2 id="invites-title">Convites emitidos</h2>
              <p>Consulte o estado e a validade dos acessos criados. Os links e hashes de convite não são apresentados nesta lista.</p>
            </div>
            <form method="get" className={styles.statusFilter}>
              <label htmlFor="invite-status">Estado</label>
              <select id="invite-status" name="status" defaultValue={selectedStatus}>
                <option value="ALL">Todos</option>
                <option value="PENDING">Pendentes</option>
                <option value="ACCEPTED">Aceites</option>
                <option value="EXPIRED">Expirados</option>
                <option value="REVOKED">Revogados</option>
              </select>
              <button type="submit">Filtrar</button>
            </form>
          </div>
          <div className={styles.inviteStats}>
            <div><span>Pendentes</span><strong>{statusCounts.PENDING}</strong></div>
            <div><span>Aceites</span><strong>{statusCounts.ACCEPTED}</strong></div>
            <div><span>Expirados</span><strong>{statusCounts.EXPIRED}</strong></div>
            <div><span>Revogados</span><strong>{statusCounts.REVOKED}</strong></div>
          </div>
          {grantsError ? (
            <div className={styles.emptyState} role="alert">Não foi possível carregar a lista de convites. Confirme se a migração de acesso administrativo foi aplicada à base de dados.</div>
          ) : visibleGrants.length === 0 ? (
            <div className={styles.emptyState}>Não existem convites para este filtro.</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.invitesTable}>
                <thead><tr><th>Email</th><th>Estado</th><th>Criado em</th><th>Validade</th><th>Aceite em</th></tr></thead>
                <tbody>
                  {visibleGrants.map((grant) => (
                    <tr key={grant.id}>
                      <td data-label="Email"><strong>{grant.email}</strong></td>
                      <td data-label="Estado"><span className={`${styles.statusPill} ${styles[`status_${grant.status}`] || ""}`}>{statusLabels[grant.status] || grant.status}</span></td>
                      <td data-label="Criado em">{formatDate(grant.created_at)}</td>
                      <td data-label="Validade">{formatDate(grant.expires_at)}</td>
                      <td data-label="Aceite em">{formatDate(grant.accepted_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className={styles.tableNote}>São apresentados os 200 convites mais recentes. Convites pendentes cuja validade terminou aparecem como expirados, sem alteração automática do registo.</p>
        </section>

        <footer className={styles.pageFooter}><Link href="/dashboard/admin">← Voltar à administração da plataforma</Link><span>Gestão de acessos · MozEmpresas</span></footer>
      </div>
    </main>
  );
}
