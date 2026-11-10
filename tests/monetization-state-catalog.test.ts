import { describe, expect, it } from "vitest";
import {
  creditPurchaseStatuses,
  financialPaymentStatuses,
  isCreditPurchaseStatus,
  isFinancialPaymentStatus,
  isPlatformServiceOrderStatus,
  platformServiceOrderStatuses,
} from "../lib/monetization/state-catalog";

describe("monetization status catalog", () => {
  it("matches the active credit purchase status constraint", () => {
    expect(creditPurchaseStatuses).toEqual([
      "REQUESTED",
      "PAYMENT_PENDING",
      "PAID",
      "REJECTED",
      "CANCELLED",
    ]);
    for (const status of creditPurchaseStatuses) expect(isCreditPurchaseStatus(status)).toBe(true);
    expect(isCreditPurchaseStatus("CONFIRMED")).toBe(false);
    expect(isCreditPurchaseStatus("")).toBe(false);
  });

  it("matches the active financial payment status constraint", () => {
    expect(financialPaymentStatuses).toEqual(["PENDING", "CONFIRMED", "FAILED", "REFUNDED"]);
    for (const status of financialPaymentStatuses) expect(isFinancialPaymentStatus(status)).toBe(true);
    expect(isFinancialPaymentStatus("PAID")).toBe(false);
    expect(isFinancialPaymentStatus("")).toBe(false);
  });

  it("matches the active platform service order status constraint", () => {
    expect(platformServiceOrderStatuses).toEqual([
      "PENDING_PAYMENT",
      "PAID",
      "PROCESSING",
      "COMPLETED",
      "CANCELLED",
      "FAILED",
    ]);
    for (const status of platformServiceOrderStatuses) expect(isPlatformServiceOrderStatus(status)).toBe(true);
    expect(isPlatformServiceOrderStatus("CONFIRMED")).toBe(false);
    expect(isPlatformServiceOrderStatus("")).toBe(false);
  });

  it("does not normalize unknown casing or whitespace into valid states", () => {
    expect(isCreditPurchaseStatus("paid")).toBe(false);
    expect(isFinancialPaymentStatus(" pending")).toBe(false);
    expect(isPlatformServiceOrderStatus("completed ")).toBe(false);
  });
});
