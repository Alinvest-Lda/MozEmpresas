import { describe, expect, it } from "vitest";
import { isValidOpportunityId } from "../lib/opportunities/validation";

describe("opportunity action identifiers", () => {
  it("accepts canonical UUIDs", () => {
    expect(isValidOpportunityId("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isValidOpportunityId("550E8400-E29B-41D4-A716-446655440000")).toBe(true);
  });

  it("rejects malformed or non-UUID identifiers", () => {
    expect(isValidOpportunityId("")).toBe(false);
    expect(isValidOpportunityId("123")).toBe(false);
    expect(isValidOpportunityId("550e8400e29b41d4a716446655440000")).toBe(false);
    expect(isValidOpportunityId("550e8400-e29b-41d4-a716-44665544000x")).toBe(false);
    expect(isValidOpportunityId("undefined")).toBe(false);
  });
});
