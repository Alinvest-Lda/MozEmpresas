export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PartnerPage, PartnerSection, PartnerMetric, PartnerEmpty } from "@/components/partner-workspace";

export default async function PartnerInsights() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: accountId, error: accountError } = await supabase.rpc("current_partner_account_id");
  const [
    { data: opportunities, error: opportunitiesError },
    { data: requests, error: requestsError },
    { data: entitlements, error: entitlementsError },
  ] = await Promise.all([
    accountId
      ? supabase.from("opportunities").select("id,title,status,created_at,type,location,slug").eq("partner_account_id", accountId).order("created_at", { ascending: false }).limit(100)
      : Promise.resolve({ data: null, error: accountError || new Error("PARTNER_ACCOUNT_REQUIRED") }),
    supabase.from("service_requests").select("id,status,created_at").eq("requester_user_id", user.id).order("created_at", { ascending: false }).limit(100),
    supabase.rpc("partner_entitlements_list"),
  ]);

  const published = (opportunities ?? []).filter((item: any) => item.status === "PUBLISHED").length;
  const closed = (opportunities ?? []).filter((item: any) => ["CLOSED", "ARCHIVED"].includes(item.status)).length;
  const activeRequests = (requests ?? []).filter((item: any) => !["COMPLETED", "CANCELLED"].includes(item.status)).length;
  const benefits = (entitlements ?? []).filter((item: any) => item.status === "ACTIVE").length;
  const loadErrors = [
    accountError && "identificação da conta",
    opportunitiesError && "publicações",
    requestsError && "pedidos submetidos por si",
    entitlementsError && "benefícios",
  ].filter(Boolean);

  return (
    <PartnerPage eyebrow="Indicadores · Actividade" title="Indicadores da actividade" description="Consulte indicadores operacionais calculados a partir dos registos da sua conta. Esta área ainda não disponibiliza estudos sectoriais, tendências de mercado ou comparações com outras organizações." action={{ href: "/parceiro/oportunidades", label: "Gerir publicações" }}>
      {loadErrors.length > 0 && <div className="notice" role="alert">Não foi possível carregar todos os indicadores ({loadErrors.join(", ")}). Os valores indisponíveis não representam zero actividade. Tente novamente.</div>}
      <section className="partner-metrics-grid">
        <PartnerMetric label="Publicações activas da conta" value={opportunitiesError ? "—" : published} detail="Oportunidades actualmente publicadas" featured />
        <PartnerMetric label="Publicações encerradas" value={opportunitiesError ? "—" : closed} detail="Registos no histórico da conta" />
        <PartnerMetric label="Pedidos submetidos por si" value={requestsError ? "—" : activeRequests} detail="Pedidos individuais ainda em acompanhamento" />
        <PartnerMetric label="Benefícios activos" value={entitlementsError ? "—" : benefits} detail="Exclusividades atribuídas à conta" />
      </section>

      <PartnerSection eyebrow="Leitura operacional" title="O que os indicadores mostram">
        <div className="partner-insight-grid">
          <article><span>01 · PUBLICAÇÕES</span><h3>{opportunitiesError ? "Dados indisponíveis" : published ? "A conta tem actividade publicada" : "Ainda não existem publicações activas"}</h3><p>Este indicador conta oportunidades associadas à organização, independentemente do gestor que as criou.</p></article>
          <article><span>02 · SERVIÇOS</span><h3>{requestsError ? "Dados indisponíveis" : activeRequests ? "Existem pedidos por acompanhar" : "Não há pedidos individuais activos"}</h3><p>Os pedidos apresentados são os submetidos pelo seu utilizador. Ainda não são agregados entre todos os gestores da conta.</p></article>
          <article><span>03 · BENEFÍCIOS</span><h3>{entitlementsError ? "Dados indisponíveis" : benefits ? "A conta tem benefícios activos" : "Sem benefícios activos"}</h3><p>Consulte os serviços e exclusividades formalmente atribuídos à organização.</p></article>
        </div>
      </PartnerSection>

      <PartnerSection eyebrow="Registos recentes" title="Publicações da organização">
        {opportunitiesError ? <PartnerEmpty title="Não foi possível carregar as publicações" text="Tente novamente. Os dados indisponíveis não devem ser interpretados como ausência de actividade." /> : opportunities?.length ? <div className="partner-record-list">{opportunities.slice(0, 6).map((item: any) => <Link href={"/oportunidades/" + (item.slug || item.id)} key={item.id}><div><strong>{item.title}</strong><span>{item.type || "Oportunidade"} · {item.location || "Localização não indicada"} · {item.status}</span></div><b>→</b></Link>)}</div> : <PartnerEmpty title="Ainda sem publicações" text="Publique uma oportunidade para iniciar o histórico operacional da organização." href="/parceiro/oportunidades" label="Ver publicações" />}
      </PartnerSection>

      <PartnerSection eyebrow="Âmbito dos dados" title="O que ainda não está incluído">
        <div className="partner-strategy-grid">
          <article><span>01</span><h3>Procura externa</h3><p>Não são apresentados dados agregados de procura do público nem volume de interesse por categoria.</p></article>
          <article><span>02</span><h3>Comparações de mercado</h3><p>Não existem benchmarks sectoriais ou comparações com outras organizações nesta versão.</p></article>
          <article><span>03</span><h3>Tendências</h3><p>Não são calculadas tendências temporais ou previsões. Os números reflectem apenas registos operacionais disponíveis.</p></article>
        </div>
      </PartnerSection>
    </PartnerPage>
  );
}
