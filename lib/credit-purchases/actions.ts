"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export async function requestCreditPurchase(formData:FormData){
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)redirect("/login?next=/dashboard/monetizacao/creditos");
 const businessId=String(formData.get("business_id")||""), packageId=String(formData.get("package_id")||""), paymentMethod=String(formData.get("payment_method")||"DIRECT"), notes=String(formData.get("notes")||"").trim();
 if(!businessId||!packageId)redirect("/dashboard/monetizacao/creditos?error=purchase");
 const {data:owner}=await supabase.from("businesses").select("id").eq("id",businessId).eq("owner_id",user.id).maybeSingle();
 const {data:member}=await supabase.from("business_members").select("role").eq("business_id",businessId).eq("user_id",user.id).in("role",["owner","admin","operator"]).maybeSingle();
 if(!owner&&!member)redirect("/dashboard/monetizacao/creditos?error=purchase");
 const {data:pkg}=await supabase.from("credit_packages").select("id,credit_volume,price_mzn,active").eq("id",packageId).eq("active",true).maybeSingle();
 if(!pkg)redirect("/dashboard/monetizacao/creditos?error=purchase");
 const {error}=await supabase.from("credit_purchase_requests").insert({business_id:businessId,package_id:packageId,requester_user_id:user.id,amount_mzn:pkg.price_mzn,credits:pkg.credit_volume,payment_method:paymentMethod,notes:notes||null,status:"REQUESTED"});
 if(error)redirect("/dashboard/monetizacao/creditos?error=purchase");
 revalidatePath("/dashboard/monetizacao/creditos"); revalidatePath("/dashboard/admin/monetizacao/creditos"); redirect("/dashboard/monetizacao/creditos?success=purchase");
}