export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PartnerPage, PartnerSection, PartnerMetric, PartnerEmpty } from "@/components/partner-workspace";
import { PartnerManagerForm } from "@/components/partner-actions";

export default async function PartnerAccountPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: profileRows, error: profileError },
    { data: members, error: membersError },
    { data: contextRows, error: contextError },
  ] = await Promise.all([
    supabase.rpc("partner_account_profile"),
    supabase.rpc("partner_account_members_list"),
    supabase.rpc("partner_account_context"),
  ]);

  const account = Array.isArray(profileRows) ? profileRows[0] : null;
  const context = Array.isArray(contextRows) ? contextRows[0] : null;
  const rows = members ?? [];
  const activeMembers = rows.filter((member: any) => member.active === true).length;
  const isOwner = context?.member_role === "owner";
  const hasLoadError = !!profileError || !!membersError || !!contextError;
  const name = account?.account_name || user.email?.split("@")[0] || "Parceiro";

  return (
    <PartnerPage eyebrow="Organização · Conta" title="Conta e gestores" description="Consulte os dados da organização e os acessos associados à conta. As alterações de acesso são reservadas ao administrador da parceria." action={{ href: "/parceiro", label: "Voltar à visão geral" }}>
      {hasLoadError && <div className="notice" role="alert">Não foi possível carregar todos os dados da conta. Os campos indisponíveis não devem ser interpretados como vazios ou activos. Actualize a página ou contacte o suporte.</div>}
      <section className="partner-metrics-grid">
        <PartnerMetric label="Estado" value={profileError || !account ? "Indisponível" : account.account_status || "Por confirmar"} detail="Estado da conta" featured />
        <PartnerMetric label="Gestores activos" value={membersError ? "—" : activeMembers} detail="Acessos actualmente activos" />
        <PartnerMetric label="Código" value={profileError ? "—" : account?.partner_code || "—"} detail="Identificador da parceria" />
        <PartnerMetric label="Contacto" value={profileError ? "—" : account?.contact_email ? "Registado" : "Por indicar"} detail={profileError ? "Dados indisponíveis" : account?.contact_email || "Sem contacto registado"} />
      </section>

      <PartnerSection eyebrow="Entidade" title="Dados da parceria" description="Informação actualmente registada para a organização.">
        <div className="partner-detail-grid">
          <div><span>Estado</span><strong>{profileError ? "Indisponível" : account?.account_status || "Por confirmar"}</strong></div>
          <div><span>Código de parceiro</span><strong>{profileError ? "Indisponível" : account?.partner_code || "A atribuir"}</strong></div>
          <div><span>Email</span><strong>{profileError ? "Indisponível" : account?.contact_email || user.email || "—"}</strong></div>
          <div><span>Website</span><strong>{profileError ? "Indisponível" : account?.website || "—"}</strong></div>
        </div>
      </PartnerSection>

      <PartnerSection eyebrow="Segurança" title="Gestores autorizados" description="Os membros activos partilham o acesso à mesma organização, de acordo com o seu papel.">
        {membersError ? <PartnerEmpty title="Não foi possível carregar os gestores" text="A lista de acessos está temporariamente indisponível. Tente novamente." /> : rows.length ? <div className="partner-record-list">{rows.map((member: any) => <div key={member.member_id}><div><strong>{member.full_name || member.email || "Gestor"}</strong><span>{member.email || "—"} · {member.active === true ? "Acesso activo" : "Acesso suspenso"}</span></div><b>{member.member_role === "owner" ? "Administrador" : member.member_role === "manager" ? "Gestor" : member.member_role === "analyst" ? "Analista" : "Visualizador"}</b></div>)}</div> : <PartnerEmpty title="Não existem gestores registados" text="Contacte o suporte se considerar que falta um acesso à organização." />}
      </PartnerSection>

      <PartnerSection eyebrow="Equipa" title="Acessos à organização" description="Neste momento, esta operação associa utilizadores que já tenham uma conta de parceiro activa. Ainda não envia convites para novos utilizadores.">
        {contextError ? <PartnerEmpty title="Não foi possível confirmar o seu papel" text="Por segurança, a gestão de acessos fica indisponível até ser possível validar as permissões da sua conta." /> : isOwner ? <PartnerManagerForm /> : <PartnerEmpty title="Gestão reservada ao administrador da parceria" text="O seu papel permite consultar os acessos, mas não adicionar ou alterar gestores." />}
      </PartnerSection>
    </PartnerPage>
  );
}
