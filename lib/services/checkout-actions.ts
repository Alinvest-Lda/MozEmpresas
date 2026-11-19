"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

const text = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

async function access(s: SupabaseClient, uid: string, bid: string) {
  const { data: owner } = await s.from("businesses").select("id").eq("id", bid).eq("owner_id", uid).maybeSingle();
  if (owner) return true;
  const { data: member } = await s.from("business_members").select("role").eq("business_id", bid).eq("user_id", uid).in("role", ["owner", "admin", "operator"]).maybeSingle();
  return !!member;
}

export async function purchasePlatformService(formData: FormData) {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) redirect("/login");

  const serviceId = text(formData.get("serviceId"));
  const businessId = text(formData.get("businessId"));
  const method = text(formData.get("paymentMethod")) || "CREDITS";
  const purchaseKey = text(formData.get("purchaseKey"));
  if ((method === "CREDITS" || method === "MPESA") && !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(purchaseKey)) {
    return { error: "Actualize a página e tente novamente." };
  }

  if (!serviceId || !businessId || !(await access(s, user.id, businessId))) {
    return { error: "Não tem autorização para esta contratação." };
  }

  const { data: service } = await s
    .from("platform_services")
    .select("id,name,price,currency,billing,default_term_days")
    .eq("id", serviceId)
    .eq("active", true)
    .maybeSingle();

  if (!service || service.price == null || Number(service.price) <= 0) {
    return { error: "Este serviço ainda não está disponível para contratação self-service." };
  }

  if (method === "CREDITS") {
    const { data, error } = await s.rpc("purchase_platform_service_with_credits", {
      p_service_id: serviceId,
      p_business_id: businessId,
      p_user_id: user.id,
      p_idempotency_key: purchaseKey,
    });

    if (error) {
      return {
        error: error.message.includes("INSUFFICIENT_CREDITS")
          ? "Créditos insuficientes."
          : error.message.includes("NO_WALLET")
            ? "Esta empresa ainda não tem carteira de créditos."
            : "Não foi possível concluir a contratação.",
      };
    }

    revalidatePath("/dashboard/servicos");
    revalidatePath("/dashboard/financeiro");
    revalidatePath("/dashboard/monetizacao/creditos");
    return { success: true, orderId: String(data) };
  }

  if (method !== "MPESA") return { error: "Meio de pagamento não suportado." };

  const { data: pendingOrder, error: pendingOrderError } = await s.rpc("create_mpesa_platform_service_order", {
    p_service_id: serviceId,
    p_business_id: businessId,
    p_user_id: user.id,
    p_idempotency_key: purchaseKey,
  });
  if (pendingOrderError || !pendingOrder?.order_id) {
    return { error: pendingOrderError?.message.includes("FORBIDDEN")
      ? "Não tem autorização para esta contratação."
      : "Não foi possível registar a contratação M-Pesa." };
  }

  revalidatePath("/dashboard/servicos");
  revalidatePath("/dashboard/financeiro");
  return { success: true, orderId: String(pendingOrder.order_id), pending: true };
}

export async function adminCancelPlatformServiceOrder(formData: FormData) {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return { error: "Sessão expirada. Inicie sessão novamente." };
  const orderId = text(formData.get("orderId"));
  const reason = text(formData.get("reason"));
  const refundReference = text(formData.get("refundReference")) || null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId)) {
    return { error: "Ordem inválida." };
  }
  if (reason.length < 8 || reason.length > 1000) return { error: "Indique um motivo com pelo menos 8 caracteres." };
  const { data, error } = await s.rpc("admin_cancel_platform_service_order", {
    p_order_id: orderId,
    p_reason: reason,
    p_external_refund_reference: refundReference,
  });
  if (error) {
    const known: Record<string,string> = {
      FORBIDDEN: "Apenas um Super Admin activo pode executar esta operação.",
      COMPLETED_ORDER_NOT_REVERSIBLE: "Uma ordem concluída não pode ser estornada por esta operação.",
      ORDER_ALREADY_CANCELLED: "Esta ordem já foi cancelada.",
      FAILED_ORDER_NOT_CANCELLABLE: "Uma ordem falhada não pode ser cancelada novamente.",
      EXTERNAL_REFUND_REFERENCE_REQUIRED: "Registe a referência externa do reembolso M-Pesa já realizado.",
      ORDER_ALREADY_ADJUSTED: "Esta ordem já possui um ajustamento financeiro.",
    };
    const code = Object.keys(known).find(key => error.message.includes(key));
    return { error: code ? known[code] : "Não foi possível executar o ajustamento. Verifique o estado da ordem e tente novamente." };
  }
  revalidatePath("/dashboard/admin/monetizacao/servicos");
  revalidatePath("/dashboard/servicos");
  revalidatePath("/dashboard/financeiro");
  revalidatePath("/dashboard/monetizacao/creditos");
  return { success: true, adjustment: data };
}
