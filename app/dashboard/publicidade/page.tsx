export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { purchaseAdCredits, requestAdDirectPayment } from "@/lib/advertising/actions";

const placement: Record<string, string> = {
  DIRECTORY: "Directório",
  MARKETPLACE: "Marketplace",
  HOME: "Página inicial",
};
const locations = ["Maputo","Matola","Gaza","Inhambane","Sofala","Manica","Tete","Zambézia","Nampula","Cabo Delgado","Niassa"];

function money(value: number | string | null | undefined) {
  if (value == null) return "—";
  return Number(value).toLocaleString("pt-MZ") + " MZN";
}

function credits(value: number | null | undefined) {
  return value == null ? "—" : value.toLocaleString("pt-MZ") + " cr";
}

export default async function PublicidadePage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: owned }, { data: members }, { data: products }, { data: promotions }, { data: categories }] = await Promise.all([
    supabase.from("businesses").select("id,name").eq("owner_id", user.id).order("name"),
    supabase.from("business_members").select("business_id").eq("user_id", user.id).in("role", ["owner","admin","operator"]),
    supabase.from("ad_products").select("id,name,placement,description,duration_days,direct_price_mzn,credit_price,capacity,access_type,audience_level").eq("active", true).order("placement").order("duration_days"),
    supabase.from("business_promotions").select("id,title,placement,status,starts_at,ends_at,payment_method,price_mzn,credits_charged,businesses:business_id(name)").order("created_at", { ascending: false }).limit(20),
    supabase.from("business_categories").select("name").order("name"),
  ]);

  const ids = [...new Set((members ?? []).map(x => x.business_id))];
  const { data: managed } = ids.length
    ? await supabase.from("businesses").select("id,name").in("id", ids).order("name")
    : { data: [] as { id: string; name: string }[] };

  const businesses = [
    ...(owned ?? []),
    ...(managed ?? []).filter(b => !(owned ?? []).some(o => o.id === b.id)),
  ];
  const { data: wallets } = businesses.length
    ? await supabase.from("business_credit_wallets").select("business_id,balance_credits").in("business_id", businesses.map(b => b.id))
    : { data: [] as { business_id: string; balance_credits: number }[] };
  const wallet = new Map((wallets ?? []).map(w => [w.business_id, w.balance_credits]));
  const paidProducts = (products ?? []).filter(p => p.access_type !== "FREE");

  const flash =
    params.success === "credits" ? "Publicidade activada e créditos debitados."
    : params.success === "direct" ? "Pedido de pagamento directo criado e aguarda confirmação."
    : params.error === "credits" ? "Créditos insuficientes. Recarregue a conta."
    : params.error === "availability" ? "O espaço está ocupado nesse período. Escolha outra data."
    : params.error ? "Não foi possível concluir a operação. Verifique os dados."
    : "";

  return (
    <main className="dashboard-main">
      <div className="dashboard-content">
        {flash && <div className="card" style={{ marginBottom: 18 }}><strong>{flash}</strong></div>}

        <header className="dashboard-topbar">
          <div>
            <span className="dashboard-kicker">Trabalho · Publicidade</span>
            <h1>Publicidade</h1>
            <p>Compre visibilidade adicional para a sua empresa nos espaços publicitários limitados do MozEmpresas. A presença normal no ecossistema continua gratuita.</p>
          </div>
          <Link className="btn" href="/dashboard/monetizacao/creditos">Gerir créditos →</Link>
        </header>

        <section className="dashboard-section" style={{ marginTop: 18 }}>
          <div className="dashboard-section-head">
            <div>
              <span className="dashboard-kicker">Primeiro, uma distinção importante</span>
              <h2>Presença da empresa ≠ publicidade</h2>
              <p>O MozEmpresas não cobra para uma empresa existir no Directório ou apresentar os seus produtos e serviços. A publicidade é uma camada adicional para ganhar prioridade de exposição.</p>
            </div>
          </div>
          <div className="grid" style={{ gridTemplateColumns: "repeat(2,minmax(0,1fr))" }}>
            <div className="card">
              <span className="dashboard-kicker">Incluído</span>
              <h3>Presença orgânica</h3>
              <p className="muted">Directório e Marketplace permanecem acessíveis sem compra de publicidade.</p>
              <strong>Gratuito</strong>
            </div>
            <div className="card">
              <span className="dashboard-kicker">Opcional</span>
              <h3>Publicidade</h3>
              <p className="muted">Compra de espaços limitados para dar maior visibilidade à empresa, oferta ou campanha.</p>
              <strong>Pago por campanha</strong>
            </div>
          </div>
        </section>

        <section className="dashboard-section" style={{ marginTop: 18 }}>
          <div className="dashboard-section-head">
            <div>
              <span className="dashboard-kicker">Tabela comercial</span>
              <h2>Preçário de publicidade</h2>
              <p>Os preços abaixo referem-se exclusivamente a espaços publicitários. A segmentação é um adicional sobre o mesmo espaço.</p>
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <strong>Publicidade geral</strong>
                <p className="muted" style={{ margin: "4px 0 0" }}>A campanha pode alcançar a audiência elegível do espaço, sem critérios adicionais.</p>
              </div>
              <span className="dashboard-kicker">Preço base</span>
            </div>
          </div>

          {(["DIRECTORY", "MARKETPLACE", "HOME"] as const).map(p => {
            const rows = paidProducts.filter(x => x.placement === p);
            if (!rows.length) return null;
            return (
              <div key={p} style={{ marginTop: 18 }}>
                <div style={{ marginBottom: 8 }}>
                  <span className="dashboard-kicker">{placement[p]}</span>
                  <h3 style={{ margin: "4px 0" }}>Espaços disponíveis</h3>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr>
                        <th style={{ textAlign: "left", padding: 10 }}>Espaço</th>
                        <th style={{ textAlign: "center", padding: 10 }}>Duração</th>
                        <th style={{ textAlign: "right", padding: 10 }}>Pagamento directo</th>
                        <th style={{ textAlign: "right", padding: 10 }}>Créditos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(x => (
                        <tr key={x.id} style={{ borderTop: "1px solid #eee" }}>
                          <td style={{ padding: 10 }}>
                            <strong>{x.name}</strong>
                            {x.description && <><br /><small className="muted">{x.description}</small></>}
                          </td>
                          <td style={{ textAlign: "center", padding: 10 }}>{x.duration_days} dias</td>
                          <td style={{ textAlign: "right", padding: 10 }}>{money(x.direct_price_mzn)}</td>
                          <td style={{ textAlign: "right", padding: 10 }}><strong>{credits(x.credit_price)}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          <div className="card" style={{ marginTop: 20 }}>
            <span className="dashboard-kicker">Adicional de segmentação</span>
            <h3>Direccione a mesma publicidade</h3>
            <p className="muted">Não criamos banners adicionais. A campanha usa o mesmo inventário, mas pode receber prioridade perante uma audiência definida.</p>
            <div className="grid" style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))", marginTop: 12 }}>
              <div><strong>Geral</strong><p className="muted">Preço base</p></div>
              <div><strong>1 critério · +10%</strong><p className="muted">Localização ou actividade</p></div>
              <div><strong>2 critérios · +20%</strong><p className="muted">Localização + actividade</p></div>
            </div>
          </div>
        </section>

        <section className="dashboard-section" style={{ marginTop: 18 }}>
          <div className="dashboard-section-head">
            <div>
              <span className="dashboard-kicker">Compra self-service</span>
              <h2>Escolher e activar uma campanha</h2>
              <p>Escolha a empresa, o espaço, a data e, se quiser, a audiência. O sistema calcula o custo final da segmentação.</p>
            </div>
          </div>

          {businesses.length ? (
            <div className="grid" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" }}>
              <div className="card">
                <span className="dashboard-kicker">Opção 1</span>
                <h3>Comprar com créditos</h3>
                <p className="muted">O saldo é debitado apenas quando há disponibilidade e todos os critérios são válidos.</p>
                <form action={purchaseAdCredits} style={{ display: "grid", gap: 12, marginTop: 14 }}>
                  <label>Empresa<select name="business_id" required defaultValue={businesses[0].id}>{businesses.map(b => <option value={b.id} key={b.id}>{b.name} — {wallet.get(b.id) ?? 0} cr</option>)}</select></label>
                  <label>Espaço<select name="ad_product_id" required>{paidProducts.map(p => <option value={p.id} key={p.id}>{p.name} · {p.duration_days} dias · {money(p.direct_price_mzn)}</option>)}</select></label>
                  <label>Oferta associada (opcional)<input name="listing_id" placeholder="ID da oferta" /></label>
                  <label>Campanha<input name="title" placeholder="Ex.: Campanha institucional" /></label>
                  <label>Início<input name="starts_at" type="datetime-local" required /></label>
                  <fieldset className="card" style={{ display: "grid", gap: 10, margin: 0 }}>
                    <legend><strong>Segmentação opcional</strong></legend>
                    <small className="muted">Localização e actividade aumentam o preço em 10% cada.</small>
                    <span className="dashboard-kicker">Localização</span>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>{locations.map(v => <label key={v}><input type="checkbox" name="target_location" value={v} /> {v}</label>)}</div>
                    <span className="dashboard-kicker">Actividade</span>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>{(categories ?? []).map(c => <label key={c.name}><input type="checkbox" name="target_category" value={c.name} /> {c.name}</label>)}</div>
                  </fieldset>
                  <button className="btn primary" type="submit">Comprar com créditos →</button>
                  <Link className="text-link" href="/dashboard/monetizacao/creditos">Recarregar conta de créditos →</Link>
                </form>
              </div>

              <div className="card">
                <span className="dashboard-kicker">Opção 2</span>
                <h3>Pagamento directo</h3>
                <p className="muted">Registe o pedido. A campanha só fica activa depois da confirmação do pagamento.</p>
                <form action={requestAdDirectPayment} style={{ display: "grid", gap: 12, marginTop: 14 }}>
                  <input type="hidden" name="business_id" value={businesses[0].id} />
                  <label>Espaço<select name="ad_product_id" required>{paidProducts.map(p => <option value={p.id} key={p.id}>{p.name} · {p.duration_days} dias · {money(p.direct_price_mzn)}</option>)}</select></label>
                  <label>Início<input name="starts_at" type="datetime-local" required /></label>
                  <label>Campanha<input name="title" placeholder="Ex.: Campanha institucional" /></label>
                  <fieldset className="card" style={{ display: "grid", gap: 10, margin: 0 }}>
                    <legend><strong>Segmentação opcional</strong></legend>
                    <small className="muted">Localização e actividade aumentam o preço em 10% cada.</small>
                    <span className="dashboard-kicker">Localização</span>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>{locations.map(v => <label key={v}><input type="checkbox" name="target_location" value={v} /> {v}</label>)}</div>
                    <span className="dashboard-kicker">Actividade</span>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>{(categories ?? []).map(c => <label key={c.name}><input type="checkbox" name="target_category" value={c.name} /> {c.name}</label>)}</div>
                  </fieldset>
                  <button className="btn" type="submit">Registar pagamento directo →</button>
                </form>
              </div>
            </div>
          ) : (
            <div className="card"><strong>Associe uma empresa primeiro.</strong><p className="muted">É necessário representar uma empresa para comprar publicidade.</p><Link href="/dashboard/empresas" className="btn primary">Gerir presença da empresa →</Link></div>
          )}
        </section>

        <section className="dashboard-section" style={{ marginTop: 18 }}>
          <div className="dashboard-section-head">
            <div>
              <span className="dashboard-kicker">Operação</span>
              <h2>Campanhas da sua empresa</h2>
              <p>Aqui ficam os pedidos e campanhas publicitárias; os serviços MozEmpresas têm o seu próprio espaço.</p>
            </div>
            <Link href="/dashboard/servicos" className="text-link">Ver Serviços MozEmpresas →</Link>
          </div>
          {(promotions ?? []).length ? (promotions ?? []).map(p => {
            const b = Array.isArray(p.businesses) ? p.businesses[0] : p.businesses;
            return (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "14px 0", borderTop: "1px solid #eee" }}>
                <div>
                  <strong>{p.title}</strong>
                  <div className="muted">{b?.name || "Empresa"} · {placement[p.placement] || p.placement} · {p.payment_method === "CREDITS" ? String(p.credits_charged ?? 0) + " créditos" : String(p.price_mzn ?? 0) + " MZN"}</div>
                </div>
                <span>{p.status}</span>
              </div>
            );
          }) : <p className="muted">Ainda não existem campanhas publicitárias.</p>}
        </section>
      </div>
    </main>
  );
}
