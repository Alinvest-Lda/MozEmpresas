import { describe, expect, it } from "vitest";
import { classifyMpesaCallbackAuditError } from "../lib/payments/mpesa-webhook";

describe("M-Pesa callback audit error classification", () => {
  it("classifies transaction reuse with mismatched payment data as a conflict", () => {
    expect(classifyMpesaCallbackAuditError("CALLBACK_TRANSACTION_CONFLICT")).toBe("CALLBACK_TRANSACTION_CONFLICT");
  });

  it("normalizes conflict detection from database exception text", () => {
    expect(classifyMpesaCallbackAuditError("ERROR: CALLBACK_TRANSACTION_CONFLICT")).toBe("CALLBACK_TRANSACTION_CONFLICT");
  });

  it("does not expose unexpected database failures as client conflicts", () => {
    expect(classifyMpesaCallbackAuditError("database connection unavailable")).toBe("CALLBACK_AUDIT_UNAVAILABLE");
    expect(classifyMpesaCallbackAuditError("")).toBe("CALLBACK_AUDIT_UNAVAILABLE");
  });
});
