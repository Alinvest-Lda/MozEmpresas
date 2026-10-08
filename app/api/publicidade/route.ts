import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  companyName: z.string().trim().min(2).max(160),
  contactName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(180),
  phone: z.string().trim().max(40).optional(),
  surface: z.enum(["HOME","DIRECTORY","MARKETPLACE","OPPORTUNITIES"]),
  slot: z.enum(["HERO","BILLBOARD","FEATURED","INFEED"]),
  creativeType: z.enum(["BANNER","NATIVE","CARD","TEXT"]),
  packageName: z.string().trim().min(2).max(120),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  headline: z.string().trim().max(160).optional(),
  body: z.string().trim().max(3000).optional(),
  imageUrl: z.string().trim().url().max(1000).optional().or(z.literal("")),
  targetUrl: z.string().trim().url().max(1000).optional().or(z.literal("")),
  ctaLabel: z.string().trim().max(40).optional(),
  altText: z.string().trim().max(180).optional(),
  message: z.string().trim().max(3000).optional(),
});

export async function POST(request: Request) {
  try {
    const payload = schema.parse(await request.json());
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let businessId: string | null = null;
    if (user) {
      const { data: business } = await supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", user.id)
        .ilike("name", payload.companyName)
        .limit(1)
        .maybeSingle();
      businessId = business?.id ?? null;
    }

    const { error } = await supabase.from("advertising_requests").insert({
      business_id: businessId,
      company_name: payload.companyName,
      contact_name: payload.contactName,
      email: payload.email,
      phone: payload.phone || null,
      surface: payload.surface,
      slot: payload.slot,
      creative_type: payload.creativeType,
      package_name: payload.packageName,
      headline: payload.headline || null,
      body: payload.body || null,
      image_url: payload.imageUrl || null,
      target_url: payload.targetUrl || null,
      cta_label: payload.ctaLabel || null,
      alt_text: payload.altText || null,
      starts_at: payload.startsAt || null,
      ends_at: payload.endsAt || null,
      message: payload.message || null,
    });

    if (error) return NextResponse.json({ error: "Não foi possível registar o pedido." }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Verifique os dados preenchidos." }, { status: 400 });
  }
}