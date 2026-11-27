import { describe, expect, it } from "vitest";
import {
  ADVERTISING_REQUEST_TRANSITIONS,
  getAdvertisingRequestNextStatuses,
  getBusinessCampaignNextStatuses,
  getPartnerCampaignNextStatuses,
} from "@/lib/advertising/state-machine";

describe("advertising admin state machine", () => {
  const now = new Date("2026-11-27T10:00:00.000Z").getTime();

  it("does not offer business activation before the contracted start", () => {
    expect(getBusinessCampaignNextStatuses({
      status:"PENDING",
      starts_at:"2026-11-27T13:00:00.000Z",
      ends_at:"2026-11-30T21:59:59.000Z",
      payment_method:"CREDITS",
      credits_charged:100,
    },now)).not.toContain("ACTIVE");
  });

  it("offers business activation only after settlement and inside the contracted window", () => {
    expect(getBusinessCampaignNextStatuses({
      status:"PENDING",
      starts_at:"2026-11-27T09:00:00.000Z",
      ends_at:"2026-11-30T21:59:59.000Z",
      payment_method:"CREDITS",
      credits_charged:100,
    },now)).toContain("ACTIVE");
    expect(getBusinessCampaignNextStatuses({
      status:"PENDING",
      starts_at:"2026-11-27T09:00:00.000Z",
      ends_at:"2026-11-30T21:59:59.000Z",
      payment_method:"MPESA",
      paid_at:null,
    },now)).not.toContain("ACTIVE");
  });

  it("allows a partner campaign to activate only after settlement and start", () => {
    expect(getPartnerCampaignNextStatuses("APPROVED","PAID","2026-11-30T21:59:59.000Z","2026-11-27T13:00:00.000Z",now)).toEqual([]);
    expect(getPartnerCampaignNextStatuses("APPROVED","PAID","2026-11-30T21:59:59.000Z","2026-11-27T09:00:00.000Z",now)).toEqual(["ACTIVE"]);
    expect(getPartnerCampaignNextStatuses("APPROVED","FAILED","2026-11-30T21:59:59.000Z","2026-11-27T09:00:00.000Z",now)).toEqual(["REJECTED"]);
  });

  it("keeps the request payment deadline renewal in the shared transition map", () => {
    expect(ADVERTISING_REQUEST_TRANSITIONS.AWAITING_PAYMENT).toContain("AWAITING_PAYMENT");
    expect(getAdvertisingRequestNextStatuses("AWAITING_PAYMENT")).toContain("AWAITING_PAYMENT");
  });
});
