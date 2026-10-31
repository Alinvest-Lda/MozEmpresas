import { describe, expect, it } from "vitest";
import {
  canTransitionOpportunity,
  canTransitionPartnerApplication,
  opportunityTransitions,
  partnerApplicationTransitions,
} from "../lib/opportunities/state-machine";

describe("opportunity state machine", () => {
  it("allows only transitions exposed by the partner workspace", () => {
    expect(canTransitionOpportunity("DRAFT", "PUBLISHED")).toBe(true);
    expect(canTransitionOpportunity("PUBLISHED", "CLOSED")).toBe(true);
    expect(canTransitionOpportunity("PUBLISHED", "ARCHIVED")).toBe(true);
    expect(canTransitionOpportunity("CLOSED", "PUBLISHED")).toBe(true);
    expect(canTransitionOpportunity("CLOSED", "ARCHIVED")).toBe(true);
    expect(canTransitionOpportunity("ARCHIVED", "DRAFT")).toBe(true);
  });

  it("rejects skipped, repeated, and unknown opportunity transitions", () => {
    expect(canTransitionOpportunity("DRAFT", "CLOSED")).toBe(false);
    expect(canTransitionOpportunity("ARCHIVED", "PUBLISHED")).toBe(false);
    expect(canTransitionOpportunity("PUBLISHED", "PUBLISHED")).toBe(false);
    expect(canTransitionOpportunity("UNKNOWN", "PUBLISHED")).toBe(false);
    expect(canTransitionOpportunity("DRAFT", "UNKNOWN")).toBe(false);
  });

  it("has no accidental self-transitions", () => {
    for (const [from, targets] of Object.entries(opportunityTransitions)) {
      expect(targets).not.toContain(from);
    }
  });
});

describe("partner application state machine", () => {
  it("allows review decisions only from eligible states", () => {
    expect(canTransitionPartnerApplication("SUBMITTED", "UNDER_REVIEW")).toBe(true);
    expect(canTransitionPartnerApplication("UNDER_REVIEW", "SHORTLISTED")).toBe(true);
    expect(canTransitionPartnerApplication("UNDER_REVIEW", "ACCEPTED")).toBe(true);
    expect(canTransitionPartnerApplication("SHORTLISTED", "REJECTED")).toBe(true);
  });

  it("does not allow partners to withdraw or rewrite terminal decisions", () => {
    expect(canTransitionPartnerApplication("SUBMITTED", "WITHDRAWN")).toBe(false);
    expect(canTransitionPartnerApplication("ACCEPTED", "REJECTED")).toBe(false);
    expect(canTransitionPartnerApplication("REJECTED", "ACCEPTED")).toBe(false);
    expect(canTransitionPartnerApplication("WITHDRAWN", "UNDER_REVIEW")).toBe(false);
    expect(canTransitionPartnerApplication("DRAFT", "UNDER_REVIEW")).toBe(false);
  });

  it("has no self-transitions or unlisted destination statuses", () => {
    for (const [from, targets] of Object.entries(partnerApplicationTransitions)) {
      expect(targets).not.toContain(from);
      expect(targets).not.toContain("WITHDRAWN");
      expect(targets).not.toContain("DRAFT");
    }
    expect(canTransitionPartnerApplication("SUBMITTED", "UNKNOWN")).toBe(false);
  });
});
