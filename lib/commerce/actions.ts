"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canManageBusiness } from "@/lib/businesses/permissions";
import { canTransitionCommerceOrder, commerceOrderTransitions } from "@/lib/commerce/state-machine";

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

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("account_status")
    .eq("id", userId)
    .maybeSingle();
  if (profileError || !profile || (profile.account_status && profile.account_status !== "ACTIVE")) {
    redirect("/login?inactive=1");
  }
  return { supabase, userId };
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

  if (!title || title.length > 180 || !description || description.length > 8000 || !businessId || !["PRODUCT", "SERVICE"].includes(type)) {
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
    status: "DRAFT",
    category_id: categoryId,
    location,
  }).select("id").single();

  if (error || !createdListing) redirect("/dashboard/marketplace?publish=error");
  const listingIdPlaceholder = createdListing.id;
  const uploadedStoragePaths: string[] = [];

  async function cleanupDraftListing(): Promise<boolean> {
    if (uploadedStoragePaths.length) {
      const { error: storageCleanupError } = await supabase.storage.from("listing-media").remove(uploadedStoragePaths);
      if (storageCleanupError) return false;
    }
    const { error: listingCleanupError } = await supabase
      .from("listings")
      .delete()
      .eq("id", listingIdPlaceholder)
      .eq("status", "DRAFT");
    return !listingCleanupError;
  }

  for (const file of attachments) {
    const kind = file.type.startsWith("image/") ? "IMAGE" : "DOCUMENT";
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").slice(-120);
    const storagePath = `${userId}/${listingIdPlaceholder}/${crypto.randomUUID()}-${safeName}`;
    // Track the attempted path before upload so an ambiguous upload failure can also be cleaned up.
    uploadedStoragePaths.push(storagePath);
    const { error: uploadError } = await supabase.storage.from("listing-media").upload(storagePath, file, { contentType: file.type, upsert: false });
    if (uploadError) {
      const cleaned = await cleanupDraftListing();
      redirect(cleaned ? "/dashboard/marketplace?publish=error" : "/dashboard/marketplace?publish=cleanup-error");
    }
    const { error: attachmentError } = await supabase.from("listing_attachments").insert({ listing_id: listingIdPlaceholder, storage_path: storagePath, file_name: file.name, mime_type: file.type, size_bytes: file.size, kind });
    if (attachmentError) {
      const cleaned = await cleanupDraftListing();
      redirect(cleaned ? "/dashboard/marketplace?publish=error" : "/dashboard/marketplace?publish=cleanup-error");
    }
  }

  const { data: publishedListing, error: publishError } = await supabase
    .from("listings")
    .update({ status: "PUBLISHED", updated_at: new Date().toISOString() })
    .eq("id", listingIdPlaceholder)
    .eq("status", "DRAFT")
    .select("id")
    .maybeSingle();
  if (publishError || !publishedListing) {
    const cleaned = await cleanupDraftListing();
    redirect(cleaned ? "/dashboard/marketplace?publish=error" : "/dashboard/marketplace?publish=cleanup-error");
  }

  redirect("/dashboard/marketplace?publish=success");
}

