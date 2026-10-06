export const dynamic="force-dynamic";
import { createClient } from "@/lib/supabase/server";

export default async function PartnerResultsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data: opportunities }, { data: requests }, { data: campaigns }] = await Promise.all([
    supabase.from("opportunities").select("id,title,status,created_at").eq("owner_id", user.id).order("created_at",{ascending:false}).limit(20),
    supabase.from("service_requests").select("id,status,created_at,platform_services(name)").eq("requester_user_id", user.id).order("created_at",{ascending:false}).limit(20),
    supabase.rpc("partner_ad_campaigns_list"),
  ]);
  const activity = [
    ...(opportunities ?? []).map((x:any)=>({id:x.id,title:x.title,meta:"Oportunidade · "+x.status,date:x.created_at})),
    ...(requests ?? []).map((x:any)=>({id:x.id,title:x.platform_services?.name || "Serviço",meta:"Pedido · "+x.status,date:x.created_at})),
    ...(campaigns ?? []).map((x:any)=>({id:x.id,title:x.title,meta:"Publicidade · "+x.status,date:x.created_at})),
  ].sort((a,b)=>+new Date(b.date)-+new Date(a.date)).slice(0,30);
  return (
    <main className="dashboard-main"><div className="dashboard-content">
      <header className="dashboard-topbar"><div className="dashboard-welcome">
        <span className="dashboard-kicker">Actividade</span><h1>Desempenho e histórico</h1>
        <p>Registo factual das interacções da sua entidade com a MozEmpresas.</p>
      </div></header>
      <section className="dashboard-section"><div className="dashboard-section-head"><div>
        <span className="dashboard-kicker">Linha de actividade</span><h2>O que aconteceu na conta</h2>
      </div></div>
      {activity.length ? <div className="dashboard-list">{activity.map((x:any)=>
        <div key={x.id}><div><strong>{x.title}</strong><span>{x.meta} · {new Date(x.date).toLocaleDateString("pt-MZ")}</span></div><b>Registo</b></div>
      )}</div> : <div className="empty"><p>Ainda não há actividade registada.</p></div>}
      </section>
    </div></main>
  );
}