"use client";
import { useActionState } from "react";
import Link from "next/link";
import { purchasePlatformService } from "@/lib/services/checkout-actions";
type Business={id:string;name:string}; type State={success?:boolean;error?:string;orderId?:string;pending?:boolean};
export function PlatformServiceRequestForm({serviceId,businesses,price}:{serviceId:string;businesses:Business[];price:number|string|null}){
 const [state,action,pending]=useActionState<State,FormData>(async(_,f)=>await purchasePlatformService(f),{});
 if(state.success)return <div className="service-request-success" role="status"><span className="service-success-icon">✓</span><div><strong>{state.pending?"Pagamento M-Pesa registado.":"Compra concluída."}</strong><p>{state.pending?"Conclua o pagamento M-Pesa conforme as instruções da plataforma. O serviço será activado após confirmação.":"O serviço foi adquirido e o valor foi registado na gestão financeira."} <Link href="/dashboard/financeiro">Ver gestão financeira</Link></p></div></div>;
 return <form action={action} className="service-request-form"><input type="hidden" name="serviceId" value={serviceId}/><div className="service-form-heading"><span className="dashboard-kicker">Comprar este serviço</span><h3>Activação self-service</h3><p>Escolha a empresa e pague com créditos ou M-Pesa. Não é necessário enviar uma solicitação para obter uma cotação.</p></div>
 {businesses.length?<label><span>Empresa</span><select name="businessId" defaultValue={businesses[0].id}>{businesses.map(b=><option value={b.id} key={b.id}>{b.name}</option>)}</select></label>:<p className="service-form-error">Associe uma empresa antes de comprar.</p>}
 <div className="service-checkout-price"><span>Preço actual</span><strong>{price==null?"Indisponível":Number(price).toLocaleString("pt-MZ")+" MZN"}</strong></div>
 <label><span>Forma de pagamento</span><select name="paymentMethod" defaultValue="CREDITS"><option value="CREDITS">Créditos</option><option value="MPESA">M-Pesa</option></select></label>
 {state.error?<p className="service-form-error">{state.error}</p>:null}<div className="service-form-submit"><div><strong>Compra self-service</strong><span>O débito de créditos é atómico; M-Pesa fica pendente até confirmação.</span></div><button className="btn primary" type="submit" disabled={pending||!businesses.length||price==null}>{pending?"A processar…":"Comprar agora →"}</button></div></form>;
}