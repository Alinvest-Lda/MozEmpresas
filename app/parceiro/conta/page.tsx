export const dynamic = "force-dynamic";

import { requirePartnerAccount } from "@/lib/auth/access";
import { PartnerPage, PartnerSection, PartnerMetric, PartnerEmpty } from "@/components/partner-workspace";

export default async function PartnerAccountPage() {
  const { supabase, user } = await requirePartnerAccount();

  const [{ data: profileRows, error: profileError }, { data: contextRows, error: contextError }] =
    await Promise.all([
      supabase.rpc("partner_account_profile"),
      supabase.rpc("partner_account_context"),
    ]);

  const account = Array.isArray(profileRows) ? profileRows[0] : null;
  const context = Array.isArray(contextRows) ? contextRows[0] : null;
  const hasLoadError = !!profileError || !!contextError;
  const accountName = account?.account_name || "Conta Parceira";
  const accountStatus = account?.account_status || context?.account_status || "Por confirmar";
  const email = user.email || "Email não disponível";

  return (
    <PartnerPage
      eyebrow="Organização · Conta"
      title="Conta e acesso"
      description="Consulte a entidade Parceira e o acesso individual autorizado. Cada organização tem um único utilizador activo."
      action={{ href: "/parceiro", label: "Voltar à visão geral" }}
    >
      {hasLoadError && (
        <div className="notice" role="alert">
          Não foi possível carregar todos os dados da conta. Os campos indisponíveis não devem ser interpretados como vazios. Actualize a página ou contacte o suporte.
        </div>
      )}
      <section className="partner-metrics-grid">
        <PartnerMetric label="Estado da conta" value={hasLoadError ? "Indisponível" : accountStatus} detail="Estado da organização" featured />
        <PartnerMetric label="Acesso" value={contextError ? "Indisponível" : context?.member_role === "owner" ? "Responsável único" : "Não confirmado"} detail="Membership activo verificado" />
        <PartnerMetric label="Código" value={profileError ? "—" : account?.partner_code || "—"} detail="Identificador da parceria" />
        <PartnerMetric label="Contacto" value={profileError ? "—" : account?.contact_email ? "Registado" : "Por indicar"} detail={profileError ? "Dados indisponíveis" : account?.contact_email || "Sem contacto registado"} />
      </section>

      <PartnerSection eyebrow="Entidade" title="Dados da parceria" description="Informação registada para a organização Parceira.">
        <div className="partner-detail-grid">
          <div><span>Organização</span><strong>{profileError ? "Indisponível" : accountName}</strong></div>
          <div><span>Estado</span><strong>{profileError ? "Indisponível" : accountStatus}</strong></div>
          <div><span>Código de parceiro</span><strong>{profileError ? "Indisponível" : account?.partner_code || "A atribuir"}</strong></div>
          <div><span>Email institucional</span><strong>{profileError ? "Indisponível" : account?.contact_email || email}</strong></div>
          <div><span>Website</span><strong>{profileError ? "Indisponível" : account?.website || "—"}</strong></div>
          <div><span>Contacto telefónico</span><strong>{profileError ? "Indisponível" : account?.contact_phone || "—"}</strong></div>
        </div>
      </PartnerSection>

      <PartnerSection eyebrow="Segurança" title="Utilizador autorizado" description="Acesso individual e não partilhável. A gestão de substituição é feita pela administração da plataforma.">
        {contextError ? (
          <PartnerEmpty title="Não foi possível confirmar o acesso" text="Por segurança, o estado do acesso não está disponível. Actualize a página ou contacte o suporte." />
        ) : context?.member_role === "owner" ? (
          <div className="partner-detail-grid">
            <div><span>Utilizador</span><strong>{email}</strong></div>
            <div><span>Tipo de acesso</span><strong>Responsável único (Owner)</strong></div>
            <div><span>Estado</span><strong>Activo</strong></div>
            <div><span>Regra da organização</span><strong>Um utilizador activo</strong></div>
          </div>
        ) : (
          <PartnerEmpty title="Acesso não confirmado" text="A conta não apresenta um responsável único activo. Contacte o suporte para regularizar o acesso." />
        )}
      </PartnerSection>
    </PartnerPage>
  );
}
