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

export async function createInstitutionalPartner(formData: FormData) {
  const parsed = z.object({
    name: z.string().min(2).max(180),
    legal_name: z.string().max(180).optional(),
    tax_id: z.string().max(80).optional(),
    contact_email: z.string().email().optional().or(z.literal("")),
    contact_phone: z.string().max(60).optional(),
    operating_model: z.enum(["MANAGED", "STRATEGIC", "HYBRID", "SELF_SERVICE"]),
    portal_enabled: z.enum(["true", "false"]),
    description: z.string().max(2000).optional(),
  }).safeParse({
    name: value(formData,"name"), legal_name: value(formData,"legal_name") || undefined,
    tax_id: value(formData,"tax_id") || undefined, contact_email: value(formData,"contact_email"),
    contact_phone: value(formData,"contact_phone"), operating_model: value(formData,"operating_model"),
    portal_enabled: value(formData,"portal_enabled"), description: value(formData,"description") || undefined,
  });
  if (!parsed.success) redirect("/dashboard/admin/parceiros/gestao?error=partner");
  const { supabase } = await adminContext();
  const { error } = await supabase.from("partner_accounts").insert({
    name: parsed.data.name, legal_name: parsed.data.legal_name ?? null, tax_id: parsed.data.tax_id ?? null,
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
  const parsed = z.object({ account_id:uuid, contract_id:z.string().optional(), engagement_id:z.string().optional(),
    document_number:z.string().min(3).max(100), amount_mzn:z.coerce.number().positive().max(100000000000) })
    .safeParse({account_id:value(formData,"account_id"),contract_id:value(formData,"contract_id") || undefined,
      engagement_id:value(formData,"engagement_id") || undefined,document_number:value(formData,"document_number"),
      amount_mzn:value(formData,"amount_mzn")});
  if (!parsed.success || (parsed.data.contract_id && !uuid.safeParse(parsed.data.contract_id).success) ||
      (parsed.data.engagement_id && !uuid.safeParse(parsed.data.engagement_id).success)) redirect("/dashboard/admin/parceiros/gestao?error=invoice");
  const {supabase,user}=await adminContext();
  const {error}=await supabase.from("financial_documents").insert({
    partner_account_id:parsed.data.account_id,business_id:null,user_id:user!.id,issued_by_internal_user_id:user!.id,
    contract_id:parsed.data.contract_id || null,engagement_id:parsed.data.engagement_id || null,
    document_type:"INVOICE",document_number:parsed.data.document_number,status:"ISSUED",
    amount_mzn:parsed.data.amount_mzn,currency:"MZN",
  });
  if(error) redirect("/dashboard/admin/parceiros/gestao?error=invoice-save");
  revalidatePath("/dashboard/admin/parceiros/gestao");
  redirect("/dashboard/admin/parceiros/gestao?saved=invoice");
}

export async function recordPartnerBankTransfer(formData: FormData) {
  const parsed=z.object({account_id:uuid,contract_id:z.string().optional(),engagement_id:z.string().optional(),
    document_id:z.string().optional(),amount_mzn:z.coerce.number().positive().max(100000000000),
    reference:z.string().min(3).max(180),bank_name:z.string().max(120).optional(),
    payer_name:z.string().max(180).optional(),transfer_date:z.string().optional(),proof_url:z.string().url().optional().or(z.literal(""))})
    .safeParse({account_id:value(formData,"account_id"),contract_id:value(formData,"contract_id") || undefined,
      engagement_id:value(formData,"engagement_id") || undefined,document_id:value(formData,"document_id") || undefined,
      amount_mzn:value(formData,"amount_mzn"),reference:value(formData,"reference"),bank_name:value(formData,"bank_name") || undefined,
      payer_name:value(formData,"payer_name") || undefined,transfer_date:value(formData,"transfer_date") || undefined,
      proof_url:value(formData,"proof_url")});
  if(!parsed.success || [parsed.data.contract_id,parsed.data.engagement_id,parsed.data.document_id].some(x=>x && !uuid.safeParse(x).success))
    redirect("/dashboard/admin/parceiros/gestao?error=transfer");
  const {supabase,user}=await adminContext();
  const {error}=await supabase.from("financial_payments").insert({
    partner_account_id:parsed.data.account_id,business_id:null,user_id:user!.id,
    contract_id:parsed.data.contract_id || null,engagement_id:parsed.data.engagement_id || null,
    document_id:parsed.data.document_id || null,amount_mzn:parsed.data.amount_mzn,currency:"MZN",
    method:"BANK_TRANSFER",status:"PENDING",reference:parsed.data.reference,
    bank_name:parsed.data.bank_name || null,payer_name:parsed.data.payer_name || null,
    transfer_date:parsed.data.transfer_date || null,proof_url:parsed.data.proof_url || null,
  });
  if(error) redirect("/dashboard/admin/parceiros/gestao?error=transfer-save");
  revalidatePath("/dashboard/admin/parceiros/gestao");
  redirect("/dashboard/admin/parceiros/gestao?saved=transfer");
}

export async function verifyPartnerBankTransfer(formData: FormData) {
  const paymentId=value(formData,"payment_id");
  if(!uuid.safeParse(paymentId).success) redirect("/dashboard/admin/parceiros/gestao?error=payment-id");
  const {supabase,user}=await adminContext();
  const {error}=await supabase.from("financial_payments").update({
    status:"CONFIRMED",verified_by:user!.id,verified_at:new Date().toISOString(),
    confirmed_at:new Date().toISOString(),verification_notes:value(formData,"verification_notes") || null,
  }).eq("id",paymentId).eq("method","BANK_TRANSFER").eq("status","PENDING");
  if(error) redirect("/dashboard/admin/parceiros/gestao?error=verify");
  revalidatePath("/dashboard/admin/parceiros/gestao");
  redirect("/dashboard/admin/parceiros/gestao?saved=verified");
}
