"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export async function requestCreditPurchase(formData:FormData){
 const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)redirect("/login?next=/dashboard/monetizacao/creditos");
 const businessId=String(formData.get("business_id")||""),packageId=String(formData.get("package_id")||""),paymentMethod=String(formData.get("payment_method")||"MPESA"),notes=String(formData.get("notes")||"").trim();
 if(!businessId||!packageId||!["MPESA","BANK_TRANSFER"].includes(paymentMethod))redirect("/dashboard/monetizacao/creditos?error=purchase");
 const file=formData.get("proof"); if(paymentMethod==="BANK_TRANSFER" && (!(file instanceof File)||file.size===0))redirect("/dashboard/monetizacao/creditos?error=proof");
 const {data:pkg}=await supabase.from("credit_packages").select("id,price_mzn,credit_volume").eq("id",packageId).eq("active",true).maybeSingle(); if(!pkg)redirect("/dashboard/monetizacao/creditos?error=purchase");
 const {data:owner}=await supabase.from("businesses").select("id").eq("id",businessId).eq("owner_id",user.id).maybeSingle();
 const {data:member}=await supabase.from("business_members").select("role").eq("business_id",businessId).eq("user_id",user.id).in("role",["owner","admin","operator"]).maybeSingle();
 if(!owner&&!member)redirect("/dashboard/monetizacao/creditos?error=forbidden");
 let proofPath:string|null=null;
 if(file instanceof File&&file.size>0){const ext=(file.name.split(".").pop()||"bin").toLowerCase();proofPath=user.id+"/"+crypto.randomUUID()+"."+ext;const {error}=await supabase.storage.from("payment-proofs").upload(proofPath,file,{contentType:file.type||"application/octet-stream",upsert:false});if(error)redirect("/dashboard/monetizacao/creditos?error=proof");}
 const {error}=await supabase.from("credit_purchase_requests").insert({business_id:businessId,package_id:packageId,requester_user_id:user.id,amount_mzn:pkg.price_mzn,credits:pkg.credit_volume,payment_method:paymentMethod,notes:notes||null,status:"REQUESTED",proof_path:proofPath});
 if(error){if(proofPath)await supabase.storage.from("payment-proofs").remove([proofPath]);redirect("/dashboard/monetizacao/creditos?error=purchase");}
 revalidatePath("/dashboard/monetizacao/creditos");revalidatePath("/dashboard/financeiro");revalidatePath("/dashboard/admin/monetizacao/creditos");redirect("/dashboard/monetizacao/creditos?success=purchase");
}