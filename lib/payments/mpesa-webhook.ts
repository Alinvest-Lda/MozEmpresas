export type MpesaCallbackAuditError =
  | "CALLBACK_TRANSACTION_CONFLICT"
  | "CALLBACK_AUDIT_UNAVAILABLE";

/**
 * Converts internal callback-audit failures into safe, stable classifications.
 * Raw database or provider errors must not be exposed to the callback caller.
 */
export function classifyMpesaCallbackAuditError(
  error: unknown,
): MpesaCallbackAuditError {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (message.toUpperCase().includes("CALLBACK_TRANSACTION_CONFLICT")) {
    return "CALLBACK_TRANSACTION_CONFLICT";
  }
  return "CALLBACK_AUDIT_UNAVAILABLE";
}
