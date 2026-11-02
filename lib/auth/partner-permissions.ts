export function canManagePartnerOpportunity(role: unknown): boolean {
  return role === "owner" || role === "manager";
}
