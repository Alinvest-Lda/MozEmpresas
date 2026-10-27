import { describe, expect, it } from "vitest";
import { adEventSchema, isEligibleCampaign, type AdEventPayload, type CampaignEligibility } from "../lib/advertising/event-validation";

const validPayload: AdEventPayload = {
  visitorKey: "visitor-key-123456789",
  campaignSource: "business",
  campaignId: "9b2b6a1a-6d8c-4a37-9bb8-7b11d7d3f451",
  surface: "HOME",
  slot: "HERO",
  eventType: "IMPRESSION",
};

const eligibleCampaign: CampaignEligibility = {
  status: "ACTIVE",
  starts_at: "2026-10-01T00:00:00.000Z",
  ends_at: "2026-11-01T00:00:00.000Z",
  slot: "HERO",
  surface: null,
};

const now = new Date("2026-10-27T12:00:00.000Z");

describe("adEventSchema", () => {
  it("accepts a valid impression payload", () => {
    expect(adEventSchema.safeParse(validPayload).success).toBe(true);
  });

  it("rejects short visitor keys and invalid event enums", () => {
    expect(adEventSchema.safeParse({ ...validPayload, visitorKey: "short" }).success).toBe(false);
    expect(adEventSchema.safeParse({ ...validPayload, eventType: "VIEW" }).success).toBe(false);
  });

  it("rejects invalid campaign IDs and non-string context values", () => {
    expect(adEventSchema.safeParse({ ...validPayload, campaignId: "not-a-uuid" }).success).toBe(false);
    expect(adEventSchema.safeParse({ ...validPayload, context: { page: 42 } }).success).toBe(false);
  });
});

describe("isEligibleCampaign", () => {
  it("accepts an active campaign within its publication window", () => {
    expect(isEligibleCampaign(eligibleCampaign, validPayload, now)).toBe(true);
  });

  it("rejects missing, inactive, or invalid campaigns", () => {
    expect(isEligibleCampaign(null, validPayload, now)).toBe(false);
    expect(isEligibleCampaign({ ...eligibleCampaign, status: "PAUSED" }, validPayload, now)).toBe(false);
    expect(isEligibleCampaign({ ...eligibleCampaign, starts_at: "invalid" }, validPayload, now)).toBe(false);
  });

  it("rejects campaigns before their start or at/after their end", () => {
    expect(isEligibleCampaign({ ...eligibleCampaign, starts_at: "2026-10-27T12:00:01.000Z" }, validPayload, now)).toBe(false);
    expect(isEligibleCampaign({ ...eligibleCampaign, ends_at: "2026-10-27T12:00:00.000Z" }, validPayload, now)).toBe(false);
  });

  it("rejects mismatched slots and surfaces", () => {
    expect(isEligibleCampaign({ ...eligibleCampaign, slot: "BILLBOARD" }, validPayload, now)).toBe(false);
    expect(isEligibleCampaign({ ...eligibleCampaign, surface: "DIRECTORY" }, validPayload, now)).toBe(false);
  });

  it("allows campaign slot/surface to be unspecified when the model does not constrain them", () => {
    expect(isEligibleCampaign({ ...eligibleCampaign, slot: null, surface: null }, validPayload, now)).toBe(true);
  });
});
