export const dynamic = "force-dynamic";

import { listPartnerDocuments } from "@/lib/partner/documents";
import { PartnerPage, PartnerSection, PartnerEmpty } from "@/components/partner-workspace";
import PartnerDocumentsList from "@/components/partner-documents-list";

export default async function PartnerDocumentsPage() {
  const result = await listPartnerDocuments();
  return (
    <PartnerPage eyebrow="Organização · Documentos" title="Documentos institucionais"
      description="Consulte os contratos, relatórios e outros documentos disponibilizados pela administração à sua organização."
      action={{ href: "/parceiro", label: "Voltar à visão geral" }}>
      {result.error ? (
        <PartnerEmpty title="Documentos indisponíveis" text="Não foi possível confirmar o acesso ou carregar o arquivo documental. Actualize a página ou contacte o suporte." />
      ) : result.documents.length === 0 ? (
        <PartnerEmpty title="Ainda não existem documentos disponíveis" text="Quando forem disponibilizados documentos à sua organização, aparecerão aqui." />
      ) : (
        <PartnerSection eyebrow="Arquivo" title="Documentos disponíveis" description="Os downloads são temporários e protegidos.">
          <PartnerDocumentsList documents={result.documents} />
        </PartnerSection>
      )}
    </PartnerPage>
  );
}
