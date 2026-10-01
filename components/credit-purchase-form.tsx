"use client";

import { useState } from "react";
import { requestCreditPurchase } from "@/lib/credit-purchases/actions";

type Package={id:string;code:string;name:string;credit_volume:number;price_mzn:number|string};
function money(v:number|string){return Number(v).toLocaleString("pt-MZ",{minimumFractionDigits:2,maximumFractionDigits:2})+" MZN";}
export function CreditPurchaseForm({businesses,packages}:{businesses:{id:string;name:string}[];packages:Package[]}){
 const [packageId,setPackageId]=useState(packages[0]?.id??""); const [businessId,setBusinessId]=useState(businesses[0]?.id??""); const selected=packages.find(p=>p.id===packageId)??packages[0];
 if(!packages.length||!businesses.length)return null;
 return <form action={requestCreditPurchase} className="credit-purchase-form">
  <input type="hidden" name="package_id" value={packageId}/><input type="hidden" name="business_id" value={businessId}/>
  <section className="credit-purchase-panel">
   <div className="credit-purchase-heading"><div><span className="dashboard-kicker">1 · Empresa</span><h3>Onde quer carregar os créditos?</h3></div><select value={businessId} onChange={e=>setBusinessId(e.target.value)} aria-label="Empresa">{businesses.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
   <div className="credit-package-grid">{packages.map(p=><button key={p.id} type="button" className={"credit-package-option"+(p.id===packageId?" selected":"")} onClick={()=>setPackageId(p.id)}><span>{p.name}</span><strong>{p.credit_volume.toLocaleString("pt-MZ")}</strong><small>créditos</small><b>{money(p.price_mzn)}</b><em>{(Number(p.price_mzn)/p.credit_volume).toLocaleString("pt-MZ",{minimumFractionDigits:2,maximumFractionDigits:2})} MZN/crédito</em></button>)}</div>
  </section>
  <section className="credit-purchase-checkout"><div><span className="dashboard-kicker">2 · Pagamento</span><h3>{selected?.name}</h3><p>{selected?.credit_volume.toLocaleString("pt-MZ")} créditos · {money(selected?.price_mzn??0)}</p></div>
   <div className="credit-checkout-fields"><label>Forma de pagamento<select name="payment_method" defaultValue="MPESA"><option value="MPESA">M-Pesa</option><option value="BANK_TRANSFER">Transferência bancária</option><option value="OTHER">Outro / combinar</option></select></label><label>Observação <span>(opcional)</span><input name="notes" placeholder="Referência ou instrução adicional"/></label></div>
   <div className="credit-checkout-action"><p>O pedido fica registado para confirmação. O saldo só é creditado após confirmação do pagamento.</p><button className="btn primary" type="submit">Solicitar compra →</button></div>
  </section>
 </form>;
}