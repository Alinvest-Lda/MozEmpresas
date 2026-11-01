export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { PartnerPage, PartnerSection, PartnerMetric, PartnerEmpty } from "@/components/partner-workspace";

export default async function PartnerResultsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: accountId, error: accountError } = await supabase.rpc("current_partner_account_id");
  const [
    { data: opportunities, error: opportunitiesError },
    { data: requests, error: requestsError },
    { data: campaigns, error: campaignsError },
  ] = await Promise.all([
    accountId
      ? supabase.from("opportunities").select("id,title,status,created_at").eq("partner_account_id", accountId).order("created_at", { ascending: false }).limit(50)
      : Promise.resolve({ data: null, error: accountError || new Error("PARTNER_ACCOUNT_REQUIRED") }),
    supabase.from("service_requests").select("id,status,created_at,platform_services(name)").eq("requester_user_id", user.id).order("created_at", { ascending: false }).limit(50),
    supabase.rpc("partner_ad_campaigns_list"),
  ]);

  const activity = [
    ...(opportunities ?? []).map((x: any) => ({ id: "o-" + x.id, title: x.title, meta: "Publicação da conta · " + x.status, date: x.created_at })),
    ...(requests ?? []).map((x: any) => ({ id: "r-" + x.id, title: x.platform_services?.name || "Serviço", meta: "Pedido submetido por si · " + x.status, date: x.created_at })),
    ...(campaigns ?? []).map((x: any) => ({ id: "c-" + x.id, title: x.title, meta: "Publicidade da conta · " + x.status, date: x.created_at })),
  ].sort((x, y) => new Date(y.date).getTime() - new Date(x.date).getTime()).slice(0, 40);

  const loadErrors = [
    accountError && "conta",
    opportunitiesError && "publicações",
    requestsError && "pedidos submetidos por si",
    campaignsError && "campanhas",
  ].filter(Boolean);

  return (
    <PartnerPage eyebrow="Compreender · Histórico" title="Actividade e histórico" description="Consulte as publicações e campanhas da conta, bem como os pedidos de serviço submetidos pelo seu utilizador. Os pedidos de outros gestores ainda não são agregados nesta linha temporal." action={{ href: "/parceiro", label: "Voltar à visão geral" }}>
      {loadErrors.length > 0 && <div className="notice" role="alert">Não foi possível carregar todos os dados ({loadErrors.join(", ")}). A lista pode estar incompleta; tente novamente.</div>}
      <section className="partner-metrics-grid">
        <PartnerMetric label="Registos visíveis" value={activity.length} detail="Actividade disponível" featured />
        <PartnerMetric label="Publicações da conta" value={opportunitiesError ? "—" : opportunities?.length ?? 0} detail="Partilhadas entre gestores" />
        <PartnerMetric label="Pedidos submetidos por si" value={requestsError ? "—" : requests?.length ?? 0} detail="Não inclui pedidos de outros gestores" />
        <PartnerMetric label="Campanhas da conta" value={campaignsError ? "—" : campaigns?.length ?? 0} detail="Publicidade registada" />
      </section>
      <PartnerSection eyebrow="Linha do tempo" title="O que aconteceu">
        {activity.length ? <div className="partner-record-list">{activity.map((item: any) => <div key={item.id}><div><strong>{item.title}</strong><span>{item.meta} · {new Date(item.date).toLocaleDateString("pt-MZ")}</span></div><b>{/COMPLETED|CLOSED/.test(item.meta) ? "Concluído" : "Registo"}</b></div>)}</div> : loadErrors.length ? <PartnerEmpty title="Não foi possível carregar a actividade" text="A plataforma não conseguiu obter todos os registos. Tente novamente." /> : <PartnerEmpty title="Ainda não há actividade" text="Publicações, pedidos e campanhas aparecerão aqui quando forem registados." />}
      </PartnerSection>
      <PartnerSection eyebrow="Leitura" title="Como ler o histórico"><div className="partner-strategy-grid"><article><span>01</span><h3>Rever</h3><p>Identifique processos abertos ou sem seguimento.</p></article><article><span>02</span><h3>Priorizar</h3><p>Resolva primeiro actividades com prazo ou estado pendente.</p></article><article><span>03</span><h3>Registar</h3><p>Mantenha a relação comercial documentada na plataforma.</p></article></div></PartnerSection>
    </PartnerPage>
  );
}
