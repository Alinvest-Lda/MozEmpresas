"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function requestCreditPurchase(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Inicie sessão para continuar." };
  const businessId = String(formData.get("business_id") || "");
  const packageId = String(formData.get("package_id") || "");
  const paymentMethod = String(formData.get("payment_method") || "DIRECT");
  const notes = String(formData.get("notes") || "").trim();
  if (!businessId || !packageId) return { error: "Seleccione a empresa e o pacote." };
  const { data: business } = await supabase.from("businesses").select("id").eq("id", businessId).eq("owner_id", user.id).maybeSingle();
  if (!business) return { error: "Não tem autorização para comprar créditos para esta empresa." };
  const { data: pkg } = await supabase.from("credit_packages").select("id,credit_volume,price_mzn,active").eq("id", packageId).eq("active", true).maybeSingle();
  if (!pkg) return { error: "Pacote indisponível." };
  const { error } = await supabase.from("credit_purchase_requests").insert({
    business_id: businessId, package_id: packageId, requester_user_id: user.id,
    amount_mzn: pkg.price_mzn, credits: pkg.credit_volume, payment_method: paymentMethod,
    notes: notes || null, status: "REQUESTED",
  });
  if (error) return { error: "Não foi possível registar o pedido de compra." };
  revalidatePath("/dashboard/monetizacao/creditos");
  revalidatePath("/dashboard/admin/monetizacao/creditos");
  return { success: true };
}
