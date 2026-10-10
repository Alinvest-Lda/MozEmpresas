export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PartnerPage, PartnerSection, PartnerMetric } from "@/components/partner-workspace";
import { changeOpportunityStatus } from "@/lib/opportunities/partner-actions";

const labels: Record<string, string> = {
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
  CALL: "Chamada · anterior",
  EVENT: "Evento · anterior",
  BUSINESS: "Negócio · anterior",
  OTHER: "Outro · anterior",
};

const statusLabel = (status: string) =>
  status === "PUBLISHED" ? "Publicada" :
  status === "DRAFT" ? "Rascunho" :
  status === "CLOSED" ? "Encerrada" :
  status === "ARCHIVED" ? "Arquivada" : status;

export default async function PartnerOpportunitiesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("opportunities")
    .select("id,title,slug,type,organization,location,closes_at,status,created_at")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = data ?? [];
  const published = rows.filter((row: any) => row.status === "PUBLISHED").length;
  const drafts = rows.filter((row: any) => row.status === "DRAFT").length;
  const closed = rows.filter((row: any) => ["CLOSED", "ARCHIVED"].includes(row.status)).length;

  return (
    <PartnerPage
      eyebrow="Publicar · Oportunidades"
      title="As suas publicações"
      description="Um espaço de gestão: publique, acompanhe prazos e consulte o histórico das oportunidades abertas pela sua organização."
      action={{ href: "/parceiro/oportunidades/nova", label: "Nova oportunidade" }}
    >
      <div className="partner-pub-toolbar">
        <Link className="btn" href="/parceiro/oportunidades/candidaturas">Ver candidaturas recebidas →</Link>
      </div>

      <section className="partner-metrics-grid">
        <PartnerMetric label="Publicadas" value={published} detail="Actualmente visíveis" featured />
        <PartnerMetric label="Rascunhos" value={drafts} detail="Ainda por publicar" />
        <PartnerMetric label="Encerradas" value={closed} detail="No histórico" />
        <PartnerMetric label="Total" value={rows.length} detail="Registos" />
      </section>

      <PartnerSection
        eyebrow="Gestão operacional"
        title="Todas as publicações"
        description="Consulte o que está no ar, o que precisa de trabalho e o que já terminou."
      >
        {rows.length > 0 ? (
          <>
            <div className="partner-pub-toolbar">
              <div className="partner-pub-filter">
                <span className="active">Todas · {rows.length}</span>
                <span>Publicadas · {published}</span>
                <span>Rascunhos · {drafts}</span>
                <span>Encerradas · {closed}</span>
              </div>
              <span className="partner-pub-sort">Mais recentes primeiro</span>
            </div>

            <div className="partner-pub-table">
              <div className="partner-pub-table-head">
                <span>Oportunidade</span>
                <span>Tipo</span>
                <span>Prazo</span>
                <span>Estado</span>
                <span>Acções</span>
              </div>

              {rows.map((row: any) => (
                <div key={row.id} className="partner-pub-row">
                  <div className="partner-pub-title">
                    <span>{labels[row.type] || row.type || "Oportunidade"}</span>
                    <strong>
                      <Link href={row.status === "PUBLISHED" ? "/oportunidades/" + row.slug : "/parceiro/oportunidades/nova?editar=" + row.id}>
                        {row.title}
                      </Link>
                    </strong>
                    <small>{row.organization || "A sua entidade"} · {row.location || "Localização não indicada"}</small>
                  </div>

                  <div className="partner-pub-cell">{labels[row.type] || row.type || "—"}</div>
                  <div className="partner-pub-cell">
                    {row.closes_at ? new Date(row.closes_at).toLocaleDateString("pt-MZ") : "Sem prazo"}
                  </div>
                  <div>
                    <span className={"partner-pub-status " + (row.status === "PUBLISHED" ? "published" : row.status === "DRAFT" ? "draft" : "closed")}>
                      {statusLabel(row.status)}
                    </span>
                  </div>

                  <div className="partner-pub-row-actions">
                    <Link className="partner-pub-action" href={"/parceiro/oportunidades/nova?editar=" + row.id}>Editar →</Link>
                    <form action={changeOpportunityStatus}>
                      <input type="hidden" name="opportunity_id" value={row.id} />
                      {row.status === "PUBLISHED" ? (
                        <>
                          <button className="partner-pub-action" name="status" value="CLOSED" type="submit">Encerrar</button>
                          <button className="partner-pub-action" name="status" value="ARCHIVED" type="submit">Arquivar</button>
                        </>
                      ) : row.status === "DRAFT" ? (
                        <button className="partner-pub-action" name="status" value="PUBLISHED" type="submit">Publicar</button>
                      ) : row.status === "CLOSED" ? (
                        <>
                          <button className="partner-pub-action" name="status" value="PUBLISHED" type="submit">Reabrir</button>
                          <button className="partner-pub-action" name="status" value="ARCHIVED" type="submit">Arquivar</button>
                        </>
                      ) : (
                        <button className="partner-pub-action" name="status" value="DRAFT" type="submit">Repor em rascunho</button>
                      )}
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="partner-pub-empty">
            <strong>Ainda não existe nenhuma publicação.</strong>
            <p>Comece por uma oportunidade que peça candidatura, participação, benefício ou cooperação externa.</p>
            <Link href="/parceiro/oportunidades/nova" className="partner-primary-action">Publicar primeira oportunidade →</Link>
          </div>
        )}
      </PartnerSection>

      <div className="partner-pub-summary">
        <div className="partner-pub-note">
          <strong>Depois de publicar</strong>
          <p>Uma publicação pode ser promovida através da área de Exposição. Os resultados de actividade ficam separados do conteúdo publicado.</p>
        </div>
        <div className="partner-pub-note">
          <strong>Precisa de apoio?</strong>
          <p>Consulte serviços de posicionamento, dados e inteligência.</p>
          <Link href="/parceiro/servicos">Ver serviços →</Link>
        </div>
      </div>

      <style>{`.partner-pub-row-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.partner-pub-row-actions form{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.partner-pub-row-actions button{background:transparent;border:0;cursor:pointer;font:inherit}`}</style>
    </PartnerPage>
  );
}
