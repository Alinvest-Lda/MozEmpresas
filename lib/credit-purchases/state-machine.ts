/**
 * Allowed lifecycle for a manual credit-purchase request.
 *
 * PAID is deliberately excluded from generic transitions: reaching PAID
 * must only happen inside the atomic, idempotent database operation that
 * confirms payment, posts the wallet ledger and records the decision.
 */
export const creditPurchaseTransitions: Record<string, readonly string[]> = {
  REQUESTED: ["PAYMENT_PENDING", "REJECTED", "CANCELLED"],
  PAYMENT_PENDING: ["REJECTED", "CANCELLED"],
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

/**
 * Signals that a payment confirmation needs the dedicated transactional
 * database operation; it is not permission to update the request directly.
 */
export function requiresAtomicCreditPosting(to: string): boolean {
  return to === "PAID";
}
