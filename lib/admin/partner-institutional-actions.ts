"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSuperAdminContext } from "@/lib/auth/super-admin";

type AdminSupabase = Awaited<ReturnType<typeof getSuperAdminContext>>["supabase"];
const uuid = z.string().uuid();
const money = z.coerce.number().finite().nonnegative().max(100000000000);

async function adminContext() {
  const context = await getSuperAdminContext();
  if (!context.authorized || !context.user) redirect("/login?next=/dashboard/admin/parceiros/gestao");
  return context;
}

function value(data: FormData, key: string) {
  return String(data.get(key) ?? "").trim();
}


type PartnerLinkIds = { contractId?: string; engagementId?: string; campaignId?: string; documentId?: string };
async function partnerLinksValid(supabase: AdminSupabase, accountId: string, links: PartnerLinkIds) {
  if (links.contractId) {
    const {data,error}=await supabase.from("partner_contracts").select("account_id").eq("id",links.contractId).maybeSingle();
    if(error || data?.account_id!==accountId) return false;
  }
  if (links.engagementId) {
    const {data,error}=await supabase.from("partner_service_engagements").select("account_id").eq("id",links.engagementId).maybeSingle();
    if(error || data?.account_id!==accountId) return false;
  }
  if (links.campaignId) {
    const {data,error}=await supabase.from("partner_ad_campaigns").select("account_id").eq("id",links.campaignId).maybeSingle();
    if(error || data?.account_id!==accountId) return false;
  }
  if (links.documentId) {
    const {data,error}=await supabase.from("financial_documents").select("partner_account_id").eq("id",links.documentId).maybeSingle();
    if(error || data?.partner_account_id!==accountId) return false;
  }
  return true;
}
async function isActivePlatformMember(supabase: any, userId?: string) {
  if (!userId) return true;
  const {data,error}=await supabase.rpc("admin_list_platform_staff");
  const members=(data??[]) as Array<{user_id:string}>;
  return !error && members.some(member=>member.user_id===userId);
}
export async function createInstitutionalPartner(formData: FormData) {
  const parsed = z.object({
    name: z.string().min(2).max(180),
    legal_name: z.string().max(180).optional(),
    tax_id: z.string().max(80).optional(),
    billing_address: z.string().max(300).optional(),
    billing_city: z.string().max(120).optional(),
    contact_email: z.string().email().optional().or(z.literal("")),
    contact_phone: z.string().max(60).optional(),
    operating_model: z.enum(["MANAGED", "STRATEGIC", "HYBRID", "SELF_SERVICE"]),
    portal_enabled: z.enum(["true", "false"]),
    description: z.string().max(2000).optional(),
  }).safeParse({
    name: value(formData,"name"), legal_name: value(formData,"legal_name") || undefined,
    tax_id: value(formData,"tax_id") || undefined, billing_address: value(formData,"billing_address") || undefined,
    billing_city: value(formData,"billing_city") || undefined, contact_email: value(formData,"contact_email"),
    contact_phone: value(formData,"contact_phone"), operating_model: value(formData,"operating_model"),
    portal_enabled: value(formData,"portal_enabled"), description: value(formData,"description") || undefined,
  });
  if (!parsed.success) redirect("/dashboard/admin/parceiros/gestao?error=partner");
  const { supabase } = await adminContext();
  const { error } = await supabase.from("partner_accounts").insert({
    name: parsed.data.name, legal_name: parsed.data.legal_name ?? null, tax_id: parsed.data.tax_id ?? null,
    billing_address: parsed.data.billing_address ?? null, billing_city: parsed.data.billing_city ?? null,
    contact_email: parsed.data.contact_email || null, contact_phone: parsed.data.contact_phone || null,
    operating_model: parsed.data.operating_model, portal_enabled: parsed.data.portal_enabled === "true",
    description: parsed.data.description ?? null, business_id: null, status: "ACTIVE",
  });
  if (error) redirect("/dashboard/admin/parceiros/gestao?error=partner-save");
  revalidatePath("/dashboard/admin/parceiros/gestao");
  revalidatePath("/dashboard/admin/parceiros");
  redirect("/dashboard/admin/parceiros/gestao?saved=partner");
}

