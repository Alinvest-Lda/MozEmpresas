import { createHmac, timingSafeEqual } from "node:crypto";

const MAX_CLOCK_SKEW_SECONDS = 300;

export function verifyMpesaWebhookSignature(input: {
  rawBody: string;
  timestamp: string | null;
  signature: string | null;
  secret: string;
  nowSeconds?: number;
}): boolean {
  const { rawBody, timestamp, signature, secret } = input;
  if (!timestamp || !signature || !secret) return false;
  if (!/^\d{10}$/.test(timestamp)) return false;

  const timestampSeconds = Number(timestamp);
  const nowSeconds = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(timestampSeconds)
      || Math.abs(nowSeconds - timestampSeconds) > MAX_CLOCK_SKEW_SECONDS) return false;

  const suppliedHex = signature.replace(/^sha256=/i, "").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(suppliedHex)) return false;

  const expected = createHmac("sha256", secret)
    .update(timestamp + "." + rawBody, "utf8")
    .digest();
  const supplied = Buffer.from(suppliedHex, "hex");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}


export function classifyMpesaCallbackAuditError(message: string): "CALLBACK_TRANSACTION_CONFLICT" | "CALLBACK_AUDIT_UNAVAILABLE" {
  return message.includes("CALLBACK_TRANSACTION_CONFLICT")
    ? "CALLBACK_TRANSACTION_CONFLICT"
    : "CALLBACK_AUDIT_UNAVAILABLE";
}
