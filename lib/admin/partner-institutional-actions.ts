"use server";

import { createHash, randomUUID } from "node:crypto";
import { sendPartnerReportEmail as deliverPartnerReportEmail } from "@/lib/email/resend";

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
function validCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
function validLocalDateTime(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}


type PartnerLinkIds = { contractId?: string; engagementId?: string; campaignId?: string; documentId?: string };
async function partnerAccountIsActive(supabase: AdminSupabase, accountId: string) {
  const {data,error}=await supabase.from("partner_accounts").select("status").eq("id",accountId).maybeSingle();
  return !error && data?.status==="ACTIVE";
}
async function partnerParentBelongsToAccount(supabase: AdminSupabase, accountId: string, parentType: string, parentId: string) {
  const tables: Record<string,string> = {
    CONTRACT: "partner_contracts",
    ENGAGEMENT: "partner_service_engagements",
    REPORT: "partner_report_deliveries",
    CAMPAIGN: "partner_ad_campaigns",
  };
  const table=tables[parentType];
  if(!table) return false;
  const {data,error}=await supabase.from(table).select("account_id").eq("id",parentId).maybeSingle();
  return !error && data?.account_id===accountId;
}
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
  if (!parsed.success || (parsed.data.starts_on && !validCalendarDate(parsed.data.starts_on)) ||
    (parsed.data.ends_on && !validCalendarDate(parsed.data.ends_on)) ||
    (parsed.data.starts_on && parsed.data.ends_on && parsed.data.ends_on < parsed.data.starts_on))
    redirect("/dashboard/admin/parceiros/gestao?error=contract");
  const { supabase,user } = await adminContext();
  if(!(await partnerAccountIsActive(supabase,parsed.data.account_id))) redirect("/dashboard/admin/parceiros/gestao?error=contract");
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
  const amountValue=parsed.success && parsed.data.agreed_amount_mzn ? Number(parsed.data.agreed_amount_mzn) : null;
  if (!parsed.success || (parsed.data.contract_id && !uuid.safeParse(parsed.data.contract_id).success) ||
    [parsed.data.assigned_commercial_user_id,parsed.data.assigned_operations_user_id].some(x=>x&&!uuid.safeParse(x).success) ||
    (parsed.data.agreed_amount_mzn && (!Number.isFinite(amountValue) || amountValue! < 0 || amountValue! > 100000000000)) ||
    (parsed.data.due_at && !validLocalDateTime(parsed.data.due_at))) redirect("/dashboard/admin/parceiros/gestao?error=engagement");
  const { supabase,user } = await adminContext();
  if(!(await partnerAccountIsActive(supabase,parsed.data.account_id))) redirect("/dashboard/admin/parceiros/gestao?error=engagement");
  if(parsed.data.contract_id && !(await partnerLinksValid(supabase,parsed.data.account_id,{contractId:parsed.data.contract_id}))) redirect("/dashboard/admin/parceiros/gestao?error=engagement");
  if(!(await isActivePlatformMember(supabase,parsed.data.assigned_commercial_user_id)) || !(await isActivePlatformMember(supabase,parsed.data.assigned_operations_user_id))) redirect("/dashboard/admin/parceiros/gestao?error=engagement");
  const { error } = await supabase.from("partner_service_engagements").insert({
    account_id:parsed.data.account_id, contract_id:parsed.data.contract_id || null,
    service_type:parsed.data.service_type, request_source:parsed.data.request_source,
    title:parsed.data.title, description:parsed.data.description || null,
    agreed_amount_mzn:amountValue,
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
  if(!(await partnerAccountIsActive(supabase,parsed.data.account_id))) redirect("/dashboard/admin/parceiros/gestao?error=invoice");
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
  if(!(await partnerAccountIsActive(supabase,parsed.data.account_id))) redirect("/dashboard/admin/parceiros/gestao?error=transfer");
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
  if(!(await partnerAccountIsActive(supabase,parsed.data.account_id))) redirect("/dashboard/admin/parceiros/gestao?error=contact");
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
 const parsed=z.object({account_id:uuid,contract_id:z.string().optional(),engagement_id:z.string().optional(),campaign_id:z.string().optional(),title:z.string().min(2).max(180),report_type:z.enum(["PERFORMANCE","FINANCIAL","MARKET_INTELLIGENCE","CAMPAIGN","EXECUTIVE","OTHER"]),period_start:z.string().optional(),period_end:z.string().optional(),storage_path:z.string().max(500).optional(),external_url:z.string().url().optional().or(z.literal("")),recipient_emails:z.string().max(2000).optional(),delivery_channel:z.enum(["EMAIL","PORTAL","MEETING","SHARED_LINK","OTHER"])}).safeParse({account_id:value(formData,"account_id"),contract_id:value(formData,"contract_id")||undefined,engagement_id:value(formData,"engagement_id")||undefined,campaign_id:value(formData,"campaign_id")||undefined,title:value(formData,"title"),report_type:value(formData,"report_type"),period_start:value(formData,"period_start")||undefined,period_end:value(formData,"period_end")||undefined,storage_path:value(formData,"storage_path")||undefined,external_url:value(formData,"external_url"),recipient_emails:value(formData,"recipient_emails")||undefined,delivery_channel:value(formData,"delivery_channel")});
 if(!parsed.success || [parsed.data.contract_id,parsed.data.engagement_id,parsed.data.campaign_id].some(x=>x&&!uuid.safeParse(x).success) ||
   (parsed.data.period_start&&!validCalendarDate(parsed.data.period_start)) || (parsed.data.period_end&&!validCalendarDate(parsed.data.period_end)) ||
   (parsed.data.period_start&&parsed.data.period_end&&parsed.data.period_end<parsed.data.period_start)) redirect("/dashboard/admin/parceiros/gestao?error=report");
 const {supabase,user}=await adminContext();
 if(!(await partnerAccountIsActive(supabase,parsed.data.account_id))) redirect("/dashboard/admin/parceiros/gestao?error=report");
 if(!(await partnerLinksValid(supabase,parsed.data.account_id,{contractId:parsed.data.contract_id,engagementId:parsed.data.engagement_id,campaignId:parsed.data.campaign_id}))) redirect("/dashboard/admin/parceiros/gestao?error=report");
 if(parsed.data.storage_path) {
  const {data:attached,error:attachedError}=await supabase.from("partner_documents").select("id,document_type").eq("account_id",parsed.data.account_id).eq("storage_path",parsed.data.storage_path).maybeSingle();
  if(attachedError || !attached || !["REPORT","SUPPORTING","OTHER"].includes(attached.document_type)) redirect("/dashboard/admin/parceiros/gestao?error=report");
 }
 if(parsed.data.external_url && !/^https:\/\//i.test(parsed.data.external_url)) redirect("/dashboard/admin/parceiros/gestao?error=report");
 const recipients=(parsed.data.recipient_emails||"").split(/[;,\\n]/).map(x=>x.trim()).filter(Boolean);
 if(recipients.some(x=>!z.string().email().safeParse(x).success)) redirect("/dashboard/admin/parceiros/gestao?error=report");
 const {error}=await supabase.from("partner_report_deliveries").insert({account_id:parsed.data.account_id,contract_id:parsed.data.contract_id||null,engagement_id:parsed.data.engagement_id||null,campaign_id:parsed.data.campaign_id||null,title:parsed.data.title,report_type:parsed.data.report_type,period_start:parsed.data.period_start||null,period_end:parsed.data.period_end||null,storage_path:parsed.data.storage_path||null,external_url:parsed.data.external_url||null,recipient_emails:recipients,delivery_channel:parsed.data.delivery_channel,status:"DRAFT",created_by:user!.id});
 if(error) redirect("/dashboard/admin/parceiros/gestao?error=report-save");
 revalidatePath("/dashboard/admin/parceiros/gestao");redirect("/dashboard/admin/parceiros/gestao?saved=report");
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
    (parsed.data.assigned_operations_user_id&&!uuid.safeParse(parsed.data.assigned_operations_user_id).success) ||
    (parsed.data.starts_at&&!validLocalDateTime(parsed.data.starts_at)) ||
    (parsed.data.ends_at&&!validLocalDateTime(parsed.data.ends_at)) ||
    (parsed.data.starts_at&&parsed.data.ends_at&&parsed.data.ends_at<=parsed.data.starts_at)) redirect("/dashboard/admin/parceiros/gestao?error=campaign");
  const {supabase}=await adminContext();
  if(!(await partnerAccountIsActive(supabase,parsed.data.account_id))) redirect("/dashboard/admin/parceiros/gestao?error=campaign");
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
 const id=value(formData,"engagement_id"),status=value(formData,"status"),commercial=value(formData,"assigned_commercial_user_id"),operations=value(formData,"assigned_operations_user_id"),due=value(formData,"due_at"),reason=value(formData,"reason");
 if(!uuid.safeParse(id).success || (commercial&&!uuid.safeParse(commercial).success) || (operations&&!uuid.safeParse(operations).success) || (due&&!/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}$/.test(due)) || reason.length<8 || reason.length>500) redirect("/dashboard/admin/parceiros/gestao?error=engagement-status");
 const {supabase}=await adminContext();
 const {error}=await supabase.rpc("admin_update_partner_engagement",{p_engagement_id:id,p_status:status,p_commercial_user_id:commercial||null,p_operations_user_id:operations||null,p_due_at:due?new Date(due).toISOString():null,p_reason:reason});
 if(error) redirect("/dashboard/admin/parceiros/gestao?error=engagement-status");
 revalidatePath("/dashboard/admin/parceiros/gestao");redirect("/dashboard/admin/parceiros/gestao?saved=engagement-status");
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
  if (!parsed.success || (parsed.data.starts_at && Number.isNaN(new Date(parsed.data.starts_at).getTime())) ||
    (parsed.data.ends_at && Number.isNaN(new Date(parsed.data.ends_at).getTime())) ||
    (parsed.data.starts_at && parsed.data.ends_at && parsed.data.ends_at < parsed.data.starts_at) ||
    (parsed.data.entitlement_type === "EXCLUSIVITY" && !parsed.data.scope?.trim())) {
    redirect("/dashboard/admin/parceiros/gestao?error=entitlement");
  }
  const {supabase,user}=await adminContext();
  if(!(await partnerAccountIsActive(supabase,parsed.data.account_id))) redirect("/dashboard/admin/parceiros/gestao?error=entitlement");
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
 const id=value(formData,"entitlement_id"),status=value(formData,"status"),reason=value(formData,"reason");
 if(!uuid.safeParse(id).success || reason.length<8 || reason.length>500) redirect("/dashboard/admin/parceiros/gestao?error=entitlement");
 const {supabase}=await adminContext();
 const {error}=await supabase.rpc("admin_update_partner_entitlement_status",{p_entitlement_id:id,p_status:status,p_reason:reason});
 if(error) redirect("/dashboard/admin/parceiros/gestao?error=entitlement-save");
 revalidatePath("/dashboard/admin/parceiros/gestao");redirect("/dashboard/admin/parceiros/gestao?saved=entitlement-status");
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


export async function transitionPartnerContract(formData: FormData) {
 const id=value(formData,"contract_id"),status=value(formData,"status"),signed=value(formData,"signed_document_path"),reason=value(formData,"reason");
 if(!uuid.safeParse(id).success || reason.length<8 || reason.length>500 || signed.length>500) redirect("/dashboard/admin/parceiros/gestao?error=contract-transition");
 const {supabase}=await adminContext();
 if(signed) {
  const {data:contract,error:contractError}=await supabase.from("partner_contracts").select("account_id").eq("id",id).maybeSingle();
  const {data:document,error:documentError}=await supabase.from("partner_documents").select("id").eq("account_id",contract?.account_id??"").eq("storage_path",signed).eq("document_type","SIGNED_CONTRACT").eq("parent_type","CONTRACT").eq("parent_id",id).maybeSingle();
  if(contractError || documentError || !contract || !document) redirect("/dashboard/admin/parceiros/gestao?error=contract-transition");
 }
 const {error}=await supabase.rpc("admin_transition_partner_contract",{p_contract_id:id,p_status:status,p_signed_document_path:signed||null,p_reason:reason});
 if(error) redirect("/dashboard/admin/parceiros/gestao?error=contract-transition");
 revalidatePath("/dashboard/admin/parceiros/gestao");redirect("/dashboard/admin/parceiros/gestao?saved=contract-transition");
}
export async function transitionPartnerReport(formData: FormData) {
 const id=value(formData,"report_id"),status=value(formData,"status"),reference=value(formData,"delivery_reference"),reason=value(formData,"reason");
 if(!uuid.safeParse(id).success || reason.length<8 || reason.length>500 || reference.length>500) redirect("/dashboard/admin/parceiros/gestao?error=report-transition");
 const {supabase}=await adminContext();
 const {error}=await supabase.rpc("admin_update_partner_report_delivery",{p_report_id:id,p_status:status,p_delivery_reference:reference||null,p_reason:reason});
 if(error) redirect("/dashboard/admin/parceiros/gestao?error=report-transition");
 revalidatePath("/dashboard/admin/parceiros/gestao");redirect("/dashboard/admin/parceiros/gestao?saved=report-transition");
}


const partnerDocumentMimeTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
export async function createPartnerRelationshipAction(formData:FormData){const parsed=z.object({account_id:uuid,title:z.string().min(3).max(180),details:z.string().min(8).max(2000),priority:z.enum(["CRITICAL","HIGH","MEDIUM","LOW"]),owner_user_id:z.string().optional(),due_at:z.string().optional()}).safeParse({account_id:value(formData,"account_id"),title:value(formData,"title"),details:value(formData,"details"),priority:value(formData,"priority"),owner_user_id:value(formData,"owner_user_id")||undefined,due_at:value(formData,"due_at")||undefined});if(!parsed.success||(parsed.data.owner_user_id&&!uuid.safeParse(parsed.data.owner_user_id).success)||(parsed.data.due_at&&!/^\\d{4}-\\d{2}-\\d{2}$/.test(parsed.data.due_at)))redirect("/dashboard/admin/parceiros/controlo?error=action");const {supabase,user}=await adminContext();if(parsed.data.owner_user_id&&!(await isActivePlatformMember(supabase,parsed.data.owner_user_id)))redirect("/dashboard/admin/parceiros/controlo?error=action");const {error}=await supabase.from("partner_relationship_action_plans").insert({...parsed.data,owner_user_id:parsed.data.owner_user_id||null,due_at:parsed.data.due_at||null,created_by:user!.id,updated_by:user!.id});if(error)redirect("/dashboard/admin/parceiros/controlo?error=action-save");revalidatePath("/dashboard/admin/parceiros/controlo");redirect("/dashboard/admin/parceiros/controlo?saved=action");}
export async function updatePartnerRelationshipAction(formData:FormData){const parsed=z.object({action_id:uuid,status:z.enum(["OPEN","IN_PROGRESS","WAITING","RESOLVED","CANCELLED"]),owner_user_id:z.string().optional(),due_at:z.string().optional(),decision:z.string().optional(),resolution_note:z.string().optional()}).safeParse({action_id:value(formData,"action_id"),status:value(formData,"status"),owner_user_id:value(formData,"owner_user_id")||undefined,due_at:value(formData,"due_at")||undefined,decision:value(formData,"decision")||undefined,resolution_note:value(formData,"resolution_note")||undefined});const ds=["RECOVER","RENEW","RENEGOTIATE","CONTINUE","TERMINATE","OTHER"];if(!parsed.success||(parsed.data.owner_user_id&&!uuid.safeParse(parsed.data.owner_user_id).success)||(parsed.data.due_at&&!/^\\d{4}-\\d{2}-\\d{2}$/.test(parsed.data.due_at))||(parsed.data.decision&&!ds.includes(parsed.data.decision))||(["RESOLVED","CANCELLED"].includes(parsed.data.status)&&(!parsed.data.decision||!parsed.data.resolution_note||parsed.data.resolution_note.length<8))||(parsed.data.resolution_note&&parsed.data.resolution_note.length>2000))redirect("/dashboard/admin/parceiros/controlo?error=action");const {supabase,user}=await adminContext();if(parsed.data.owner_user_id&&!(await isActivePlatformMember(supabase,parsed.data.owner_user_id)))redirect("/dashboard/admin/parceiros/controlo?error=action");const {error}=await supabase.from("partner_relationship_action_plans").update({status:parsed.data.status,owner_user_id:parsed.data.owner_user_id||null,due_at:parsed.data.due_at||null,decision:parsed.data.decision||null,resolution_note:parsed.data.resolution_note||null,resolved_at:["RESOLVED","CANCELLED"].includes(parsed.data.status)?new Date().toISOString():null,updated_by:user!.id,updated_at:new Date().toISOString()}).eq("id",parsed.data.action_id);if(error)redirect("/dashboard/admin/parceiros/controlo?error=action-save");revalidatePath("/dashboard/admin/parceiros/controlo");redirect("/dashboard/admin/parceiros/controlo?saved=action-update");}

function documentExtension(mime: string) {
  return ({
    "application/pdf":"pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":"docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":"xlsx",
    "image/jpeg":"jpg",
    "image/png":"png",
    "image/webp":"webp",
  } as Record<string,string>)[mime] ?? null;
}
function validDocumentSignature(bytes: Uint8Array, mime: string) {
  if (mime === "application/pdf") return new TextDecoder().decode(bytes.slice(0,5)) === "%PDF-";
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/png") return [137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
  if (mime === "image/webp") return new TextDecoder().decode(bytes.slice(0,4)) === "RIFF" && new TextDecoder().decode(bytes.slice(8,12)) === "WEBP";
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
  return false;
}

export async function createPartnerDocument(formData: FormData) {
  const accountId=value(formData,"account_id");
  const documentType=value(formData,"document_type");
  const parentRef=value(formData,"parent_ref") || "GENERAL";
  const title=value(formData,"title");
  const notes=value(formData,"notes");
  const file=formData.get("file");
  if(!uuid.safeParse(accountId).success || !["SIGNED_CONTRACT","REPORT","SUPPORTING","OTHER"].includes(documentType) ||
    title.length<2 || title.length>180 || notes.length>1000 || !(file instanceof File) ||
    file.size<1 || file.size>10*1024*1024 || !partnerDocumentMimeTypes.has(file.type)) {
    redirect("/dashboard/admin/parceiros/gestao?error=document");
  }
  let parentType="GENERAL",parentId:string|null=null;
  if(parentRef!=="GENERAL") {
    const separator=parentRef.indexOf(":");
    parentType=parentRef.slice(0,separator);
    parentId=parentRef.slice(separator+1);
    if(!["CONTRACT","ENGAGEMENT","REPORT","CAMPAIGN"].includes(parentType) || !uuid.safeParse(parentId).success) redirect("/dashboard/admin/parceiros/gestao?error=document");
  }
  if(documentType==="SIGNED_CONTRACT" && parentType!=="CONTRACT") redirect("/dashboard/admin/parceiros/gestao?error=document");
  const {supabase}=await adminContext();
  if(!(await partnerAccountIsActive(supabase,accountId))) redirect("/dashboard/admin/parceiros/gestao?error=document");
  if(parentId && !(await partnerParentBelongsToAccount(supabase,accountId,parentType,parentId)))
    redirect("/dashboard/admin/parceiros/gestao?error=document");
  const extension=documentExtension(file.type);
  if(!extension) redirect("/dashboard/admin/parceiros/gestao?error=document");
  const bytes=new Uint8Array(await file.arrayBuffer());
  if(!validDocumentSignature(bytes,file.type)) redirect("/dashboard/admin/parceiros/gestao?error=document-type");
  const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,"_").slice(-100) || `document.${extension}`;
  const storagePath=`${accountId}/${parentType.toLowerCase()}/${parentId ?? "general"}/${randomUUID()}.${extension}`;
  const {error:uploadError}=await supabase.storage.from("partner-documents").upload(storagePath,bytes,{
    contentType:file.type,cacheControl:"3600",upsert:false,
  });
  if(uploadError) redirect("/dashboard/admin/parceiros/gestao?error=document-upload");
  const digest=createHash("sha256").update(bytes).digest("hex");
  const {error:registerError}=await supabase.from("partner_documents").insert({
    account_id:accountId,document_type:documentType,parent_type:parentType,parent_id:parentId,
    title,original_filename:safeName,storage_path:storagePath,mime_type:file.type,
    size_bytes:file.size,sha256_hash:digest,notes:notes||null,
  });
  if(registerError) {
    await supabase.storage.from("partner-documents").remove([storagePath]);
    redirect("/dashboard/admin/parceiros/gestao?error=document-register");
  }
  revalidatePath("/dashboard/admin/parceiros/gestao");
  redirect("/dashboard/admin/parceiros/gestao?saved=document");
}