export async function createPartnerContract(formData: FormData) {
  const parsed = z.object({
    account_id: uuid, contract_code: z.string().min(2).max(80), title: z.string().min(2).max(180),
    contract_type: z.enum(["STRATEGIC_PARTNERSHIP","CAMPAIGN_PACKAGE","SERVICE_ORDER","REPORTING","RETAINER","OTHER"]),
    contracted_amount_mzn: money, billing_frequency: z.enum(["ONE_OFF","MONTHLY","QUARTERLY","SEMI_ANNUAL","ANNUAL","MILESTONE"]),
    starts_on: z.string().optional(), ends_on: z.string().optional(), payment_terms: z.string().max(2000).optional(),
  }).safeParse({
    account_id:value(formData,"account_id"), contract_code:value(formData,"contract_code"),
    title:value(formData,"title"), contract_type:value(formData,"contract_type"),
    contracted_amount_mzn:value(formData,"contracted_amount_mzn"), billing_frequency:value(formData,"billing_frequency"),
    starts_on:value(formData,"starts_on") || undefined, ends_on:value(formData,"ends_on") || undefined,
    payment_terms:value(formData,"payment_terms") || undefined,
  });
  if (!parsed.success) redirect("/dashboard/admin/parceiros/gestao?error=contract");
  const { supabase,user } = await adminContext();
  const { error } = await supabase.from("partner_contracts").insert({
    ...parsed.data, starts_on:parsed.data.starts_on || null, ends_on:parsed.data.ends_on || null,
    payment_terms:parsed.data.payment_terms || null, created_by:user!.id,
  });
  if (error) redirect("/dashboard/admin/parceiros/gestao?error=contract-save");
  revalidatePath("/dashboard/admin/parceiros/gestao");
  redirect("/dashboard/admin/parceiros/gestao?saved=contract");
}

export async function createPartnerEngagement(formData: FormData) {
  const parsed = z.object({
    account_id:uuid, contract_id:z.string().optional(), service_type:z.enum(["ADVERTISING","CAMPAIGN_MANAGEMENT","MARKET_INTELLIGENCE","REPORTING","LEAD_GENERATION","PROMOTION","STRATEGIC_PARTNERSHIP","OTHER"]),
    request_source:z.enum(["EMAIL","MEETING","CONTRACT","PHONE","BACKOFFICE","OTHER"]),
    title:z.string().min(2).max(180), description:z.string().max(4000).optional(),
    agreed_amount_mzn:z.string().optional(), due_at:z.string().optional(),
    assigned_commercial_user_id:z.string().optional(), assigned_operations_user_id:z.string().optional(),
  }).safeParse({
    account_id:value(formData,"account_id"), contract_id:value(formData,"contract_id"),
    service_type:value(formData,"service_type"), request_source:value(formData,"request_source"),
    title:value(formData,"title"), description:value(formData,"description") || undefined,
    agreed_amount_mzn:value(formData,"agreed_amount_mzn"), due_at:value(formData,"due_at"),
    assigned_commercial_user_id:value(formData,"assigned_commercial_user_id") || undefined,
    assigned_operations_user_id:value(formData,"assigned_operations_user_id") || undefined,
  });
  if (!parsed.success || (parsed.data.contract_id && !uuid.safeParse(parsed.data.contract_id).success) ||
    [parsed.data.assigned_commercial_user_id,parsed.data.assigned_operations_user_id].some(x=>x&&!uuid.safeParse(x).success)) redirect("/dashboard/admin/parceiros/gestao?error=engagement");
  const { supabase,user } = await adminContext();
  if(parsed.data.contract_id && !(await partnerLinksValid(supabase,parsed.data.account_id,{contractId:parsed.data.contract_id}))) redirect("/dashboard/admin/parceiros/gestao?error=engagement");
  if(!(await isActivePlatformMember(supabase,parsed.data.assigned_commercial_user_id)) || !(await isActivePlatformMember(supabase,parsed.data.assigned_operations_user_id))) redirect("/dashboard/admin/parceiros/gestao?error=engagement");
  const { error } = await supabase.from("partner_service_engagements").insert({
    account_id:parsed.data.account_id, contract_id:parsed.data.contract_id || null,
    service_type:parsed.data.service_type, request_source:parsed.data.request_source,
    title:parsed.data.title, description:parsed.data.description || null,
    agreed_amount_mzn:parsed.data.agreed_amount_mzn ? Number(parsed.data.agreed_amount_mzn) : null,
    due_at:parsed.data.due_at || null, created_by:user!.id,
    assigned_commercial_user_id:parsed.data.assigned_commercial_user_id || null,
    assigned_operations_user_id:parsed.data.assigned_operations_user_id || null,
  });
  if (error) redirect("/dashboard/admin/parceiros/gestao?error=engagement-save");
  revalidatePath("/dashboard/admin/parceiros/gestao");
  redirect("/dashboard/admin/parceiros/gestao?saved=engagement");
}

