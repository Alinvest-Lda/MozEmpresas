import { createPartnerAccess, requireSuperAdmin } from "@/lib/auth/partner-access";
import { PartnerAccessLink } from "@/components/partner-access-link";
import { PartnerAccessSubmitButton } from "@/components/partner-access-submit-button";
import styles from "./parceiros.module.css";
import { Input, Select } from "@/components/ui";
import { linkPartnerBusiness } from "@/lib/admin/partner-billing-actions";
import { revokePartnerPortalAccess } from "@/lib/admin/partner-access-actions";

export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  validation: "O email ou o prazo indicado não é válido. Reveja os campos e tente novamente.",
  forbidden: "Apenas o Super Admin pode criar acessos dedicados de parceiros.",
  create: "Não foi possível criar o acesso. Confirme se a conta ainda não tem utilizador activo nem convite pendente.",
  "portal-disabled": "A conta seleccionada não está activa ou não permite acesso ao portal.",
};

export default async function PartnerAccessAdmin({ searchParams }: { searchParams: Promise<{ created?: string; access?: string; error?: string; status?: string; billing?: string }> }) {
  await requireSuperAdmin();
  const params = await searchParams;
  const inviteUrl = params.created === "1" && params.access ? params.access : "";
  const supabase = await (await import("@/lib/supabase/server")).createClient();
  const [{data: grantsData,error: grantsError},{data: memberAccessData,error: memberAccessError}] = await Promise.all([
    supabase.rpc("partner_access_list"),
    supabase.rpc("admin_partner_access_members_list"),
  ]);
  const activePartnerAccesses = Array.isArray(memberAccessData) ? memberAccessData : [];
  const [{data: partnerAccounts},{data: businesses},{data: activePartnerMembers}] = await Promise.all([
    supabase.from("partner_accounts").select("id,name,status,business_id,portal_enabled").order("name").limit(200),
    supabase.from("businesses").select("id,name").is("archived_at",null).order("name").limit(500),
    supabase.from("partner_account_members").select("account_id").eq("active",true).limit(500),
  ]);
  const assignedPartnerAccountIds = new Set((activePartnerMembers ?? []).map((member:any)=>member.account_id));
  const eligiblePartnerAccounts = (partnerAccounts ?? []).filter((account:any)=>
    account.portal_enabled && account.status==="ACTIVE" && !assignedPartnerAccountIds.has(account.id)
  );
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
            <span className={styles.eyebrow}>Módulo de administração · Parceiros</span>
            <h1>Acessos de parceiros</h1>
            <p>Crie um acesso individual por organização parceira e partilhe um convite seguro com prazo definido.</p>
          </div>
          <div className={styles.heroBadge}><span className={styles.badgeIcon} aria-hidden="true">↗</span><strong>Acesso controlado</strong><small>Convite individual por email</small></div>
          <a className={styles.heroBadge} href="/dashboard/admin/parceiros/gestao"><strong>Gestão institucional</strong><small>Contratos · execução · facturação · relatórios →</small></a>
          <span className={styles.heroMark} aria-hidden="true">P</span>
        </header>

        <div className={styles.noticeInfo}>
          <span className={styles.noticeIcon} aria-hidden="true">i</span>
          <p><strong>Como funciona</strong> Cada organização parceira tem um único utilizador activo. O acesso é criado pelo Super Admin e activado apenas pelo email autorizado; não existe convite de gestores adicionais.</p>
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
        {params.access ? <div className={params.access==="revoked" ? styles.noticeInfo : styles.errorNotice} role={params.access==="revoked"?"status":"alert"}>{accessMessages[params.access] || "Não foi possível concluir a operação de acesso."}</div> : null}
        {params.billing ? <div className={params.billing==="success" ? styles.noticeInfo : styles.errorNotice} role={params.billing==="success"?"status":"alert"}>{params.billing==="success"?"Associação empresarial actualizada. A carteira de créditos dessa empresa poderá ser usada para campanhas da conta Parceiro.":params.billing==="BUSINESS_ALREADY_LINKED_TO_PARTNER"?"Esta empresa já está associada a outra conta Parceiro.":params.billing==="BUSINESS_NOT_AVAILABLE"?"A empresa seleccionada não está disponível.":params.billing==="invalid"?"Selecção inválida.": "Não foi possível actualizar a associação empresarial."}</div> : null}

        <div className={styles.mainGrid}>
          <section className={styles.formPanel} aria-labelledby="new-access-title">
            <div className={styles.sectionHead}>
              <span className={styles.kicker}>Novo convite</span>
              <h2 id="new-access-title">Criar acesso dedicado</h2>
              <p>Defina o email do utilizador único da organização e o prazo para activar a conta.</p>
            </div>
            <form action={createPartnerAccess} className={styles.form}>
              <label className={styles.field} htmlFor="partner-account">
                <span>Atribuir a uma entidade existente (opcional)</span>
                <Select id="partner-account" name="accountId" defaultValue="">
                  <option value="">Criar uma nova conta Parceiro de auto-serviço</option>
                  {eligiblePartnerAccounts.map((account:any)=><option key={account.id} value={account.id}>{account.name}</option>)}
                </Select>
                <small>Só são elegíveis entidades activas com portal ligado e sem utilizador activo. Cada conta aceita um único utilizador; contas já atribuídas não aparecem.</small>
              </label>
              <label className={styles.field} htmlFor="partner-email">
                <span>Email do parceiro</span>
                <Input id="partner-email" name="email" type="email" placeholder="nome@organizacao.co.mz" autoComplete="email" required />
                <small>O convite só pode ser aceite com este endereço de email. O utilizador ficará como responsável único pelo acesso da organização.</small>
              </label>
              <label className={styles.field} htmlFor="partner-expiry">
                <span>Validade do convite</span>
                <Select id="partner-expiry" name="expiresInDays" defaultValue="7">
                  <option value="1">1 dia</option>
                  <option value="7">7 dias</option>
                  <option value="14">14 dias</option>
                  <option value="30">30 dias</option>
                </Select>
              </label>
              <PartnerAccessSubmitButton />
            </form>
          </section>

          <aside className={styles.stepsPanel} aria-label="Etapas do acesso">
            <span className={styles.kicker}>Processo de activação</span>
            <h2>Activação do acesso único</h2>
            <ol className={styles.steps}>
              <li><span>01</span><div><strong>Criar convite</strong><p>Seleccione a organização, indique o email e escolha a validade.</p></div></li>
              <li><span>02</span><div><strong>Partilhar o link</strong><p>Envie o link gerado ao contacto autorizado.</p></div></li>
              <li><span>03</span><div><strong>Activar a conta</strong><p>O utilizador autorizado define o nome e a palavra-passe; a conta fica associada a uma única pessoa.</p></div></li>
            </ol>
            <div className={styles.securityCallout}><strong>Nota de segurança</strong><p>O link expira automaticamente. Se o prazo terminar, será necessário criar um novo convite.</p></div>
          </aside>
        </div>

        <section className={styles.invitesPanel} aria-labelledby="partner-billing-title">
          <div className={styles.invitesHeader}>
            <div>
              <span className={styles.kicker}>Facturação e carteira</span>
              <h2 id="partner-billing-title">Associação empresarial das contas Parceiro</h2>
              <p>Associe uma conta Parceiro a uma empresa existente apenas quando a relação jurídica/comercial estiver confirmada. Esta associação permite utilizar a carteira de créditos da empresa; não transfere a titularidade da conta nem mistura os registos financeiros: a factura publicitária continua emitida à conta Parceiro.</p>
            </div>
          </div>
          {!partnerAccounts?.length ? <div className={styles.emptyState}>Ainda não existem contas Parceiro registadas.</div> : <div className={styles.tableWrap}>
            <table className={styles.invitesTable}>
              <thead><tr><th>Conta Parceiro</th><th>Estado</th><th>Empresa associada / carteira</th><th>Acção</th></tr></thead>
              <tbody>
                {(partnerAccounts??[]).map((account:any)=><tr key={account.id}>
                  <td data-label="Conta Parceiro"><strong>{account.name}</strong></td>
                  <td data-label="Estado">{account.status}</td>
                  <td data-label="Empresa associada">
                    <form action={linkPartnerBusiness} className={styles.statusFilter}>
                      <input type="hidden" name="account_id" value={account.id}/>
                      <Select name="business_id" defaultValue={account.business_id||""}>
                        <option value="">Sem associação (M-Pesa)</option>
                        {(businesses??[]).map((business:any)=><option key={business.id} value={business.id}>{business.name}</option>)}
                      </Select>
                      <button type="submit">Guardar</button>
                    </form>
                  </td>
                  <td data-label="Carteira">{account.business_id?"Créditos elegíveis após verificação de saldo":"Apenas M-Pesa"}</td>
                </tr>)}
              </tbody>
            </table>
          </div>}
          <p className={styles.tableNote}>A associação é única por empresa. O Super Admin deve confirmar previamente que a conta Parceiro representa a mesma entidade empresarial. A cobrança por M-Pesa continua disponível sem associação.</p>
        </section>

        <section className={styles.invitesPanel} aria-labelledby="active-access-title">
          <div className={styles.invitesHeader}>
            <div>
              <span className={styles.kicker}>Acesso organizacional</span>
              <h2 id="active-access-title">Utilizadores activos das organizações Parceiro</h2>
              <p>Existe um único utilizador activo por organização. Quando for necessário substituir o responsável, revogue primeiro o acesso actual; depois poderá emitir um novo convite para a mesma conta. A operação fica registada no histórico institucional.</p>
            </div>
          </div>
          {memberAccessError ? (
            <div className={styles.emptyState} role="alert">Não foi possível carregar os acessos activos. A função administrativa de listagem precisa de estar disponível.</div>
          ) : activePartnerAccesses.length === 0 ? (
            <div className={styles.emptyState}>Não existem utilizadores activos associados a contas Parceiro.</div>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.invitesTable}>
                <thead><tr><th>Organização</th><th>Utilizador</th><th>Email</th><th>Desde</th><th>Substituição do acesso</th></tr></thead>
                <tbody>
                  {activePartnerAccesses.map((member:any)=>(
                    <tr key={member.member_id}>
                      <td data-label="Organização"><strong>{member.account_name}</strong></td>
                      <td data-label="Utilizador">{member.full_name || "—"}</td>
                      <td data-label="Email">{member.email}</td>
                      <td data-label="Desde">{formatDate(member.created_at)}</td>
                      <td data-label="Substituição">
                        <form action={revokePartnerPortalAccess} className={styles.statusFilter}>
                          <input type="hidden" name="memberId" value={member.member_id}/>
                          <Input name="reason" placeholder="Motivo da revogação (mín. 8 caracteres)" required minLength={8} maxLength={500}/>
                          <button type="submit">Revogar acesso</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className={styles.tableNote}>A revogação desactiva a membership, não apaga a conta, os dados nem o histórico. O novo convite só deve ser emitido depois de confirmada a substituição do responsável.</p>
        </section>

        <section className={styles.invitesPanel} aria-labelledby="invites-title">
          <div className={styles.invitesHeader}>
            <div>
              <span className={styles.kicker}>Acompanhamento</span>
              <h2 id="invites-title">Convites emitidos</h2>
              <p>Consulte o estado e a validade dos acessos criados. Os links e hashes de convite não são apresentados nesta lista. Cada convite corresponde a um único acesso organizacional.</p>
            </div>
            <form method="get" className={styles.statusFilter}>
              <label htmlFor="invite-status">Estado</label>
              <Select id="invite-status" name="status" defaultValue={selectedStatus}>
                <option value="ALL">Todos</option>
                <option value="PENDING">Pendentes</option>
                <option value="ACCEPTED">Aceites</option>
                <option value="EXPIRED">Expirados</option>
                <option value="REVOKED">Revogados</option>
              </Select>
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

      </div>
    </main>
  );
}
