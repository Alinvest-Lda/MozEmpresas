import { describe, expect, it } from "vitest";
import { canManagePartnerOpportunity } from "../lib/auth/partner-permissions";

describe("partner opportunity permissions", () => {
  it.each(["owner", "manager"])("allows %s to manage partner opportunities", (role) => {
    expect(canManagePartnerOpportunity(role)).toBe(true);
  });

  it.each(["member", "viewer", "billing", null, undefined, "admin"])("rejects role %s", (role) => {
    expect(canManagePartnerOpportunity(role)).toBe(false);
  });
});