export async function issuePartnerInvoice(formData: FormData) {
  const parsed = z.object({ account_id:uuid, contract_id:z.string().optional(), engagement_id:z.string().optional(), campaign_id:z.string().optional(),
    document_number:z.string().min(3).max(100), amount_mzn:z.coerce.number().positive().max(100000000000) })
    .safeParse({account_id:value(formData,"account_id"),contract_id:value(formData,"contract_id") || undefined,
      engagement_id:value(formData,"engagement_id") || undefined,campaign_id:value(formData,"campaign_id") || undefined,document_number:value(formData,"document_number"),
      amount_mzn:value(formData,"amount_mzn")});
  if (!parsed.success || (parsed.data.contract_id && !uuid.safeParse(parsed.data.contract_id).success) ||
      (parsed.data.engagement_id && !uuid.safeParse(parsed.data.engagement_id).success) || (parsed.data.campaign_id && !uuid.safeParse(parsed.data.campaign_id).success)) redirect("/dashboard/admin/parceiros/gestao?error=invoice");
  const {supabase}=await adminContext();
  if(!(await partnerLinksValid(supabase,parsed.data.account_id,{contractId:parsed.data.contract_id,engagementId:parsed.data.engagement_id,campaignId:parsed.data.campaign_id}))) redirect("/dashboard/admin/parceiros/gestao?error=invoice");
  const {error}=await supabase.rpc("admin_issue_partner_invoice",{
    p_account_id:parsed.data.account_id,p_contract_id:parsed.data.contract_id||null,
    p_engagement_id:parsed.data.engagement_id||null,p_campaign_id:parsed.data.campaign_id||null,
    p_document_number:parsed.data.document_number,p_amount_mzn:parsed.data.amount_mzn,
  });
  if(error?.message.includes("CAMPAIGN_INVOICE_AMOUNT_MISMATCH")) redirect("/dashboard/admin/parceiros/gestao?error=invoice-campaign-amount");
  if(error) redirect("/dashboard/admin/parceiros/gestao?error=invoice-save");
  revalidatePath("/dashboard/admin/parceiros/gestao");
  redirect("/dashboard/admin/parceiros/gestao?saved=invoice");
}

