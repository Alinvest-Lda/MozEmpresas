import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, enforceRateLimit, getPostgresClient, rateLimitResponse } from "@/lib/security/rate-limit";
import { adEventSchema, isEligibleCampaign, type CampaignEligibility } from "@/lib/advertising/event-validation";

export async function POST(request: Request) {
  const rate = await enforceRateLimit(request, { scope: "ads-event", limit: 60, windowSeconds: 60 });
  if (!rate.allowed) return rateLimitResponse(rate.unavailable);

  let payload;
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

    if (!isEligibleCampaign(campaign, payload, now)) {
      return NextResponse.json({ error: "A campanha não está activa para este espaço e período." }, { status: 409 });
    }

    if (payload.eventType === "CLICK") {
      const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      let hasImpression = false;
      let recentClick = false;
      if (sql) {
        const impressions = await sql.unsafe(
          "select id from public.ad_delivery_events where visitor_key = $1 and campaign_source = $2 and campaign_id = $3 and surface = $4 and slot = $5 and event_type = 'IMPRESSION' and created_at >= $6 limit 1",
          [payload.visitorKey, payload.campaignSource, payload.campaignId, payload.surface, payload.slot, since],
        );
        hasImpression = impressions.length > 0;
        const clicks = await sql.unsafe(
          "select id from public.ad_delivery_events where visitor_key = $1 and campaign_source = $2 and campaign_id = $3 and surface = $4 and slot = $5 and event_type = 'CLICK' and created_at >= $6 limit 1",
          [payload.visitorKey, payload.campaignSource, payload.campaignId, payload.surface, payload.slot, new Date(now.getTime() - 30 * 1000).toISOString()],
        );
        recentClick = clicks.length > 0;
      } else if (admin) {
        const { data: impressions, error: impressionError } = await admin.from("ad_delivery_events")
          .select("id").eq("visitor_key", payload.visitorKey).eq("campaign_source", payload.campaignSource)
          .eq("campaign_id", payload.campaignId).eq("surface", payload.surface).eq("slot", payload.slot)
          .eq("event_type", "IMPRESSION").gte("created_at", since).limit(1);
        if (impressionError) return NextResponse.json({ error: "Não foi possível validar o clique." }, { status: 500 });
        hasImpression = Boolean(impressions?.length);
        const { data: clicks, error: clickError } = await admin.from("ad_delivery_events")
          .select("id").eq("visitor_key", payload.visitorKey).eq("campaign_source", payload.campaignSource)
          .eq("campaign_id", payload.campaignId).eq("surface", payload.surface).eq("slot", payload.slot)
          .eq("event_type", "CLICK").gte("created_at", new Date(now.getTime() - 30 * 1000).toISOString()).limit(1);
        if (clickError) return NextResponse.json({ error: "Não foi possível validar o clique." }, { status: 500 });
        recentClick = Boolean(clicks?.length);
      }
      if (!hasImpression) {
        return NextResponse.json({ error: "O clique não corresponde a uma impressão recente da campanha." }, { status: 409 });
      }
      if (recentClick) return NextResponse.json({ ok: true, deduplicated: true });
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