export async function createOrder(formData: FormData) {
  const { supabase, userId } = await currentUser();
  const listingId = text(formData.get("listing_id"));
  const buyerBusinessId = text(formData.get("buyer_business_id")) || null;
  const quantityRaw = text(formData.get("quantity"));
  const quantity = quantityRaw ? number(quantityRaw, NaN) : 1;
  const notes = text(formData.get("notes")) || null;

  if (!listingId || !Number.isFinite(quantity) || quantity <= 0 || quantity > 1_000_000 || (notes && notes.length > 2000)) {
    redirect("/dashboard/marketplace?request=error");
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("id,title,type,price,currency,business_id,owner_id,status")
    .eq("id", listingId)
    .eq("status", "PUBLISHED")
    .maybeSingle();

  if (!listing || listing.owner_id === userId) redirect("/dashboard/marketplace?request=error");
  if (buyerBusinessId && !(await canManageBusiness(supabase, userId, buyerBusinessId))) redirect("/dashboard/marketplace?request=forbidden");

  const { data: orderId, error: orderError } = await supabase.rpc("create_commerce_order", {
    p_listing_id: listing.id,
    p_buyer_business_id: buyerBusinessId,
    p_quantity: quantity,
    p_notes: notes,
  });
  if (orderError || !orderId) redirect("/dashboard/marketplace?request=error");
  await supabase.from("platform_conversion_events").insert({
    user_id: userId,
    visitor_key: "user:" + userId,
    event_type: "CONTACT_CLICK",
    entity_type: "listing",
    entity_id: listing.id,
    source: "commerce_order",
    metadata: { action: "contact_request", order_id: String(orderId) },
  });
  redirect("/dashboard/marketplace?request=" + orderId);
}

export async function updateOrderStatus(formData: FormData) {
  const { supabase, userId } = await currentUser();
  const orderId = text(formData.get("order_id"));
  const status = text(formData.get("status")).toUpperCase();
  if (!orderId || !Object.values(commerceOrderTransitions).flat().includes(status)) redirect("/dashboard/marketplace?status=error");

  const { data: items } = await supabase.from("commerce_order_items").select("seller_business_id").eq("order_id", orderId);
  const sellerIds = [...new Set((items ?? []).map(item => item.seller_business_id).filter(Boolean))];
  let authorized = false;
  for (const businessId of sellerIds) if (await canManageBusiness(supabase, userId, businessId)) { authorized = true; break; }
  if (!authorized) redirect("/dashboard/marketplace?status=forbidden");

  const { data: current } = await supabase.from("commerce_orders").select("status").eq("id", orderId).maybeSingle();
  if (!current || !canTransitionCommerceOrder(current.status, status)) redirect("/dashboard/marketplace?status=invalid-transition");

  // Compare-and-set prevents concurrent requests from overwriting a newer state.
  const { data: updatedOrder, error } = await supabase
    .from("commerce_orders")
    .update({ status })
    .eq("id", orderId)
    .eq("status", current.status)
    .select("id")
    .maybeSingle();
  if (error) redirect("/dashboard/marketplace?status=error");
  if (!updatedOrder) redirect("/dashboard/marketplace?status=invalid-transition");

  const { error: eventError } = await supabase.from("commerce_order_events").insert({
    order_id: orderId, actor_user_id: userId, from_status: current.status, to_status: status,
    note: "Estado actualizado pela empresa vendedora. Qualquer negociação ou pagamento decorre fora do MozEmpresas.",
  });
  // The status is already saved; report a history failure rather than silently hiding it.
  if (eventError) redirect("/dashboard/marketplace?status=history-error");

  redirect("/dashboard/marketplace?status=updated");
}

export async function cancelOrder(formData: FormData) {
  const { supabase, userId } = await currentUser();
  const orderId = text(formData.get("order_id"));
  if (!orderId) redirect("/dashboard/marketplace?status=error");

  const { data: order } = await supabase.from("commerce_orders").select("id,status").eq("id", orderId).eq("buyer_user_id", userId).maybeSingle();
  if (!order || !["INTERESTED","CONTACTED","NEGOTIATING"].includes(order.status)) redirect("/dashboard/marketplace?status=error");

  const { data: cancelledOrder, error } = await supabase
    .from("commerce_orders")
    .update({ status: "CANCELLED" })
    .eq("id", orderId)
    .eq("buyer_user_id", userId)
    .eq("status", order.status)
    .select("id")
    .maybeSingle();
  if (error) redirect("/dashboard/marketplace?status=error");
  if (!cancelledOrder) redirect("/dashboard/marketplace?status=invalid-transition");

  const { error: eventError } = await supabase.from("commerce_order_events").insert({
    order_id: orderId, actor_user_id: userId, from_status: order.status,
    to_status: "CANCELLED", note: "Interesse comercial cancelado pelo utilizador."
  });
  if (eventError) redirect("/dashboard/marketplace?status=history-error");

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

  const { error } = await supabase.rpc("update_commerce_order_progress", {
    p_order_id: orderId,
    p_payment_status: paymentStatus,
    p_fulfillment_status: fulfillmentStatus,
    p_payment_reference: paymentReference,
  });
  if (error) redirect("/dashboard/marketplace?status=error");
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

  if (!listingId || !title || title.length > 180 || !description || description.length > 8000 || !businessId || !["PRODUCT","SERVICE"].includes(type)) {
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

  const { data: existing, error: existingError } = await supabase
    .from("listings")
    .select("id,owner_id,business_id")
    .eq("id", listingId)
    .maybeSingle();

  if (existingError || !existing) redirect("/dashboard/marketplace?status=forbidden");
  // Require access to the listing's current business, not merely the destination
  // business supplied in the form. Legacy listings without a business are editable
  // only by their recorded owner.
  if (existing.business_id) {
    if (!(await canManageBusiness(supabase, userId, existing.business_id))) {
      redirect("/dashboard/marketplace?status=forbidden");
    }
  } else if (existing.owner_id !== userId) {
    redirect("/dashboard/marketplace?status=forbidden");
  }

  const attachments = formData.getAll("attachments").filter((value): value is File => value instanceof File && value.size > 0);
  if (attachments.length > 10) redirect("/dashboard/marketplace/" + listingId + "?status=attachments-error");
  const allowed = new Set(["image/jpeg","image/png","image/webp","application/pdf","application/msword","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.ms-excel","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]);
  if (attachments.some((file) => !allowed.has(file.type) || file.size > 10 * 1024 * 1024)) redirect("/dashboard/marketplace/" + listingId + "?status=attachments-error");

  const base = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "oferta";
  const slug = `${base}-${crypto.randomUUID().slice(0, 8)}`;

  const uploadedStoragePaths: string[] = [];
  async function cleanupNewAttachments(): Promise<boolean> {
    if (!uploadedStoragePaths.length) return true;
    const { error: metadataError } = await supabase
      .from("listing_attachments")
      .delete()
      .eq("listing_id", listingId)
      .in("storage_path", uploadedStoragePaths);
    if (metadataError) return false;
    const { error: storageError } = await supabase.storage.from("listing-media").remove(uploadedStoragePaths);
    return !storageError;
  }

  for (const file of attachments) {
    const kind = file.type.startsWith("image/") ? "IMAGE" : "DOCUMENT";
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").slice(-120);
    const storagePath = `${userId}/${listingId}/${crypto.randomUUID()}-${safeName}`;
    // Track the attempted path before upload so an ambiguous upload failure can also be cleaned up.
    uploadedStoragePaths.push(storagePath);
    const { error: uploadError } = await supabase.storage.from("listing-media").upload(storagePath, file, { contentType: file.type, upsert: false });
    if (uploadError) {
      await cleanupNewAttachments();
      redirect("/dashboard/marketplace/" + listingId + "?status=attachments-error");
    }
    const { error: attachmentError } = await supabase.from("listing_attachments").insert({ listing_id: listingId, storage_path: storagePath, file_name: file.name, mime_type: file.type, size_bytes: file.size, kind });
    if (attachmentError) {
      await cleanupNewAttachments();
      redirect("/dashboard/marketplace/" + listingId + "?status=attachments-error");
    }
  }

  const { data: updatedListing, error: listingUpdateError } = await supabase.from("listings").update({
    title, description, type, business_id: businessId, category_id: categoryId, location, price, currency: "MZN", status, slug,
    updated_at: new Date().toISOString(),
  }).eq("id", listingId).select("id").maybeSingle();

  if (listingUpdateError || !updatedListing) {
    const cleaned = await cleanupNewAttachments();
    redirect(cleaned ? "/dashboard/marketplace?status=error" : "/dashboard/marketplace/" + listingId + "?status=attachments-error");
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

  const { data: updatedListing, error } = await supabase.from("listings").update({status, updated_at:new Date().toISOString()}).eq("id",listingId).select("id").maybeSingle();
  if (error || !updatedListing) redirect("/dashboard/marketplace?status=error");

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

  const { error: storageError } = await supabase.storage.from("listing-media").remove([attachment.storage_path]);
  if (storageError) redirect("/dashboard/marketplace/" + attachment.listing_id + "?status=attachments-error");

  const { data: deletedAttachment, error } = await supabase.from("listing_attachments").delete().eq("id", attachmentId).select("id").maybeSingle();
  if (error || !deletedAttachment) redirect("/dashboard/marketplace/" + attachment.listing_id + "?status=attachments-error");

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

  const { data: attachments, error: attachmentsError } = await supabase.from("listing_attachments").select("storage_path").eq("listing_id",listingId);
  if (attachmentsError) redirect("/dashboard/marketplace/" + listingId + "?status=attachments-error");
  if (attachments?.length) {
    const { error: storageError } = await supabase.storage.from("listing-media").remove(attachments.map(a=>a.storage_path));
    if (storageError) redirect("/dashboard/marketplace/" + listingId + "?status=attachments-error");
  }
  const { data: deletedListing, error } = await supabase.from("listings").delete().eq("id",listingId).select("id").maybeSingle();
  if (error || !deletedListing) redirect("/dashboard/marketplace/" + listingId + "?status=error");

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