export async function recordPartnerBankTransfer(formData: FormData) {
  const parsed=z.object({account_id:uuid,contract_id:z.string().optional(),engagement_id:z.string().optional(),campaign_id:z.string().optional(),
    document_id:z.string().optional(),amount_mzn:z.coerce.number().positive().max(100000000000),
    reference:z.string().min(3).max(180),bank_name:z.string().max(120).optional(),
    payer_name:z.string().max(180).optional(),transfer_date:z.string().optional(),proof_url:z.string().url().optional().or(z.literal(""))})
    .safeParse({account_id:value(formData,"account_id"),contract_id:value(formData,"contract_id") || undefined,
      engagement_id:value(formData,"engagement_id") || undefined,campaign_id:value(formData,"campaign_id") || undefined,document_id:value(formData,"document_id") || undefined,
      amount_mzn:value(formData,"amount_mzn"),reference:value(formData,"reference"),bank_name:value(formData,"bank_name") || undefined,
      payer_name:value(formData,"payer_name") || undefined,transfer_date:value(formData,"transfer_date") || undefined,
      proof_url:value(formData,"proof_url")});
  if(!parsed.success || [parsed.data.contract_id,parsed.data.engagement_id,parsed.data.campaign_id,parsed.data.document_id].some(x=>x && !uuid.safeParse(x).success))
    redirect("/dashboard/admin/parceiros/gestao?error=transfer");
  const {supabase}=await adminContext();
  if(!(await partnerLinksValid(supabase,parsed.data.account_id,{contractId:parsed.data.contract_id,engagementId:parsed.data.engagement_id,campaignId:parsed.data.campaign_id,documentId:parsed.data.document_id}))) redirect("/dashboard/admin/parceiros/gestao?error=transfer");
  const {error}=await supabase.rpc("admin_record_partner_bank_transfer",{
    p_account_id:parsed.data.account_id,p_amount_mzn:parsed.data.amount_mzn,p_reference:parsed.data.reference,
    p_bank_name:parsed.data.bank_name||null,p_payer_name:parsed.data.payer_name||null,
    p_transfer_date:parsed.data.transfer_date||null,p_proof_url:parsed.data.proof_url||null,
    p_contract_id:parsed.data.contract_id||null,p_engagement_id:parsed.data.engagement_id||null,
    p_campaign_id:parsed.data.campaign_id||null,p_document_id:parsed.data.document_id||null,
  });
  if(error?.code==="23505") redirect("/dashboard/admin/parceiros/gestao?error=transfer-duplicate");
  if(error?.message.includes("CAMPAIGN_PAYMENT_MUST_BE_FULL")) redirect("/dashboard/admin/parceiros/gestao?error=transfer-campaign-amount");
  if(error) redirect("/dashboard/admin/parceiros/gestao?error=transfer-save");
  revalidatePath("/dashboard/admin/parceiros/gestao");
  redirect("/dashboard/admin/parceiros/gestao?saved=transfer");
}

export async function verifyPartnerBankTransfer(formData: FormData) {
  const paymentId=value(formData,"payment_id");
  if(!uuid.safeParse(paymentId).success) redirect("/dashboard/admin/parceiros/gestao?error=payment-id");
  const {supabase}=await adminContext();
  const {error}=await supabase.rpc("admin_confirm_partner_bank_transfer",{
    p_payment_id:paymentId,p_notes:value(formData,"verification_notes") || null,
  });
  if(error?.message.includes("FINANCIAL_DOCUMENT_OVERPAID")) redirect("/dashboard/admin/parceiros/gestao?error=verify-overpayment");
  if(error?.message.includes("FINANCIAL_DOCUMENT_NOT_PAYABLE")) redirect("/dashboard/admin/parceiros/gestao?error=verify-not-payable");
  if(error) redirect("/dashboard/admin/parceiros/gestao?error=verify");
  revalidatePath("/dashboard/admin/parceiros/gestao");
  redirect("/dashboard/admin/parceiros/gestao?saved=verified");
}


export async function createPartnerContact(formData: FormData) {
  const parsed=z.object({account_id:uuid,full_name:z.string().min(2).max(160),role_title:z.string().max(120).optional(),
    email:z.string().email().optional().or(z.literal("")),phone:z.string().max(60).optional(),
    is_primary:z.enum(["true","false"]),is_billing_contact:z.enum(["true","false"]),receives_reports:z.enum(["true","false"])})
    .safeParse({account_id:value(formData,"account_id"),full_name:value(formData,"full_name"),role_title:value(formData,"role_title")||undefined,
      email:value(formData,"email"),phone:value(formData,"phone"),is_primary:value(formData,"is_primary"),
      is_billing_contact:value(formData,"is_billing_contact"),receives_reports:value(formData,"receives_reports")});
  if(!parsed.success || (!parsed.data.email && !parsed.data.phone)) redirect("/dashboard/admin/parceiros/gestao?error=contact");
  const {supabase,user}=await adminContext();
  if(parsed.data.is_primary==="true") {
    const {error:primaryError}=await supabase.from("partner_contacts").update({is_primary:false}).eq("account_id",parsed.data.account_id).eq("is_primary",true);
    if(primaryError) redirect("/dashboard/admin/parceiros/gestao?error=contact-save");
  }
  const {error}=await supabase.from("partner_contacts").insert({
    account_id:parsed.data.account_id,full_name:parsed.data.full_name,role_title:parsed.data.role_title||null,
    email:parsed.data.email||null,phone:parsed.data.phone||null,is_primary:parsed.data.is_primary==="true",
    is_billing_contact:parsed.data.is_billing_contact==="true",receives_reports:parsed.data.receives_reports==="true",created_by:user!.id,
  });
  if(error) redirect("/dashboard/admin/parceiros/gestao?error=contact-save");
  revalidatePath("/dashboard/admin/parceiros/gestao");
  redirect("/dashboard/admin/parceiros/gestao?saved=contact");
}

