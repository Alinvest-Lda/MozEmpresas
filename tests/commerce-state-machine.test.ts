import { describe, expect, it } from "vitest";
import { canTransitionCommerceOrder, commerceOrderTransitions, isCommerceOrderStatus } from "../lib/commerce/state-machine";

describe("commerce order state machine", () => {
  it("allows only the defined forward transitions", () => {
    expect(canTransitionCommerceOrder("INTERESTED", "CONTACTED")).toBe(true);
    expect(canTransitionCommerceOrder("CONTACTED", "NEGOTIATING")).toBe(true);
    expect(canTransitionCommerceOrder("NEGOTIATING", "AGREED")).toBe(true);
    expect(canTransitionCommerceOrder("AGREED", "COMPLETED")).toBe(true);
  });

  it("allows cancellation only from states where cancellation is configured", () => {
    for (const status of ["INTERESTED", "CONTACTED", "NEGOTIATING", "AGREED"]) {
      expect(canTransitionCommerceOrder(status, "CANCELLED")).toBe(true);
    }
    expect(canTransitionCommerceOrder("COMPLETED", "CANCELLED")).toBe(false);
    expect(canTransitionCommerceOrder("CANCELLED", "CANCELLED")).toBe(false);
  });

  it("rejects skipped, reverse, and unknown transitions", () => {
    expect(canTransitionCommerceOrder("INTERESTED", "AGREED")).toBe(false);
    expect(canTransitionCommerceOrder("AGREED", "CONTACTED")).toBe(false);
    expect(canTransitionCommerceOrder("UNKNOWN", "COMPLETED")).toBe(false);
    expect(canTransitionCommerceOrder("CONTACTED", "UNKNOWN")).toBe(false);
  });

  it("recognizes only supported commerce statuses", () => {
    for (const status of ["INTERESTED", "CONTACTED", "NEGOTIATING", "AGREED", "COMPLETED", "CANCELLED"]) {
      expect(isCommerceOrderStatus(status)).toBe(true);
    }
    expect(isCommerceOrderStatus("PAID")).toBe(false);
    expect(isCommerceOrderStatus("")).toBe(false);
  });

  it("does not allow self-transitions", () => {
    for (const status of Object.keys(commerceOrderTransitions)) {
      expect(canTransitionCommerceOrder(status, status)).toBe(false);
    }
  });
});
