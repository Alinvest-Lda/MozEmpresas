import { describe, expect, it } from "vitest";
import {
  canTransitionCreditPurchase,
  creditPurchaseTransitions,
  isTerminalCreditPurchaseStatus,
  requiresAtomicCreditPosting,
} from "../lib/credit-purchases/state-machine";

describe("credit purchase state machine", () => {
  it("allows requests to enter payment pending or be rejected/cancelled", () => {
    expect(canTransitionCreditPurchase("REQUESTED", "PAYMENT_PENDING")).toBe(true);
    expect(canTransitionCreditPurchase("REQUESTED", "REJECTED")).toBe(true);
    expect(canTransitionCreditPurchase("REQUESTED", "CANCELLED")).toBe(true);
  });

  it("allows a pending payment to be rejected or cancelled", () => {
    expect(canTransitionCreditPurchase("PAYMENT_PENDING", "REJECTED")).toBe(true);
    expect(canTransitionCreditPurchase("PAYMENT_PENDING", "CANCELLED")).toBe(true);
  });

  it("never allows a generic transition to mark a purchase as paid", () => {
    expect(canTransitionCreditPurchase("REQUESTED", "PAID")).toBe(false);
    expect(canTransitionCreditPurchase("PAYMENT_PENDING", "PAID")).toBe(false);
    expect(requiresAtomicCreditPosting("PAID")).toBe(true);
    expect(requiresAtomicCreditPosting("REJECTED")).toBe(false);
  });

  it("keeps paid, rejected, and cancelled requests terminal", () => {
    for (const status of ["PAID", "REJECTED", "CANCELLED"]) {
      expect(isTerminalCreditPurchaseStatus(status)).toBe(true);
      for (const destination of Object.keys(creditPurchaseTransitions)) {
        expect(canTransitionCreditPurchase(status, destination)).toBe(false);
      }
    }
  });

  it("rejects repeated, reverse, and unknown transitions", () => {
    expect(canTransitionCreditPurchase("REQUESTED", "REQUESTED")).toBe(false);
    expect(canTransitionCreditPurchase("PAYMENT_PENDING", "REQUESTED")).toBe(false);
    expect(canTransitionCreditPurchase("PAID", "PAYMENT_PENDING")).toBe(false);
    expect(canTransitionCreditPurchase("UNKNOWN", "PAID")).toBe(false);
    expect(canTransitionCreditPurchase("REQUESTED", "UNKNOWN")).toBe(false);
    expect(isTerminalCreditPurchaseStatus("UNKNOWN")).toBe(false);
  });
});
