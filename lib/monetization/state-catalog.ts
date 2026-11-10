/**
 * Canonical status vocabulary verified against the active MozEmpresas
 * PostgreSQL constraints on 2026-11-10.
 *
 * This file deliberately validates status membership only. It does not infer
 * transition permissions; transitions must remain actor- and tenant-aware
 * and be enforced by the corresponding server action/RPC.
 */

export const creditPurchaseStatuses = [
  "REQUESTED",
  "PAYMENT_PENDING",
  "PAID",
  "REJECTED",
  "CANCELLED",
] as const;

export type CreditPurchaseStatus = (typeof creditPurchaseStatuses)[number];

export function isCreditPurchaseStatus(value: string): value is CreditPurchaseStatus {
  return (creditPurchaseStatuses as readonly string[]).includes(value);
}

export const financialPaymentStatuses = [
  "PENDING",
  "CONFIRMED",
  "FAILED",
  "REFUNDED",
] as const;

export type FinancialPaymentStatus = (typeof financialPaymentStatuses)[number];

export function isFinancialPaymentStatus(value: string): value is FinancialPaymentStatus {
  return (financialPaymentStatuses as readonly string[]).includes(value);
}

export const platformServiceOrderStatuses = [
  "PENDING_PAYMENT",
  "PAID",
  "PROCESSING",
  "COMPLETED",
  "CANCELLED",
  "FAILED",
] as const;

export type PlatformServiceOrderStatus = (typeof platformServiceOrderStatuses)[number];

export function isPlatformServiceOrderStatus(value: string): value is PlatformServiceOrderStatus {
  return (platformServiceOrderStatuses as readonly string[]).includes(value);
}
