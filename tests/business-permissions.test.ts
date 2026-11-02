import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { canManageBusiness, MANAGER_ROLES } from "../lib/businesses/permissions";

type Row = Record<string, unknown>;
type Fixture = {
  business?: { id: string; owner_id: string; archived_at: string | null } | null;
  member?: { business_id: string; user_id: string; role: string } | null;
};

function mockSupabase(fixture: Fixture): SupabaseClient {
  return {
    from(table: string) {
      const filters: Record<string, unknown> = {};
      let allowedRoles: string[] | undefined;
      const query = {
        select() { return this; },
        eq(column: string, value: unknown) { filters[column] = value; return this; },
        is(column: string, value: unknown) { filters[column] = value; return this; },
        in(column: string, values: unknown[]) {
          if (column === "role") allowedRoles = values as string[];
          else filters[column] = values;
          return this;
        },
        async maybeSingle() {
          if (table === "businesses") {
            const row = fixture.business;
            const matches = row &&
              (!filters.id || row.id === filters.id) &&
              (!filters.owner_id || row.owner_id === filters.owner_id) &&
              (!("archived_at" in filters) || row.archived_at === filters.archived_at);
            return { data: matches ? row : null, error: null };
          }
          if (table === "business_members") {
            const row = fixture.member;
            const matches = row &&
              (!filters.business_id || row.business_id === filters.business_id) &&
              (!filters.user_id || row.user_id === filters.user_id) &&
              (!allowedRoles || allowedRoles.includes(row.role));
            return { data: matches ? row : null, error: null };
          }
          return { data: null, error: null };
        },
      };
      return this;
    },
  } as unknown as SupabaseClient;
}

describe("canManageBusiness", () => {
  const userId = "user-1";
  const businessId = "business-1";

  it("allows the active business owner", async () => {
    const supabase = mockSupabase({
      business: { id: businessId, owner_id: userId, archived_at: null },
    });
    await expect(canManageBusiness(supabase, userId, businessId)).resolves.toBe(true);
  });

  it.each(MANAGER_ROLES)("allows an active member with the %s role", async (role) => {
    const supabase = mockSupabase({
      business: { id: businessId, owner_id: "another-user", archived_at: null },
      member: { business_id: businessId, user_id: userId, role },
    });
    await expect(canManageBusiness(supabase, userId, businessId)).resolves.toBe(true);
  });

  it("rejects members with roles outside the management allowlist", async () => {
    const supabase = mockSupabase({
      business: { id: businessId, owner_id: "another-user", archived_at: null },
      member: { business_id: businessId, user_id: userId, role: "viewer" },
    });
    await expect(canManageBusiness(supabase, userId, businessId)).resolves.toBe(false);
  });

  it("rejects archived or missing businesses before checking membership", async () => {
    const archived = mockSupabase({
      business: { id: businessId, owner_id: "another-user", archived_at: "2026-11-01T00:00:00.000Z" },
      member: { business_id: businessId, user_id: userId, role: "admin" },
    });
    const missing = mockSupabase({ business: null });
    await expect(canManageBusiness(archived, userId, businessId)).resolves.toBe(false);
    await expect(canManageBusiness(missing, userId, businessId)).resolves.toBe(false);
  });

  it("does not grant access when membership belongs to another user or business", async () => {
    const wrongUser = mockSupabase({
      business: { id: businessId, owner_id: "another-user", archived_at: null },
      member: { business_id: businessId, user_id: "different-user", role: "owner" },
    });
    const wrongBusiness = mockSupabase({
      business: { id: businessId, owner_id: "another-user", archived_at: null },
      member: { business_id: "different-business", user_id: userId, role: "owner" },
    });
    await expect(canManageBusiness(wrongUser, userId, businessId)).resolves.toBe(false);
    await expect(canManageBusiness(wrongBusiness, userId, businessId)).resolves.toBe(false);
  });
});
