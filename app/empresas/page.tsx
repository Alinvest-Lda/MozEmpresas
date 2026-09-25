import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const sectors = ["Construção e engenharia","Consultoria e serviços","Tecnologia","Contabilidade e finanças","Comércio e distribuição","Logística e transportes","Agricultura e agro-negócio","Hotelaria e turismo","Saúde","Educação e formação","Energia e ambiente","Outros serviços"];

export default async function Empresas({ searchParams }: { searchParams: Promise<{q?:string;location?:string}> }) {
  const params = await searchParams;
  const supabase = await createClient();
  let query = supabase.from("businesses").select("id,name,slug,description,location,phone,email,website,logo_url").eq("is_public",true).order("name").limit(60);
  if (params.q?.trim()) query = query.or(`name.ilike.%${params.q.trim()}%,description.ilike.%${params.q.trim()}%`);
  if (params.location?.trim()) query = query.ilike("location",`%${params.location.trim()}%`);
  const {data,error}=await query;

  return <main className="page">
    <div className="container">
      <section className="page-header" style={{padding:"20px 0 12px"}}>
        <span className="eyebrow">Directório empresarial de Moçambique</span>
        <h1>Encontre empresas para fazer negócio.</h1>
        <p className="muted" style={{maxWidth:720,fontSize:16,lineHeight:1.6}}>Pesquise empresas, fornecedores e prestadores de serviços por actividade, nome ou localização. Consulte o perfil e encontre os contactos certos.</p>
      </section>
      <form className="toolbar" action="/empresas">
        <input name="q" defaultValue={params.q} style={{flex:1,minWidth:260}} placeholder="Nome da empresa, actividade ou serviço" />
        <input name="location" defaultValue={params.location} placeholder="Província ou localização" />
        <button className="btn primary">Pesquisar</button>
      </form>

      <section className="section" style={{padding:"18px 0 38px"}}>
        <div className="section-head"><div><span className="eyebrow">Explore por sector</span><h2>Actividades empresariais</h2></div><Link href="/registo" className="text-link">Registar empresa →</Link></div>
        <div className="category-list">
          {sectors.map(s=><Link className="category-row" key={s} href={"/empresas?q="+encodeURIComponent(s)}><span className="category-icon">›</span><span><strong>{s}</strong><small>Ver empresas deste sector</small></span><span className="category-arrow">→</span></Link>)}
        </div>
      </section>

      <section>
        <div className="result-bar"><strong>{data?.length ?? 0} perfis encontrados</strong><span>Perfis públicos</span></div>
        {error && <div className="notice">Não foi possível carregar o directório neste momento.</div>}
        <div className="grid">
          {data?.map(b=><Link href={"/empresas/"+b.slug} className="card business-card" key={b.id}>
            <div className="business-head"><div className="avatar">{b.logo_url?<img src={b.logo_url} alt="" />:b.name.charAt(0)}</div><span className="verified">Perfil público</span></div>
            <h3>{b.name}</h3><div className="meta">{b.location&&<span className="tag">{b.location}</span>}</div>
            <p>{b.description||"Perfil empresarial no ecossistema MozEmpresas."}</p><span className="card-link">Ver empresa →</span>
          </Link>)}
          {(!data||data.length===0)&&<div className="empty card"><div className="empty-icon">⌂</div><h3>Nenhuma empresa encontrada</h3><p>Tente outra pesquisa ou seja a primeira empresa a criar um perfil público.</p><Link href="/registo" className="btn primary">Registar empresa</Link></div>}
        </div>
      </section>
    </div>
  </main>;
}
