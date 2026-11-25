"use server";

import { revalidatePath } from "next/cache";
import { requireNormalAccount } from "@/lib/auth/access";
import { getSuperAdminContext } from "@/lib/auth/super-admin";
import { canManageBusiness } from "@/lib/businesses/permissions";
import { parseServiceRequestInput, parseServiceRequestUpdateInput } from "@/lib/services/validation";

export async function requestPlatformService(formData: FormData) {
  const parsed = parseServiceRequestInput({
    serviceId: formData.get("serviceId"),
    businessId: formData.get("businessId") || "",
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return { error: "Verifique os dados do pedido." };

  const context = await requireNormalAccount();
  if (!context.user) return { error: "Inicie sessão para solicitar este serviço." };
  const supabase = context.supabase;
  const user = context.user;

  if (parsed.data.businessId && !(await canManageBusiness(supabase, user.id, parsed.data.businessId))) {
    return { error: "Não tem autorização para solicitar o serviço em nome desta empresa." };
  }

  const { data: service, error: serviceError } = await supabase
    .from("platform_services")
    .select("id")
    .eq("id", parsed.data.serviceId)
    .eq("active", true)
    .maybeSingle();
  if (serviceError || !service) return { error: "Este serviço já não está disponível para pedidos." };

  const { error } = await supabase.from("service_requests").insert({
    service_id: parsed.data.serviceId,
    requester_user_id: user.id,
    requester_business_id: parsed.data.businessId || null,
    notes: parsed.data.notes || null,
  });
  if (error) return { error: "Não foi possível registar o pedido. Tente novamente." };

  revalidatePath("/dashboard/servicos");
  revalidatePath("/dashboard/admin");
  return { success: true };
}

export async function updatePlatformServiceRequest(formData: FormData) {
  const parsed = parseServiceRequestUpdateInput({
    requestId: formData.get("requestId"),
    status: formData.get("status"),
    requestedPrice: formData.get("requestedPrice"),
  });
  if (!parsed.success) {
    return { error: parsed.error === "INVALID_PRICE" ? "O valor proposto é inválido." : "Pedido ou estado inválido." };
  }
  const { requestId, status, requestedPrice } = parsed.data;

  const { supabase, authorized, user } = await getSuperAdminContext();
  if (!authorized || !user) return { error: "Sem autorização para gerir pedidos." };

  const reason = String(formData.get("reason") || "").trim();
  if (reason.length < 8 || reason.length > 500) return { error: "A justificação deve ter entre 8 e 500 caracteres." };
  const { error } = await supabase.rpc("admin_update_service_request", {
    p_request_id: requestId,
    p_status: status,
    p_requested_price: requestedPrice,
    p_reason: reason,
  });
  if (error) {
    return { error: error.message.includes("INVALID_SERVICE_REQUEST_TRANSITION")
      ? "Esta alteração não é permitida a partir do estado actual."
      : error.message.includes("SERVICE_REQUEST_QUOTE_LOCKED")
        ? "O orçamento fica bloqueado depois da aceitação do pedido."
        : "Não foi possível actualizar o pedido. Reveja o estado e tente novamente." };
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/servicos");
  return { success: true };
}