export async function createPartnerReportDelivery(formData: FormData) {
  const parsed=z.object({account_id:uuid,contract_id:z.string().optional(),engagement_id:z.string().optional(),campaign_id:z.string().optional(),
    title:z.string().min(2).max(180),report_type:z.enum(["PERFORMANCE","FINANCIAL","MARKET_INTELLIGENCE","CAMPAIGN","EXECUTIVE","OTHER"]),
    period_start:z.string().optional(),period_end:z.string().optional(),storage_path:z.string().max(500).optional(),
    external_url:z.string().url().optional().or(z.literal("")),recipient_emails:z.string().max(2000).optional(),
    delivery_channel:z.enum(["EMAIL","PORTAL","MEETING","SHARED_LINK","OTHER"]),status:z.enum(["DRAFT","READY","DELIVERED"])})
    .safeParse({account_id:value(formData,"account_id"),contract_id:value(formData,"contract_id")||undefined,
      engagement_id:value(formData,"engagement_id")||undefined,campaign_id:value(formData,"campaign_id")||undefined,title:value(formData,"title"),report_type:value(formData,"report_type"),
      period_start:value(formData,"period_start")||undefined,period_end:value(formData,"period_end")||undefined,
      storage_path:value(formData,"storage_path")||undefined,external_url:value(formData,"external_url"),
      recipient_emails:value(formData,"recipient_emails")||undefined,delivery_channel:value(formData,"delivery_channel"),
      status:value(formData,"status")});
  if(!parsed.success || [parsed.data.contract_id,parsed.data.engagement_id,parsed.data.campaign_id].some(x=>x&&!uuid.safeParse(x).success) ||
    (["READY","DELIVERED"].includes(parsed.data.status)&&!parsed.data.storage_path&&!parsed.data.external_url))
    redirect("/dashboard/admin/parceiros/gestao?error=report");
  const {supabase,user}=await adminContext();
  if(!(await partnerLinksValid(supabase,parsed.data.account_id,{contractId:parsed.data.contract_id,engagementId:parsed.data.engagement_id,campaignId:parsed.data.campaign_id}))) redirect("/dashboard/admin/parceiros/gestao?error=report");
  const recipients=(parsed.data.recipient_emails||"").split(/[;,\\n]/).map(x=>x.trim()).filter(Boolean);
  if(recipients.some(x=>!z.string().email().safeParse(x).success)) redirect("/dashboard/admin/parceiros/gestao?error=report");
  const {error}=await supabase.from("partner_report_deliveries").insert({
    account_id:parsed.data.account_id,contract_id:parsed.data.contract_id||null,engagement_id:parsed.data.engagement_id||null,campaign_id:parsed.data.campaign_id||null,
    title:parsed.data.title,report_type:parsed.data.report_type,period_start:parsed.data.period_start||null,
    period_end:parsed.data.period_end||null,storage_path:parsed.data.storage_path||null,external_url:parsed.data.external_url||null,
    recipient_emails:recipients,delivery_channel:parsed.data.delivery_channel,status:parsed.data.status,
    delivered_at:parsed.data.status==="DELIVERED"?new Date().toISOString():null,
    delivered_by:parsed.data.status==="DELIVERED"?user!.id:null,created_by:user!.id,
  });
  if(error) redirect("/dashboard/admin/parceiros/gestao?error=report-save");
  revalidatePath("/dashboard/admin/parceiros/gestao");
  redirect("/dashboard/admin/parceiros/gestao?saved=report");
}