export async function openPartnerDocument(formData: FormData) {
  const id=value(formData,"document_id");
  if(!uuid.safeParse(id).success) redirect("/dashboard/admin/parceiros/gestao?error=document-open");
  const {supabase}=await adminContext();
  const {data,error}=await supabase.from("partner_documents").select("storage_path,original_filename").eq("id",id).maybeSingle();
  if(error || !data) redirect("/dashboard/admin/parceiros/gestao?error=document-open");
  const {data:signed,error:signedError}=await supabase.storage.from("partner-documents").createSignedUrl(data.storage_path,600,{download:data.original_filename});
  if(signedError || !signed?.signedUrl) redirect("/dashboard/admin/parceiros/gestao?error=document-open");
  redirect(signed.signedUrl);
}

export async function sendPartnerReportEmail(formData: FormData) {
  const reportId=value(formData,"report_id");
  if(!uuid.safeParse(reportId).success) redirect("/dashboard/admin/parceiros/gestao?error=email-report");
  const {supabase}=await adminContext();
  const {data:report,error}=await supabase.from("partner_report_deliveries")
    .select("id,account_id,title,status,delivery_channel,recipient_emails,storage_path,external_url,period_start,period_end")
    .eq("id",reportId).maybeSingle();
  if(error || !report || report.status!=="READY" || report.delivery_channel!=="EMAIL" || !report.recipient_emails?.length)
    redirect("/dashboard/admin/parceiros/gestao?error=email-report");
  let reportUrl=report.external_url as string|null;
  if(report.storage_path) {
    const {data:document,error:documentError}=await supabase.from("partner_documents")
      .select("id").eq("account_id",report.account_id).eq("storage_path",report.storage_path).maybeSingle();
    if(documentError || !document) redirect("/dashboard/admin/parceiros/gestao?error=email-report-file");
    const {data:signed,error:signedError}=await supabase.storage.from("partner-documents").createSignedUrl(report.storage_path,60*60*24*3);
    if(signedError || !signed?.signedUrl) redirect("/dashboard/admin/parceiros/gestao?error=email-report-file");
    reportUrl=signed.signedUrl;
  }
  if(!reportUrl || !/^https:\/\//i.test(reportUrl)) redirect("/dashboard/admin/parceiros/gestao?error=email-report-file");
  const esc=(input:string)=>input.replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]!));
  const period=report.period_start || report.period_end
    ? `<p>Período: ${esc(report.period_start ?? "—")} a ${esc(report.period_end ?? "—")}</p>`
    : "";
  let providerId:string;
  try {
    providerId=await deliverPartnerReportEmail({
      to:report.recipient_emails as string[],
      subject:`MozEmpresas | ${report.title}`,
      html:`<div style="font-family:Arial,sans-serif;color:#172033;line-height:1.6"><h2>${esc(report.title)}</h2>${period}<p>O relatório institucional está disponível através do endereço seguro abaixo:</p><p><a href="${esc(reportUrl)}">Consultar relatório</a></p><p style="font-size:12px;color:#687386">Este endereço temporário expira em 72 horas. Se necessitar de novo acesso, contacte a equipa responsável.</p></div>`,
      idempotencyKey:`partner-report-${report.id}`,
    });
  } catch(error) {
    const message=error instanceof Error?error.message:"EMAIL_PROVIDER_UNAVAILABLE";
    if(message==="EMAIL_PROVIDER_NOT_CONFIGURED") redirect("/dashboard/admin/parceiros/gestao?error=email-config");
    await supabase.rpc("admin_update_partner_report_delivery",{
      p_report_id:report.id,p_status:"FAILED",p_delivery_reference:"RESEND_FAILURE",
      p_reason:"Falha no envio de email pelo fornecedor configurado.",
    });
    redirect("/dashboard/admin/parceiros/gestao?error=email-send");
  }
  const {error:deliveryError}=await supabase.rpc("admin_update_partner_report_delivery",{
    p_report_id:report.id,p_status:"DELIVERED",p_delivery_reference:`resend:${providerId}`,
    p_reason:"Email enviado pelo fornecedor transaccional; referência do fornecedor registada.",
  });
  if(deliveryError) redirect("/dashboard/admin/parceiros/gestao?error=email-audit");
  revalidatePath("/dashboard/admin/parceiros/gestao");
  redirect("/dashboard/admin/parceiros/gestao?saved=report-sent");
}

