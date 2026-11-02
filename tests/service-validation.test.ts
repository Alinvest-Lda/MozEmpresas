import { describe, expect, it } from "vitest";
import {
  parseServiceRequestInput,
  parseServiceRequestUpdateInput,
} from "../lib/services/validation";

const serviceId = "9b2b6a1a-6d8c-4a37-9bb8-7b11d7d3f451";
const requestId = "8b2b6a1a-6d8c-4a37-9bb8-7b11d7d3f451";
const businessId = "7b2b6a1a-6d8c-4a37-9bb8-7b11d7d3f451";

describe("platform service request input", () => {
  it("accepts a valid service request with an optional business", () => {
    expect(parseServiceRequestInput({ serviceId, businessId, notes: "  Apoio necessário  " })).toMatchObject({
      success: true,
      data: { serviceId, businessId, notes: "Apoio necessário" },
    });
    expect(parseServiceRequestInput({ serviceId, businessId: "", notes: "" }).success).toBe(true);
  });

  it("rejects invalid identifiers and notes over 2,000 characters", () => {
    expect(parseServiceRequestInput({ serviceId: "invalid", businessId: "" }).success).toBe(false);
    expect(parseServiceRequestInput({ serviceId, businessId: "", notes: "x".repeat(2001) }).success).toBe(false);
  });
});

describe("platform service request administration", () => {
  it("normalizes status and parses Mozambican decimal comma prices", () => {
    expect(parseServiceRequestUpdateInput({
      requestId,
      status: "quoted",
      requestedPrice: "12 500,50".replace(" ", ""),
    })).toMatchObject({ success: true, data: { status: "QUOTED", requestedPrice: 12500.5 } });
  });

  it("allows an empty price and a zero quote", () => {
    expect(parseServiceRequestUpdateInput({ requestId, status: "REQUESTED", requestedPrice: "" }))
      .toMatchObject({ success: true, data: { requestedPrice: null } });
    expect(parseServiceRequestUpdateInput({ requestId, status: "QUOTED", requestedPrice: "0" }))
      .toMatchObject({ success: true, data: { requestedPrice: 0 } });
  });

  it.each(["-1", "NaN", "Infinity", "not-a-price"])("rejects invalid price %s", (requestedPrice) => {
    expect(parseServiceRequestUpdateInput({ requestId, status: "QUOTED", requestedPrice }))
      .toMatchObject({ success: false, error: "INVALID_PRICE" });
  });

  it("rejects unknown statuses and malformed request IDs", () => {
    expect(parseServiceRequestUpdateInput({ requestId, status: "PAID", requestedPrice: "" }).success).toBe(false);
    expect(parseServiceRequestUpdateInput({ requestId: "bad", status: "QUOTED", requestedPrice: "" }).success).toBe(false);
  });
});
