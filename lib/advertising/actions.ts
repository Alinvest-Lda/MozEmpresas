"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  calculateCampaignPrice,
  isUuid,
  normalizeCampaignTargets,
  parseMaputoCampaignStart,
} from "@/lib/advertising/purchase-validation";

const text = (v: FormDataEntryValue | null) => typeof v === "string" ? v.trim() : "";

async function auth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard/publicidade");
  return { supabase, userId: user.id };
}

async function manages(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, businessId: string) {
  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .select("id,owner_id")
    .eq("id", businessId)
    .is("archived_at", null)
    .maybeSingle();
  if (businessError || !business) return false;
  if (business.owner_id === userId) return true;
  const { data: member, error: memberError } = await supabase
    .from("business_members")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .in("role", ["owner", "admin", "operator"])
    .maybeSingle();
  return !memberError && Boolean(member);
}

function purchaseInput(formData: FormData) {
  const businessId = text(formData.get("business_id"));
  const productId = text(formData.get("ad_product_id"));
  const listingValue = text(formData.get("listing_id"));
  const title = text(formData.get("title"));
  const startsAt = parseMaputoCampaignStart(text(formData.get("starts_at")));
  const locations = normalizeCampaignTargets(formData.getAll("target_location"));
  const categories = normalizeCampaignTargets(formData.getAll("target_category"));

  if (
    !isUuid(businessId) || !isUuid(productId) ||
    (listingValue !== "" && !isUuid(listingValue)) ||
    (title.length > 160) || !startsAt || !locations || !categories
  ) return null;

  return {
    businessId,
    productId,
    listingId: listingValue || null,
    title: title || "Campanha publicitária",
    startsAt,
    locations,
    categories,
  };
}

function purchaseErrorCode(message: string) {
  if (message.includes("INSUFFICIENT_CREDITS")) return "credits";
  if (message.includes("NO_AVAILABILITY")) return "availability";
  if (message.includes("FORBIDDEN")) return "forbidden";
  if (message.includes("LISTING_NOT_AVAILABLE")) return "listing";
  if (message.includes("INVALID_CAMPAIGN")) return "invalid";
  return "purchase";
}

export async function purchaseAdCredits(formData: FormData) {
  const { supabase, userId } = await auth();
  const input = purchaseInput(formData);
  if (!input || !(await manages(supabase, userId, input.businessId))) {
    redirect("/dashboard/publicidade?error=invalid");
  }

  const { data, error } = await supabase.rpc("purchase_promotion_with_credits", {
    p_business_id: input.businessId,
    p_ad_product_id: input.productId,
    p_listing_id: input.listingId,
    p_title: input.title,
    p_starts_at: input.startsAt,
    p_locations: input.locations,
    p_categories: input.categories,
  });
  if (error) redirect("/dashboard/publicidade?error=" + purchaseErrorCode(error.message));

  revalidatePath("/dashboard/publicidade");
  revalidatePath("/dashboard/admin/monetizacao");
  redirect("/dashboard/publicidade?success=credits&promotion=" + String(data?.promotion_id ?? ""));
}

export async function requestAdMpesaPayment(formData: FormData) {
  const { supabase, userId } = await auth();
  const input = purchaseInput(formData);
  if (!input || !(await manages(supabase, userId, input.businessId))) {
    redirect("/dashboard/publicidade?error=invalid");
  }

  const { data, error } = await supabase.rpc("request_promotion_with_mpesa", {
    p_business_id: input.businessId,
    p_ad_product_id: input.productId,
    p_listing_id: input.listingId,
    p_title: input.title,
    p_starts_at: input.startsAt,
    p_locations: input.locations,
    p_categories: input.categories,
  });
  if (error) redirect("/dashboard/publicidade?error=" + purchaseErrorCode(error.message));

  revalidatePath("/dashboard/publicidade");
  revalidatePath("/dashboard/admin/monetizacao");
  redirect("/dashboard/publicidade?success=mpesa&promotion=" + String(data?.promotion_id ?? ""));
}
