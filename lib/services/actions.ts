"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Inicie sessão para solicitar este serviço." };

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

  const { data: request, error: requestError } = await supabase
    .from("service_requests")
    .select("id,requester_user_id,service_id,status")
    .eq("id", requestId)
    .maybeSingle();

  if (requestError || !request) {
    return { error: "Pedido não encontrado ou indisponível." };
  }

  const { data: updatedRequest, error } = await supabase
    .from("service_requests")
    .update({
      status,
      requested_price: requestedPrice,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .eq("status", request.status)
    .select("id")
    .maybeSingle();

  if (error || !updatedRequest) {
    return { error: "Não foi possível actualizar o pedido." };
  }

  if (request?.requester_user_id && request.requester_user_id !== user.id) {
    const { data: service } = await supabase.from("platform_services").select("name").eq("id", request.service_id).maybeSingle();
    await supabase.from("notifications").insert({
      user_id: request.requester_user_id,
      type: "SERVICE_REQUEST_UPDATED",
      title: "Pedido de serviço actualizado",
      body: `O pedido de ${service?.name || "serviço"} passou para o estado ${status.replaceAll("_", " ").toLowerCase()}.`,
      resource_type: "SERVICE_REQUEST",
      resource_id: requestId,
    });
  }

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/servicos");
  return { success: true };
}
