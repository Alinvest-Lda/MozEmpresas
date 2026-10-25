import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, enforceRateLimit, getPostgresClient, rateLimitResponse } from "@/lib/security/rate-limit";
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
  audienceMode: z.enum(["CONTEXTUAL","INTEREST","BROAD"]).default("CONTEXTUAL"),
  budget: z.coerce.number().nonnegative().optional(),
  bidCpm: z.coerce.number().nonnegative().optional(),
  frequencyCap: z.coerce.number().int().min(1).max(20).default(2),
  targetInterests: z.string().trim().max(1000).optional(),
  targetLocations: z.string().trim().max(500).optional(),
});

export async function POST(request: Request) {
  const rate = await enforceRateLimit(request, { scope: "public-advertising-request", limit: 5, windowSeconds: 60 });
  if (!rate.allowed) return rateLimitResponse(rate.unavailable);

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

    const values = [
      businessId, payload.companyName, payload.contactName, payload.email, payload.phone || null,
      payload.surface, payload.slot, payload.creativeType, payload.packageName, payload.headline || null,
      payload.body || null, payload.imageUrl || null, payload.targetUrl || null, payload.ctaLabel || null,
      payload.altText || null, payload.startsAt || null, payload.endsAt || null, payload.message || null,
      payload.audienceMode, payload.budget ?? null, payload.bidCpm ?? null, payload.frequencyCap,
      (payload.targetInterests || "").split(",").map(v => v.trim().toLowerCase()).filter(Boolean),
      (payload.targetLocations || "").split(",").map(v => v.trim().toLowerCase()).filter(Boolean),
    ];
    const sql = getPostgresClient();
    if (sql) {
      await sql.unsafe(
        `insert into public.advertising_requests (
          business_id, company_name, contact_name, email, phone, surface, slot, creative_type, package_name,
          headline, body, image_url, target_url, cta_label, alt_text, starts_at, ends_at, message, audience_mode,
          budget, bid_cpm, frequency_cap, target_interests, target_locations
        ) values (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::timestamptz,
          $17::timestamptz, $18, $19, $20, $21, $22, $23::text[], $24::text[]
        )`,
        values,
      );
    } else {
      const admin = createAdminClient();
      if (!admin) return rateLimitResponse(true);
      const { error } = await admin.from("advertising_requests").insert({
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
        audience_mode: payload.audienceMode,
        budget: payload.budget ?? null,
        bid_cpm: payload.bidCpm ?? null,
        frequency_cap: payload.frequencyCap,
        target_interests: values[22],
        target_locations: values[23],
      });
      if (error) return NextResponse.json({ error: "Não foi possível registar o pedido." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Verifique os dados preenchidos." }, { status: 400 });
  }
}