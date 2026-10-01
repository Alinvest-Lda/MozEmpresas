"use client";

import { useMemo } from "react";

type Product = {
  id: string; name: string; placement: string; duration_days: number;
  direct_price_mzn: number | string; credit_price: number; description?: string | null;
};

const placementLabel: Record<string,string> = {
  DIRECTORY: "Directório", MARKETPLACE: "Marketplace", HOME: "Página inicial",
};

const locations = ["Maputo","Matola","Gaza","Inhambane","Sofala","Manica","Tete","Zambézia","Nampula","Cabo Delgado","Niassa"];

function money(value: number | string) {
  return Number(value).toLocaleString("pt-MZ") + " MZN";
}

function calculate(product: Product | undefined, locationCount: number, categoryCount: number) {
  if (!product) return { factor: 1, price: 0, credits: 0 };
  const factor = 1 + (locationCount ? 0.10 : 0) + (categoryCount ? 0.10 : 0);
  return {
    factor,
    price: Number((Number(product.direct_price_mzn) * factor).toFixed(2)),
    credits: Math.ceil(Number(product.credit_price) * factor),
  };
}

export function AdvertisingPurchaseForm({
  businesses, products, categories, wallets, creditAction, directAction,
}: {
  businesses: { id: string; name: string }[];
  products: Product[];
  categories: { name: string }[];
  wallets: Record<string, number>;
  creditAction: (formData: FormData) => void | Promise<void>;
  directAction: (formData: FormData) => void | Promise<void>;
}) {
  const first = products[0];
  const defaultBusiness = businesses[0]?.id ?? "";
  const selectedProduct = useMemo(() => first, [first]);
  const price = calculate(selectedProduct, 0, 0);

  return (
    <div className="card">
      <div style={{display:"grid",gap:6}}>
        <span className="dashboard-kicker">Activação self-service</span>
        <h2 style={{margin:0}}>Monte a sua campanha</h2>
        <p className="muted" style={{margin:0}}>Escolha as opções. O custo final é calculado automaticamente, sem precisar consultar tabelas.</p>
      </div>

      <form style={{display:"grid",gap:16,marginTop:20}}>
        <div className="grid" style={{gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:14}}>
          <label>Empresa
            <select name="business_id" required defaultValue={defaultBusiness}>
              {businesses.map(b => <option key={b.id} value={b.id}>{b.name} — {wallets[b.id] ?? 0} cr</option>)}
            </select>
          </label>
          <label>Espaço publicitário
            <select name="ad_product_id" required defaultValue={first?.id}>
              {(["DIRECTORY","MARKETPLACE","HOME"] as const).map(place => (
                <optgroup key={place} label={placementLabel[place]}>
                  {products.filter(p => p.placement === place).map(p => (
                    <option key={p.id} value={p.id}>{p.name} · {p.duration_days} dias · {money(p.direct_price_mzn)}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        </div>

        <div className="grid" style={{gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:14}}>
          <label>Início
            <input name="starts_at" type="datetime-local" required />
          </label>
          <label>Oferta associada <span className="muted">(opcional)</span>
            <input name="listing_id" placeholder="ID da oferta, se aplicável" />
          </label>
        </div>

        <label>Nome da campanha <span className="muted">(opcional)</span>
          <input name="title" placeholder="Ex.: Campanha institucional" />
        </label>

        <details className="card" style={{margin:0}}>
          <summary style={{cursor:"pointer",fontWeight:700}}>Definir audiência <span className="muted">· opcional</span></summary>
          <p className="muted" style={{margin:"10px 0"}}>Cada tipo de critério acrescenta 10% ao preço. Vários valores dentro do mesmo tipo continuam a contar como um critério.</p>
          <div className="grid" style={{gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:14}}>
            <label>Localização
              <select name="target_location" multiple size={5}>
                {locations.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <small className="muted">Pode seleccionar várias.</small>
            </label>
            <label>Actividade / categoria
              <select name="target_category" multiple size={5}>
                {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
              <small className="muted">Pode seleccionar várias.</small>
            </label>
          </div>
        </details>

        <div className="card" style={{margin:0,background:"var(--surface-muted, #f7f7f7)"}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"center",flexWrap:"wrap"}}>
            <div><span className="dashboard-kicker">Cálculo</span><h3 style={{margin:"4px 0"}}>{money(price.price)}</h3><p className="muted" style={{margin:0}}>ou {price.credits.toLocaleString("pt-MZ")} créditos · preço base, sem segmentação</p></div>
            <div className="muted">Ajuste final após seleccionar a audiência.</div>
          </div>
        </div>

        <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
          <button className="btn primary" type="submit" formAction={creditAction}>Activar com créditos</button>
          <button className="btn" type="submit" formAction={directAction}>Solicitar pagamento directo</button>
        </div>
      </form>
    </div>
  );
}
