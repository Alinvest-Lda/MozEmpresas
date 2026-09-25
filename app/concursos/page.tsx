import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const statuses: Record<string,string> = { PUBLISHED:"Publicado", OPEN:"Aberto", CLOSED:"Encerrado", EVALUATION:"Em avaliação", RESULTS:"Resultados" };
type Contest = { id:string; title:string; slug:string; description:string; status:string; category:string|null; closes_at:string|null };

export default async function Concursos({ searchParams }: { searchParams: Promise<{q?:string;status?:string}> }) {
  const params = await searchParams;
  let data: Contest[] = [];
  let error = false;

  try {
    const supabase = await createClient();
    let query = supabase.from("contests").select("id,title,slug,description,status,category,closes_at").in("status",["PUBLISHED","OPEN","CLOSED","EVALUATION","RESULTS"]).order("created_at",{ascending:false}).limit(48);
    const q = params.q?.trim();
    if (q) {
      const safe = q.replace(/[,%()]/g," ").replace(/\s+/g," ").trim();
      if (safe) query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%,category.ilike.%${safe}%`);
    }
    if (params.status && params.status !== "all") query = query.eq("status",params.status);
    const result = await query;
    if (result.error) error = true;
    data = (result.data ?? []) as Contest[];
  } catch {
    error = true;
  }

  return (
    <main className="page">
      <div className="container">
        <section className="page-header">
          <span className="eyebrow">Concursos e contratação</span>
          <h1>Encontre concursos e processos de contratação.</h1>
          <p className="muted page-lead">Consulte chamadas públicas, requisitos, prazos e informação necessária para apresentar uma candidatura ou proposta.</p>
        </section>

        <form className="toolbar" action="/concursos">
          <input name="q" defaultValue={params.q} placeholder="Pesquisar por título, sector ou palavra-chave" />
          <select name="status" defaultValue={params.status || "all"}><option value="all">Todos os estados</option>{Object.entries(statuses).map(([value,label]) => <option value={value} key={value}>{label}</option>)}</select>
          <button className="btn primary">Pesquisar</button>
        </form>

        <section className="section page-section">
          <div className="grid">
            <div className="card module-card"><span className="module-number">CHAMADAS</span><h3>Consulte oportunidades</h3><p>Veja concursos e processos publicados por organizações e empresas.</p></div>
            <div className="card module-card"><span className="module-number">PRAZOS</span><h3>Controle datas</h3><p>Identifique abertura, encerramento e estado de cada processo.</p></div>
            <div className="card module-card"><span className="module-number">CANDIDATURA</span><h3>Analise requisitos</h3><p>Abra cada concurso para consultar regras e informação disponível.</p></div>
          </div>
        </section>

        <div className="result-bar"><strong>{data.length} concursos</strong><span>Processos públicos</span></div>
        {error && <div className="notice">Não foi possível carregar os concursos neste momento.</div>}
        <div className="grid">
          {data.map(item => (
            <Link href={"/concursos/"+item.slug} className="card listing" key={item.id}>
              <div className="listing-top"><span className="tag">{statuses[item.status] || item.status}</span>{item.closes_at && <span className="status-dot">Até {new Date(item.closes_at).toLocaleDateString("pt-MZ")}</span>}</div>
              <h3>{item.title}</h3><p>{item.description}</p>{item.category && <span className="tag item-category">{item.category}</span>}<span className="card-link">Consultar concurso →</span>
            </Link>
          ))}
          {data.length === 0 && <div className="empty card"><div className="empty-icon">§</div><h3>Nenhum concurso publicado</h3><p>Os concursos e processos de contratação aparecerão aqui quando forem publicados.</p><Link href="/registo" className="btn primary">Registar empresa</Link></div>}
        </div>
      </div>
    </main>
  );
}