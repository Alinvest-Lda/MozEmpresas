import { NextResponse } from "next/server";
import { withApiObservability } from "@/lib/observability/api";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, enforceRateLimit, getPostgresClient, rateLimitResponse } from "@/lib/security/rate-limit";
import { adEventSchema, isEligibleCampaign, type AdEventPayload, type CampaignEligibility } from "@/lib/advertising/event-validation";

export const POST = withApiObservability("api.ads_event", async (request: Request) => {
  const rate = await enforceRateLimit(request, { scope: "ads-event", limit: 60, windowSeconds: 60 });
  if (!rate.allowed) return rateLimitResponse(rate.unavailable);

  let payload: AdEventPayload;
  try {
    payload = adEventSchema.parse(await request.json());
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
      const surfaceSelect = payload.campaignSource === "partner" ? "surface" : "placement as surface";
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

    if (!isEligibleCampaign(campaign, payload, now)) {
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

    let recorded: boolean;
    if (sql) {
      const rows = await sql.unsafe(
        "select public.record_ad_delivery_event_f370($1,$2,$3,$4,$5,$6,$7,$8::jsonb) as recorded",
        [event.visitor_key, event.user_id, event.campaign_source, event.campaign_id, event.surface, event.slot, event.event_type, JSON.stringify(event.context)],
      ) as { recorded: boolean }[];
      recorded = Boolean(rows[0]?.recorded);
    } else if (admin) {
      const { data, error } = await admin.rpc("record_ad_delivery_event_f370", {
        p_visitor_key: event.visitor_key,
        p_user_id: event.user_id,
        p_campaign_source: event.campaign_source,
        p_campaign_id: event.campaign_id,
        p_surface: event.surface,
        p_slot: event.slot,
        p_event_type: event.event_type,
        p_context: event.context,
      });
      if (error) {
        if (error.message.includes("AD_CLICK_WITHOUT_IMPRESSION")) {
          return NextResponse.json({ error: "O clique não corresponde a uma impressão recente da campanha." }, { status: 409 });
        }
        return NextResponse.json({ error: "Não foi possível registar o evento." }, { status: 500 });
      }
      recorded = data === true;
    } else {
      return rateLimitResponse(true);
    }
    if (!recorded) return NextResponse.json({ ok: true, deduplicated: true });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Não foi possível processar o evento de publicidade." }, { status: 500 });
  }
});