export async function createBackofficePartnerCampaign(formData: FormData) {
  const parsed=z.object({account_id:uuid,product_id:uuid,contract_id:z.string().optional(),title:z.string().min(2).max(180),
    objective:z.string().max(1000).optional(),starts_at:z.string().optional(),ends_at:z.string().optional(),
    price_mzn:z.coerce.number().positive().max(100000000000),assigned_operations_user_id:z.string().optional()})
    .safeParse({account_id:value(formData,"account_id"),product_id:value(formData,"product_id"),contract_id:value(formData,"contract_id")||undefined,
      title:value(formData,"title"),objective:value(formData,"objective")||undefined,starts_at:value(formData,"starts_at")||undefined,
      ends_at:value(formData,"ends_at")||undefined,price_mzn:value(formData,"price_mzn"),
      assigned_operations_user_id:value(formData,"assigned_operations_user_id")||undefined});
  if(!parsed.success || (parsed.data.contract_id&&!uuid.safeParse(parsed.data.contract_id).success) ||
    (parsed.data.assigned_operations_user_id&&!uuid.safeParse(parsed.data.assigned_operations_user_id).success)) redirect("/dashboard/admin/parceiros/gestao?error=campaign");
  const {supabase}=await adminContext();
  if(parsed.data.contract_id && !(await partnerLinksValid(supabase,parsed.data.account_id,{contractId:parsed.data.contract_id}))) redirect("/dashboard/admin/parceiros/gestao?error=campaign");
  if(!(await isActivePlatformMember(supabase,parsed.data.assigned_operations_user_id))) redirect("/dashboard/admin/parceiros/gestao?error=campaign");
  const {error}=await supabase.rpc("admin_create_partner_ad_campaign_bank_transfer",{
    p_account_id:parsed.data.account_id,p_product_id:parsed.data.product_id,p_contract_id:parsed.data.contract_id||null,
    p_title:parsed.data.title,p_objective:parsed.data.objective||null,
    p_starts_at:parsed.data.starts_at||null,p_ends_at:parsed.data.ends_at||null,
    p_price_mzn:parsed.data.price_mzn,p_assigned_operations_user_id:parsed.data.assigned_operations_user_id||null,
  });
  if(error?.message.includes("FIXED_PRODUCT_PRICE_CANNOT_BE_OVERRIDDEN")) redirect("/dashboard/admin/parceiros/gestao?error=campaign-price");
  if(error?.message.includes("AD_PRODUCT_NOT_AVAILABLE")) redirect("/dashboard/admin/parceiros/gestao?error=campaign-product");
  if(error?.message.includes("AD_SPACE_UNAVAILABLE")) redirect("/dashboard/admin/parceiros/gestao?error=campaign-capacity");
  if(error?.message.includes("CAMPAIGN_EXCEEDS_PRODUCT_DURATION")||error?.message.includes("INVALID_CAMPAIGN_DATES")) redirect("/dashboard/admin/parceiros/gestao?error=campaign-dates");
  if(error) redirect("/dashboard/admin/parceiros/gestao?error=campaign-save");
  revalidatePath("/dashboard/admin/parceiros/gestao");
  revalidatePath("/dashboard/admin/publicidade");
  redirect("/dashboard/admin/parceiros/gestao?saved=campaign");
}