export async function updatePartnerContractRenewal(formData: FormData) {
  const contractId=value(formData,"contract_id");
  const status=value(formData,"renewal_status");
  const due=value(formData,"renewal_due_on");
  const owner=value(formData,"renewal_owner_user_id");
  const notes=value(formData,"renewal_notes");
  if(!uuid.safeParse(contractId).success ||
    !["NOT_REVIEWED","REVIEW_REQUIRED","IN_PROGRESS","RENEWED","NON_RENEWAL"].includes(status) ||
    (owner&&!uuid.safeParse(owner).success) || (due&&!/^\\d{4}-\\d{2}-\\d{2}$/.test(due)) ||
    notes.length<8 || notes.length>1000) redirect("/dashboard/admin/parceiros/controlo?error=renewal");
  const {supabase}=await adminContext();
  const {error}=await supabase.rpc("admin_update_partner_contract_renewal_f363",{
    p_contract_id:contractId,p_renewal_status:status,p_renewal_due_on:due||null,
    p_renewal_owner_user_id:owner||null,p_renewal_notes:notes,
  });
  if(error) redirect("/dashboard/admin/parceiros/controlo?error=renewal");
  revalidatePath("/dashboard/admin/parceiros/controlo");
  revalidatePath("/dashboard/admin/parceiros/gestao");
  redirect("/dashboard/admin/parceiros/controlo?saved=renewal");
}
