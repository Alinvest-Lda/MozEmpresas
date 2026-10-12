export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createOpportunity, updateOpportunityStatus } from "@/lib/opportunities/actions";

const typeLabels: Record<string, string> = {
  CALL: "Concurso / chamada",
  TENDER: "Concurso público",
  FUNDING: "Financiamento",
  PARTNERSHIP: "Parceria",
  TRAINING: "Formação",
  EVENT: "Evento",
  BUSINESS: "Oportunidade de negócio",
  OTHER: "Outra oportunidade",
};
const statusLabels: Record<string, string> = {
  DRAFT: "Rascunho",
  PUBLISHED: "Publicada",
  CLOSED: "Encerrada",
  ARCHIVED: "Arquivada",
};

export default async function MyOpportunities({
  searchParams,
}: {
  searchParams?: Promise<{ publish?: string; status?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/oportunidades");

  const [{ data: opportunities }, { data: profile }] = await Promise.all([
    supabase
      .from("opportunities")
      .select("id,title,slug,type,status,organization,location,opens_at,closes_at,created_at")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);

  const feedback: Record<string, { kind: "success" | "error" | "warning"; message: string }> = {
    success: { kind: "success", message: "Oportunidade publicada." },
    updated: { kind: "success", message: "Estado da oportunidade actualizado." },
    unchanged: { kind: "warning", message: "A oportunidade já se encontra nesse estado." },
    error: { kind: "error", message: "Não foi possível concluir a operação. Verifique os campos e tente novamente." },
    forbidden: { kind: "error", message: "Não tem permissão para alterar esta oportunidade." },
    "invalid-transition": { kind: "error", message: "Uma oportunidade arquivada não pode ser reaberta." },
  };
  const messageKey = params?.publish === "success" ? "success" : params?.publish === "error" ? "error" : params?.status;
  const notice = messageKey ? feedback[messageKey] : null;

  return (
    <main className="dashboard-main">
      <div className="dashboard-content">
        <header className="dashboard-topbar">
          <div className="dashboard-welcome">
            <span className="dashboard-kicker">Operação · Oportunidades</span>
            <h1>Oportunidades</h1>
            <p>Publique chamadas, parcerias, eventos e oportunidades de negócio. Acompanhe o estado das publicações numa única área.</p>
          </div>
        </header>

        {notice && <p role="status" className={notice.kind === "success" ? "account-success" : notice.kind === "warning" ? "notice" : "form-error"}>{notice.message}</p>}

        <section className="dashboard-section">
          <div className="dashboard-section-head">
            <div>
              <span className="dashboard-kicker">Nova publicação</span>
              <h2>Publicar oportunidade</h2>
              <p>Inclua datas realistas e os requisitos essenciais para que os interessados possam avaliar a oportunidade.</p>
            </div>
          </div>
          <form action={createOpportunity} className="business-form-grid opportunity-form">
            <label>Título<input name="title" required minLength={4} maxLength={180} placeholder="Ex.: Fornecimento de material de escritório" /></label>
            <label>Tipo<select name="type" required defaultValue="CALL">{Object.entries(typeLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label>Organização / entidade<input name="organization" maxLength={180} defaultValue={profile?.full_name || ""} placeholder="Nome da entidade responsável" /></label>
            <label>Localização<input name="location" maxLength={180} placeholder="Província, cidade ou remoto" /></label>
            <label>Data de abertura<input type="datetime-local" name="opens_at" /></label>
            <label>Data de encerramento<input type="datetime-local" name="closes_at" /></label>
            <label className="form-full">Descrição<textarea name="description" required minLength={10} maxLength={10000} rows={5} placeholder="Explique o objectivo, o âmbito e o que está a ser solicitado." /></label>
            <label className="form-full">Requisitos / instruções<input name="requirements" maxLength={5000} placeholder="Documentos, critérios ou passos para participar" /></label>
            <label className="form-full">Documentos de apoio<input type="file" name="attachments" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp" /><small>Opcional. Até 10 ficheiros, com limite de 10 MB por ficheiro.</small></label>
            <div className="form-full"><button className="btn primary" type="submit">Publicar oportunidade</button></div>
          </form>
        </section>

        <section className="dashboard-section">
          <div className="dashboard-section-head">
            <div><span className="dashboard-kicker">As suas publicações</span><h2>Histórico de oportunidades</h2><p>Altere o estado quando a oportunidade deixar de aceitar respostas ou já não estiver activa.</p></div>
            <Link href="/oportunidades" className="text-link">Ver oportunidades públicas →</Link>
          </div>
          {opportunities?.length ? (
            <div className="opportunity-list">
              {opportunities.map((item) => (
                <article className="opportunity-list-item" key={item.id}>
                  <div>
                    <span className="dashboard-kicker">{typeLabels[item.type] || item.type} · {statusLabels[item.status] || item.status}</span>
                    <strong>{item.title}</strong>
                    <small>{item.organization || "Entidade não indicada"}{item.location ? " · " + item.location : ""}</small>
                    <small>{item.closes_at ? "Encerra em " + new Date(item.closes_at).toLocaleString("pt-MZ") : "Sem data de encerramento"}</small>
                  </div>
                  <div className="opportunity-list-actions">
                    {item.status !== "ARCHIVED" && <Link href={"/oportunidades/" + item.slug} className="text-link">Ver publicação →</Link>}
                    {item.status === "PUBLISHED" && <form action={updateOpportunityStatus}><input type="hidden" name="opportunity_id" value={item.id} /><input type="hidden" name="status" value="CLOSED" /><button className="btn secondary" type="submit">Encerrar</button></form>}
                    {item.status === "CLOSED" && <form action={updateOpportunityStatus}><input type="hidden" name="opportunity_id" value={item.id} /><input type="hidden" name="status" value="PUBLISHED" /><button className="btn secondary" type="submit">Reabrir</button></form>}
                    {item.status !== "ARCHIVED" && <form action={updateOpportunityStatus}><input type="hidden" name="opportunity_id" value={item.id} /><input type="hidden" name="status" value="ARCHIVED" /><button className="text-link" type="submit">Arquivar</button></form>}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty"><p>Ainda não publicou oportunidades. A primeira publicação ficará registada aqui.</p></div>
          )}
        </section>
      </div>
    </main>
  );
}
