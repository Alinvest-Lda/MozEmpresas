"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSuperAdminContext } from "@/lib/auth/super-admin";

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
async function partnerLinksValid(supabase: any, accountId: string, links: PartnerLinkIds) {
  const checks: Array<[string,string]> = [
    ...(links.contractId ? [["partner_contracts",links.contractId] as [string,string]] : []),
    ...(links.engagementId ? [["partner_service_engagements",links.engagementId] as [string,string]] : []),
    ...(links.campaignId ? [["partner_ad_campaigns",links.campaignId] as [string,string]] : []),
    ...(links.documentId ? [["financial_documents",links.documentId] as [string,string]] : []),
  ];
  for (const [table,id] of checks) {
    const ownerColumn=table==="financial_documents"?"partner_account_id":"account_id";
    const {data,error}=await supabase.from(table).select(ownerColumn).eq("id",id).maybeSingle();
    const owner=data?.[ownerColumn];
    if(error || owner!==accountId) return false;
  }
  return true;
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
  }).safeParse({
    account_id:value(formData,"account_id"), contract_id:value(formData,"contract_id"),
    service_type:value(formData,"service_type"), request_source:value(formData,"request_source"),
    title:value(formData,"title"), description:value(formData,"description") || undefined,
    agreed_amount_mzn:value(formData,"agreed_amount_mzn"), due_at:value(formData,"due_at"),
  });
  if (!parsed.success || (parsed.data.contract_id && !uuid.safeParse(parsed.data.contract_id).success)) redirect("/dashboard/admin/parceiros/gestao?error=engagement");
  const { supabase,user } = await adminContext();
  if(parsed.data.contract_id && !(await partnerLinksValid(supabase,parsed.data.account_id,{contractId:parsed.data.contract_id}))) redirect("/dashboard/admin/parceiros/gestao?error=engagement");
  const { error } = await supabase.from("partner_service_engagements").insert({
    account_id:parsed.data.account_id, contract_id:parsed.data.contract_id || null,
    service_type:parsed.data.service_type, request_source:parsed.data.request_source,
    title:parsed.data.title, description:parsed.data.description || null,
    agreed_amount_mzn:parsed.data.agreed_amount_mzn ? Number(parsed.data.agreed_amount_mzn) : null,
    due_at:parsed.data.due_at || null, created_by:user!.id,
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
  const {supabase,user}=await adminContext();
  if(!(await partnerLinksValid(supabase,parsed.data.account_id,{contractId:parsed.data.contract_id,engagementId:parsed.data.engagement_id,campaignId:parsed.data.campaign_id}))) redirect("/dashboard/admin/parceiros/gestao?error=invoice");
  const {error}=await supabase.from("financial_documents").insert({
    partner_account_id:parsed.data.account_id,business_id:null,user_id:user!.id,issued_by_internal_user_id:user!.id,
    contract_id:parsed.data.contract_id || null,engagement_id:parsed.data.engagement_id || null,campaign_id:parsed.data.campaign_id || null,
    document_type:"INVOICE",document_number:parsed.data.document_number,status:"ISSUED",
    amount_mzn:parsed.data.amount_mzn,currency:"MZN",
  });
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
  const {supabase,user}=await adminContext();
  if(!(await partnerLinksValid(supabase,parsed.data.account_id,{contractId:parsed.data.contract_id,engagementId:parsed.data.engagement_id,campaignId:parsed.data.campaign_id,documentId:parsed.data.document_id}))) redirect("/dashboard/admin/parceiros/gestao?error=transfer");
  const {error}=await supabase.from("financial_payments").insert({
    partner_account_id:parsed.data.account_id,business_id:null,user_id:user!.id,
    contract_id:parsed.data.contract_id || null,engagement_id:parsed.data.engagement_id || null,campaign_id:parsed.data.campaign_id || null,
    document_id:parsed.data.document_id || null,amount_mzn:parsed.data.amount_mzn,currency:"MZN",
    method:"BANK_TRANSFER",status:"PENDING",reference:parsed.data.reference,
    bank_name:parsed.data.bank_name || null,payer_name:parsed.data.payer_name || null,
    transfer_date:parsed.data.transfer_date || null,proof_url:parsed.data.proof_url || null,
  });
  if(error?.code==="23505") redirect("/dashboard/admin/parceiros/gestao?error=transfer-duplicate");
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
  const parsed=z.object({account_id:uuid,contract_id:z.string().optional(),engagement_id:z.string().optional(),
    title:z.string().min(2).max(180),report_type:z.enum(["PERFORMANCE","FINANCIAL","MARKET_INTELLIGENCE","CAMPAIGN","EXECUTIVE","OTHER"]),
    period_start:z.string().optional(),period_end:z.string().optional(),storage_path:z.string().max(500).optional(),
    external_url:z.string().url().optional().or(z.literal("")),recipient_emails:z.string().max(2000).optional(),
    delivery_channel:z.enum(["EMAIL","PORTAL","MEETING","SHARED_LINK","OTHER"]),status:z.enum(["DRAFT","READY","DELIVERED"])})
    .safeParse({account_id:value(formData,"account_id"),contract_id:value(formData,"contract_id")||undefined,
      engagement_id:value(formData,"engagement_id")||undefined,title:value(formData,"title"),report_type:value(formData,"report_type"),
      period_start:value(formData,"period_start")||undefined,period_end:value(formData,"period_end")||undefined,
      storage_path:value(formData,"storage_path")||undefined,external_url:value(formData,"external_url"),
      recipient_emails:value(formData,"recipient_emails")||undefined,delivery_channel:value(formData,"delivery_channel"),
      status:value(formData,"status")});
  if(!parsed.success || [parsed.data.contract_id,parsed.data.engagement_id].some(x=>x&&!uuid.safeParse(x).success) ||
    (["READY","DELIVERED"].includes(parsed.data.status)&&!parsed.data.storage_path&&!parsed.data.external_url))
    redirect("/dashboard/admin/parceiros/gestao?error=report");
  const {supabase,user}=await adminContext();
  if(!(await partnerLinksValid(supabase,parsed.data.account_id,{contractId:parsed.data.contract_id,engagementId:parsed.data.engagement_id}))) redirect("/dashboard/admin/parceiros/gestao?error=report");
  const recipients=(parsed.data.recipient_emails||"").split(/[;,\\n]/).map(x=>x.trim()).filter(Boolean);
  if(recipients.some(x=>!z.string().email().safeParse(x).success)) redirect("/dashboard/admin/parceiros/gestao?error=report");
  const {error}=await supabase.from("partner_report_deliveries").insert({
    account_id:parsed.data.account_id,contract_id:parsed.data.contract_id||null,engagement_id:parsed.data.engagement_id||null,
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
    objective:z.string().max(1000).optional(),starts_at:z.string().optional(),ends_at:z.string().optional(),price_mzn:z.coerce.number().positive().max(100000000000)})
    .safeParse({account_id:value(formData,"account_id"),product_id:value(formData,"product_id"),contract_id:value(formData,"contract_id")||undefined,
      title:value(formData,"title"),objective:value(formData,"objective")||undefined,starts_at:value(formData,"starts_at")||undefined,
      ends_at:value(formData,"ends_at")||undefined,price_mzn:value(formData,"price_mzn")});
  if(!parsed.success || (parsed.data.contract_id&&!uuid.safeParse(parsed.data.contract_id).success)) redirect("/dashboard/admin/parceiros/gestao?error=campaign");
  const {supabase,user}=await adminContext();
  if(parsed.data.contract_id && !(await partnerLinksValid(supabase,parsed.data.account_id,{contractId:parsed.data.contract_id}))) redirect("/dashboard/admin/parceiros/gestao?error=campaign");
  const {data:product,error:productError}=await supabase.from("partner_ad_products")
    .select("id,price_mzn,active,surface,slot,duration_days").eq("id",parsed.data.product_id).maybeSingle();
  if(productError||!product?.active) redirect("/dashboard/admin/parceiros/gestao?error=campaign-product");
  if(product.price_mzn!=null && Number(product.price_mzn)!==parsed.data.price_mzn)
    redirect("/dashboard/admin/parceiros/gestao?error=campaign-price");
  const {error}=await supabase.from("partner_ad_campaigns").insert({
    account_id:parsed.data.account_id,product_id:parsed.data.product_id,contract_id:parsed.data.contract_id||null,
    title:parsed.data.title,objective:parsed.data.objective||null,starts_at:parsed.data.starts_at||null,ends_at:parsed.data.ends_at||null,
    price_mzn:parsed.data.price_mzn,status:"REQUESTED",request_source:"BACKOFFICE",
    created_by_internal_user_id:user!.id,surface:product.surface,slot:product.slot,
    creative_type:"TEXT",campaign_mode:"GUARANTEED",priority:70,bid_mzn:0,frequency_cap:2,targeting:{},
    impression_goal:null,impressions_count:0,clicks_count:0,campaign_kind:"GUARANTEED",bid_cpm:0,
    target_interests:[],target_locations:[],payment_method_preference:"MPESA",
  });
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