export async function updatePartnerEngagementStatus(formData: FormData) {
  const id=value(formData,"engagement_id");
  const status=value(formData,"status");
  if(!uuid.safeParse(id).success || !["RECEIVED","SCOPING","AWAITING_APPROVAL","APPROVED","IN_PROGRESS","UNDER_REVIEW","DELIVERED","CLOSED","ON_HOLD","CANCELLED"].includes(status))
    redirect("/dashboard/admin/parceiros/gestao?error=engagement-status");
  const {supabase}=await adminContext();
  const updates:Record<string,unknown>={status};
  if(status==="IN_PROGRESS") updates.started_at=new Date().toISOString();
  if(status==="DELIVERED") updates.delivered_at=new Date().toISOString();
  if(status==="CLOSED") updates.closed_at=new Date().toISOString();
  const {error}=await supabase.from("partner_service_engagements").update(updates).eq("id",id);
  if(error) redirect("/dashboard/admin/parceiros/gestao?error=engagement-status");
  revalidatePath("/dashboard/admin/parceiros/gestao");
  redirect("/dashboard/admin/parceiros/gestao?saved=engagement-status");
}


export async function createPartnerEntitlement(formData: FormData) {
  const parsed = z.object({
    account_id: uuid,
    entitlement_type: z.enum(["SERVICE","EXCLUSIVITY","ADVERTISING","INTELLIGENCE"]),
    name: z.string().trim().min(2).max(180),
    description: z.string().max(2000).optional(),
    scope: z.string().max(500).optional(),
    starts_at: z.string().optional(),
    ends_at: z.string().optional(),
  }).safeParse({
    account_id:value(formData,"account_id"),
    entitlement_type:value(formData,"entitlement_type"),
    name:value(formData,"name"),
    description:value(formData,"description") || undefined,
    scope:value(formData,"scope") || undefined,
    starts_at:value(formData,"starts_at") || undefined,
    ends_at:value(formData,"ends_at") || undefined,
  });
  if (!parsed.success || (parsed.data.starts_at && parsed.data.ends_at && parsed.data.ends_at < parsed.data.starts_at) ||
    (parsed.data.entitlement_type === "EXCLUSIVITY" && !parsed.data.scope?.trim())) {
    redirect("/dashboard/admin/parceiros/gestao?error=entitlement");
  }
  const {supabase,user}=await adminContext();
  const {error}=await supabase.from("partner_entitlements").insert({
    account_id:parsed.data.account_id,
    entitlement_type:parsed.data.entitlement_type,
    name:parsed.data.name,
    description:parsed.data.description || null,
    scope:parsed.data.scope || null,
    starts_at:parsed.data.starts_at ? new Date(parsed.data.starts_at).toISOString() : null,
    ends_at:parsed.data.ends_at ? new Date(parsed.data.ends_at).toISOString() : null,
    status:"ACTIVE",
  });
  if(error?.message.includes("PARTNER_EXCLUSIVITY_SCOPE_CONFLICT")) redirect("/dashboard/admin/parceiros/gestao?error=entitlement-conflict");
  if(error?.message.includes("PARTNER_EXCLUSIVITY_SCOPE_REQUIRED") || error?.message.includes("PARTNER_ENTITLEMENT_INVALID_DATES")) redirect("/dashboard/admin/parceiros/gestao?error=entitlement");
  if(error) redirect("/dashboard/admin/parceiros/gestao?error=entitlement-save");
  revalidatePath("/dashboard/admin/parceiros/gestao");
  redirect("/dashboard/admin/parceiros/gestao?saved=entitlement");
}

export async function updatePartnerEntitlementStatus(formData: FormData) {
  const id=value(formData,"entitlement_id");
  const status=value(formData,"status");
  if(!uuid.safeParse(id).success || !["ACTIVE","SUSPENDED","EXPIRED"].includes(status)) redirect("/dashboard/admin/parceiros/gestao?error=entitlement");
  const {supabase}=await adminContext();
  const {error}=await supabase.from("partner_entitlements").update({status,updated_at:new Date().toISOString()}).eq("id",id);
  if(error?.message.includes("PARTNER_EXCLUSIVITY_SCOPE_CONFLICT")) redirect("/dashboard/admin/parceiros/gestao?error=entitlement-conflict");
  if(error) redirect("/dashboard/admin/parceiros/gestao?error=entitlement-save");
  revalidatePath("/dashboard/admin/parceiros/gestao");
  redirect("/dashboard/admin/parceiros/gestao?saved=entitlement-status");
}


