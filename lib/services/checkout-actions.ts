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

  const startsAt = new Date();
  const endsAt = new Date(startsAt);
  if (service.billing === "MONTHLY") {
    endsAt.setMonth(endsAt.getMonth() + 1);
  } else if (service.billing === "ANNUAL") {
    endsAt.setFullYear(endsAt.getFullYear() + 1);
  } else if (service.default_term_days) {
    endsAt.setDate(endsAt.getDate() + service.default_term_days);
  } else {
    endsAt.setDate(endsAt.getDate() + 30);
  }

  const renewalPeriod =
    service.billing === "MONTHLY" ? "MONTHLY" :
    service.billing === "ANNUAL" ? "ANNUAL" : null;

  const { data: order, error } = await s
    .from("platform_service_orders")
    .insert({
      service_id: serviceId,
      business_id: businessId,
      requester_user_id: user.id,
      amount_mzn: service.price,
      currency: service.currency || "MZN",
      payment_method: "MPESA",
      credits_charged: 0,
      status: "PENDING_PAYMENT",
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      renewal_period: renewalPeriod,
      auto_renew: false,
      renewal_status: renewalPeriod ? "ACTIVE" : "NONE",
    })
    .select("id")
    .single();

  if (error || !order) return { error: "Não foi possível criar a contratação M-Pesa." };

  const payment = await s.from("financial_payments").insert({
    business_id: businessId,
    user_id: user.id,
    amount_mzn: service.price,
    currency: service.currency || "MZN",
    method: "MPESA",
    status: "PENDING",
    reference: "SERVICE:" + order.id,
  });

  if (payment.error) {
    await s.from("platform_service_orders").update({ status: "FAILED", renewal_status: "NONE" }).eq("id", order.id);
    return { error: "A contratação foi criada, mas não foi possível registar o pagamento pendente." };
  }

  revalidatePath("/dashboard/servicos");
  revalidatePath("/dashboard/financeiro");
  return { success: true, orderId: String(order.id), pending: true };
}
