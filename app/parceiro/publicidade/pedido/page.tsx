export const dynamic="force-dynamic";
import{requirePartnerAccount}from"@/lib/auth/access";
import{PartnerPage,PartnerSection,PartnerEmpty}from"@/components/partner-workspace";
import{PartnerAdRequestForm}from"@/components/partner-actions";
export default async function PartnerAdRequest({searchParams}:{searchParams:Promise<{produto?:string}>}){
 const q=await searchParams;
 const{supabase:s}=await requirePartnerAccount();
 const{data,error}=await s.rpc("partner_ad_products_list");
 const p=(data??[]).find((x:any)=>x.id===q.produto)||data?.[0];
 return <PartnerPage eyebrow="Crescimento · Pedido" title="Configurar publicidade" description="Defina a campanha, período e público. O pedido será analisado antes da activação." action={{href:"/parceiro/publicidade",label:"Voltar aos espaços"}}>
  {error?<div className="notice" role="alert">Não foi possível carregar os formatos publicitários. Actualize a página ou volte ao catálogo.</div>:p?<PartnerSection eyebrow="Formato seleccionado" title={p.name} description={p.description}><PartnerAdRequestForm productId={p.id} productName={p.name} productPrice={p.price_mzn==null?null:Number(p.price_mzn)} durationDays={p.duration_days==null?null:Number(p.duration_days)} creditPrice={p.credit_price==null?null:Number(p.credit_price)} creditPaymentAvailable={Boolean(p.credit_payment_available)}/></PartnerSection>:<PartnerEmpty title="Sem formatos publicitários activos" text="Não existem formatos disponíveis para pedido neste momento." href="/parceiro/publicidade" label="Voltar ao catálogo"/>}
 </PartnerPage>
}