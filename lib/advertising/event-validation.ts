import { z } from "zod";

export const adEventSchema = z.object({
  visitorKey: z.string().min(16).max(120),
  campaignSource: z.enum(["business", "partner"]),
  campaignId: z.string().uuid(),
  surface: z.enum(["HOME", "DIRECTORY", "MARKETPLACE", "OPPORTUNITIES"]),
  slot: z.enum(["HERO", "BILLBOARD", "EXCLUSIVE", "FEATURED", "INFEED", "CONTEXT"]),
  eventType: z.enum(["IMPRESSION", "CLICK"]),
  context: z.record(z.string(), z.string()).optional(),
});

export type AdEventPayload = z.infer<typeof adEventSchema>;

export type CampaignEligibility = {
  status: string;
  starts_at: string | Date | null;
  ends_at: string | Date | null;
  slot: string | null;
  surface?: string | null;
};

export function isEligibleCampaign(
  campaign: CampaignEligibility | null | undefined,
  payload: AdEventPayload,
  now: Date,
): boolean {
  if (!campaign || campaign.status !== "ACTIVE" || !campaign.starts_at || !campaign.ends_at) return false;
  const startsAt = new Date(campaign.starts_at);
  const endsAt = new Date(campaign.ends_at);
  if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime())) return false;
  if (startsAt.getTime() > now.getTime() || endsAt.getTime() <= now.getTime()) return false;
  if (campaign.slot && campaign.slot !== payload.slot) return false;
  if (campaign.surface && campaign.surface !== payload.surface) return false;
  return true;
}
