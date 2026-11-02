"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireNormalAccount } from "@/lib/auth/access";
import { canManageBusiness } from "@/lib/businesses/permissions";
import { hasValidAttachmentSignature, PAYMENT_PROOF_TYPES } from "@/lib/publications/attachment-validation";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROOF_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export async function requestCreditPurchase(formData: FormData) {
  const context = await requireNormalAccount();
  if (!context.user) redirect("/login?next=/dashboard/monetizacao/creditos");
  const { supabase, user } = context;

  const businessId = String(formData.get("business_id") || "").trim();
  const packageId = String(formData.get("package_id") || "").trim();
  const paymentMethod = String(formData.get("payment_method") || "MPESA");
  const notes = String(formData.get("notes") || "").trim();
  if (!UUID.test(businessId) || !UUID.test(packageId) ||
      !["MPESA", "BANK_TRANSFER"].includes(paymentMethod) || notes.length > 2000) {
    redirect("/dashboard/monetizacao/creditos?error=purchase");
  }
  if (!(await canManageBusiness(supabase, user.id, businessId))) {
    redirect("/dashboard/monetizacao/creditos?error=forbidden");
  }

  const proofEntry = formData.get("proof");
  const proof = proofEntry instanceof File && proofEntry.size > 0 ? proofEntry : null;
  if (paymentMethod === "BANK_TRANSFER" && !proof) {
    redirect("/dashboard/monetizacao/creditos?error=proof");
  }
  if (proof && (
    proof.size > 10 * 1024 * 1024 ||
    !PAYMENT_PROOF_TYPES.has(proof.type) ||
    !(await hasValidAttachmentSignature(proof))
  )) {
    redirect("/dashboard/monetizacao/creditos?error=proof");
  }

  const { data: pkg, error: packageError } = await supabase
    .from("credit_packages")
    .select("id,price_mzn,credit_volume")
    .eq("id", packageId)
    .eq("active", true)
    .maybeSingle();
  if (packageError || !pkg) redirect("/dashboard/monetizacao/creditos?error=purchase");

  let proofPath: string | null = null;
  if (proof) {
    const extension = PROOF_EXTENSIONS[proof.type];
    proofPath = user.id + "/" + crypto.randomUUID() + "." + extension;
    const { error: uploadError } = await supabase.storage
      .from("payment-proofs")
      .upload(proofPath, proof, { contentType: proof.type, upsert: false });
    if (uploadError) redirect("/dashboard/monetizacao/creditos?error=proof");
  }

  const { error } = await supabase.from("credit_purchase_requests").insert({
    business_id: businessId,
    package_id: packageId,
    requester_user_id: user.id,
    amount_mzn: pkg.price_mzn,
    credits: pkg.credit_volume,
    payment_method: paymentMethod,
    notes: notes || null,
    status: "REQUESTED",
    proof_path: proofPath,
  });

  if (error) {
    if (proofPath) {
      const { error: cleanupError } = await supabase.storage.from("payment-proofs").remove([proofPath]);
      if (cleanupError) redirect("/dashboard/monetizacao/creditos?error=cleanup");
    }
    redirect("/dashboard/monetizacao/creditos?error=purchase");
  }

  revalidatePath("/dashboard/monetizacao/creditos");
  revalidatePath("/dashboard/financeiro");
  revalidatePath("/dashboard/admin/monetizacao/creditos");
  redirect("/dashboard/monetizacao/creditos?success=purchase");
}
