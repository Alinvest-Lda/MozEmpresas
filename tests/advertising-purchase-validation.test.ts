import { describe, expect, it } from "vitest";
import {
  calculateCampaignCredits,
  calculateCampaignPrice,
  isUuid,
  maputoDateTimeLocalInputValue,
  normalizeCampaignTargets,
  parseMaputoLocalDateTime,
  parseMaputoCampaignStart,
} from "../lib/advertising/purchase-validation";

describe("advertising purchase validation", () => {
  it("accepts UUIDs and rejects malformed identifiers", () => {
    expect(isUuid("60000000-0000-4000-8000-000000000001")).toBe(true);
    expect(isUuid("not-a-uuid")).toBe(false);
  });

  it("parses local date-time values independently of the device timezone", () => {
    expect(parseMaputoLocalDateTime("2026-11-02T13:00")).toBe("2026-11-02T11:00:00.000Z");
    expect(parseMaputoLocalDateTime("2026-11-02T13:00Z")).toBe("2026-11-02T13:00:00.000Z");
    expect(maputoDateTimeLocalInputValue(new Date("2026-11-02T10:00:00.000Z"))).toBe("2026-11-02T12:00");
  });

  it("interprets local date-time values in Maputo time and rejects past or invalid dates", () => {
    const now = new Date("2026-11-02T10:00:00.000Z");
    expect(parseMaputoCampaignStart("2026-11-02T13:00", now)).toBe("2026-11-02T11:00:00.000Z");
    expect(parseMaputoCampaignStart("2026-11-02T11:00", now)).toBeNull();
    expect(parseMaputoCampaignStart("invalid", now)).toBeNull();
  });

  it("interprets date-only campaign starts as Maputo midnight", () => {
    const now = new Date("2026-11-01T12:00:00.000Z");
    expect(parseMaputoCampaignStart("2026-11-02", now)).toBe("2026-11-01T22:00:00.000Z");
    expect(parseMaputoCampaignStart("2026-11-01", now)).toBeNull();
  });

  it("calculates credit cost with the same targeting factor as the MZN price", () => {
    expect(calculateCampaignCredits(100, ["Maputo"], ["Construção"])).toBe(120);
    expect(calculateCampaignCredits(null, [], [])).toBeNull();
  });

  it("trims, de-duplicates and bounds target values", () => {
    expect(normalizeCampaignTargets([" Maputo ", "Maputo", "Matola"])).toEqual(["Maputo", "Matola"]);
    expect(normalizeCampaignTargets(Array.from({ length: 11 }, (_, index) => String(index)))).toBeNull();
    expect(normalizeCampaignTargets(["x".repeat(121)])).toBeNull();
    expect(normalizeCampaignTargets([""])).toBeNull();
  });

  it("calculates targeting price adjustments and rejects invalid base prices", () => {
    expect(calculateCampaignPrice(500, ["Maputo"], [])).toBe(550);
    expect(calculateCampaignPrice(500, ["Maputo"], ["Tecnologia"])).toBe(600);
    expect(calculateCampaignPrice(-1, [], [])).toBeNull();
    expect(calculateCampaignPrice("not-a-price", [], [])).toBeNull();
  });
});
