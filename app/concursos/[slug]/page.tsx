import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const statusLabel: Record<string,string> = {
  PUBLISHED:"Publicado", OPEN:"Aberto", CLOSED:"Encerrado", EVALUATION:"Em avaliação", RESULTS:"Resultados"
};

function daysLeft(date: string | null) {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}

export default async function ContestDetail({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params;
  const supabase=await createClient();
  const {data:claimsData}=await supabase.auth.getClaims();
  const signedIn=Boolean(claimsData?.claims?.sub);
  const {data:item}=await supabase.from("contests")
    .select("id,title,slug,description,status,category,rules,opens_at,closes_at,created_at")
    .eq("slug",slug).eq("status","OPEN").maybeSingle();

  if(!item) notFound();

  const {data:reqs}=signedIn
    ? await supabase.from("contest_requirements").select("title,description,required").eq("contest_id",item.id).order("title")
    : {data:[]};

  const days=daysLeft(item.closes_at);
  const urgent=days !== null && days <= 7;
  const deadline=item.closes_at ? new Date(item.closes_at).toLocaleDateString("pt-MZ",{day:"2-digit",month:"long",year:"numeric"}) : "Prazo não indicado";

  return (
    <main className="page contests-detail-page">
      <div className="container">
        <Link href="/concursos" className="muted">← Voltar aos concursos</Link>

        <div className="contest-detail-hero">
          <article className="contest-detail-main">
            <div className="listing-top">
              <div className="contest-card-tags">
                <span>{statusLabel[item.status]||item.status}</span>
                {item.category && <span>{item.category}</span>}
                {urgent && <span className="urgent-tag">Prazo próximo</span>}
              </div>
              <span className={urgent ? "contest-detail-deadline urgent" : "contest-detail-deadline"}>
                {days === 0 ? "Termina hoje" : days === 1 ? "Termina amanhã" : days !== null && days > 1 && days <= 7 ? `Termina em ${days} dias` : `Até ${deadline}`}
              </span>
            </div>
            <h1>{item.title}</h1>
            <p className="contest-detail-description">
              {signedIn ? item.description : (item.description.length > 420 ? item.description.slice(0,420)+"…" : item.description)}
            </p>

            <div className="contest-fact-grid">
              <div><span>Estado</span><strong>Aberto</strong></div>
              <div><span>Área</span><strong>{item.category || "Não indicada"}</strong></div>
              <div><span>Publicação</span><strong>{item.created_at ? new Date(item.created_at).toLocaleDateString("pt-MZ") : "—"}</strong></div>
              <div><span>Prazo</span><strong>{deadline}</strong></div>
            </div>
          </article>

          <aside className="contest-action-card">
            <span className="eyebrow">Próximo passo</span>
            <h3>{signedIn ? "Preparar candidatura" : "Quer participar?"}</h3>
            <p>{signedIn ? "Consulte os requisitos completos e avance para a área de candidatura." : "Registe-se ou entre na sua conta para consultar o processo completo."}</p>
            <Link href={signedIn ? "/dashboard" : "/login?next=/concursos/"+encodeURIComponent(slug)} className="btn primary full">
              {signedIn ? "Ir para candidatura →" : "Entrar para continuar"}
            </Link>
            {!signedIn && <Link href="/registo" className="btn full">Criar conta</Link>}
          </aside>
        </div>

        <section className="contest-detail-section">
          <div className="contest-detail-section-head">
            <div><span className="eyebrow">Processo</span><h2>Informação do concurso</h2></div>
            {!signedIn && <span className="contest-member-note">Preview público</span>}
          </div>

          {!signedIn && <div className="notice">Está a consultar um preview público. Os requisitos e condições completos ficam disponíveis depois de iniciar sessão.</div>}

          <div className="contest-detail-columns">
            <div>
              <span className="eyebrow">Requisitos</span>
              <h3 className="contest-subheading">Documentação e condições</h3>
              {signedIn ? (
                reqs?.length ? <div className="requirement-list">{reqs.map((r,i)=><div className="card requirement" key={i}><div className="listing-top"><strong>{r.title}</strong>{r.required&&<span className="tag">Obrigatório</span>}</div><p className="muted">{r.description||"Consulte as condições do concurso."}</p></div>)}</div>
                : <div className="card detail-text-card"><p>{item.rules||"As regras e requisitos serão apresentados pela entidade responsável."}</p></div>
              ) : <div className="card detail-text-card"><p>Faça login para consultar a lista completa de requisitos, perguntas e documentos de candidatura.</p></div>}
            </div>
            <aside className="contest-calendar-card">
              <span className="eyebrow">Calendário</span>
              <h3>Datas importantes</h3>
              <div><span>Abertura</span><strong>{item.opens_at ? new Date(item.opens_at).toLocaleDateString("pt-MZ") : "Não indicada"}</strong></div>
              <div><span>Encerramento</span><strong>{deadline}</strong></div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
