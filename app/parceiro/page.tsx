export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function PartnerHome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [
    { data: context, error: contextError },
    { data: accountId, error: accountError },
    { data: requests, error: requestsError },
    { data: members, error: membersError },
    { data: campaigns, error: campaignsError },
    { data: entitlements, error: entitlementsError },
  ] = await Promise.all([
    supabase.rpc("partner_account_context"),
    supabase.rpc("current_partner_account_id"),
    supabase.from("service_requests").select("id,status,created_at,requested_price,currency,platform_services(name)").eq("requester_user_id", user.id).order("created_at", { ascending: false }).limit(8),
    supabase.rpc("partner_account_members_list"),
    supabase.rpc("partner_ad_campaigns_list"),
    supabase.rpc("partner_entitlements_list"),
  ]);

  const account = Array.isArray(context) ? context[0] : null;
  const { data: opportunities, error: opportunitiesError } = accountId
    ? await supabase.from("opportunities").select("id,title,slug,type,status,organization,location,closes_at,created_at").eq("partner_account_id", accountId).order("created_at", { ascending: false }).limit(8)
    : { data: null, error: accountError || new Error("PARTNER_ACCOUNT_REQUIRED") };

  const name = account?.account_name || user.email?.split("@")[0] || "Parceiro";
  const published = opportunitiesError ? null : (opportunities ?? []).filter((x) => x.status === "PUBLISHED").length;
  const drafts = opportunitiesError ? null : (opportunities ?? []).filter((x) => x.status === "DRAFT").length;
  const pending = (requests ?? []).filter((x) => ["REQUESTED", "UNDER_REVIEW", "QUOTED"].includes(x.status)).length;
  const activeCampaigns = (campaigns ?? []).filter((x: any) => ["ACTIVE", "RUNNING", "PUBLISHED"].includes(x.status)).length;
  const benefits = (entitlements ?? []).filter((x: any) => x.status === "ACTIVE").length;
  const date = (v: string) => new Date(v).toLocaleDateString("pt-MZ", { day: "2-digit", month: "short" });
  const next = opportunitiesError
    ? { label: "Tentar carregar as publicações", href: "/parceiro", kind: "DADOS" }
    : drafts
      ? { label: "Rever e publicar rascunhos", href: "/parceiro/oportunidades", kind: "ACTIVIDADE" }
      : !published
        ? { label: "Publicar a primeira oportunidade", href: "/parceiro/oportunidades/nova", kind: "ACTIVIDADE" }
        : !activeCampaigns
        ? { label: "Escolher um formato de exposição", href: "/parceiro/publicidade", kind: "EXPOSIÇÃO" }
        : { label: "Consultar indicadores da actividade", href: "/parceiro/inteligencia", kind: "INDICADORES" };

  const loadErrors = [
    contextError && "contexto da conta",
    accountError && "identificação da conta",
    opportunitiesError && "publicações",
    requestsError && "pedidos submetidos por si",
    membersError && "gestores",
    campaignsError && "campanhas",
    entitlementsError && "benefícios",
  ].filter(Boolean);

  return (
    <main className="partner-main">
      <div className="partner-topbar">
        <div className="partner-topbar-left"><span>MOZEMPRESAS</span><b>/</b><strong>ÁREA DE PARCEIROS</strong><b>/</b><span>VISÃO GERAL</span></div>
        <div className="partner-topbar-center"><strong>MOZEMPRESAS</strong><span>ÁREA DE PARCEIROS</span></div>
        <div className="partner-topbar-right"><span className="partner-topbar-account"><i/> {contextError || !account ? "Estado da conta indisponível" : account.account_status === "ACTIVE" ? "Conta activa" : account.account_status === "SUSPENDED" ? "Conta suspensa" : "Conta " + (account.account_status || "por validar").toLowerCase()}</span><Link href="/parceiro/conta" className="partner-topbar-link">Conta →</Link></div>
      </div>
      <div className="partner-content partner-home">
        <header className="partner-home-top">
          <div><span className="partner-kicker">ÁREA DE PARCEIROS</span><h1>{name}</h1><p>Gerir publicações, acompanhar pedidos e consultar os indicadores disponíveis da conta.</p></div>
          <div className="partner-home-top-meta"><span>CONTA</span><strong>{account?.account_status === "ACTIVE" ? "Activa" : "A validar"}</strong><small>{membersError ? "Gestores indisponíveis" : (members?.length ?? 0) + " gestor(es) autorizado(s)"}</small><Link href="/parceiro/conta">Gerir conta →</Link></div>
        </header>

        {loadErrors.length > 0 && <div className="notice" role="alert">Alguns dados não puderam ser carregados ({loadErrors.join(", ")}). Actualize a página ou tente novamente. Não interprete estes dados como ausência de actividade.</div>}

        <section className="partner-command-grid">
          <article className="partner-command-feature"><span className="partner-kicker">ESTADO DA RELAÇÃO</span><strong>Em actividade</strong><p>Acompanhe a actividade publicada, os pedidos submetidos e os serviços disponíveis à sua conta.</p><div><Link href="/parceiro/oportunidades" className="partner-primary-action">Gerir publicações →</Link><Link href="/parceiro/publicidade" className="partner-command-link">Ver exposição</Link></div></article>
          <article className="partner-command-action"><span>PRÓXIMA ACÇÃO</span><strong>{next.label}</strong><small>{next.kind}</small><Link href={next.href}>Abrir →</Link></article>
        </section>

        <section className="partner-home-metrics">
          <article><span>Publicações activas da conta</span><strong>{opportunitiesError ? "—" : published}</strong><small>{opportunitiesError ? "Dados indisponíveis" : drafts + " rascunho(s)"}</small></article>
          <article><span>Campanhas activas</span><strong>{campaignsError ? "—" : activeCampaigns}</strong><small>Publicidade e exposição</small></article>
          <article><span>Pedidos submetidos por si</span><strong>{requestsError ? "—" : pending}</strong><small>Não representa pedidos de outros gestores</small></article>
          <article><span>Benefícios activos da conta</span><strong>{entitlementsError ? "—" : benefits}</strong><small>Benefícios atribuídos à organização</small></article>
        </section>

        <div className="partner-home-columns">
          <section className="partner-home-panel">
            <div className="partner-home-panel-head"><div><span className="partner-kicker">ACTIVIDADE DA CONTA</span><h2>Publicações recentes</h2></div><Link href="/parceiro/oportunidades">Ver todas →</Link></div>
            {opportunitiesError ? <div className="partner-home-empty"><strong>Não foi possível carregar as publicações.</strong><p>Os dados não estão disponíveis neste momento.</p></div> : opportunities?.length ? <div className="partner-home-list">{opportunities.slice(0, 5).map((x) => <Link href={"/parceiro/oportunidades/" + x.id} key={x.id}><div><span>{x.status} · {x.type || "OPORTUNIDADE"}</span><strong>{x.title}</strong><small>{x.location || "Localização não indicada"} · {date(x.created_at)}</small></div><b>→</b></Link>)}</div> : <div className="partner-home-empty"><strong>A conta ainda não tem publicações.</strong><p>Publique uma oportunidade, chamada, financiamento ou programa.</p><Link href="/parceiro/oportunidades/nova" className="partner-primary-action">Publicar agora →</Link></div>}
          </section>
          <section className="partner-home-panel">
            <div className="partner-home-panel-head"><div><span className="partner-kicker">VALOR</span><h2>Serviços da conta</h2></div><Link href="/parceiro/servicos">Catálogo →</Link></div>
            <div className="partner-value-stack">
              <Link href="/parceiro/publicidade"><span>01 · EXPOSIÇÃO</span><strong>{campaignsError ? "Dados indisponíveis" : activeCampaigns ? activeCampaigns + " campanha(s) activa(s)" : "Ainda sem campanha activa"}</strong><small>Publicidade, patrocínios e posicionamento perante o público.</small></Link>
              <Link href="/parceiro/inteligencia"><span>02 · INDICADORES</span><strong>Actividade e dados disponíveis</strong><small>Consulte os indicadores operacionais existentes, sem confundi-los com estudos de mercado.</small></Link>
              <Link href="/parceiro/resultados"><span>03 · HISTÓRICO</span><strong>Publicações e actividade registada</strong><small>Consulte os registos disponíveis e identifique o que exige seguimento.</small></Link>
            </div>
          </section>
        </div>

        <section className="partner-home-panel partner-home-bottom"><div className="partner-home-panel-head"><div><span className="partner-kicker">COMO UTILIZAR</span><h2>O que pode fazer nesta área</h2></div></div><div className="partner-value-grid"><article><span>01</span><h3>PUBLICAR</h3><p>Coloque oportunidades e actividades da organização diante do mercado.</p><Link href="/parceiro/oportunidades">Gerir publicações →</Link></article><article><span>02</span><h3>POSICIONAR</h3><p>Solicite exposição, destaque e patrocínio nos espaços disponíveis.</p><Link href="/parceiro/publicidade">Ver formatos →</Link></article><article><span>03</span><h3>ACOMPANHAR</h3><p>Consulte pedidos, benefícios e indicadores que a plataforma já consegue comprovar.</p><Link href="/parceiro/servicos">Explorar serviços →</Link></article></div></section>
      </div>
    </main>
  );
}
