"use client";

import { useState } from "react";

type Product={id:string;name:string;placement:string;duration_days:number;direct_price_mzn:number|string;credit_price:number;description?:string|null};
const placementLabel:Record<string,string>={DIRECTORY:"Directório",MARKETPLACE:"Marketplace",HOME:"Página inicial"};
const locationOptions=["Maputo","Matola","Gaza","Inhambane","Sofala","Manica","Tete","Zambézia","Nampula","Cabo Delgado","Niassa"];
function money(v:number|string){return Number(v).toLocaleString("pt-MZ")+" MZN";}
function calculate(p:Product|undefined,l:number,c:number){if(!p)return{price:0,credits:0};const factor=1+(l?0.1:0)+(c?0.1:0);return{price:Number((Number(p.direct_price_mzn)*factor).toFixed(2)),credits:Math.ceil(Number(p.credit_price)*factor)};}

export function AdvertisingPurchaseForm({businesses,products,categories,wallets,creditAction,directAction}:{businesses:{id:string;name:string}[];products:Product[];categories:{name:string}[];wallets:Record<string,number>;creditAction:(f:FormData)=>Promise<void>;directAction:(f:FormData)=>Promise<void>}){
 const first=products[0]; const [productId,setProductId]=useState(first?.id??""); const [businessId,setBusinessId]=useState(businesses[0]?.id??""); const [locations,setLocations]=useState<string[]>([]); const [cats,setCats]=useState<string[]>([]);
 const product=products.find(p=>p.id===productId)??first; const calc=calculate(product,locations.length,cats.length);
 const toggle=(value:string,setter:(v:string[])=>void,current:string[])=>setter(current.includes(value)?current.filter(x=>x!==value):[...current,value]);
 return <div className="ad-campaign-builder">
  <div className="ad-builder-progress"><span className="active">01 <b>Campanha</b></span><span>02 <b>Audiência</b></span><span>03 <b>Pagamento</b></span></div>
  <form className="ad-builder-form">
   <section className="ad-builder-section"><div className="ad-builder-section-head"><span>01</span><div><h3>Defina a campanha</h3><p>Comece pela empresa e pelo espaço onde quer ganhar visibilidade.</p></div></div>
    <label className="ad-builder-field"><span>Empresa</span><select name="business_id" value={businessId} onChange={e=>setBusinessId(e.target.value)} required>{businesses.map(b=><option key={b.id} value={b.id}>{b.name} · {wallets[b.id]??0} créditos</option>)}</select></label>
    <input type="hidden" name="ad_product_id" value={productId}/>
    <div className="ad-builder-label"><span>Escolha o espaço</span><small>Seleccione uma opção para ver o preço.</small></div>
    <div className="ad-product-grid">{(["DIRECTORY","MARKETPLACE","HOME"] as const).map(place=><div className="ad-product-group" key={place}><strong>{placementLabel[place]}</strong><div>{products.filter(p=>p.placement===place).map(p=><button type="button" key={p.id} className={"ad-product-option"+(p.id===productId?" selected":"")} onClick={()=>setProductId(p.id)}><span>{p.name}</span><b>{p.duration_days} dias</b><em>{money(p.direct_price_mzn)}</em></button>)}</div></div>)}</div>
    <div className="ad-builder-two"><label className="ad-builder-field"><span>Início da campanha</span><input name="starts_at" type="datetime-local" required/></label><label className="ad-builder-field"><span>Nome da campanha <small>(opcional)</small></span><input name="title" placeholder="Ex.: Campanha institucional"/></label></div>
    <label className="ad-builder-field"><span>Oferta associada <small>(opcional)</small></span><input name="listing_id" placeholder="ID da oferta, se aplicável"/></label>
   </section>
   <section className="ad-builder-section"><div className="ad-builder-section-head"><span>02</span><div><h3>Escolha a audiência</h3><p>Segmentar por localização ou actividade aumenta o preço do mesmo espaço em 10% por tipo de critério.</p></div></div>
    <div className="ad-target-block"><div className="ad-builder-label"><span>Localização <small>+10%</small></span><small>{locations.length?locations.length+" seleccionada(s)":"Opcional"}</small></div><div className="ad-chip-grid">{locationOptions.map(v=><label key={v} className={"ad-chip"+(locations.includes(v)?" selected":"")}><input type="checkbox" name="target_location" value={v} checked={locations.includes(v)} onChange={()=>toggle(v,setLocations,locations)}/>{v}</label>)}</div></div>
    <div className="ad-target-block"><div className="ad-builder-label"><span>Actividade / categoria <small>+10%</small></span><small>{cats.length?cats.length+" seleccionada(s)":"Opcional"}</small></div><div className="ad-chip-grid">{categories.map(c=><label key={c.name} className={"ad-chip"+(cats.includes(c.name)?" selected":"")}><input type="checkbox" name="target_category" value={c.name} checked={cats.includes(c.name)} onChange={()=>toggle(c.name,setCats,cats)}/>{c.name}</label>)}</div></div>
   </section>
   <section className="ad-builder-summary"><div><span className="dashboard-kicker">03 · Resumo</span><h3>{product?.name??"Espaço publicitário"}</h3><p>{product?.duration_days??0} dias · {locations.length||cats.length?"Audiência segmentada":"Audiência geral"}</p></div><div className="ad-builder-price"><small>Valor estimado</small><strong>{money(calc.price)}</strong><span>ou {calc.credits.toLocaleString("pt-MZ")} créditos</span></div></section>
   <section className="ad-builder-actions"><div><strong>Como pretende pagar?</strong><p>Use o saldo de créditos ou solicite pagamento directo.</p></div><div className="ad-builder-buttons"><button className="btn primary" type="submit" formAction={creditAction}>Activar com créditos</button><button className="btn" type="submit" formAction={directAction}>Solicitar pagamento directo</button></div></section>
  </form>
 </div>;
}