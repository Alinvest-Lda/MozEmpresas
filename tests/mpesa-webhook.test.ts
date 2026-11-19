import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyMpesaWebhookSignature } from "../lib/payments/mpesa-webhook";

const secret = "test-webhook-secret";
const timestamp = "1795000000";
const nowSeconds = 1795000000;
const rawBody = JSON.stringify({ transactionId: "TX-12345" });
const signature = createHmac("sha256", secret).update(timestamp + "." + rawBody).digest("hex");

describe("M-Pesa webhook signature", () => {
  it("accepts a valid, recent HMAC signature", () => {
    expect(verifyMpesaWebhookSignature({ rawBody, timestamp, signature, secret, nowSeconds })).toBe(true);
  });

  it("rejects a modified body", () => {
    expect(verifyMpesaWebhookSignature({ rawBody: rawBody + " ", timestamp, signature, secret, nowSeconds })).toBe(false);
  });

  it("rejects missing or malformed signatures", () => {
    expect(verifyMpesaWebhookSignature({ rawBody, timestamp, signature: null, secret, nowSeconds })).toBe(false);
    expect(verifyMpesaWebhookSignature({ rawBody, timestamp, signature: "not-a-signature", secret, nowSeconds })).toBe(false);
  });

  it("rejects timestamps outside the five-minute replay window", () => {
    expect(verifyMpesaWebhookSignature({ rawBody, timestamp, signature, secret, nowSeconds: nowSeconds + 301 })).toBe(false);
  });
});
