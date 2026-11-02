import { describe, expect, it } from "vitest";
import { resolveTrustedClientAddress } from "../lib/security/rate-limit";

describe("trusted client address resolution", () => {
  it("reads only the configured trusted proxy header", () => {
    const request = new Request("https://example.test", {
      headers: {
        "x-vercel-forwarded-for": "203.0.113.10, 10.0.0.1",
        "x-forwarded-for": "198.51.100.99",
      },
    });
    expect(resolveTrustedClientAddress(request, "x-vercel-forwarded-for")).toBe("203.0.113.10");
  });

  it("does not trust arbitrary client-supplied forwarding headers", () => {
    const request = new Request("https://example.test", {
      headers: { "x-forwarded-for": "198.51.100.99" },
    });
    expect(resolveTrustedClientAddress(request, "x-vercel-forwarded-for")).toBeNull();
  });

  it("accepts valid IPv4 and IPv6 values", () => {
    expect(resolveTrustedClientAddress(new Request("https://example.test", {
      headers: { "x-client-ip": "203.0.113.5" },
    }), "x-client-ip")).toBe("203.0.113.5");
    expect(resolveTrustedClientAddress(new Request("https://example.test", {
      headers: { "x-client-ip": "2001:db8::1" },
    }), "x-client-ip")).toBe("2001:db8::1");
  });

  it("rejects missing and malformed trusted IP headers", () => {
    expect(resolveTrustedClientAddress(new Request("https://example.test"), "x-client-ip")).toBeNull();
    expect(resolveTrustedClientAddress(new Request("https://example.test", {
      headers: { "x-client-ip": "not-an-ip" },
    }), "x-client-ip")).toBeNull();
  });
});
