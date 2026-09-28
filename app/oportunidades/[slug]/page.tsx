import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { applyToOpportunity } from "@/lib/opportunities/actions";

const labels: Record<string, string> = {
  CALL: "Chamada",
  FUNDING: "Financiamento",
  PARTNERSHIP: "Parceria",
  TRAINING: "Capacitação",
  EVENT: "Evento",
};

const icons: Record<string, string> = {
  CALL: "↗",
  FUNDING: "◈",
  PARTNERSHIP: "⌘",
  TRAINING: "◇",
  EVENT: "◷",
};

function dateLabel(value: string | null) {
  return value
    ? new Date(value).toLocaleDateString("pt-MZ", { day: "2-digit", month: "long", year: "numeric" })
    : "Não indicado";
}

export default async function OpportunityDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub || null;

  const { data: item } = await supabase
    .from("opportunities")
    .select("id,title,slug,type,status,description,organization,location,opens_at,closes_at,requirements,created_at")
    .eq("slug", slug)
    .eq("status", "PUBLISHED")
    .maybeSingle();

  if (!item || !labels[item.type]) notFound();

  const { data: application } = userId
    ? await supabase.from("opportunity_applications").select("status").eq("opportunity_id", item.id).eq("applicant_user_id", userId).maybeSingle()
    : { data: null };

  const deadline = item.closes_at ? new Date(item.closes_at) : null;
  const isEvent = item.type === "EVENT";

  return (
    <main className="opportunity-detail-page">
      <div className="container">
        <Link href="/oportunidades" className="opportunity-back">← Voltar às oportunidades</Link>

        <section className="opportunity-detail-hero">
          <div>
            <div className="opportunity-detail-tags">
              <span className="opportunity-pill">{icons[item.type]} {labels[item.type]}</span>
              {item.location && <span className="detail-neutral-tag">⌖ {item.location}</span>}
            </div>
            <h1>{item.title}</h1>
            <p>{item.description}</p>
            <div className="opportunity-detail-source">
              <span>Publicado por</span><strong>{item.organization || "Organização não indicada"}</strong>
            </div>
          </div>
          <aside className="opportunity-deadline-card">
            <span>{isEvent ? "Data principal" : "Prazo de candidatura"}</span>
            <strong>{dateLabel(item.closes_at)}</strong>
            {deadline && <small>{deadline.toLocaleDateString("pt-MZ", { weekday: "long" })}</small>}
            {userId ? (
              <form action={applyToOpportunity} className="detail-action-form">
                <input type="hidden" name="opportunity_id" value={item.id} />
                <input type="hidden" name="slug" value={item.slug} />
                <textarea name="cover_note" rows={3} placeholder="Apresente brevemente a sua empresa ou interesse." aria-label="Mensagem de candidatura" />
                <button className="btn primary full" type="submit">Enviar resposta →</button>
              </form>
            ) : (
              <Link href={"/login?next=/oportunidades/" + encodeURIComponent(slug)} className="btn primary full">Entrar para participar</Link>
            )}
          </aside>
        </section>

        <div className="opportunity-detail-layout">
          <article>
            <section className="opportunity-detail-section">
              <span className="eyebrow">Sobre esta oportunidade</span>
              <h2>O que precisa de saber.</h2>
              <p className="opportunity-detail-longtext">{item.description}</p>
            </section>

            <section className="opportunity-detail-section">
              <span className="eyebrow">Condições</span>
              <h2>Requisitos e informações.</h2>
              <div className="opportunity-requirements">
                <p>{item.requirements || "Os requisitos e condições desta oportunidade serão apresentados pela entidade responsável."}</p>
              </div>
            </section>

            <section className="opportunity-detail-section">
              <span className="eyebrow">Calendário</span>
              <div className="opportunity-calendar">
                <div><span>Abertura</span><strong>{dateLabel(item.opens_at)}</strong></div>
                <div><span>{isEvent ? "Data do evento" : "Encerramento"}</span><strong>{dateLabel(item.closes_at)}</strong></div>
              </div>
            </section>
          </article>

          <aside className="opportunity-detail-sidebar">
            <div className="opportunity-side-card">
              <span className="eyebrow">Próximo passo</span>
              <h3>{application ? "A sua participação está registada." : "Não perca esta oportunidade."}</h3>
              <p>{application ? "Pode acompanhar o estado da sua participação a partir da sua área." : "Registe-se para acompanhar oportunidades e usar as funcionalidades de participação do MozEmpresas."}</p>
              {application && <div className="notice">Estado: {application.status}</div>}
              <Link href={userId ? "/dashboard" : "/registo"} className="btn primary full">{userId ? "Abrir a minha área" : "Criar conta gratuita"}</Link>
            </div>
            <div className="opportunity-side-card muted-side">
              <span className="eyebrow">Fonte</span>
              <p>As informações são disponibilizadas pela organização responsável pela oportunidade. Confirme sempre as condições e instruções oficiais antes de participar.</p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
