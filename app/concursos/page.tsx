export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

function daysLeft(date: string | null) {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}

export default async function ContestsPage() {
  const supabase = await createClient();
  const { data: items } = await supabase
    .from("contests")
    .select("id,title,slug,description,status,category,opens_at,closes_at,created_at")
    .eq("status", "OPEN")
    .order("closes_at", { ascending: true, nullsFirst: false })
    .limit(30);

  const contests = items ?? [];

  return (
    <main className="page contests-detail-page">
      <div className="container">
        <section className="page-header">
          <span className="eyebrow">Concursos empresariais</span>
          <h1>Concursos abertos para empresas.</h1>
          <p className="muted" style={{ maxWidth: 760 }}>
            Consulte apenas concursos actualmente abertos, veja o prazo e avance para os requisitos
            completos quando estiver pronto para participar.
          </p>
        </section>

        <div className="contest-command-bar">
          <div className="contest-command-copy">
            <span className="eyebrow">Aberto agora</span>
            <strong>{contests.length} concursos disponíveis</strong>
            <span>Os processos encerrados deixam de aparecer nesta área.</span>
          </div>
          <Link href="/dashboard/servicos/concursos-empresariais" className="btn">Conhecer o serviço →</Link>
        </div>

        <section className="contest-discovery">
          <div className="contest-discovery-head">
            <div>
              <span className="eyebrow">Directório</span>
              <h2>Processos em curso.</h2>
            </div>
          </div>

          <div className="contest-results-list">
            {contests.length ? contests.map((item, index) => {
              const days = daysLeft(item.closes_at);
              const urgent = days !== null && days <= 7;
              return (
                <Link href={"/concursos/" + item.slug} className={"contest-card card" + (urgent ? " is-urgent" : "")} key={item.id}>
                  <div className="contest-card-index">{String(index + 1).padStart(2, "0")}</div>
                  <div className="contest-type-icon" aria-hidden="true">▣</div>
                  <div className="directory-business-content">
                    <div className="contest-card-tags">
                      <span>Aberto</span>
                      {item.category && <span>{item.category}</span>}
                      {urgent && <span className="urgent-tag">Prazo próximo</span>}
                    </div>
                    <h3>{item.title}</h3>
                    <div className="contest-card-meta">
                      <span>Publicado <strong>{new Date(item.created_at).toLocaleDateString("pt-MZ")}</strong></span>
                      <span>Prazo <strong>{item.closes_at ? new Date(item.closes_at).toLocaleDateString("pt-MZ") : "Não indicado"}</strong></span>
                    </div>
                    <p>{item.description || "Consulte o processo, requisitos e condições de candidatura."}</p>
                    <div className="contest-result-bottom">
                      <span>{days === null ? "Prazo não indicado" : days < 0 ? "Prazo encerrado" : days === 0 ? "Termina hoje" : days === 1 ? "Termina amanhã" : "Termina em " + days + " dias"}</span>
                      <span>Ver concurso →</span>
                    </div>
                  </div>
                </Link>
              );
            }) : (
              <div className="contest-empty card" style={{ padding: 28 }}>
                <strong>Não existem concursos abertos neste momento.</strong>
                <p className="muted">Os processos encerrados não são apresentados no directório público.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
