"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSuperAdminContext } from "@/lib/auth/super-admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function decideCreditPurchase(formData: FormData) {
  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) redirect("/login?next=/dashboard/admin/monetizacao/creditos");

  const requestId = String(formData.get("request_id") || "").trim();
  const decision = String(formData.get("decision") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!UUID.test(requestId) || !["APPROVE", "REJECT"].includes(decision) || notes.length > 2000) {
    redirect("/dashboard/admin/monetizacao/creditos?decision=invalid");
  }

  const { error } = await supabase.rpc("admin_decide_credit_purchase", {
    p_request_id: requestId,
    p_decision: decision,
    p_notes: notes || null,
  });

  if (error) {
    const code = error.message.includes("REQUEST_ALREADY_FINAL") ? "final"
      : error.message.includes("REQUEST_NOT_FOUND") ? "missing"
      : error.message.includes("FORBIDDEN") ? "forbidden"
      : "failed";
    redirect("/dashboard/admin/monetizacao/creditos?decision=" + code);
  }

  revalidatePath("/dashboard/admin/monetizacao/creditos");
  revalidatePath("/dashboard/monetizacao/creditos");
  revalidatePath("/dashboard/financeiro");
  redirect("/dashboard/admin/monetizacao/creditos?decision=success");
}


export async function adjustCreditWallet(formData: FormData) {
  const { supabase, authorized } = await getSuperAdminContext();
  if (!authorized) redirect("/login?next=/dashboard/admin/monetizacao/creditos");

  const walletId = String(formData.get("wallet_id") || "").trim();
  const idempotencyKey = String(formData.get("idempotency_key") || "").trim();
  const deltaRaw = String(formData.get("delta_credits") || "").trim();
  const reason = String(formData.get("reason") || "").trim();
  const delta = Number(deltaRaw);

  if (!UUID.test(walletId) || !UUID.test(idempotencyKey)
      || !/^-?\d+$/.test(deltaRaw) || !Number.isSafeInteger(delta)
      || delta === 0 || Math.abs(delta) > 1000000
      || reason.length < 10 || reason.length > 500) {
    redirect("/dashboard/admin/monetizacao/creditos?adjustment=invalid");
  }

  const { error } = await supabase.rpc("admin_adjust_credit_wallet", {
    p_wallet_id: walletId,
    p_delta_credits: delta,
    p_reason: reason,
    p_idempotency_key: idempotencyKey,
  });

  if (error) {
    const code = error.message.includes("INSUFFICIENT_CREDIT_BALANCE") ? "insufficient"
      : error.message.includes("WALLET_NOT_FOUND") ? "missing"
      : error.message.includes("IDEMPOTENCY_KEY_CONFLICT") ? "conflict"
      : error.message.includes("FORBIDDEN") ? "forbidden"
      : "failed";
    redirect("/dashboard/admin/monetizacao/creditos?adjustment=" + code);
  }

  revalidatePath("/dashboard/admin/monetizacao/creditos");
  revalidatePath("/dashboard/monetizacao/creditos");
  redirect("/dashboard/admin/monetizacao/creditos?adjustment=success");
}
