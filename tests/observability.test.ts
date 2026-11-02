import { afterEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
import { logger } from "../lib/observability/logger";
import { withApiObservability } from "../lib/observability/api";

describe("structured logger", () => {
  afterEach(() => vi.restoreAllMocks());

  it("omits sensitive and unknown fields while retaining operational context", () => {
    const output = vi.spyOn(console, "info").mockImplementation(() => {});
    logger.info("api.test", {
      request_id: "request-12345678",
      route: "api.test",
      status: 200,
      email: "private@example.com",
      user_id: "user-secret",
      message: "private body",
      authorization: "Bearer secret",
      duration_ms: 12,
    } as Record<string, string | number>);
    const entry = JSON.parse(String(output.mock.calls[0][0]));
    expect(entry).toMatchObject({ event: "api.test", request_id: "request-12345678", status: 200, duration_ms: 12 });
    expect(entry).not.toHaveProperty("email");
    expect(entry).not.toHaveProperty("user_id");
    expect(entry).not.toHaveProperty("message");
    expect(entry).not.toHaveProperty("authorization");
  });
});

describe("API observability wrapper", () => {
  afterEach(() => vi.restoreAllMocks());

  it("propagates a valid request ID and returns it in the response header", async () => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    const handler = withApiObservability("api.smoke", async () => NextResponse.json({ ok: true }));
    const response = await handler(new Request("https://example.test/api/smoke", {
      headers: { "x-request-id": "trace-12345678" },
    }));
    expect(response.headers.get("x-request-id")).toBe("trace-12345678");
    expect(response.status).toBe(200);
  });

  it("replaces malformed request IDs and safely handles unhandled errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = withApiObservability("api.smoke", async () => {
      throw new Error("contains private request content");
    });
    const response = await handler(new Request("https://example.test/api/smoke", {
      headers: { "x-request-id": "bad id with spaces" },
    }));
    const body = await response.json();
    expect(response.status).toBe(500);
    expect(response.headers.get("x-request-id")).toMatch(/^[a-f0-9-]{36}$/i);
    expect(body).toEqual({ error: "Não foi possível processar o pedido.", requestId: response.headers.get("x-request-id") });
  });
});
