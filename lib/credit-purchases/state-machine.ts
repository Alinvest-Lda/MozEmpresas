/**
 * Allowed lifecycle for a manual credit-purchase request.
 * PAID is terminal and must only be reached by an atomic, idempotent
 * database operation that confirms payment and posts the wallet ledger.
 */
export const creditPurchaseTransitions: Record<string, readonly string[]> = {
  REQUESTED: ["PAYMENT_PENDING", "PAID", "REJECTED", "CANCELLED"],
  PAYMENT_PENDING: ["PAID", "REJECTED", "CANCELLED"],
  PAID: [],
  REJECTED: [],
  CANCELLED: [],
};

export function canTransitionCreditPurchase(from: string, to: string): boolean {
  return creditPurchaseTransitions[from]?.includes(to) ?? false;
}

export function isTerminalCreditPurchaseStatus(status: string): boolean {
  return Object.prototype.hasOwnProperty.call(creditPurchaseTransitions, status)
    && creditPurchaseTransitions[status].length === 0;
}
