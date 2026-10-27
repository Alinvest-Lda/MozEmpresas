import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { createAdminClient, enforceRateLimit, getPostgresClient, rateLimitResponse } from "@/lib/security/rate-limit";

const schema = z.object({
  visitorKey: z.string().min(16).max(120),
  campaignSource: z.enum(["business", "partner"]),
  campaignId: z.string().uuid(),
  surface: z.enum(["HOME", "DIRECTORY", "MARKETPLACE", "OPPORTUNITIES"]),
  slot: z.enum(["HERO", "BILLBOARD", "EXCLUSIVE", "FEATURED", "INFEED", "CONTEXT"]),
  eventType: z.enum(["IMPRESSION", "CLICK"]),
  context: z.record(z.string(), z.string()).optional(),
});

type CampaignEligibility = {
  status: string;
  starts_at: string | Date | null;
  ends_at: string | Date | null;
  slot: string | null;
  surface?: string | null;
};

function isEligible(campaign: CampaignEligibility | null | undefined, payload: z.infer<typeof schema>, now: Date) {
  if (!campaign || campaign.status !== "ACTIVE" || !campaign.starts_at || !campaign.ends_at) return false;
  const startsAt = new Date(campaign.starts_at);
  const endsAt = new Date(campaign.ends_at);
  if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime())) return false;
  if (startsAt.getTime() > now.getTime() || endsAt.getTime() <= now.getTime()) return false;
  if (campaign.slot && campaign.slot !== payload.slot) return false;
  if (campaign.surface && campaign.surface !== payload.surface) return false;
  return true;
}

export async function POST(request: Request) {
  const rate = await enforceRateLimit(request, { scope: "ads-event", limit: 60, windowSeconds: 60 });
  if (!rate.allowed) return rateLimitResponse(rate.unavailable);

  let payload: z.infer<typeof schema>;
  try {
    payload = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Evento de publicidade inválido." }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const sql = getPostgresClient();
    const admin = sql ? null : createAdminClient();
    if (!sql && !admin) return rateLimitResponse(true);

    const now = new Date();
    const table = payload.campaignSource === "business" ? "business_promotions" : "partner_ad_campaigns";
    let campaign: CampaignEligibility | null = null;

    if (sql) {
      const surfaceSelect = payload.campaignSource === "partner" ? "surface" : "null::text as surface";
      const rows = await sql.unsafe(
        `select status, starts_at, ends_at, slot, ${surfaceSelect} from public.${table} where id = $1 limit 1`,
        [payload.campaignId],
      ) as CampaignEligibility[];
      campaign = rows[0] ?? null;
    } else if (admin) {
      const columns = payload.campaignSource === "partner" ? "status,starts_at,ends_at,slot,surface" : "status,starts_at,ends_at,slot";
      const { data, error } = await admin.from(table).select(columns).eq("id", payload.campaignId).maybeSingle();
      if (error) return NextResponse.json({ error: "Não foi possível validar a campanha." }, { status: 500 });
      campaign = data as CampaignEligibility | null;
    }

    if (!isEligible(campaign, payload, now)) {
      return NextResponse.json({ error: "A campanha não está activa para este espaço e período." }, { status: 409 });
    }

    const event = {
      visitor_key: payload.visitorKey,
      user_id: user?.id ?? null,
      campaign_source: payload.campaignSource,
      campaign_id: payload.campaignId,
      surface: payload.surface,
      slot: payload.slot,
      event_type: payload.eventType,
      context: payload.context || {},
    };

    if (sql) {
      await sql.unsafe(
        "insert into public.ad_delivery_events (visitor_key, user_id, campaign_source, campaign_id, surface, slot, event_type, context) values ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)",
        [event.visitor_key, event.user_id, event.campaign_source, event.campaign_id, event.surface, event.slot, event.event_type, JSON.stringify(event.context)],
      );
    } else if (admin) {
      const { error } = await admin.from("ad_delivery_events").insert(event);
      if (error) return NextResponse.json({ error: "Não foi possível registar o evento." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível processar o evento de publicidade." }, { status: 500 });
  }
}
