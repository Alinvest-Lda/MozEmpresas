export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";

export default async function AdminCreditsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: member } = await supabase.from("platform_members").select("active").eq("user_id", user.id).maybeSingle();
  if (!member?.active) return null;
  const { data: packages } = await supabase.from("credit_packages").select("code,name,credit_volume,price_mzn,active").order("credit_volume");
  return <main className="dashboard-main"><div className="dashboard-content">
    <div className="page-header">
      <span className="eyebrow">Monetização</span>
      <h1>Créditos da plataforma</h1>
      <p className="muted">Modelo pré-pago para comprar volume de utilização sem subscrição directa de cada pacote.</p>
    </div>
    <div className="card" style={{marginTop:18}}>
      <h2>Conversão de referência</h2>
      <p>1 crédito = 1,00 MZN no pacote base. Os volumes maiores reduzem o custo efectivo por crédito através de bónus de volume.</p>
    </div>
    <section className="dashboard-section" style={{marginTop:18}}>
      <div className="dashboard-section-head"><div><span className="dashboard-kicker">Tabela comercial</span><h2>Pacotes de créditos</h2><p>Preço em meticais e conversão efectiva por crédito.</p></div></div>
      <div className="grid" style={{marginTop:18}}>
        {packages?.map(p=><article className="card" key={p.code}><span className="dashboard-kicker">{p.code}</span><h3 style={{marginTop:8}}>{p.name}</h3><p><strong>{p.credit_volume.toLocaleString("pt-MZ")}</strong> créditos</p><p><strong>{Number(p.price_mzn).toLocaleString("pt-MZ",{minimumFractionDigits:2})} MZN</strong></p><p className="muted">{(Number(p.price_mzn)/p.credit_volume).toLocaleString("pt-MZ",{minimumFractionDigits:4})} MZN/crédito</p></article>)}
      </div>
    </section>
  </div></main>;
}
