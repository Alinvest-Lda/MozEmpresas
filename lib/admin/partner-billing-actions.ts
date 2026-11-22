"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSuperAdminContext } from "@/lib/auth/super-admin";

export async function linkPartnerBusiness(formData: FormData) {
  const accountId=String(formData.get("account_id")||"");
  const businessId=String(formData.get("business_id")||"");
  if(!z.string().uuid().safeParse(accountId).success || (businessId && !z.string().uuid().safeParse(businessId).success)) {
    redirect("/dashboard/admin/parceiros?billing=invalid");
  }
  const {supabase,authorized}=await getSuperAdminContext();
  if(!authorized) redirect("/login?next=/dashboard/admin/parceiros");
  const {error}=await supabase.rpc("admin_link_partner_business",{
    p_account_id:accountId,
    p_business_id:businessId||null,
  });
  if(error) {
    const code=["BUSINESS_ALREADY_LINKED_TO_PARTNER","BUSINESS_NOT_AVAILABLE","PARTNER_ACCOUNT_NOT_FOUND"].find(x=>error.message.includes(x))||"error";
    redirect("/dashboard/admin/parceiros?billing="+code);
  }
  revalidatePath("/dashboard/admin/parceiros");
  revalidatePath("/dashboard/admin/publicidade");
  redirect("/dashboard/admin/parceiros?billing=success");
}
