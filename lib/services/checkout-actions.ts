"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
const text=(v:FormDataEntryValue|null)=>typeof v==="string"?v.trim():"";
async function access(s:SupabaseClient,uid:string,bid:string){const {data:o}=await s.from("businesses").select("id").eq("id",bid).eq("owner_id",uid).maybeSingle();if(o)return true;const {data:m}=await s.from("business_members").select("role").eq("business_id",bid).eq("user_id",uid).in("role",["owner","admin","operator"]).maybeSingle();return !!m;}
export async function purchasePlatformService(formData:FormData){
 const s=await createClient();const {data:{user}}=await s.auth.getUser();if(!user)redirect("/login");
 const serviceId=text(formData.get("serviceId")),businessId=text(formData.get("businessId")),method=text(formData.get("paymentMethod"))||"CREDITS";
 if(!serviceId||!businessId||!(await access(s,user.id,businessId)))return {error:"Não tem autorização para esta compra."};
 const {data:service}=await s.from("platform_services").select("id,name,price,currency,billing").eq("id",serviceId).eq("active",true).maybeSingle();
 if(!service||service.price==null||Number(service.price)<=0)return {error:"Este serviço ainda não está disponível para compra self-service."};
 if(method==="CREDITS"){
  const {data,error}=await s.rpc("purchase_platform_service_with_credits",{p_service_id:serviceId,p_business_id:businessId,p_user_id:user.id});
  if(error)return {error:error.message.includes("INSUFFICIENT_CREDITS")?"Créditos insuficientes.":error.message.includes("NO_WALLET")?"Esta empresa ainda não tem carteira de créditos.":"Não foi possível concluir a compra."};
  revalidatePath("/dashboard/servicos");revalidatePath("/dashboard/financeiro");revalidatePath("/dashboard/monetizacao/creditos");return {success:true,orderId:String(data)};
 }
 if(method!=="MPESA")return {error:"Meio de pagamento não suportado."};
 const {data:order,error}=await s.from("platform_service_orders").insert({service_id:serviceId,business_id:businessId,requester_user_id:user.id,amount_mzn:service.price,currency:service.currency||"MZN",payment_method:"MPESA",credits_charged:0,status:"PENDING_PAYMENT"}).select("id").single();
 if(error||!order)return {error:"Não foi possível criar o pagamento M-Pesa."};
 await s.from("financial_payments").insert({business_id:businessId,user_id:user.id,amount_mzn:service.price,currency:service.currency||"MZN",method:"MPESA",status:"PENDING",reference:"SERVICE:"+order.id});
 revalidatePath("/dashboard/servicos");revalidatePath("/dashboard/financeiro");return {success:true,orderId:String(order.id),pending:true};
}