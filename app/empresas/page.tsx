import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Params = { q?: string; location?: string };

export default async function Empresas({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const supabase = await createClient();
  let query = supabase.from("businesses")
    .select("id,name,slug,description,location,phone,email,website,logo_url")
    .eq("is_public", true)
    .order("name")
    .limit(60);

  if (params.q?.trim()) query = query.or(`name.ilike.%${params.q.trim()}%,description.ilike.%${params.q.trim()}%`);
  if (params.location?.trim()) query = query.ilike("location", `%${params.location.trim()}%`);

  const { data: businesses, error } = await query;

  return <main className="page"><div className="container">
    <div className="page-header page-header-row">
      <div><span className="eyebrow">Directório empresarial</span><h1>Empresas em Moçambique</h1><p className="muted">Encontre empresas por actividade, nome e localização.</p></div>
      <Link href="/dashboard/empresas" className="btn primary">Registar empresa</Link>
    </div>

    <form className="toolbar" action="/empresas">
      <input name="q" defaultValue={params.q} style={{flex:1}} placeholder="Empresa, actividade ou serviço..." aria-label="Pesquisar empresas" />
      <input name="location" defaultValue={params.location} placeholder="Província ou localização" aria-label="Localização" />
      <button className="btn primary">Pesquisar</button>
    </form>

    <div className="result-bar"><span>{businesses?.length ?? 0} perfis encontrados</span><span>Perfis públicos</span></div>
    {error && <div className="notice">Não foi possível carregar o directório neste momento.</div>}

    <div className="grid">{businesses?.map((b) =>
      <Link href={"/empresas/" + b.slug} className="card business-card" key={b.id}>
        <div className="business-head"><div className="avatar">{b.logo_url ? <img src={b.logo_url} alt="" /> : b.name[0]}</div><span className="verified">Perfil público</span></div>
        <h3>{b.name}</h3>
        <div className="meta">{b.location && <span className="tag">{b.location}</span>}</div>
        <p>{b.description || "Empresa registada no ecossistema MozEmpresas."}</p>
        <span className="card-link">Ver perfil →</span>
      </Link>
    )}</div>

    {(!businesses || businesses.length === 0) && <div className="empty card"><div className="empty-icon">⌂</div><h3>Nenhuma empresa encontrada</h3><p>Altere os termos de pesquisa ou crie o primeiro perfil empresarial.</p><Link href="/dashboard/empresas" className="btn primary">Criar perfil empresarial</Link></div>}
  </div></main>;
}