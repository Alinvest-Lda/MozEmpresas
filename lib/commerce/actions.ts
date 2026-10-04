"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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
  if (!userId) redirect("/login?next=/dashboard/marketplace");
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
  const categoryId = text(formData.get("category_id")) || null;
  const location = text(formData.get("location")) || null;
  const priceRaw = text(formData.get("price"));
  const price = priceRaw ? number(priceRaw, NaN) : null;

  if (!title || !description || !businessId || !["PRODUCT", "SERVICE"].includes(type)) {
    redirect("/dashboard/marketplace?publish=error");
  }
  if (price !== null && (!Number.isFinite(price) || price < 0)) {
    redirect("/dashboard/marketplace?publish=error");
  }
  if (!(await canManageBusiness(supabase, userId, businessId))) {
    redirect("/dashboard/marketplace?publish=forbidden");
  }

  const base = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "oferta";
  const slug = `${base}-${crypto.randomUUID().slice(0, 8)}`;

  const attachments = formData.getAll("attachments").filter((value): value is File => value instanceof File && value.size > 0);
  if (attachments.length > 10) redirect("/dashboard/marketplace?publish=error");
  const allowed = new Set(["image/jpeg","image/png","image/webp","application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.ms-excel","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]);
  if (attachments.some((file) => !allowed.has(file.type) || file.size > 10 * 1024 * 1024)) redirect("/dashboard/marketplace?publish=error");

  const { data: createdListing, error } = await supabase.from("listings").insert({
    owner_id: userId,
    business_id: businessId,
    title,
    slug,
    description,
    type,
    price,
    currency: "MZN",
    status: "PUBLISHED",
    category_id: categoryId,
    location,
  }).select("id").single();

  if (error || !createdListing) redirect("/dashboard/marketplace?publish=error");
  const listingIdPlaceholder = createdListing.id;

  for (const file of attachments) {
    const kind = file.type.startsWith("image/") ? "IMAGE" : "DOCUMENT";
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").slice(-120);
    const storagePath = `${userId}/${listingIdPlaceholder}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("listing-media").upload(storagePath, file, { contentType: file.type, upsert: false });
    if (uploadError) redirect("/dashboard/marketplace?publish=error");
    const { error: attachmentError } = await supabase.from("listing_attachments").insert({ listing_id: listingIdPlaceholder, storage_path: storagePath, file_name: file.name, mime_type: file.type, size_bytes: file.size, kind });
    if (attachmentError) redirect("/dashboard/marketplace?publish=error");
  }

  redirect("/dashboard/marketplace?publish=success");
}

export async function createOrder(formData: FormData) {
  const { supabase, userId } = await currentUser();
  const listingId = text(formData.get("listing_id"));
  const buyerBusinessId = text(formData.get("buyer_business_id")) || null;
  const quantity = number(formData.get("quantity"), 1);
  const notes = text(formData.get("notes")) || null;

  if (!listingId || quantity <= 0) redirect("/dashboard/marketplace?request=error");

  const { data: listing } = await supabase
    .from("listings")
    .select("id,title,type,price,currency,business_id,owner_id,status")
    .eq("id", listingId)
    .eq("status", "PUBLISHED")
    .maybeSingle();

  if (!listing || listing.owner_id === userId) redirect("/dashboard/marketplace?request=error");
  if (buyerBusinessId && !(await canManageBusiness(supabase, userId, buyerBusinessId))) redirect("/dashboard/marketplace?request=forbidden");

  const { data: order, error: orderError } = await supabase.from("commerce_orders").insert({
    buyer_user_id: userId,
    buyer_business_id: buyerBusinessId,
    status: "INTERESTED",
    currency: listing.currency || "MZN",
    subtotal: listing.price ?? 0,
    total: listing.price ?? 0,
    notes,
  }).select("id").single();

  if (orderError || !order) redirect("/dashboard/marketplace?request=error");

  const { error: itemError } = await supabase.from("commerce_order_items").insert({
    order_id: order.id,
    listing_id: listing.id,
    seller_business_id: listing.business_id,
    title: listing.title,
    type: listing.type,
    quantity,
    unit_price: listing.price,
    currency: listing.currency || "MZN",
    line_total: listing.price === null ? 0 : Number(listing.price) * quantity,
    metadata: { transaction_mode: "OFFLINE", quantity_requested: quantity },
  });

  if (itemError) {
    await supabase.from("commerce_orders").update({ status: "CANCELLED" }).eq("id", order.id);
    redirect("/dashboard/marketplace?request=error");
  }

  await supabase.from("commerce_order_events").insert({
    order_id: order.id,
    actor_user_id: userId,
    to_status: "INTERESTED",
    note: "Interesse comercial registado. A negociação e qualquer compra decorrem fora da plataforma.",
  });

  redirect("/dashboard/marketplace?request=" + order.id);
}

export async function updateOrderStatus(formData: FormData) {
  const { supabase, userId } = await currentUser();
  const orderId = text(formData.get("order_id"));
  const status = text(formData.get("status")).toUpperCase();
  const transitions: Record<string, string[]> = {
    INTERESTED: ["CONTACTED", "CANCELLED"],
    CONTACTED: ["NEGOTIATING", "CANCELLED"],
    NEGOTIATING: ["AGREED", "CANCELLED"],
    AGREED: ["COMPLETED", "CANCELLED"],
  };
  if (!orderId || !Object.values(transitions).flat().includes(status)) redirect("/dashboard/marketplace?status=error");

  const { data: items } = await supabase.from("commerce_order_items").select("seller_business_id").eq("order_id", orderId);
  const sellerIds = [...new Set((items ?? []).map(item => item.seller_business_id).filter(Boolean))];
  let authorized = false;
  for (const businessId of sellerIds) if (await canManageBusiness(supabase, userId, businessId)) { authorized = true; break; }
  if (!authorized) redirect("/dashboard/marketplace?status=forbidden");

  const { data: current } = await supabase.from("commerce_orders").select("status").eq("id", orderId).maybeSingle();
  if (!current || !transitions[current.status]?.includes(status)) redirect("/dashboard/marketplace?status=invalid-transition");

  const { error } = await supabase.from("commerce_orders").update({ status }).eq("id", orderId);
  if (error) redirect("/dashboard/marketplace?status=error");

  await supabase.from("commerce_order_events").insert({
    order_id: orderId, actor_user_id: userId, from_status: current.status, to_status: status,
    note: "Estado actualizado pela empresa vendedora. Qualquer negociação ou pagamento decorre fora do MozEmpresas.",
  });

  redirect("/dashboard/marketplace?status=updated");
}

export async function cancelOrder(formData: FormData) {
  const { supabase, userId } = await currentUser();
  const orderId = text(formData.get("order_id"));
  if (!orderId) redirect("/dashboard/marketplace?status=error");

  const { data: order } = await supabase.from("commerce_orders").select("id,status").eq("id", orderId).eq("buyer_user_id", userId).maybeSingle();
  if (!order || !["INTERESTED","CONTACTED","NEGOTIATING"].includes(order.status)) redirect("/dashboard/marketplace?status=error");

  const { error } = await supabase.from("commerce_orders").update({status:"CANCELLED"}).eq("id",orderId).eq("buyer_user_id",userId);
  if (error) redirect("/dashboard/marketplace?status=error");

  await supabase.from("commerce_order_events").insert({
    order_id: orderId, actor_user_id: userId, from_status: order.status,
    to_status: "CANCELLED", note: "Interesse comercial cancelado pelo utilizador."
  });
  redirect("/dashboard/marketplace?status=cancelled");
}


export async function updateOrderProgress(formData: FormData) {
  const { supabase, userId } = await currentUser();
  const orderId = text(formData.get("order_id"));
  const paymentStatus = text(formData.get("payment_status")).toUpperCase();
  const fulfillmentStatus = text(formData.get("fulfillment_status")).toUpperCase();
  const paymentReference = text(formData.get("payment_reference")) || null;
  const allowedPayments = ["NOT_REQUIRED","PENDING","PROOF_SUBMITTED","PAID","FAILED","REFUNDED"];
  const allowedFulfillment = ["NOT_STARTED","IN_PROGRESS","DELIVERED","COMPLETED","CANCELLED"];
  if (!orderId || !allowedPayments.includes(paymentStatus) || !allowedFulfillment.includes(fulfillmentStatus)) redirect("/dashboard/marketplace?status=error");

  const { data: items } = await supabase.from("commerce_order_items").select("seller_business_id").eq("order_id", orderId);
  const sellerIds = [...new Set((items ?? []).map(item => item.seller_business_id).filter(Boolean))];
  let authorized = false;
  for (const businessId of sellerIds) if (await canManageBusiness(supabase, userId, businessId)) { authorized = true; break; }
  if (!authorized) redirect("/dashboard/marketplace?status=forbidden");

  const { data: current } = await supabase.from("commerce_orders").select("status,payment_status,fulfillment_status").eq("id", orderId).maybeSingle();
  if (!current) redirect("/dashboard/marketplace?status=error");
  if (paymentStatus === "PAID" && current.status !== "AGREED" && current.status !== "COMPLETED") redirect("/dashboard/marketplace?status=invalid-transition");

  const now = new Date().toISOString();
  const update: Record<string, string | null> = { payment_status: paymentStatus, fulfillment_status: fulfillmentStatus, payment_reference: paymentReference };
  if (paymentStatus === "PAID") update.paid_at = now;
  if (fulfillmentStatus === "IN_PROGRESS") update.service_started_at = now;
  if (fulfillmentStatus === "COMPLETED") update.completed_at = now;
  const { error } = await supabase.from("commerce_orders").update(update).eq("id", orderId);
  if (error) redirect("/dashboard/marketplace?status=error");
  await supabase.from("commerce_order_events").insert({ order_id: orderId, actor_user_id: userId, from_status: current.status, to_status: current.status, note: "Progresso comercial actualizado: pagamento " + paymentStatus + "; execução " + fulfillmentStatus + (paymentReference ? "; referência " + paymentReference : "") });
  revalidatePath("/dashboard/marketplace");
  redirect("/dashboard/marketplace?status=updated");
}

export async function updateListing(_state: { error?: string; success?: string }, formData: FormData): Promise<{ error?: string; success?: string }> {
  const { supabase, userId } = await currentUser();
  const listingId = text(formData.get("listing_id"));
  const title = text(formData.get("title"));
  const description = text(formData.get("description"));
  const type = text(formData.get("type")).toUpperCase();
  const businessId = text(formData.get("business_id"));
  const categoryId = text(formData.get("category_id")) || null;
  const location = text(formData.get("location")) || null;
  const priceRaw = text(formData.get("price"));
  const price = priceRaw ? number(priceRaw, NaN) : null;
  const status = text(formData.get("status")).toUpperCase();

  if (!listingId || !title || !description || !businessId || !["PRODUCT","SERVICE"].includes(type)) {
    redirect("/dashboard/marketplace?status=error");
  }
  if (price !== null && (!Number.isFinite(price) || price < 0)) {
    redirect("/dashboard/marketplace?status=error");
  }
  if (!["DRAFT","PUBLISHED","PAUSED","SOLD_OUT","ARCHIVED"].includes(status)) {
    redirect("/dashboard/marketplace?status=error");
  }
  if (!(await canManageBusiness(supabase, userId, businessId))) {
    redirect("/dashboard/marketplace?status=forbidden");
  }

  const { data: existing } = await supabase
    .from("listings")
    .select("id,owner_id,business_id")
    .eq("id", listingId)
    .maybeSingle();

  if (!existing || !(await canManageBusiness(supabase, userId, existing.business_id || businessId))) {
    redirect("/dashboard/marketplace?status=forbidden");
  }

  const base = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "oferta";
  const slug = `${base}-${crypto.randomUUID().slice(0, 8)}`;

  const { error } = await supabase.from("listings").update({
    title, description, type, business_id: businessId, category_id: categoryId, location, price, currency: "MZN", status, slug,
    updated_at: new Date().toISOString(),
  }).eq("id", listingId);

  if (error) redirect("/dashboard/marketplace?status=error");

  const attachments = formData.getAll("attachments").filter((value): value is File => value instanceof File && value.size > 0);
  if (attachments.length > 10) redirect("/dashboard/marketplace/" + listingId + "?status=attachments-error");
  const allowed = new Set(["image/jpeg","image/png","image/webp","application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.ms-excel","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]);
  if (attachments.some((file) => !allowed.has(file.type) || file.size > 10 * 1024 * 1024)) redirect("/dashboard/marketplace/" + listingId + "?status=attachments-error");

  for (const file of attachments) {
    const kind = file.type.startsWith("image/") ? "IMAGE" : "DOCUMENT";
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").slice(-120);
    const storagePath = `${userId}/${listingId}/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from("listing-media").upload(storagePath, file, { contentType: file.type, upsert: false });
    if (uploadError) redirect("/dashboard/marketplace/" + listingId + "?status=attachments-error");
    const { error: attachmentError } = await supabase.from("listing_attachments").insert({ listing_id: listingId, storage_path: storagePath, file_name: file.name, mime_type: file.type, size_bytes: file.size, kind });
    if (attachmentError) {
      await supabase.storage.from("listing-media").remove([storagePath]);
      redirect("/dashboard/marketplace/" + listingId + "?status=attachments-error");
    }
  }

  revalidatePath("/dashboard/marketplace");
  revalidatePath("/dashboard/marketplace/" + listingId);
  revalidatePath("/marketplace/" + listingId);
  redirect("/dashboard/marketplace?status=updated");
  return { success: "Oferta actualizada." };
}

export async function updateListingStatus(formData: FormData) {
  const { supabase, userId } = await currentUser();
  const listingId = text(formData.get("listing_id"));
  const status = text(formData.get("status")).toUpperCase();
  if (!listingId || !["DRAFT","PUBLISHED","PAUSED","SOLD_OUT","ARCHIVED"].includes(status)) {
    redirect("/dashboard/marketplace?status=error");
  }

  const { data: listing } = await supabase.from("listings").select("id,business_id").eq("id", listingId).maybeSingle();
  if (!listing || !listing.business_id || !(await canManageBusiness(supabase, userId, listing.business_id))) {
    redirect("/dashboard/marketplace?status=forbidden");
  }

  const { error } = await supabase.from("listings").update({status, updated_at:new Date().toISOString()}).eq("id",listingId);
  if (error) redirect("/dashboard/marketplace?status=error");

  revalidatePath("/dashboard/marketplace");
  revalidatePath("/marketplace/" + listingId);
  redirect("/dashboard/marketplace?status=updated");
}

export async function deleteListingAttachment(formData: FormData) {
  const { supabase, userId } = await currentUser();
  const attachmentId = text(formData.get("attachment_id"));
  if (!attachmentId) redirect("/dashboard/marketplace?status=error");

  const { data: attachment } = await supabase
    .from("listing_attachments")
    .select("id,listing_id,storage_path")
    .eq("id", attachmentId)
    .maybeSingle();
  if (!attachment) redirect("/dashboard/marketplace?status=error");

  const { data: listing } = await supabase
    .from("listings")
    .select("id,business_id")
    .eq("id", attachment.listing_id)
    .maybeSingle();
  if (!listing || !(await canManageBusiness(supabase, userId, listing.business_id || ""))) {
    redirect("/dashboard/marketplace?status=forbidden");
  }

  const { error } = await supabase.from("listing_attachments").delete().eq("id", attachmentId);
  if (error) redirect("/dashboard/marketplace/" + attachment.listing_id + "?status=attachments-error");
  await supabase.storage.from("listing-media").remove([attachment.storage_path]);

  revalidatePath("/dashboard/marketplace/" + attachment.listing_id);
  revalidatePath("/marketplace/" + attachment.listing_id);
  redirect("/dashboard/marketplace/" + attachment.listing_id + "?status=attachment-deleted");
}

export async function deleteListing(formData: FormData) {
  const { supabase, userId } = await currentUser();
  const listingId = text(formData.get("listing_id"));
  if (!listingId) redirect("/dashboard/marketplace?status=error");

  const { data: listing } = await supabase.from("listings").select("id,business_id").eq("id",listingId).maybeSingle();
  if (!listing || !listing.business_id || !(await canManageBusiness(supabase, userId, listing.business_id))) {
    redirect("/dashboard/marketplace?status=forbidden");
  }

  const { data: attachments } = await supabase.from("listing_attachments").select("storage_path").eq("listing_id",listingId);
  if (attachments?.length) {
    await supabase.storage.from("listing-media").remove(attachments.map(a=>a.storage_path));
  }
  const { error } = await supabase.from("listings").delete().eq("id",listingId);
  if (error) redirect("/dashboard/marketplace?status=error");

  revalidatePath("/dashboard/marketplace");
  redirect("/dashboard/marketplace?status=updated");
}


export async function saveBuyerInterest(formData: FormData) {
  const { supabase, userId } = await currentUser();
  const businessId = text(formData.get("business_id"));
  const categoryId = text(formData.get("category_id")) || null;
  const location = text(formData.get("interest_location")) || null;
  const listingType = text(formData.get("listing_type")) || null;
  if (!businessId || (!categoryId && !location && !listingType)) return;
  if (!(await canManageBusiness(supabase, userId, businessId))) return;
  await supabase.from("business_buyer_interests").upsert({ business_id: businessId, category_id: categoryId, location, listing_type: listingType }, { onConflict: "business_id,category_id,location,listing_type" });
  revalidatePath("/dashboard/marketplace");
}

export async function removeBuyerInterest(formData: FormData) {
  const { supabase, userId } = await currentUser();
  const id = text(formData.get("id"));
  if (!id) return;
  const { data: interest } = await supabase.from("business_buyer_interests").select("id,business_id").eq("id", id).maybeSingle();
  if (!interest || !(await canManageBusiness(supabase, userId, interest.business_id))) return;
  await supabase.from("business_buyer_interests").delete().eq("id", id);
  revalidatePath("/dashboard/marketplace");
}
