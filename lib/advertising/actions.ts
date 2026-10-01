"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const text = (v: FormDataEntryValue | null) => typeof v === "string" ? v.trim() : "";

async function auth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/publicidade");
  return { supabase, userId: user.id };
}

async function manages(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, businessId: string) {
  const { data: owner } = await supabase.from("businesses").select("id").eq("id", businessId).eq("owner_id", userId).maybeSingle();
  if (owner) return true;
  const { data: member } = await supabase.from("business_members").select("role").eq("business_id", businessId).eq("user_id", userId).in("role", ["owner","admin","operator"]).maybeSingle();
  return Boolean(member);
}

export async function purchaseAdCredits(formData: FormData) {
  const { supabase, userId } = await auth();
  const businessId = text(formData.get("business_id"));
  const productId = text(formData.get("ad_product_id"));
  const listingId = text(formData.get("listing_id")) || null;
  const title = text(formData.get("title"));
  const starts = new Date(text(formData.get("starts_at")));
  if (!businessId || !productId || Number.isNaN(starts.getTime()) || !(await manages(supabase,userId,businessId))) redirect("/dashboard/publicidade?error=invalid");
  const { data, error } = await supabase.rpc("purchase_promotion_with_credits", {
    p_business_id: businessId, p_ad_product_id: productId, p_listing_id: listingId,
    p_title: title || "Campanha publicitária", p_starts_at: starts.toISOString()
  });
  if (error) {
    const code = error.message.includes("INSUFFICIENT_CREDITS") ? "credits" : error.message.includes("NO_AVAILABILITY") ? "availability" : error.message.includes("FORBIDDEN") ? "forbidden" : "purchase";
    redirect("/dashboard/publicidade?error=" + code);
  }
  revalidatePath("/dashboard/publicidade");
  revalidatePath("/dashboard/admin/monetizacao");
  redirect("/dashboard/publicidade?success=credits&promotion=" + String(data?.promotion_id ?? ""));
}

export async function requestAdDirectPayment(formData: FormData) {
  const { supabase, userId } = await auth();
  const businessId = text(formData.get("business_id"));
  const productId = text(formData.get("ad_product_id"));
  const listingId = text(formData.get("listing_id")) || null;
  const title = text(formData.get("title"));
  const starts = new Date(text(formData.get("starts_at")));
  if (!businessId || !productId || Number.isNaN(starts.getTime()) || !(await manages(supabase,userId,businessId))) redirect("/dashboard/publicidade?error=invalid");
  const { data: product } = await supabase.from("ad_products").select("id,name,placement,duration_days,direct_price_mzn,capacity").eq("id",productId).eq("active",true).maybeSingle();
  if (!product) redirect("/dashboard/publicidade?error=product");
  const ends = new Date(starts.getTime() + product.duration_days * 86400000);
  const { count } = await supabase.from("business_promotions").select("id",{count:"exact",head:true}).eq("ad_product_id",product.id).in("status",["PENDING","ACTIVE"]).lt("starts_at",ends.toISOString()).gt("ends_at",starts.toISOString());
  if ((count ?? 0) >= product.capacity) redirect("/dashboard/publicidade?error=availability");
  const { error } = await supabase.from("business_promotions").insert({
    business_id: businessId, listing_id: listingId, title: title || product.name,
    placement: product.placement, status: "PENDING", starts_at: starts.toISOString(), ends_at: ends.toISOString(),
    budget: product.direct_price_mzn, currency: "MZN", ad_product_id: product.id, payment_method: "DIRECT", price_mzn: product.direct_price_mzn
  });
  if (error) redirect("/dashboard/publicidade?error=purchase");
  revalidatePath("/dashboard/publicidade");
  revalidatePath("/dashboard/admin/monetizacao");
  redirect("/dashboard/publicidade?success=direct");
}
