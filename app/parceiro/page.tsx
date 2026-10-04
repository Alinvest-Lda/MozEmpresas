export const dynamic="force-dynamic";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function PartnerHome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data: profile }, { data: opportunities }, { data: requests }, { data: relationships }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    supabase.from("opportunities").select("id,title,slug,type,closes_at").eq("status","PUBLISHED").order("closes_at",{ascending:true,nullsFirst:false}).limit(5),
    supabase.from("service_requests").select("id,status,created_at").eq("requester_user_id",user.id).order("created_at",{ascending:false}).limit(5),
    supabase.from("business_partner_relationships").select("id,status,relationship_type,created_at").eq("created_by",user.id).order("created_at",{ascending:false}).limit(5)
  ]);
  const active = (relationships ?? []).filter(x => x.status === "ACTIVE").length;
  const pending = (requests ?? []).filter(x => ["REQUESTED","UNDER_REVIEW","QUOTED"].includes(x.status)).length;
  const name = profile?.full_name || user.email?.split("@")[0] || "Parceiro";
  return <main className="partner-main"><div className="partner-content">
    <header className="partner-hero"><div><span className="partner-kicker">Área de parceiro</span><h1>Bom trabalho, {name}.</h1><p>Gira relações, acompanha oportunidades e transforma a sua rede em actividade dentro do ecossistema MozEmpresas.</p></div><Link href="/parceiro/oportunidades" className="btn primary">Ver oportunidades →</Link></header>
    <section className="partner-stats">
      <article><span>Oportunidades disponíveis</span><strong>{opportunities?.length ?? 0}</strong><small>Processos publicados para descoberta</small></article>
      <article><span>Relações activas</span><strong>{active}</strong><small>Relações registadas pelo parceiro</small></article>
      <article><span>Pedidos em acompanhamento</span><strong>{pending}</strong><small>Pedidos associados à sua conta</small></article>
      <article><span>Actividade registada</span><strong>{relationships?.length ?? 0}</strong><small>Registos recentes no ecossistema</small></article>
    </section>
    <section className="partner-section"><div className="partner-section-head"><div><span className="partner-kicker">Centro de acção</span><h2>O que pode fazer agora?</h2></div></div>
      <div className="partner-action-grid">
        <Link href="/parceiro/empresas"><strong>Gerir empresas e relações</strong><span>Organize empresas associadas, referências e parcerias.</span><b>→</b></Link>
        <Link href="/parceiro/oportunidades"><strong>Acompanhar oportunidades</strong><span>Descubra processos relevantes e mantenha o seguimento.</span><b>→</b></Link>
        <Link href="/parceiro/servicos"><strong>Acompanhar serviços</strong><span>Veja pedidos e serviços ligados à actividade do parceiro.</span><b>→</b></Link>
        <Link href="/parceiro/indicacoes"><strong>Trabalhar indicações</strong><span>Construa uma rede de recomendações e relações comerciais.</span><b>→</b></Link>
      </div>
    </section>
  </div></main>;
}