export async function updateInstitutionalPartner(formData:FormData) {
 const parsed=z.object({account_id:uuid,name:z.string().min(2).max(180),legal_name:z.string().max(180),tax_id:z.string().max(80),billing_address:z.string().max(300),billing_city:z.string().max(120),contact_email:z.string().email().or(z.literal("")),contact_phone:z.string().max(60),operating_model:z.enum(["MANAGED","STRATEGIC","HYBRID","SELF_SERVICE"]),status:z.enum(["ACTIVE","SUSPENDED","CLOSED"]),portal_enabled:z.enum(["true","false"]),description:z.string().max(2000),internal_notes:z.string().max(4000),reason:z.string().min(8).max(500)}).safeParse({
 account_id:value(formData,"account_id"),name:value(formData,"name"),legal_name:value(formData,"legal_name"),tax_id:value(formData,"tax_id"),billing_address:value(formData,"billing_address"),billing_city:value(formData,"billing_city"),contact_email:value(formData,"contact_email"),contact_phone:value(formData,"contact_phone"),operating_model:value(formData,"operating_model"),status:value(formData,"status"),portal_enabled:value(formData,"portal_enabled"),description:value(formData,"description"),internal_notes:value(formData,"internal_notes"),reason:value(formData,"reason")});
 if(!parsed.success) redirect("/dashboard/admin/parceiros/gestao?error=partner-update");
 const {supabase}=await adminContext();
 const {error}=await supabase.rpc("admin_update_partner_account",{p_account_id:parsed.data.account_id,p_name:parsed.data.name,p_legal_name:parsed.data.legal_name||null,p_tax_id:parsed.data.tax_id||null,p_billing_address:parsed.data.billing_address||null,p_billing_city:parsed.data.billing_city||null,p_contact_email:parsed.data.contact_email||null,p_contact_phone:parsed.data.contact_phone||null,p_operating_model:parsed.data.operating_model,p_status:parsed.data.status,p_portal_enabled:parsed.data.portal_enabled==="true",p_description:parsed.data.description||null,p_internal_notes:parsed.data.internal_notes||null,p_reason:parsed.data.reason});
 if(error) redirect("/dashboard/admin/parceiros/gestao?error=partner-update");
 revalidatePath("/dashboard/admin/parceiros/gestao");revalidatePath("/dashboard/admin/parceiros");
 redirect("/dashboard/admin/parceiros/gestao?saved=partner-update");
}
export async function updateInstitutionalContact(formData:FormData) {
 const parsed=z.object({contact_id:uuid,full_name:z.string().min(2).max(160),role_title:z.string().max(120),email:z.string().email().or(z.literal("")),phone:z.string().max(60),is_primary:z.enum(["true","false"]),is_billing_contact:z.enum(["true","false"]),receives_reports:z.enum(["true","false"]),active:z.enum(["true","false"]),reason:z.string().min(8).max(500)}).safeParse({contact_id:value(formData,"contact_id"),full_name:value(formData,"full_name"),role_title:value(formData,"role_title"),email:value(formData,"email"),phone:value(formData,"phone"),is_primary:value(formData,"is_primary"),is_billing_contact:value(formData,"is_billing_contact"),receives_reports:value(formData,"receives_reports"),active:value(formData,"active"),reason:value(formData,"reason")});
 if(!parsed.success||(!parsed.data.email&&!parsed.data.phone)) redirect("/dashboard/admin/parceiros/gestao?error=contact-update");
 const {supabase}=await adminContext();
 const {error}=await supabase.rpc("admin_update_partner_contact",{p_contact_id:parsed.data.contact_id,p_full_name:parsed.data.full_name,p_role_title:parsed.data.role_title||null,p_email:parsed.data.email||null,p_phone:parsed.data.phone||null,p_is_primary:parsed.data.is_primary==="true",p_is_billing_contact:parsed.data.is_billing_contact==="true",p_receives_reports:parsed.data.receives_reports==="true",p_active:parsed.data.active==="true",p_reason:parsed.data.reason});
 if(error) redirect("/dashboard/admin/parceiros/gestao?error=contact-update");
 revalidatePath("/dashboard/admin/parceiros/gestao");redirect("/dashboard/admin/parceiros/gestao?saved=contact-update");
}
