"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function text(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function number(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number(text(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function currentUser() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login?next=/marketplace");
  return { supabase, userId };
}

async function canManageBusiness(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, businessId: string) {
  const { data } = await supabase
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .or(`owner_id.eq.${userId}`)
    .maybeSingle();
  if (data) return true;

  const { data: member } = await supabase
    .from("business_members")
    .select("role")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .in("role", ["owner", "admin", "operator"])
    .maybeSingle();

  return Boolean(member);
}

export async function createListing(formData: FormData) {
  const { supabase, userId } = await currentUser();
  const title = text(formData.get("title"));
  const description = text(formData.get("description"));
  const type = text(formData.get("type")).toUpperCase();
  const businessId = text(formData.get("business_id"));
  const location = text(formData.get("location")) || null;
  const priceRaw = text(formData.get("price"));
  const price = priceRaw ? number(priceRaw, NaN) : null;

  if (!title || !description || !businessId || !["PRODUCT", "SERVICE"].includes(type)) {
    redirect("/marketplace?publish=error");
  }
  if (price !== null && (!Number.isFinite(price) || price < 0)) {
    redirect("/marketplace?publish=error");
  }
  if (!(await canManageBusiness(supabase, userId, businessId))) {
    redirect("/marketplace?publish=forbidden");
  }

  const base = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "oferta";
  const slug = `${base}-${crypto.randomUUID().slice(0, 8)}`;

  const { error } = await supabase.from("listings").insert({
    owner_id: userId,
    business_id: businessId,
    title,
    slug,
    description,
    type,
    price,
    currency: "MZN",
    status: "PUBLISHED",
    location,
  });

  redirect(error ? "/marketplace?publish=error" : "/marketplace?published=1");
}

export async function createOrder(formData: FormData) {
  const { supabase, userId } = await currentUser();
  const listingId = text(formData.get("listing_id"));
  const buyerBusinessId = text(formData.get("buyer_business_id")) || null;
  const quantity = number(formData.get("quantity"), 1);
  const notes = text(formData.get("notes")) || null;

  if (!listingId || quantity <= 0) redirect("/marketplace?order=error");

  const { data: listing } = await supabase
    .from("listings")
    .select("id,title,type,price,currency,business_id,owner_id,status")
    .eq("id", listingId)
    .eq("status", "PUBLISHED")
    .maybeSingle();

  if (!listing || listing.owner_id === userId || listing.price === null || listing.price < 0) {
    redirect("/marketplace?order=error");
  }

  if (buyerBusinessId && !(await canManageBusiness(supabase, userId, buyerBusinessId))) {
    redirect("/marketplace?order=forbidden");
  }

  const total = Number(listing.price) * quantity;
  const { data: order, error: orderError } = await supabase.from("commerce_orders").insert({
    buyer_user_id: userId,
    buyer_business_id: buyerBusinessId,
    status: "PENDING",
    currency: listing.currency || "MZN",
    subtotal: total,
    total,
    notes,
  }).select("id").single();

  if (orderError || !order) redirect("/marketplace?order=error");

  const { error: itemError } = await supabase.from("commerce_order_items").insert({
    order_id: order.id,
    listing_id: listing.id,
    seller_business_id: listing.business_id,
    title: listing.title,
    type: listing.type,
    quantity,
    unit_price: listing.price,
    currency: listing.currency || "MZN",
    line_total: total,
    metadata: {},
  });

  if (itemError) {
    await supabase.from("commerce_orders").update({ status: "CANCELLED" }).eq("id", order.id);
    redirect("/marketplace?order=error");
  }

  await supabase.from("commerce_order_events").insert({
    order_id: order.id,
    actor_user_id: userId,
    to_status: "PENDING",
    note: "Pedido criado pelo comprador.",
  });

  redirect("/dashboard/marketplace?order=" + order.id);
}
